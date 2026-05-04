# reel — Code Standards

## Language & types

- **JavaScript with JSDoc.** No TypeScript source files in v1.
- Every file starts with `// @ts-check`.
- A `tsconfig.json` at the repo root sets `checkJs: true`, `strict: true`, `noEmit: true`. The verification gate `pnpm typecheck` runs `tsc --noEmit`; failures block merge.
- Every exported function and component has a JSDoc block declaring `@param` types and `@returns`. Object shapes use `@typedef`.
- Prefer literal-typed unions in JSDoc (`'literal' | 'intent'`) over generic `string` where the value is constrained.

## React

- **Function components only.** No class components.
- Hooks at the top of the component body, in the order: `useId` / `useRef` / `useState` / `useReducer` / `useContext` / `useQuery` / `useMutation` / `useEffect` / `useMemo` / `useCallback`.
- No conditional hook calls.
- `useEffect` is reserved for synchronizing with non-React systems (browser APIs, subscriptions). Server fetches do not go in `useEffect`.
- `useMemo` / `useCallback` are added only when consumed by a memoized child or genuinely expensive — not by reflex.

## Feature-Sliced Design (FSD)

Layer order, lowest to highest:

```
shared/   ← reusable primitives, api clients, utils, ui kit
entities/ ← domain models (movie, user, event)
features/ ← interactive units (intent-search, click-tracker, trailer-tile)
widgets/  ← composite blocks assembled from features (home-row, header)
app/      ← routing, providers, layout
```

Imports flow upward only. `shared/` cannot import from `entities/`; `entities/` cannot import from `features/`; etc. Sideways imports between siblings (e.g. `features/A` → `features/B`) are forbidden — extract to a lower layer.

No barrel files (`index.js` re-exports) inside `features/`, `entities/`, or `widgets/`. Import from concrete modules so deps are visible at the import site.

## Data fetching

- **Server state**: TanStack Query for every fetch (`useQuery`/`useMutation`/`useInfiniteQuery`). Each query key starts with the resource: `['tmdb', 'movie', id]`, `['supabase', 'events', userId]`.
- **Auth state**: Supabase auth helpers (`supabase.auth.getSession()`, `onAuthStateChange`). Never read tokens from `localStorage` directly.
- **HTTP client**: `axios` is wrapped in `src/shared/api/tmdb.js` (TMDB) and used through the Supabase client (no direct axios for Supabase). No file outside `src/shared/api/` imports `axios`.
- **No fetch-in-useEffect**.

## Styling

- Tailwind v4 with design tokens declared as CSS variables in `src/app/globals.css`. Tokens drive `ui-context.md`'s palette.
- Utility classes are the default. `@apply` is reserved for genuinely repeated patterns inside `components/ui/`.
- No inline `style={...}` except for dynamic transforms (e.g. computed translateX on a slider).
- No CSS-in-JS libraries. No styled-components.
- Custom CSS lives in `src/app/globals.css`; no per-component `.css` files unless absolutely needed.

## File organization (concrete)

```
src/
├── app/
│   ├── App.jsx              # router root
│   ├── providers.jsx        # QueryClientProvider, ReduxProvider, AuthProvider
│   ├── routes.jsx
│   └── globals.css
├── widgets/
│   ├── home-row/
│   ├── header/
│   └── search-bar/
├── features/
│   ├── intent-search/
│   ├── click-tracker/
│   ├── recommendation-row/
│   └── trailer-tile/
├── entities/
│   ├── movie/
│   ├── user/
│   └── event/
├── shared/
│   ├── api/
│   │   ├── supabase.js      # singleton Supabase client
│   │   ├── tmdb.js          # singleton TMDB axios client
│   │   └── edge.js          # helpers for invoking Edge Functions
│   ├── lib/
│   │   ├── intent-mode.js   # heuristic for detecting intent vs literal queries
│   │   └── format.js
│   └── ui/                  # primitive components: Button, Input, Tile shell
└── components/ui/           # any installed primitives — protected, do not edit by hand

supabase/
├── migrations/              # numbered SQL migrations — protected, append-only
├── functions/
│   ├── recommendations/
│   └── intent-search/
└── config.toml
```

## Linting & formatting

- ESLint flat config (already in netflix-clone) with `react-hooks` and `import` plugins; the import-direction rule encodes FSD.
- Prettier with Tailwind plugin for class-name sorting.
- No unused exports. The lint gate fails on dead exports (`eslint-plugin-unused-imports`).
- `console.log` is allowed in dev only; production build strips it.

## Auth & secrets

- The Supabase **anon key** is `VITE_SUPABASE_ANON_KEY` and is safe to ship in the bundle.
- The TMDB API key is `VITE_TMDB_API_KEY` and is also safe to ship (TMDB intends it to be public).
- The Supabase **service role key** is used only inside Edge Functions; never in `src/`.
- The OpenRouter API key is used only inside Edge Functions; never in `src/`. Lint rule (custom or pattern-based) flags any `OPENROUTER_*` reference under `src/`.

## Verification gates (every spec must pass)

1. `pnpm typecheck` — `tsc --noEmit` over JSDoc-annotated JS.
2. `pnpm lint` — ESLint + Prettier check.
3. `pnpm test` — Vitest unit tests.
4. `pnpm build` — Vite production build succeeds.
5. Manual smoke test against the running `pnpm dev` server for any UI-touching change.

A spec is **not done** until all five gates pass on the spec's branch.
