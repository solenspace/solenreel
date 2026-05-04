# Spec 09 — TMDB data layer

## Goal

Land the TMDB data access pattern reel uses for the rest of its life: a singleton TMDB client, JSDoc-typed `Movie` and related entities, and a small, stable set of TanStack Query hooks (`useTrending`, `usePopular`, `useTopRated`, `useByGenre`, `useMovieDetails`, `useMovieVideos`, `useSearchMulti`). After this spec, every component reads movies through these hooks; nothing in the codebase calls `axios` against TMDB directly.

## Dependencies

- **Spec 01** — `src/api/tmdb.js` was relocated to `src/shared/api/tmdb.js` already.
- **Spec 02** — JSDoc + lint enforce no direct `axios` calls except inside the singleton.
- **Spec 03** — Vitest harness + query wrapper helper for testing hooks.
- **Spec 08** — `QueryClientProvider` is mounted once at the providers tree.
- **Context invariants**: `architecture.md` §"Stack", §"Invariants" 3, 10, 11.
- **Agents that gate this spec**: `fsd-architect` (single TMDB client, no `useEffect` + fetch).

## Design Decisions

- **Single TMDB client** at `src/shared/api/tmdb.js`. Keeps the existing 9 endpoints from netflix-clone but renames Netflix-specific function names to neutral movie/TV terms:
  - `fetchNetflixOriginals` → `fetchOriginals` (internally still queries the same TMDB endpoint via the documented Netflix discover filter — the function-name leak is fixed; the API contract is unchanged).
  - All other names from netflix-clone stay (they were already neutral: `fetchTrending`, `fetchPopular`, `fetchTopRated`, `fetchByGenre`, `fetchMovieDetails`, `fetchTVDetails`, `searchMulti`, `fetchMovieImages`, `fetchMovieVideos`).
- **`Movie` entity** typedef at `src/entities/movie/types.js`:
  ```js
  /**
   * @typedef {object} Movie
   * @property {number} id
   * @property {string} title
   * @property {string} originalTitle
   * @property {string} releaseDate          // 'YYYY-MM-DD'
   * @property {number} year                 // derived
   * @property {string|null} posterPath
   * @property {string|null} backdropPath
   * @property {number[]} genreIds
   * @property {number} voteAverage          // 0..10
   * @property {string} overview
   * @property {string|null} tagline
   * @property {number|null} runtime         // minutes; only on details
   * @property {string|null} director        // only on details (from credits)
   * @property {string[]} moodTags           // populated by spec 18 LLM (empty here)
   */
  ```
  Plus typedefs for `MovieDetails` (extends `Movie` with credits, videos), `Video` (`{ key, site, type, name }`), and `TmdbResponse<T>` (`{ page, results, total_pages, total_results }`).
- **Mapping layer**: TMDB raw responses are normalized to `Movie` shape inside the client (camelCase, `year` derived, `posterPath` already prefixed with the image base URL helper). Components see normalized shapes only.
- **TanStack Query hooks** at `src/entities/movie/queries.js`:
  - Each hook is a thin wrapper around `useQuery` with a stable query key tuple: `['tmdb', '<resource>', ...args]`.
  - Defaults: `staleTime: 5 * 60_000`, `gcTime: 30 * 60_000`. Per-hook overrides allowed via an options arg.
  - Hooks: `useTrending(window?)`, `usePopular(page?)`, `useTopRated(page?)`, `useByGenre(genreId, page?)`, `useMovieDetails(id)`, `useMovieVideos(id)`, `useSearchMulti(query)`. The Originals one stays as a function call without a hook (used by the legacy Banner; fades out by spec 11).
  - `useSearchMulti` debounces internally via `useDebounce` (post-spec-01 path: `src/shared/lib/use-debounce.js`).
- **Image URL helpers** stay in the client: `posterUrl(path, size?)`, `backdropUrl(path, size?)`. `size` defaults to `'w342'` for posters and `'original'` for backdrops; sizes documented in `src/shared/api/tmdb.js` JSDoc.
- **Genres** map (`genreIdsToNames`) is exported alongside the helpers for tile metadata rendering.
- **No `useEffect` + `fetch`** anywhere. Lint rule from spec 02 enforces.
- **Migration of existing pages**: `Home`, `Search`, `Banner`, `MovieRow`, `MovieCard`, `MovieModal` switch from direct `tmdb.js` function calls to the new hooks. `useMovies` (post-spec-01: `src/entities/movie/use-movies.js`) is replaced by these hooks and **deleted** — it was a thin wrapper that the typed hooks supersede.

