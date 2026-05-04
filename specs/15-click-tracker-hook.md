# Spec 15 — Click tracker hook

## Goal

Wire the client side of the events pipeline. After this spec, every meaningful interaction with a tile or trailer emits an event into `public.events`: `tile_click`, `hover_start`, `trailer_play`, `trailer_complete`. Writes are batched (5 events or 2 s, whichever first), deduped within the same session, and silently dropped when the user is signed out (no signup-gating; reel works for guests, but only signed-in users get personalization).

## Dependencies

- **Spec 14** — `events` table + RLS in place.
- **Spec 12** — trailer hover/full-bleed surfaces emit `trailer_play` / `trailer_complete`.
- **Spec 11 / 13** — tile click (home → /movie/:id) is the `tile_click` source.
- **Spec 10** — `Tile` primitive is where `tile_click` and `hover_start` are dispatched.
- **Context invariants**: `architecture.md` §"Invariants" 5 (append-only), 11 (no fetch in useEffect — flushing is via mutation, not effect-fetch).
- **Agents that gate this spec**: `fsd-architect`, `test-writer`.

## Design Decisions

- **Hook**: `useClickTracker()` at `src/features/click-tracker/use-click-tracker.js`. Returns `{ track }`:
    ```js
    /**
     * @param {EventKind} kind
     * @param {number} tmdbId
     * @param {Record<string, unknown>} [payload]
     * @returns {void}
     */
    track(kind, tmdbId, payload?)
    ```
