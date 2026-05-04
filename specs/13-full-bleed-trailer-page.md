# Spec 13 — Full-bleed trailer page (`/movie/:id`)

## Goal

Build the click-through destination: `/movie/:id` renders a full-bleed YouTube trailer with audio enabled, surrounded by an editorial metadata overlay (title, year, director, runtime, genres, score, overview prose). Back arrow returns the user to wherever they came from. `Esc` dismisses. After this spec, the loop "browse → trailer-hover → click → full-bleed → back" is the central reel UX.

## Dependencies

- **Spec 09** — `useMovieDetails(id)` + `useMovieVideos(id)` hooks for metadata + video keys.
- **Spec 12** — `TrailerPlayer` already supports `mode='full'` (audio enabled, 1.3× scale).
- **Spec 08** — `/movie/:id` route placeholder exists; this spec replaces the placeholder with the real page.
- **Spec 07** — editorial tokens drive the overlay typography and color.
- **Spec 10** — `Tile` (used here as a small "more like this" row at the bottom — optional v1.1 deliverable; see Design Decisions).
- **Context invariants**: `architecture.md` §"Invariants" 4, 11; `ui-context.md` §"Layout patterns" (hero), §"Trailer hover behavior" (full mode is the inverse: audio on, 1.0 opacity), §"Voice" (terse metadata).
- **Agents that gate this spec**: `fsd-architect`, `test-writer`.

## Design Decisions

- **Page route**: `/movie/:id` lazy-loaded, mounted under `AppLayout` (header + footer remain visible at the top/bottom; the trailer is the hero, not the entire viewport, so navigation chrome stays).
- **Layout** (`src/app/pages/movie-detail/movie-detail.jsx`):
  - Top: hero block — full-bleed trailer (video aspect 16:9, full container width). Metadata overlay sits in the bottom-left corner, scrim gradient from `--color-bg-overlay` for legibility.
  - Below the hero: a single column of prose content — overview paragraph, then a metadata grid (director, runtime, genres, year, score) using `font-sans` tabular nums.
  - Right side / below grid: optional **"more like this" row** of similar movies (uses `useByGenre` with the movie's first genre id) rendered with `<Row variant="compact" />`. Marked optional v1.1; if it slips, the spec is still complete with just the hero + metadata.
- **Audio**: enabled by default in this view (browser autoplay policy allows audio after a user gesture; the click that brought them here counts). The player starts at `t=0`, plays through; when it ends, replay button appears.
- **Back navigation**: a small back arrow at the top-left of the hero, or `Esc` keystroke. Uses React Router's `useNavigate(-1)` to return to the previous route.
- **Loading state**: while `useMovieDetails` is pending, render a `SkeletonBanner`-style placeholder for the hero + skeleton text rows for the metadata. After 800 ms still pending, swap to `"reel is loading"` per the same pattern as spec 11.
- **Error state**: 404-equivalent error if `useMovieDetails` returns no result for the id (typo URL). Renders a minimal message: `"that movie isn't on tmdb."` with a link back to home.
- **No watchlist button, no share button**. Watchlist is out of scope v1; share buttons add tracking surface we don't want.
- **Banner / BannerAmbient legacy**: the netflix-clone's Banner concept is *replaced* by this page's hero. Spec 11 already removed Banner from home; this spec optionally deletes the legacy Banner files (no consumers remain after this spec). Leaving them undeleted is acceptable — final cleanup pass happens at spec 23.

## Implementation

1. Create `src/app/pages/movie-detail/movie-detail.jsx`:
   - Reads `:id` from the URL via React Router's `useParams`.
   - Calls `useMovieDetails(id)` and `useMovieVideos(id)`.
   - Renders hero (TrailerPlayer in `mode='full'`, with overlay metadata) + prose overview + metadata grid.
2. Create `src/app/pages/movie-detail/metadata-grid.jsx`: small presentational component for the metadata table (director, runtime, genres, year, TMDB score). Uses `font-sans` with tabular numerics.
3. Create `src/app/pages/movie-detail/more-like-this-row.jsx` (optional v1.1): consumes `useByGenre(movie.genreIds[0])`, renders `<Row variant="compact" />`. Wrap in a feature flag (`import.meta.env.VITE_FEATURE_MORE_LIKE_THIS`) so it can be omitted from v1 if it slips.
4. Update `src/app/router.jsx` (spec 08) to point `/movie/:id` at this real page (replacing the placeholder).
5. Add `Esc` keystroke handler at the page root: calls `useNavigate(-1)`. Use a small shared hook `useKeyDown(key, handler)` at `src/shared/lib/use-key-down.js` (will be reused in spec 22).
6. Tests (run through `test-writer`):
   - `src/app/pages/movie-detail/movie-detail.test.jsx`:
     - Renders title + year + director when details loaded.
     - Plays the first YouTube `Trailer`-type video key in mode `'full'` (audio enabled).
     - `Esc` triggers `navigate(-1)`.
     - 404 case: `useMovieDetails` returns `null` → renders the prose error and the link home.
     - Pending > 800 ms swaps from skeleton to text fallback.
   - `src/app/pages/movie-detail/metadata-grid.test.jsx`: renders all rows from a sample `MovieDetails`; gracefully omits empty fields (e.g., when director is null).
7. Manual smoke: click a tile on home → land on `/movie/:id` with the trailer playing audio + metadata visible. `Esc` returns to home. Mobile width: hero stacks above metadata (no horizontal scroll).
8. Run all gates. Commit as `feat: full-bleed trailer page (/movie/:id) with editorial metadata overlay`.

## Success Criteria

1. Clicking a tile on `/` routes to `/movie/:id` and the YouTube trailer autoplays with audio enabled within 1.5 s on a warm cache.
2. Metadata overlay displays title, year, director, runtime, genres, score; missing fields are gracefully omitted.
3. `Esc` keystroke navigates back. The back arrow has the same effect.
4. 404 case (invalid id) renders the prose error + home link, not a blank page or stack trace.
5. The "more like this" row, if shipped, appears below the metadata and is composed of `<Tile variant="compact" />`.
6. No console errors during normal navigation. Network panel shows exactly two TMDB requests on first load (`movie/{id}` + `movie/{id}/videos`); the `usePopular` cache from home is not re-fetched.
7. All tests in this spec pass; `test-writer` confirms style.
8. Mobile width (<640 px) renders hero + metadata stacked; no horizontal overflow.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `fsd-architect` reports zero violations.
