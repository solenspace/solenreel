# Spec 04 — Supabase foundation

## Goal

Stand up the Supabase project that reel uses for auth, data, and Edge Functions. After this spec, the project exists in the Supabase dashboard, env wiring is documented, the singleton Supabase client is the only entry point for the rest of the codebase, and the Supabase CLI is installed and linked. **No schema, no auth swap yet** — this spec is plumbing only.

## Dependencies

- **Spec 01** — FSD tree, `src/shared/api/` exists.
- **Spec 02** — typecheck/lint gates pass (the new client file must satisfy them).
- **Spec 03** — Vitest harness (the client gets a basic smoke test using a mocked module).
- **Context invariants**: `architecture.md` §"Stack", §"Storage model", §"Invariants" 1, 2, 3, 9; `code-standards.md` §"Auth & secrets".
- **Agents that gate this spec**: `fsd-architect` (verifies single-client invariant — only `src/shared/api/supabase.js` references `@supabase/supabase-js`).

## Design Decisions

- **Free-tier Supabase project**, region nearest the user. Created via the Supabase dashboard (manual step documented in this spec, **not** scripted — project creation is a one-time operation tied to an account).
- **Two env files**:
  - `.env.example` — committed; documents required keys with placeholder values.
  - `.env.local` — gitignored (already covered by `.gitignore`); contains real values for local dev.
- **Required env vars**:
  - `VITE_SUPABASE_URL` — public-readable; lives in the bundle.
  - `VITE_SUPABASE_ANON_KEY` — public-readable; lives in the bundle.
  - `VITE_TMDB_API_KEY` — public-readable per TMDB's intent; carried over from netflix-clone.
  - `SUPABASE_SERVICE_ROLE_KEY` — Edge-Function-only, never in the bundle. Set via `pnpx supabase secrets set --env-file .env.functions` (a separate, gitignored env file under `supabase/`).
  - `OPENROUTER_API_KEY` — Edge-Function-only, also set via `pnpx supabase secrets set`. Reading this from `src/` is a defect (enforced in spec 19).
  - `OPENROUTER_MODEL` — Edge-Function-only env variable. Locked v1 value: `openai/gpt-oss-20b:free` (131K context, $0/M tokens, structured outputs supported per OpenRouter model registry as of 2026-05-04).
- **Singleton client** at `src/shared/api/supabase.js` exports a single `supabase` object. The whole codebase imports from there. Any other file that imports `@supabase/supabase-js` is a defect (`fsd-architect` enforces).
- **Supabase CLI** installed as a devDependency (`supabase` package on npm). Local dev uses `supabase link` to bind the repo to the project.
- **`supabase/` folder at repo root**: created by `supabase init`. Contents: `config.toml`, `migrations/` (empty in this spec — populated in spec 06), `functions/` (empty — populated in spec 17). `supabase/.temp/` and `supabase/.branches/` are gitignored.
- **Auth helpers**: `src/shared/api/supabase.js` exports `supabase.auth` directly. There is no second wrapper; calling code uses the official API. (A thin `useAuthSession` hook is added during spec 05 — not here.)
- **JSDoc typedef** for the client at `src/shared/types/supabase.js` — initially a placeholder, regenerated to a real `Database` typedef in spec 06 once tables exist. The placeholder is a single-line `@typedef {import('@supabase/supabase-js').SupabaseClient} SupabaseClient`.

## Implementation

1. **Manual prerequisite (documented, not scripted)**: create a free-tier Supabase project at https://supabase.com/dashboard. Capture the project URL and anon key.
2. Add devDependencies: `supabase` (CLI). Add runtime dependency: `@supabase/supabase-js`.
3. Run `pnpx supabase init` at repo root to create the `supabase/` folder; commit `supabase/config.toml` and `supabase/.gitignore` (CLI-generated).
4. Run `pnpx supabase link --project-ref <ref>` (instructions in `.env.example` comments).
5. Create `.env.example` with the five vars listed above, each commented with a one-liner: where to find the value, public-vs-private, and a non-secret placeholder.
6. Create `.env.local` (gitignored) with the real local-dev values; do not commit.
7. Create `src/shared/api/supabase.js`:
   - Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `import.meta.env`.
   - Throws a clear error at module-load time if either is missing (fail fast, don't silently use `undefined`).
   - Calls `createClient` once and exports the singleton.
   - JSDoc-typed with the placeholder typedef.
8. Create `src/shared/types/supabase.js` with the placeholder typedef.
9. Add a smoke test at `src/shared/api/supabase.test.jsx` that verifies the client is constructed and that throwing on missing env vars works. Mocks `@supabase/supabase-js`'s `createClient`.
10. Update `eslint.config.js` to add a custom restriction: any import of `@supabase/supabase-js` outside `src/shared/api/supabase.js` is a `no-restricted-imports` error.
11. Run gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Manual smoke: `pnpm dev` boots without runtime errors (the client is imported but not used yet — module load succeeds).
12. Commit as `feat: supabase project + singleton client + env scaffolding`.

## Success Criteria

1. The Supabase project exists; `pnpx supabase status` (after `supabase link`) reports it linked.
2. `.env.example` is committed; `.env.local` is **not** committed (`git ls-files .env.local` is empty).
3. `pnpm dev` boots; if `VITE_SUPABASE_URL` is unset (rename `.env.local` to test), boot fails with the explicit "missing env var" error message — not a silent `undefined` crash.
4. The codebase has exactly one import of `@supabase/supabase-js`: in `src/shared/api/supabase.js`. Verifiable: `grep -r "@supabase/supabase-js" src/ | wc -l` → `1`.
5. Adding a second import elsewhere (e.g., `src/widgets/header/index.jsx`) makes `pnpm lint` fail with the no-restricted-imports rule.
6. `supabase/` folder exists with `config.toml`; `migrations/` and `functions/` exist and are empty.
7. `pnpm test` passes including the new `supabase.test.jsx`.
8. `fsd-architect` reports zero violations of the single-Supabase-client invariant.

## Agents & Skills

**Agents (mandatory invocation):**
- `fsd-architect` — verifies the single-Supabase-client invariant after step 7 (client created) and step 10 (lint rule encoded). Reads its source-of-truth context from `architecture.md` §"Invariants" 9.

**Skills (consulted by the agents during this spec):**
- `.claude/skills/vercel-react-best-practices/rules/bundle-defer-third-party.md` — informs how the Supabase client is initialized once and imported lazily where useful.

**Notes:**
- No `test-writer` invocation beyond the simple smoke test in step 9; the spec does not author behavioral tests.
- Edge Function secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`) are set via the CLI command in Design Decisions; the file `.env.functions` is gitignored. Spec 19 verifies the keys are unreachable from the browser bundle.