- **Module-scoped queue + flush timer** (not React state): inside the hook module, a single mutable queue holds pending events. Flushing fires a `supabase.from('events').insert(batch)` call. The hook itself is just a thin wrapper that reads `auth.uid()` from Redux and pushes to the queue.
- **Flush triggers**:
  - Queue size ≥ 5 events → flush immediately.
  - 2 s elapsed since the first queued event → flush.
  - `visibilitychange` to `hidden` → synchronous flush via `navigator.sendBeacon` (or fetch with `keepalive: true` against the Supabase REST endpoint), so the user-leaves-tab case doesn't lose data.
  - Sign-out → drop the queue (don't try to write events for a logged-out user).
- **Dedupe per session**: a `Set<\`${kind}:${tmdbId}\`>` lives in module scope. `tile_click` and `hover_start` are deduped (one per movie per session). `trailer_play` is deduped (one per movie per session — even if the user replays). `trailer_complete` is **not** deduped (signal that the trailer finished is meaningful every time). The dedupe set is cleared on sign-out.
- **Signed-out users**: `track()` is a no-op. No queue accumulation, no localStorage stash. Reel for guests is browse-only with no personalization.
- **Failure mode**: a flush failure (network error, RLS error) logs to `console.warn` in dev, swallows in prod (no UI surface — events are best-effort signal, not user content). Re-queue exactly once before giving up; do not retry indefinitely on backoff.
- **Payload contents** (documented contract):
  - `tile_click` → `{ source: 'home' | 'search' | 'movie-detail' | 'for-you' | 'intent-results' }` so we can reason about where the click originated.
  - `hover_start` → `{ }` (no extra context yet; could add `dwell_ms` later via the `payload` jsonb without a migration).
  - `trailer_play` → `{ mode: 'overlay' | 'full' }`.
  - `trailer_complete` → `{ mode: 'overlay' | 'full', duration_ms: number }`.
- **Wiring points**:
  - `src/entities/movie/tile.jsx` (spec 10) — emits `tile_click` on `onClick`, `hover_start` on hover (after the same 250 ms delay as the trailer player; one signal per intentional hover, not every mouseenter).
  - `src/features/trailer/trailer-player.jsx` (spec 12 + 13) — emits `trailer_play` on player ready/start, `trailer_complete` on `onEnded`.

## Implementation

1. Create `src/features/click-tracker/use-click-tracker.js`:
   - Module-scoped `pendingQueue: Event[]`, `dedupeSet: Set<string>`, `flushTimer: number | null`.
   - Function `flush()` does `supabase.from('events').insert(...)`, clears the queue, clears the timer.
   - Hook returns a memoized `track` function.
   - `useEffect` at hook mount registers a `visibilitychange` listener (this is allowed — it's not a fetch-in-useEffect; it's syncing with browser API).
   - On sign-out (subscribe to Redux `setSession(null)`), drop queue + clear dedupe set.
2. Wire into `src/entities/movie/tile.jsx`:
   - Inject `track` via the `Tile` component itself (hook called once at the tile root).
   - `onClick` handler calls `track('tile_click', movie.id, { source })` then calls the user-provided `onClick`. The `source` is read from a `<TrackingContext>` (provider mounted at each row that knows its source — see step 4).
   - On confirmed hover (after 250 ms delay), emit `hover_start`.
3. Wire into `src/features/trailer/trailer-player.jsx`:
   - On ready/play: `track('trailer_play', movie.id, { mode })`.
   - On ended: `track('trailer_complete', movie.id, { mode, duration_ms })`.
4. Create `src/features/click-tracker/tracking-context.jsx` — a context provider that supplies the `source` string to every tile in its subtree. Home wraps its row in `<TrackingProvider source="home">`; search wraps in `source="search"`; for-you in `source="for-you"`; intent results in `source="intent-results"`.
5. Tests (run through `test-writer`):
   - `src/features/click-tracker/use-click-tracker.test.jsx`:
     - Calling `track` 5 times triggers a single `supabase.insert` with 5 events.
     - 2-s timer triggers flush with whatever is queued.
     - Dedupe: same `tile_click` for the same id twice in a session → only one insert.
     - `trailer_complete` is not deduped.
     - Sign-out empties queue and dedupe set.
     - `visibilitychange` → `hidden` triggers a sendBeacon flush.
     - Network error: logs warn in dev, retries once, gives up.
   - Tests for tile + trailer wiring: clicking a tile emits `tile_click`; trailer end emits `trailer_complete`.
6. Manual smoke (signed in): sign in, click a tile on home → check `select * from events order by created_at desc limit 5` shows the event row with `source = 'home'`. Hover a tile for 1 s → `hover_start` shows up. Watch a full trailer → `trailer_play` then `trailer_complete`.
7. Manual smoke (signed out): browse home, click tiles → no rows in `events` (RLS denies anyway, but the hook should also no-op).
8. Run all gates. Commit as `feat: click tracker hook (batched, deduped, beacon-flushed on visibility change)`.

## Success Criteria

1. Signed in, performing 5 distinct tile clicks within 2 s → exactly one `INSERT` row hits the network panel with 5 rows in the body.
2. Signed in, performing a tile click → row in `events` with the right `kind`, `tmdb_id`, `user_id`, and `payload.source`.
3. Repeating the same `tile_click` for the same `tmdb_id` in the same session inserts only once.
4. Watching a trailer to completion produces two events: `trailer_play` then `trailer_complete` with `duration_ms` populated.
5. Switching tab away (`visibilitychange: hidden`) flushes any pending events synchronously via beacon (verified by manually backgrounding the tab during a buffered window).
6. Signed out, all interactions produce zero `events` rows.
7. Sign-out clears the in-memory queue (verifiable via test or by signing out mid-buffer).
8. All tests in this spec pass; `test-writer` confirms style.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `fsd-architect` reports zero violations (the hook lives in `features/`, calls `supabase` only via the singleton from `shared/api/supabase.js`).

## Agents & Skills

**Agents (mandatory invocation):**
- `fsd-architect` — verifies the hook lives in `features/click-tracker/` and that all `supabase.from('events').insert(...)` calls go through the shared client.
- `test-writer` — runs at step 5 for the hook + wiring tests. Validates fake-timer-driven flush triggers + dedupe-set assertions.

**Skills (consulted by the agents during this spec):**
- **`.claude/skills/vercel-react-best-practices/rules/advanced-effect-event-deps.md`** — drives the visibilitychange listener subscription pattern.
- `.claude/skills/vercel-react-best-practices/rules/advanced-event-handler-refs.md` — keeps the `track` function reference stable across re-renders.
- `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md` — sendBeacon and `keepalive: true` patterns.
- `.claude/skills/vercel-composition-patterns/rules/state-context-interface.md` — drives `<TrackingProvider source>` context shape.

**Notes:**
- Module-scoped queue (not React state) is intentional: the queue must survive component unmounts during route transitions.
- No `prompt-engineer`.
