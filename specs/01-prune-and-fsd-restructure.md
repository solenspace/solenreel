# Spec 01 — Prune Netflix branding & restructure into FSD layers

## Goal

Take the imported netflix-clone tree and reshape it into reel's Feature-Sliced Design layout, stripping Netflix-specific branding strings and the Netflix red palette. **No behavior changes.** This spec is a pure structural refactor that every later spec assumes — when it lands, the app still runs exactly like the imported netflix-clone, just under reel's folder shape and a neutral placeholder palette (the real editorial tokens land in spec 07).

## Dependencies

- **Imported state**: `src/`, `public/`, root configs as committed by the import.
- **Context invariants**: `architecture.md` §System Boundaries; `code-standards.md` §"File organization" (FSD layers); `ai-workflow-rules.md` §"Splitting rule" (this spec is intentionally branding+structure only — no auth, no data layer, no schema).
- **Earlier specs**: none (this is spec 01).
- **Agents that gate this spec**: `fsd-architect` (mandatory invocation post-implementation — every imported file moves into a layer, and the layer-direction rule must hold).

## Design Decisions

- **Layer mapping** of imported files (decisions made up-front so the move is mechanical):
  - `src/api/tmdb.js` → `src/shared/api/tmdb.js`
  - `src/utils/truncate.js` → `src/shared/lib/truncate.js`
  - `src/icons/*` → `src/shared/ui/icons/*`
  - `src/components/ui/*` (Button, Input, ErrorBoundary, ErrorFallback, LoadingScreen, SkeletonBanner, SkeletonRow) → `src/shared/ui/*`
  - `src/components/layout/{Footer,Navbar}.jsx` → `src/widgets/{footer,header}/` (one folder per widget; Navbar becomes the header widget)
  - `src/components/movie/MovieCard.jsx` → `src/entities/movie/movie-card.jsx` (entity-level: pure presentational with no feature behavior)
  - `src/components/movie/{Banner,BannerAmbient,MovieRow,MovieModal,TrailerPlayer}.jsx` → `src/widgets/<name>/` or `src/features/<name>/` per their interactivity (Banner/MovieRow → widgets; TrailerPlayer → features/trailer; MovieModal → features/movie-modal)
  - `src/hooks/useDebounce.js` → `src/shared/lib/use-debounce.js`
  - `src/hooks/useMovies.js` → `src/entities/movie/use-movies.js`
  - `src/hooks/useScrolled.js` → `src/shared/lib/use-scrolled.js`
  - `src/features/userSlice.jsx` → `src/entities/user/user-slice.js` (rename `.jsx` → `.js`; it's a Redux slice with no JSX)
  - `src/store/store.js` → `src/app/store.js`
  - `src/layouts/{AppLayout,AuthLayout}.jsx` → `src/app/layouts/`
  - `src/pages/*` → `src/app/pages/*` (route pages are app-layer; no behavioral move yet, just relocation)
  - `src/router.jsx` → `src/app/router.jsx`
  - `src/main.jsx`, `src/App.jsx`, `src/main.css` → stay at `src/` root (Vite entry)
  - `src/assets/avatarPoster.jpg` → `src/shared/assets/avatar-poster.jpg`
- **Naming convention**: kebab-case for new file/folder names (`movie-card.jsx`, not `MovieCard.jsx`). Preserve `App.jsx`/`main.jsx` casing — Vite entry convention.
- **`@/` alias preserved**: still points at `src/`. Components import via `@/widgets/header` etc.
- **No barrel files** introduced. Every move uses concrete paths.
- **Branding strings**: any literal `"Netflix"` in JSX or comments is replaced with `"reel"`; the wordmark logo SVG stays for now (replaced for real in spec 07).
- **`@theme` palette** in `src/main.css` is replaced with neutral grayscale placeholders (`--color-bg`, `--color-ink`, `--color-accent` set to grayscale + a single `#888` accent) so the app still renders without leaking the Netflix red. The real editorial palette lands in spec 07.
- This spec **does not** add JSDoc, change ESLint, add tests, or touch deps. Tooling lands in spec 02; tests land in spec 03.

## Implementation

A concrete file-touched checklist. Every item is a move + import-path update or a literal-string edit. No new logic.

1. Create the FSD skeleton folders: `src/{app,widgets,features,entities,shared}` (and `src/shared/{api,lib,ui,assets}`, `src/shared/ui/icons`).
2. Move imported source per the **Layer mapping** above using `git mv` so history is preserved.
3. After each move, run a project-wide search-and-replace for the old import path → new path (e.g. `from "@/components/ui/Button"` → `from "@/shared/ui/Button"`). The list of import-path renames is exactly the inverse of the move list.
4. Rename `userSlice.jsx` → `user-slice.js`; verify no JSX inside (Redux slice should be pure JS).
5. Replace literal `"Netflix"` strings in JSX/text with `"reel"`. Confirm by `grep -ri "netflix" src/ | grep -v "netflix-clone"` returns no hits in user-facing strings. Comments/imports referencing Netflix internals (e.g. `fetchNetflixOriginals`) are renamed in spec 09.
6. Replace the `@theme` block in `src/main.css` with neutral placeholders:
    ```css
    @theme {
      --color-bg: #0a0a0a;
      --color-bg-elevated: #141414;
      --color-ink: #f5f5f5;
      --color-ink-muted: #a3a3a3;
      --color-border: #262626;
      --color-accent: #888888;
      --color-accent-ink: #0a0a0a;
    }
    ```
   This is a **placeholder** — spec 07 swaps it for the editorial palette.
7. Update any class references in JSX that used Netflix tokens (`bg-red`, `text-red`, etc.) to neutral equivalents (`bg-accent`, `text-accent`). Visual change is acknowledged: red → gray.
8. Update `@/` alias usage everywhere to match the new layer paths.
9. Verify nothing left over: `ls src/components`, `ls src/features`, `ls src/hooks`, `ls src/pages`, `ls src/layouts`, `ls src/api`, `ls src/utils`, `ls src/icons`, `ls src/store` should all error (the folders are gone).
10. Commit as `refactor: prune Netflix branding & restructure src/ into FSD layers`.

## Success Criteria

1. `pnpm dev` boots and renders the imported app at the same routes (`/`, `/search`, `/profile`, `/auth`, `/auth/login`) without runtime errors.
2. `grep -ri "netflix" src/` returns hits only in (a) `fetchNetflixOriginals` API function name (renamed in spec 09) and (b) comments referencing TMDB IDs of Netflix originals; **no user-facing JSX strings** say "Netflix".
3. `find src/components -type f`, `find src/hooks -type f`, `find src/utils -type f`, `find src/icons -type f`, `find src/api -type f`, `find src/layouts -type f`, `find src/features -type f`, `find src/pages -type f`, `find src/store -type f` all return empty (the legacy folders are gone).
4. `find src/{app,widgets,features,entities,shared} -type f` lists every imported source file under its new layer path.
5. Visual smoke test: home view loads, the previously-red accents now render in placeholder gray, no console errors.
6. `fsd-architect` agent invocation reports zero layer-direction violations on the post-restructure tree.
7. `git log --oneline` shows the restructure commit using `git mv` (verifiable by `git log --follow -- <new-path>` showing the old path).
