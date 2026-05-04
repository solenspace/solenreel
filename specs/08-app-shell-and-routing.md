# Spec 08 — App shell & routing

## Goal

Reorganize the app shell — providers, layout chrome, header, route map — to reel's structure. After this spec, every route lives in the right place, the header is the editorial chrome (logo wordmark + navigation + search-bar slot for spec 20), and providers (`QueryClientProvider`, Redux `Provider`, auth subscription) are mounted at the right boundary. The route map adds `/movie/:id` for the full-bleed trailer page (spec 13) and keeps `/`, `/search`, `/profile`, `/auth`, `/auth/login` from netflix-clone.

## Dependencies

- **Spec 01** — FSD layout, `src/app/` exists.
- **Spec 02 / 03** — gates green.
- **Spec 05** — Supabase auth thunks + `useAuthSession` hook.
- **Spec 07** — editorial tokens; the chrome looks right only after this lands.
- **Context invariants**: `ui-context.md` §"Layout patterns" (header chrome, route map), §"Voice"; `code-standards.md` §"File organization".
- **Agents that gate this spec**: `fsd-architect` (router and providers must be in `src/app/`; widgets cannot import features sideways).

## Design Decisions

- **Single providers tree** at `src/app/providers.jsx`:
    ```
    <ReduxProvider>
      <QueryClientProvider>
        <AuthSessionGate>
          {children}
        </AuthSessionGate>
      </QueryClientProvider>
    </ReduxProvider>
    ```
  `AuthSessionGate` mounts `useAuthSession` once and renders nothing extra; it's the canonical "subscribe to Supabase auth" boundary.
- **`QueryClient` config**: `staleTime: 5 * 60_000` (catalogue data), `retry: 1`, `refetchOnWindowFocus: false` (carry-over from netflix-clone). Single client per browser session.
- **Routes** (post-spec-08):
  - `/` — Home (cold-start view; popular row in spec 11; for-you row added in spec 18).
  - `/search` — Search page (intent results land in spec 21).
  - `/movie/:id` — full-bleed trailer page (drafted in spec 13; route exists here).
  - `/profile` — profile page (kept; no new behavior).
  - `/auth` — Welcome.
  - `/auth/login` — Login.
- **Lazy routes preserved**: `lazy` + `Suspense` with `LoadingScreen` fallback (already in netflix-clone). Route bundles remain split.
- **Header (`widgets/header`)** has three slots, left → right:
  1. Wordmark `reel` (display serif, no logo SVG yet — placeholder lockup until brand identity is decided).
  2. Nav links: `For you` (route to `/`), `Search` (route to `/search`), `Profile` (route to `/profile`, gated by session).
  3. Search-bar slot — empty placeholder; populated in spec 20. Header reserves the space so layout doesn't shift when the bar lands.
- **Footer** (`widgets/footer`): minimal, single line — `made with reel · TMDB attribution`. No social links, no policy links in v1.
- **Authenticated vs unauthenticated layouts**:
  - `AppLayout` wraps every route inside `(auth)` — header + main + footer; redirects to `/auth/login` if no session.
  - `AuthLayout` wraps `/auth/*` — minimal (no header), centered card. The Login page renders inside this.
- **Active-route highlight**: nav link uses accent color when `pathname` matches its route base. Implemented via React Router's `NavLink`.

## Implementation

1. Create `src/app/providers.jsx` exporting `<AppProviders>` that composes `ReduxProvider`, `QueryClientProvider`, `AuthSessionGate`.
2. Create `src/app/auth-session-gate.jsx`: small wrapper that calls `useAuthSession` (spec 05) once and renders `children`.
3. Refactor `src/main.jsx` to mount `<AppProviders><App /></AppProviders>`. The QueryClient instance is created once at module scope inside `providers.jsx`.
4. Refactor `src/app/router.jsx` (post-spec-01 rename) to declare the new route map. Add `/movie/:id` (lazy-loaded, points at a placeholder component that says `// TODO: spec 13` — this is acceptable in this spec since it's a routing scaffold; a non-empty placeholder, not an empty file).
5. Reshape `widgets/header` (post-spec-01 from `Navbar`):
   - Remove Netflix branding remnants.
   - Add wordmark, nav (using `NavLink`), search-bar slot.
   - Use `font-display` for the wordmark, `font-sans` for nav.
6. Reshape `widgets/footer`: single-line minimal footer per `ui-context.md` voice.
7. Update `src/app/layouts/AppLayout.jsx`:
   - Mount `<Header /><main>{children}</main><Footer />`.
   - Replace any Firebase-era session check (already done in spec 05; double-check).
8. Update `src/app/layouts/AuthLayout.jsx`:
   - Centered card chrome only; no header/footer.
   - Apply background gradient or muted treatment from `ui-context.md` if useful.
9. Verify nav active-state highlighting: clicking each nav link routes correctly; the active link is colored with `--color-accent`.
10. Tests (run through `test-writer`):
    - `src/app/router.test.jsx` — parameterized: visiting each route renders the expected page; visiting `/profile` while signed-out redirects to `/auth/login`; visiting `/auth/login` while signed-in redirects to `/`.
    - `src/widgets/header/header.test.jsx` — renders three slots; `NavLink` active state applies on the right route.
    - `src/app/providers.test.jsx` — renders without throwing; `useQueryClient()` inside a child returns the singleton.
11. Run all gates. Manual smoke: walk every route, confirm chrome is consistent and active-state works.
12. Commit as `feat: app shell, providers tree, editorial header, /movie/:id route stub`.

## Success Criteria

1. Route map matches the table above; visiting each route renders the expected page; `/movie/:id` renders the placeholder ("Trailer page — landing in spec 13").
2. Auth-gated routes redirect correctly (signed-out user on `/profile` → `/auth/login`; signed-in user on `/auth/login` → `/`).
3. Header shows three slots (wordmark, nav, search slot); search slot is empty but reserves space (no layout shift when filled in spec 20).
4. `NavLink` active state colors the active route in `--color-accent` (`#b69ad8` matte purple).
5. There is exactly one `QueryClient` instance per browser session: `new QueryClient(...)` appears once in `src/app/providers.jsx` and nowhere else (`grep -r "new QueryClient" src/` → 1 hit).
6. `useAuthSession` is mounted exactly once via `AuthSessionGate`. `grep -r "useAuthSession" src/` shows the mount in `auth-session-gate.jsx` and read-only consumers elsewhere.
7. All tests in this spec pass; `test-writer` confirms style.
8. `fsd-architect` reports zero violations: providers and router live in `src/app/`; widgets/header consumes only `entities/user` (for the session-gated profile link), not features.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green.

## Agents & Skills

**Agents (mandatory invocation):**
- `fsd-architect` — runs after step 1 (providers tree) and step 4 (router refactor) to validate `app/` layer ownership of routing/providers and the absence of widgets→features sideways imports.
- `test-writer` — runs at step 10 for the three test files. Validates the redirect tests use the canonical `<MemoryRouter>` wrapper, not real navigation.

**Skills (consulted by the agents during this spec):**
- `.claude/skills/web-design-guidelines/SKILL.md` — chrome / navigation density, the "single accent per viewport" rule.
- `.claude/skills/vercel-composition-patterns/rules/architecture-compound-components.md` — informs the providers tree shape (`<AppProviders>` composing children, no prop drilling).
- `.claude/skills/vercel-react-best-practices/rules/advanced-init-once.md` — drives the single-`QueryClient`-per-session invariant.

**Notes:**
- No `prompt-engineer` here.
- `useAuthSession` is mounted exactly once (via `AuthSessionGate`), validated in success criteria 6.