## Implementation

1. Edit `src/shared/api/tmdb.js`:
   - Rename `fetchNetflixOriginals` → `fetchOriginals`. Update the docstring to remove "Netflix" reference; the underlying TMDB query stays.
   - Add the normalization layer: each `fetch*` returns `{ ...normalizedTmdbResponse }` with results mapped to `Movie` shape. Helper `mapMovie(raw)` does the field mapping; `mapDetails(raw)` extends it with credits + videos.
   - Add JSDoc to every exported function.
   - Keep `axios` instance creation here. Lint rule (spec 02) restricts `axios` imports outside this file — verify it's still tight.
2. Create `src/entities/movie/types.js` with `Movie`, `MovieDetails`, `Video`, `TmdbResponse` typedefs.
3. Create `src/entities/movie/queries.js` with the seven hooks. Each hook: name, query key, fetcher, default options.
4. Delete `src/entities/movie/use-movies.js` (post-spec-01 location); migrate consumers to the new typed hooks.
5. Refactor consumers:
   - `src/widgets/banner/banner.jsx` — uses `useTrending` (was: direct `fetchTrending`).
   - `src/widgets/movie-row/movie-row.jsx` — accepts a `useQuery` result as a prop or uses one of the typed hooks based on category.
   - `src/entities/movie/movie-card.jsx` — typed by `Movie`.
   - `src/features/movie-modal/movie-modal.jsx` — uses `useMovieDetails(id)` + `useMovieVideos(id)`.
   - `src/app/pages/Search.jsx` — uses `useSearchMulti(query)` with the existing debounce.
6. Add tests (run through `test-writer`):
   - `src/shared/api/tmdb.test.js` — parameterized: each `fetch*` function returns the expected normalized shape on a mocked axios response; `posterUrl(null)` returns `null`; `genreIdsToNames([28])` returns `['Action']`.
   - `src/entities/movie/queries.test.jsx` — using `renderHook` + a fresh `QueryClient`, each hook fires the right query key and surfaces the normalized data; loading and error states work.
7. Run all gates. Manual smoke: home/search routes still render movies after the refactor.
8. Commit as `feat: TMDB data layer (normalized Movie entity + typed query hooks)`.

## Success Criteria

1. `grep -r "axios" src/` returns hits only inside `src/shared/api/tmdb.js`. (Other files use the typed hooks.)
2. `grep -r "useEffect" src/ | grep -i "fetch"` returns zero hits — no fetching in effects.
3. Every consumer that used to call `fetchTrending`, `fetchPopular`, etc., now uses a typed hook from `src/entities/movie/queries.js` (verifiable: `grep -r "from \"@/shared/api/tmdb\"" src/` shows imports only inside `queries.js` and `tmdb.test.js`).
4. The `Movie` typedef is shared and imported wherever a movie is consumed; no per-component duplicate typedefs (`grep -r "@typedef.*Movie\b" src/` shows one declaration in `entities/movie/types.js` and only `@type {Movie}` consumers elsewhere).
5. `useSearchMulti` debounces — typing fast does not produce one TMDB request per keystroke (verifiable in network tab during manual smoke or via test that asserts the fetcher was called only after debounce delay).
6. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green.
7. Bundle size for the data layer code stays modest; no spike from importing TanStack Query a second time.
8. `fsd-architect` reports zero violations.

## Agents & Skills

**Agents (mandatory invocation):**

- `fsd-architect` — verifies the single TMDB-client invariant (axios only inside `src/shared/api/tmdb.js`) and the no-fetch-in-useEffect rule. Run after step 5 (consumer refactor).
- `test-writer` — runs at step 6 for the two test files (tmdb.test, queries.test). Validates parameterized-over-endpoint tests + the `useDebounce` assertion in `useSearchMulti`.

**Skills (consulted by the agents during this spec):**

- `.claude/skills/vercel-react-best-practices/rules/client-swr-dedup.md` — drives query-key conventions and de-duplication strategy.
- `.claude/skills/vercel-react-best-practices/rules/async-parallel.md` — informs how multiple TMDB calls can be parallelized via `Promise.all` inside details fetching.
- `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md` — keeps imports concrete (no barrel re-exports).

**Notes:**

- No `prompt-engineer` here.
- TanStack Query v5 confirmed: `gcTime` (formerly `cacheTime`), `useQueries` for parallel fetches, `queryClient.invalidateQueries({ queryKey })` for invalidation.
