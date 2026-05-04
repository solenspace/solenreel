# Spec 18 — "For You" row (UI)

## Goal

Render the recommendation result on home as the "For You" row, the differentiator over the cold-start popular row. After this spec, signed-in users see two rows on home: "For you" (powered by the rec function) on top, and "Popular this week" beneath. Cold-start users (fewer than 5 events) see a single rec row labeled identically but, internally, served by the cold-start fallback. The accent burnt-amber "For You" badge is the only visual cue distinguishing warm-start from cold-start.

## Dependencies

- **Spec 17** — `useRecommendations()` hook + Edge Function.
- **Spec 11** — Home page with the popular row.
- **Spec 10** — `Tile` and `Row` primitives.
- **Spec 09** — TMDB `useMovieDetails` for fleshing out tile metadata once we have a list of ids.
- **Context invariants**: `architecture.md` §"Invariants" 6 (cold-start fallback); `ui-context.md` §"Layout patterns" (the For You row gets the accent badge), §"Density" (list view? grid view?), §"Voice".
- **Agents that gate this spec**: `fsd-architect`, `test-writer`.

## Design Decisions

- **Where it lives**: `src/widgets/for-you-row/for-you-row.jsx`. A widget composes `Row` (spec 10) with the rec data.
- **Data flow**:
  1. `useRecommendations()` returns the rec list (array of `{ tmdb_id, score, reason }`).
  2. For each tmdb_id, `useMovieDetails(tmdbId)` fetches the full `Movie` object (cached via TanStack Query, deduped if the same tmdb_id appears in popular too).
  3. The widget renders a `<Row>` with the resolved Movies.
- **Variant**: `grid` for For You row (matches Popular's density). The rec function output's `score` is not displayed in v1; it's purely for ordering. `reason` is null for content-based recs (spec 17); it gets populated only when intent-search recs are *re-cached* into recommendations (out of scope v1; intent-search returns its own list separately).
- **Position**: For You row is rendered **above** Popular on home. Order matters: the user's first row of attention is their personalized one.
- **Cold-start UX**: when the rec function returns `cold_start: true`, the widget hides the accent "For You" badge and renders the row title as `"Recommended for you — keep clicking to teach me"` instead of `"For you"`. Same row otherwise. The hint encourages engagement to lift the cold-start ceiling.
- **Loading and error states**:
  - Pending: skeleton row (shared with Popular's skeleton; spec 11 helper).
  - Error: row hides entirely (don't show a half-broken state); log to console in dev.
  - Empty (rec function returned an empty `items` array, which shouldn't happen but defensive): also hides.
- **Re-fetching**: `useRecommendations()` has `staleTime: 5 minutes`; the row refreshes naturally. After 5 events are queued/inserted via spec 15, the widget invalidates the query (`queryClient.invalidateQueries({queryKey: ['recommendations']})`) so the user sees their recs respond to behavior. The invalidation is wired in `src/features/click-tracker/use-click-tracker.js` (spec 15) — this spec extends that hook.
- **Tracking source**: tiles inside this widget are wrapped in `<TrackingProvider source="for-you" />` (per spec 15) so events from this row carry that origin.

## Implementation

1. Create `src/widgets/for-you-row/for-you-row.jsx`:
   - Calls `useRecommendations()`.
   - For each `tmdb_id` in items, uses `useMovieDetails` (or a new `useManyMovieDetails(ids)` helper that batches into parallel `useQueries` from TanStack Query).
   - Renders `<TrackingProvider source="for-you"><Row title={...} variant="grid" tiles={...} /></TrackingProvider>`.
   - Conditional title and accent badge based on the rec response's `cold_start` flag.
2. Add `src/entities/movie/use-many-movie-details.js`: a thin wrapper around TanStack Query's `useQueries` that takes an array of ids and returns an array of `{ data, isPending, error }`. Documented JSDoc.
3. Update `src/app/pages/Home.jsx` (spec 11) to render `<ForYouRow />` above `<PopularRow />`.
4. Extend `src/features/click-tracker/use-click-tracker.js` (spec 15) to invalidate `['recommendations']` after every successful flush. Add a small debounce (1 second after the flush) so flushing 5 events doesn't trigger 5 invalidations.
5. Tests (run through `test-writer`):
   - `src/widgets/for-you-row/for-you-row.test.jsx`:
     - Cold-start: rec hook returns `cold_start: true` → row title is the cold-start hint, no accent badge.
     - Warm-start: rec hook returns `cold_start: false` → row title is `"For you"`, accent badge visible.
     - Pending → skeleton row.
     - Error → row hides (renders null).
   - `src/features/click-tracker/use-click-tracker.test.jsx` extension: a successful flush triggers a single (debounced) invalidation of `['recommendations']` after 1 s.
6. Manual smoke:
   - Sign in as a user with few events → home shows cold-start title + Popular row below.
   - Manually insert 6 events into `events` table (or click around 6 tiles), wait for invalidation → home re-fetches recs and the title changes to `"For you"` + accent badge appears.
7. Run all gates. Commit as `feat: For You row on home (cold-start fallback + accent badge)`.

## Success Criteria

1. Signed-in user with `cold_start: true` sees one rec-style row labeled `"Recommended for you — keep clicking to teach me"` above Popular; no accent badge.
2. Signed-in user with `cold_start: false` sees `"For you"` row with accent burnt-amber badge above Popular.
3. After clicking 5 tiles in a session, the recommendation query invalidates within 1.5 s and the row refreshes. (Manual + automated.)
4. Tiles in the For You row carry `payload.source = 'for-you'` when clicked (verified by inspecting an `events` row).
5. Pending state renders a skeleton row no longer than 800 ms before swapping to the loading text per `ui-context.md`.
6. Error state hides the row entirely (no broken markup); error logs to console in dev only.
7. Movie details are resolved efficiently — 20 tmdb_ids → 20 parallel queries, no waterfall, no duplicate cache entries when an id is also in Popular.
8. All tests in this spec pass.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `fsd-architect` reports zero violations.
