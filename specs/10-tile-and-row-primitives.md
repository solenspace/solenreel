# Spec 10 — Tile & Row primitives

## Goal

Replace the netflix-clone's `MovieCard` and `MovieRow` with reel's editorial tile (list + grid variants) and a `Row` primitive that handles horizontal scroll snap, row title, optional accent badge slot. After this spec, every movie surface in the app — popular row (spec 11), for-you row (spec 18), intent results (spec 21) — renders through these two primitives.

## Dependencies

- **Spec 07** — editorial tokens (palette, typography) drive every visual decision here.
- **Spec 09** — `Movie` typedef + image helpers; tiles consume the normalized shape.
- **Specs 02 / 03** — gates green; tests run.
- **Spec 08** — providers tree mounted; tiles render inside `<AppLayout>`.
- **Context invariants**: `ui-context.md` §"Density", §"Layout patterns", §"Voice".
- **Skills**: `web-design-guidelines`, `vercel-composition-patterns` (compound-component pattern for variants).
- **Agents that gate this spec**: `fsd-architect` (tile is in `entities/movie/`, not in `features/`; row is in `widgets/`); `test-writer`.

## Design Decisions

- **`Tile`** lives at `src/entities/movie/tile.jsx`. Pure presentational — props in, JSX out. No data fetching, no event tracking yet (spec 15 wires it).
- **Variants** via a `variant` prop:
  - `'grid'` (default): poster (192×288 px) + title + year on a single line.
  - `'list'`: poster (48×72 px) + title + metadata row (year · director · runtime) + 3 mood tags + score.
  - `'compact'`: poster (96×144 px) + title only — for rec-row carousels where space is tight.
- Compound-component shape (per `vercel-composition-patterns`):
    ```jsx
    <Tile movie={m} variant="list" onClick={...}>
      <Tile.Poster /> <Tile.Body>
        <Tile.Title /> <Tile.Meta /> <Tile.MoodTags /> <Tile.Score />
      </Tile.Body>
    </Tile>
    ```
  Default sub-components are rendered if the children prop is omitted; consumers can override individual slots when they need to (e.g., the for-you row replaces `<Tile.Score />` with a `<Tile.Reasoning />` line in spec 18).
- **`Row`** lives at `src/widgets/row/row.jsx`. Composes:
  - Title (display serif, 24 px) + optional caption (Inter, 13 px, muted) + optional accent badge slot (used by for-you row).
  - Horizontal scroll container with CSS scroll-snap (`scroll-snap-type: x mandatory`, `scroll-snap-align: start` on each tile).
  - Keyboard nav: arrow keys move focus across tiles when focus is inside the row (a11y polish in spec 22, but the focus surface is set up now).
  - Lazy rendering: only the first 12 tiles render eagerly; the rest mount on scroll-into-view via the `IntersectionObserver` stub (spec 03 setup, spec 12 enforced for trailers).
