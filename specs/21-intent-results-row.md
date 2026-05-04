# Spec 21 — Intent results row (UI)

## Goal

Render the intent-search Edge Function's results on the Search page, in editorial list view, with the model's reasoning line per pick. Loading, error, rate-limit, and "limited matches" states all have explicit prose-first messages per `ui-context.md` voice. After this spec, the user-visible loop is complete: type a mood prompt → submit → see a curated row with reasoning. The full reel UX shipped.

## Dependencies

- **Spec 19** — Edge Function returns `{ items: [{ tmdb_id, reason }], partial, ... }`.
- **Spec 20** — `useIntentSearch` mutation hook + URL `?intent=<query>` convention.
- **Spec 10** — `Tile` (with `<Tile.Reasoning />` slot for the per-pick reason).
- **Spec 09** — `useMovieDetails` to flesh out the items.
- **Context invariants**: `ui-context.md` §"Density" (intent results default to **list view** so reasoning has room), §"Voice"; `architecture.md` §"Failure modes".
- **Agents that gate this spec**: `fsd-architect`, `test-writer`.

## Design Decisions

- **Page**: `src/app/pages/Search.jsx` is now a dual-mode page driven by URL params:
  - `?q=<text>` → literal mode → existing TMDB search results (TitleResults grid).
  - `?intent=<text>` → intent mode → `IntentResults` (this spec).
  - Both modes read URL on mount; if both params are present (shouldn't happen via the bar but defensive), intent wins.
- **Component**: `src/widgets/intent-results/intent-results.jsx`. Composes `Row` (spec 10) in list variant.
- **Data flow**:
  1. On mount with `?intent=<text>`, call `useIntentSearch().mutate({ prompt, count: 8 })`.
  2. On success, map `items` to tiles using `useManyMovieDetails(ids)` (spec 18 helper).
  3. Render `<Row title="results" variant="list" tiles={...} />` with each tile overriding `<Tile.Reasoning />` to display the model's `reason` line.
- **Loading state**:
  - First 800 ms: small "thinking" indicator with the prompt echoed back, e.g. `> something slow and quiet that hurts | reel is thinking…`. Mono font.
  - 800 ms+: still pending → message stays; no skeleton tiles (we don't know the result count up front).
  - Cap: if pending exceeds 6 seconds, swap to `"this is taking a while — the assistant may be slow."` (no auto-cancel; the mutation completes when it does).
- **Error states (prose-first per `ui-context.md`)**:
  - 401 → `"sign in to ask reel for recommendations."` + a link to `/auth/login`.
  - 429 → `"the free tier is rate-limited. give it a minute and try again."`
  - 502 (`upstream_unavailable` / `upstream_schema_violation`) → `"the assistant is offline — try a literal title search."`
  - Network failure → `"can't reach the assistant. check your connection."`
- **`partial: true` state**: above the row, render a small caption: `"limited matches in the catalog — try a more open prompt."` Prose, muted ink, italic.
- **Empty result** (post-hallucination-filter `items` length 0): render the "limited matches" caption alone, no row.
- **Tracking**: tiles in this row carry `payload.source = 'intent-results'`. Wrap in `<TrackingProvider source="intent-results" />`.
- **Reasoning line styling**: `font-sans`, 13 px, `--color-ink-muted`, 1 line truncated with ellipsis if it overflows. Lives in `<Tile.Reasoning>{item.reason}</Tile.Reasoning>` slot — only intent results provide this slot, all other tiles render their default score.

## Implementation

1. Update `src/app/pages/Search.jsx` (post-spec-01) to branch on URL params:
    ```jsx
    const params = useSearchParams();
    if (params.get('intent')) return <IntentResults prompt={params.get('intent')} />;
    if (params.get('q')) return <TitleResults query={params.get('q')} />;
    return <SearchEmptyState />;
    ```
   `SearchEmptyState` is a small "type something to begin" panel that the literal-mode user sees before hitting Enter.
2. Create `src/widgets/intent-results/intent-results.jsx`:
   - Calls `useIntentSearch()` once on mount (passing the `prompt`).
   - Resolves item details via `useManyMovieDetails(ids)`.
   - Renders states per the design above.
3. Extend `src/entities/movie/tile.jsx` (spec 10) to support the `<Tile.Reasoning />` slot — the slot is null by default, populated from children when intent results pass it.
4. Add the prompt-echo mono indicator at `src/widgets/intent-results/thinking-indicator.jsx`.
5. Tests (run through `test-writer`):
   - `src/widgets/intent-results/intent-results.test.jsx`:
     - Mock `useIntentSearch` resolved with 5 items + `partial: false` → renders 5 tiles, each with reasoning, no caption.
     - `partial: true` → renders the caption above the row.
     - Empty items + `partial: true` → renders the caption alone.
     - Pending → renders thinking indicator with prompt echo.
     - Pending > 6 s → swaps to the long-pending message.
     - Mock 401 / 429 / 502 / network errors → renders the corresponding prose-first state.
   - `src/app/pages/Search.test.jsx` — visiting `/search?intent=foo` mounts `IntentResults`; `/search?q=foo` mounts `TitleResults`; both → intent wins.
6. Manual smoke: type a real intent prompt in the bar → hit Enter → Search page renders with the thinking indicator, then the row of 5–10 results with reasoning lines under each title. Verify rate-limit handling by mocking 429 in dev.
7. Run all gates. Commit as `feat: intent results UI on /search?intent=… (editorial list + reasoning)`.

## Success Criteria

1. Submitting `?intent=<query>` from the bar lands on `/search?intent=…` and the IntentResults widget renders.
2. While pending, the thinking indicator shows the echoed prompt; after 6 s, the long-pending message replaces it.
3. On success, exactly `items.length` tiles render (5–10), each with the model's reasoning visible under the title.
4. `partial: true` shows the limited-matches caption above the row.
5. Empty `items` + `partial: true` shows only the caption (no row).
6. 401 / 429 / 502 / network errors each show the documented prose-first message; `pnpm dev` console has no unhandled rejections.
7. Tile clicks in this row carry `payload.source = 'intent-results'` (verified via inserted `events` row).
8. The Search page correctly routes between literal and intent modes based on URL params; both → intent wins.
9. All tests in this spec pass; `test-writer` confirms style.
10. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `fsd-architect` reports zero violations.
