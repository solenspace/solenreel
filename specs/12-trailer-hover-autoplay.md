# Spec 12 — Trailer hover autoplay (the differentiator)

## Goal

Make tiles autoplay their muted trailers on hover/focus instead of staying static. This is reel's headline UX bet — the page sells with motion. After this spec, hovering any tile for 250 ms swaps the poster for the trailer at 0.7 opacity over the poster, audio off, with `IntersectionObserver` lazy mount and `prefers-reduced-motion` static-poster fallback.

## Dependencies

- **Spec 09** — `useMovieVideos(id)` hook returns the YouTube video keys.
- **Spec 10** — `Tile` primitive; this spec extends it with a `<Tile.HoverPlayer />` slot.
- **Spec 03** — `react-player` mock + `IntersectionObserver` stub + `matchMedia` stub for tests.
- **Context invariants**: `architecture.md` §"Invariants" 4 (muted autoplay), 6 (TanStack Query for video keys), 11 (no fetch in useEffect); `ui-context.md` §"Trailer hover behavior" (250 ms delay, fade-in 0.7 opacity, audio off, IntersectionObserver lazy mount, unmount on leave + 100 ms, `prefers-reduced-motion` honored).
- **Agents that gate this spec**: `fsd-architect` (this is a `features/trailer/` concern; tile presentation stays in `entities/`); `test-writer`.

## Design Decisions

- **Where the player lives**: not inside the tile by default. The tile composes `<Tile.HoverPlayer />` as an _opt-in_ slot. Pages that want hover trailers (home popular row, for-you row, intent results row) pass `hoverPlayer` prop. Pages that don't (search-text-results list, profile) get static posters.
- **`useTrailerOnHover(movieId)`** hook at `src/features/trailer/use-trailer-on-hover.js`:
  - Returns `{ ref, state }` where `ref` is a ref to attach to the tile root, and `state` is `'idle' | 'pending' | 'playing' | 'unsupported'`.
  - Internals: `IntersectionObserver` to gate mount (≥40% visible), hover/focus listener with 250 ms timer, fetches video keys via `useMovieVideos` (only when entered, not at module load), picks the first YouTube `Trailer` type key, mounts a `<TrailerPlayer />` overlay.
  - Honors `prefers-reduced-motion`: sets `state = 'unsupported'` and never mounts the player.
  - Unmount: on `mouseleave` + 100 ms, OR on `IntersectionObserver` exit, OR on focus loss (any of these fires the unmount).
  - Audio is **off** — `muted` prop forced true. Audio is enabled in spec 13's full-bleed page only.
