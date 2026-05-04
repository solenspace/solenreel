# Spec 11 — Home: popular row (cold-start view)

## Goal

Land the cold-start home view: one `Row` of TMDB popular movies, rendered through the `Tile` primitive in grid variant. This is the smallest end-to-end "browse" loop reel ships — every other home-view spec (for-you in spec 18, intent results integration in spec 21) builds on this skeleton.

## Dependencies

- **Spec 09** — `usePopular()` hook returns normalized `Movie[]`.
- **Spec 10** — `Tile` and `Row` primitives.
- **Spec 08** — providers, `<AppLayout>`, header chrome.
- **Spec 07** — tokens + typography in place.
- **Context invariants**: `project-overview.md` §"User goals" (cold-start latency target < 1.5 s warm / < 3 s cold), §"Success criteria"; `ui-context.md` §"Layout patterns" (rows section).
- **Agents that gate this spec**: `test-writer` (page-level smoke).

## Design Decisions

- The home page (`src/app/pages/Home.jsx`, post-spec-01) becomes minimal in v1: a single `<Row title="Popular this week" tiles={...} variant="grid" />`. The Banner / BannerAmbient logic from netflix-clone is **deferred** — it'll resurface as the full-bleed hero in spec 13's `/movie/:id` page, not on home. Home stays calm; tiles do the talking.
- **Loading state**: while `usePopular()` is in `pending`, render a skeleton row (12 placeholder tiles using the existing `SkeletonRow` from netflix-clone, post-spec-01: `src/shared/ui/skeleton-row.jsx`). Skeletons are capped at 800 ms — if data takes longer, swap to the `"reel is loading"` accent message per `ui-context.md`.
- **Error state**: `usePopular()` failure renders the existing `ErrorFallback` (post-spec-01: `src/shared/ui/error-fallback.jsx`) with the prose-first error message: `"the movies aren't loading. trying again."`. The query's `retry: 1` retries once automatically.
- **Tile click**: `onTileClick={(movie) => navigate(\`/movie/${movie.id}\`)}` — routes to the spec-13 page (which is currently a placeholder; this spec wires the navigation).
- **Page document title**: `reel — for you` (will be accurate after spec 18; for now, the title implies "for you" even though it's the popular row, because the page semantically owns the for-you slot).
- **No analytics, no event tracking yet** (spec 15 wires `useClickTracker` into the tile click).
- **No Banner, no MovieModal, no Welcome page Banner-ambient** — these legacy components are not deleted in this spec (kept around in case spec 13 needs to cannibalize them), but they're no longer rendered anywhere. Spec 13 may delete them.

## Implementation

1. Edit `src/app/pages/Home.jsx` (post-spec-01 path):
   - Import `usePopular` from `src/entities/movie/queries.js`.
   - Import `Row` from `src/widgets/row/row.jsx`.
   - Render: error → fallback; pending → skeleton row; success → `<Row title="Popular this week" tiles={data.results} variant="grid" onTileClick={onClick} />`.
   - `onClick` uses React Router's `useNavigate`.
   - Remove imports of Banner, BannerAmbient, MovieRow (legacy) — those mount nothing here now.
2. Update `src/shared/ui/skeleton-row.jsx` (post-spec-01) if needed to match the editorial tile widths (poster aspect 2:3, 192×288 grid variant).
3. Add a small loading-too-long fallback: a custom hook `useLoadingTooLong(isPending, threshold = 800)` at `src/shared/lib/use-loading-too-long.js` — flips a flag after the threshold; the page swaps from skeleton to text fallback when set.
4. Update `<head>` title via React Router's `useDocumentTitle` (or a small helper hook in `src/shared/lib/use-document-title.js`): `'reel — for you'` on home.
5. Tests (run through `test-writer`):
   - `src/app/pages/Home.test.jsx` — using a mocked `usePopular`:
     - pending → `getByTestId('skeleton-row')`.
     - success → tiles render; clicking a tile calls `navigate('/movie/<id>')` (assert via mocked navigate).
     - error → `ErrorFallback` rendered with the prose-first message.
     - pending > 800 ms → swaps to `"reel is loading"` text.
6. Run all gates. Manual smoke: cold-load the home page; the popular row appears within target latency; clicking a tile routes to `/movie/<id>` (placeholder content from spec 08 still).
7. Commit as `feat: home page renders popular row via Tile/Row primitives`.

## Success Criteria

1. `/` renders one Row titled `"Popular this week"` with 20 popular movies (TMDB default page size).
2. Cold-load latency on a typical home connection: home view + first row of tiles paint < 1.5 s warm, < 3 s cold (Lighthouse perf check or manual stopwatch on dev build is acceptable evidence).
3. Pending state shows a skeleton row; if pending exceeds 800 ms, the skeleton swaps to `"reel is loading"` text in `--color-accent` (matte purple `#b69ad8`).
4. Error state shows `ErrorFallback` with `"the movies aren't loading. trying again."` and a single retry button.
5. Clicking any tile routes to `/movie/<id>` (the spec-08 placeholder).
6. The Banner / BannerAmbient / legacy MovieRow imports are gone from `Home.jsx` (`grep "Banner\|MovieRow" src/app/pages/Home.jsx` → 0 hits).
7. Document title on home reads `reel — for you`.
8. All tests in this spec pass.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `fsd-architect` reports zero violations.

## Agents & Skills

**Agents (mandatory invocation):**

- `test-writer` — runs at step 5 for the Home page tests. Validates pending/success/error/long-pending branches as parameterized cases.

**Skills (consulted by the agents during this spec):**

- `.claude/skills/vercel-react-best-practices/rules/async-suspense-boundaries.md` — informs whether to use Suspense or imperative pending-state branching (this spec stays imperative for the long-pending swap).
- `.claude/skills/vercel-react-best-practices/rules/bundle-defer-third-party.md` — keeps the home page bundle small.

**Notes:**

- No `fsd-architect` here unless the consumer refactor introduces drift.
- No `prompt-engineer` here.