- **Mood tags & director** are not yet populated: the `Movie` typedef has the fields but they're empty strings/arrays from TMDB at this point. Tile renders gracefully when those fields are empty (omits the row instead of showing "·  · ").
- **Tabular numerics** for year + runtime (already enabled globally in spec 07's `@layer base`).
- **No animation on hover yet** — spec 12 adds the trailer hover. Tile here has only a subtle 100 ms `bg-elevated` hover state.
- **Accessible defaults**: tile is a `<button>` element when `onClick` is provided, an `<article>` when not. Focus ring is the global one from spec 07.
- **Replaces but does not delete the legacy `MovieCard`/`MovieRow` files immediately.** This spec migrates every consumer; the legacy files are removed at the end of the migration as a single deletion commit step. (The migration must be complete before the files are deleted — verified by the success criteria.)

## Implementation

1. Create `src/entities/movie/tile.jsx`:
   - Default export `Tile` with `Tile.Poster`, `Tile.Body`, `Tile.Title`, `Tile.Meta`, `Tile.MoodTags`, `Tile.Score`, `Tile.Reasoning` (placeholder; spec 18 wires it for AI reasoning).
   - Variant logic via a `tileVariants` map keyed by `'grid'|'list'|'compact'`.
   - `JSDoc @typedef`-imports `Movie`.
2. Create `src/widgets/row/row.jsx`:
   - Props: `title`, `caption?`, `badge?` (slot), `tiles[]`, `variant='grid'|'list'|'compact'`, `onTileClick?`.
   - Implements scroll-snap container.
   - Lazy-mounts tiles past index 12 via `IntersectionObserver`.
3. Migrate consumers:
   - Anywhere `MovieCard` is rendered → render `<Tile movie={m} />`.
   - Anywhere `MovieRow` is rendered → render `<Row title={...} tiles={...} />`.
   - Specifically: home page, search results page, profile page (if it lists watched movies), banner ambient → keep banner as-is (spec 13 reshapes it for full-bleed trailer; banner is not a tile/row).
4. Delete the legacy files **only after every consumer is migrated and tests pass**:
   - `src/entities/movie/movie-card.jsx` (post-spec-01 path) — delete.
   - `src/widgets/movie-row/movie-row.jsx` — delete.
   - Update any remaining imports that reference them (none should remain).
5. Tests (run through `test-writer`):
   - `src/entities/movie/tile.test.jsx` — parameterized over variants: renders all expected sub-elements per variant; omits empty mood-tag and director rows; calls `onClick` when clicked; renders as `<button>` when `onClick` provided.
   - `src/widgets/row/row.test.jsx` — renders title + tiles; scroll-snap container has the expected CSS class; only first 12 tiles render eagerly (assert by `screen.queryAllByRole('button').length` ≤ 12 + 12 placeholders).
6. Update Storybook-style dev page at `src/app/pages/_dev/tile-gallery.jsx` (dev-only) — renders all three tile variants with mock data, useful for visual review.
7. Run all gates. Manual smoke: walk every route with movie surfaces, confirm tiles + rows render correctly, scroll-snap feels right.
8. Commit as `feat: editorial Tile + Row primitives (grid/list/compact); legacy MovieCard/Row removed`.

## Success Criteria

1. `Tile` renders all three variants without error; for the `list` variant, every metadata row appears when data is present, gracefully omits when empty.
2. Compound-component slot override works: passing `<Tile.Score>{customNode}</Tile.Score>` as a child replaces the default score slot.
3. `Row` scrolls horizontally with snap behavior verified manually on desktop and mobile widths.
4. The legacy `MovieCard` and `MovieRow` files are deleted; `grep -r "MovieCard\|MovieRow" src/` returns zero hits.
5. Lazy rendering: in a row of 30 tiles, only 12 render in the DOM until the user scrolls right (verifiable by inspecting `document.querySelectorAll('[data-tile]').length` before and after scroll).
6. Keyboard nav: focusing a tile and pressing arrow-right moves focus to the next tile (basic; full polish in spec 22).
7. All tests in this spec pass; `test-writer` confirms style.
8. `fsd-architect` reports zero violations.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green.

## Agents & Skills

**Agents (mandatory invocation):**
- `fsd-architect` — verifies `Tile` lives in `entities/movie/`, `Row` lives in `widgets/`, neither imports from features. Run after step 4 (legacy-file deletion).
- `test-writer` — runs at step 5 for tile and row tests. Validates parameterized-over-variant tests for `Tile`; validates lazy-render assertion in `Row` (only 12 tiles eagerly mounted).

**Skills (consulted by the agents during this spec):**
- **`.claude/skills/vercel-composition-patterns/rules/architecture-compound-components.md`** — drives the `<Tile.Slot />` API design (this is the spec where compound components are introduced).
- `.claude/skills/vercel-composition-patterns/rules/patterns-explicit-variants.md` — informs `variant='grid'|'list'|'compact'` over a stack of boolean props.
- `.claude/skills/vercel-composition-patterns/rules/architecture-avoid-boolean-props.md` — same direction.
- `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md` — informs the keyboard-nav handler in `Row`.
- `.claude/skills/web-design-guidelines/SKILL.md` — density rules from `ui-context.md` derive from this skill.

**Notes:**
- No `prompt-engineer` here.
- The accent badge slot on `Row` (used by spec 18 For You row) renders matte purple per `ui-context.md`.