- **`TrailerPlayer` adaptation**: the existing `src/features/trailer/trailer-player.jsx` (post-spec-01) already wraps `react-player/youtube`. This spec adds a `mode='overlay'` prop for the hover use case (positions absolute over the poster, opacity 0.7). The existing `mode='full'` (used by spec 13) keeps the 1.3× scale + audio.
- **Failure modes**:
  - No trailer video for this movie → `state = 'unsupported'`; tile stays as poster, no glitchy half-mount.
  - YouTube blocks embedding for this video → `state = 'unsupported'` (caught via `react-player`'s `onError` callback); tile reverts to poster after the failed mount.
  - Slow network on `useMovieVideos` → `state = 'pending'` shows nothing extra (poster stays); only when keys arrive does the player mount.
- **Performance**: only one hover-player at a time globally — when a tile starts hovering, it dispatches a custom event the others listen for and force-unmount their players. Single source of truth: a global signal `currentlyHoveringTileId` on a small store at `src/features/trailer/hover-store.js` (Redux slice, since Redux is already wired). This prevents 8 trailers from all autoplaying when the user sweeps the mouse across a row.
- **Open question (tracked in progress-tracker)**: whether to lazily fetch video keys per tile on hover (current design) or batch-fetch them per row eagerly. Default to lazy; revisit if perf measurements in success criteria show too many sequential network calls.

## Implementation

1. Create `src/features/trailer/use-trailer-on-hover.js`. JSDoc-typed return shape `{ ref, state }`.
2. Update `src/features/trailer/trailer-player.jsx` (post-spec-01 path) to support `mode='overlay'|'full'` with the visual differences listed above.
3. Create `src/features/trailer/hover-store.js` — a tiny Redux slice tracking `currentlyHoveringTileId`. Action: `setHoveringTile(id)`. Selector: `selectIsCurrentlyHovering(state, id)`. Wire it into `src/app/store.js`.
4. Update `src/entities/movie/tile.jsx` (spec 10) to expose a `Tile.HoverPlayer` slot. The slot calls `useTrailerOnHover(movie.id)` and renders the overlay player when `state === 'playing'`. The tile root attaches the returned `ref`.
5. Update home (`src/app/pages/Home.jsx`) to pass `hoverPlayer` to its `<Row>` so each tile gets the slot.
6. Update `src/test-setup.js` (spec 03) `matchMedia` stub to default `prefers-reduced-motion` to `false`; tests that need `true` flip it per case.
7. Tests (run through `test-writer`):
   - `src/features/trailer/use-trailer-on-hover.test.jsx` — using `renderHook`, fake timers, IO stub:
     - 250 ms hover delay before mount.
     - `mouseleave + 100 ms` unmounts.
     - `prefers-reduced-motion: true` → state never leaves `'idle'`.
     - IO `isIntersecting=false` prevents mount even on hover (user hovered an off-screen tile via keyboard).
     - When a second tile starts hovering, the first unmounts (verified via the hover-store).
   - `src/entities/movie/tile.test.jsx` — extend with hover-player tests when `<Tile.HoverPlayer />` is provided: muted prop is true, `data-testid="player"` shows up after the delay.
8. Manual perf check: open dev tools performance recorder, hover 20 tiles in sequence in the popular row; verify scripting time per autoplay stays under 50 ms (per `project-overview.md` budget).
9. Run all gates. Manual smoke: hover any tile for ≥250 ms — trailer fades in over the poster at 0.7 opacity, no audio. Move mouse away, trailer fades out within 100 ms.
10. Commit as `feat: trailer hover autoplay (250ms delay, IO lazy mount, motion-pref fallback)`.

## Success Criteria

1. Hovering a tile for ≥250 ms mounts the muted trailer overlay; mouse-leave + 100 ms unmounts it.
2. Audio is never enabled in overlay mode (verified by `data-muted="true"` on the player stub in tests; in browser, no audio plays).
3. With `prefers-reduced-motion: reduce` set, the tile never mounts the player on hover (poster stays static).
4. Tile not visible (IO `isIntersecting=false`) → hover does not mount the player.
5. Only one tile's hover-player is mounted at any time — sweeping across tiles does not stack 5 simultaneous players.
6. Movies without a YouTube trailer (mocked: `useMovieVideos` returns empty) show poster only, no glitchy half-state.
7. Per-autoplay scripting time stays under 50 ms (informal Chrome devtools check on a 20-tile row).
8. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `fsd-architect` reports zero violations.
9. `progress-tracker.md` open question (lazy vs eager video-key fetching) is updated with the spec's chosen path (lazy) and a note about when to revisit.

## Agents & Skills

**Agents (mandatory invocation):**

- `fsd-architect` — verifies `useTrailerOnHover` and `hover-store` live in `features/trailer/`, while `Tile.HoverPlayer` slot integration into `entities/movie/tile.jsx` follows the slot/composition pattern (entity stays presentational; the hook is what owns the side effect).
- `test-writer` — runs at step 7 for the hook tests. Validates fake-timer-driven 250 ms / 100 ms assertions, IO-stub-driven gating, the matchMedia flip for prefers-reduced-motion.

**Skills (consulted by the agents during this spec):**

- **`.claude/skills/vercel-react-best-practices/rules/advanced-event-handler-refs.md`** — drives the ref-attached hover handler pattern.
- `.claude/skills/vercel-react-best-practices/rules/advanced-effect-event-deps.md` — keeps the IO observer effect's deps array honest.
- `.claude/skills/vercel-react-best-practices/rules/client-passive-event-listeners.md` — informs whether the hover listeners need `passive: true`.
- `.claude/skills/web-design-guidelines/SKILL.md` — `prefers-reduced-motion` is the load-bearing accessibility rule for this spec.
- `.claude/skills/vercel-composition-patterns/rules/state-decouple-implementation.md` — informs the `hover-store` slice design (one source of truth for "currently hovering tile").

**Notes:**

- `react-player` v2.x is the locked v1 player API; v3 (Nov 2025, breaking) is v1.1 backlog. Tests rely on the spec-03 stub.
- No `prompt-engineer` here.
