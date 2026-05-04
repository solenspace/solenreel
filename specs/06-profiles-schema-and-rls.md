# Spec 06 — `profiles` schema & RLS

## Goal

Land the first Supabase migration: a `profiles` table that 1:1 mirrors `auth.users`, with RLS policies that let each user read/write only their own row, plus a trigger that creates a profile row on every signup. After this spec, signup → trigger → profile row → readable from the browser by the owner only. Generated JSDoc types ship under `src/shared/types/supabase.js` (and become protected per ai-workflow-rules).

## Dependencies

- **Spec 04** — Supabase project + `supabase/migrations/` directory exists.
- **Spec 05** — Supabase Auth is the auth provider; `auth.users` is populated on signup.
- **Spec 02** — typecheck for the generated typedefs.
- **Spec 03** — Vitest for migration smoke tests.
- **Context invariants**: `architecture.md` §"Storage model", §"Invariants" 2; `ai-workflow-rules.md` §"Protected files" (migrations are immutable; generated types are protected).
- **Agents that gate this spec**: `test-writer` (RLS policy tests).

## Design Decisions

- **Migration filename**: `supabase/migrations/0001_profiles.sql`. Numbered, append-only — never edit a past migration.
- **Schema**:
  ```sql
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    created_at timestamptz not null default now()
  );
  alter table public.profiles enable row level security;
  ```
- **RLS policies** (named so they're greppable later; uses Supabase's recommended `to authenticated` + `(select auth.uid())` form for performance per current docs):
  - `profiles_select_own` — `for select to authenticated using ((select auth.uid()) = id)`
  - `profiles_insert_own` — `for insert to authenticated with check ((select auth.uid()) = id)`
  - `profiles_update_own` — `for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id)`
  - **No delete policy** — profile rows are deleted only via the `on delete cascade` from `auth.users`. Clients cannot delete profile rows directly. RLS denies UPDATE/DELETE by default when no policy exists for the operation.
  - `to authenticated` skips evaluating the policy for `anon` users (faster, clearer intent). `(select auth.uid())` triggers Postgres initPlan caching, faster query plans on tables with many rows.
- **Trigger** to auto-create a profile on signup:

  ```sql
  create function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    insert into public.profiles (id) values (new.id);
    return new;
  end;
  $$;

  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  ```

  - `security definer` is required because the trigger inserts on a row the new user doesn't yet "own" at trigger-time. The function's search path is locked to mitigate search-path attacks.

- **Generated types**: `pnpx supabase gen types typescript --linked > src/shared/types/supabase.d.ts.tmp`, then converted to a JSDoc-friendly typedef file at `src/shared/types/supabase.js`. The generation+conversion step runs as a `pnpm types:gen` script so future schema changes are reproducible.
- **`profiles` is treated as a protected schema file** going forward — any change to it ships in a _new_ migration (`0002_*`, `0003_*`), never an in-place edit of `0001_profiles.sql`.

## Implementation

1. Author `supabase/migrations/0001_profiles.sql` with the schema, RLS, policies, function, and trigger as specified.
2. Apply locally: `pnpx supabase db reset` against the linked project's local-dev branch (or `pnpx supabase migration up` for an additive run). Verify the table, policies, function, and trigger exist via `pnpx supabase db inspect` or the dashboard.
3. Add a `types:gen` script to `package.json`: runs `supabase gen types`, post-processes to JSDoc, writes to `src/shared/types/supabase.js`.
4. Run `pnpm types:gen`. Commit the generated `supabase.js` file. Document at the top of the file: `// GENERATED — DO NOT EDIT. Run \`pnpm types:gen\` to regenerate.` (this is the protected-files marker; ai-workflow-rules forbids hand edits).
5. Update `src/entities/user/user-slice.js` (post-spec-05) to expose a `Profile` typedef, importing from the generated types.
6. Add a smoke test at `src/entities/user/profile.test.js` (uses `supabase.from('profiles').select`):
   - **RLS test (signed in as user A)**: can select own row; cannot select user B's row (returns empty).
   - **Trigger test**: signing up a fresh email creates a `profiles` row with the correct id within 2 seconds.
   - **Insert RLS**: an attempt to `insert` with `id = <other user's uid>` fails with a policy error.
   - These run against the local Supabase dev branch in CI; environment-gated so they skip gracefully without local Supabase.
7. Update `eslint.config.js`: any edit to `src/shared/types/supabase.js` that isn't `// GENERATED` triggers a warning (custom rule with regex on first line).
8. Run gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Manual smoke: sign up a fresh user, query `select * from profiles where id = auth.uid()` from the browser dev console (via the supabase client) — returns one row.
9. Commit as `feat: profiles table + RLS + signup trigger + generated types`.

## Success Criteria

1. `supabase/migrations/0001_profiles.sql` exists; running it on a fresh database creates the table, four policies (`profiles_select_own`, `profiles_insert_own`, `profiles_update_own`, no delete), the function, and the trigger.
2. Signing up a brand-new email via the Login page (spec 05) creates a row in `public.profiles` with the same id as `auth.users` within 2 seconds.
3. From the browser, signed in as user A, `supabase.from('profiles').select('*')` returns exactly user A's row — no others.
4. From the browser, signed in as user A, `supabase.from('profiles').insert({ id: '<user B uid>', display_name: 'X' })` fails with an RLS policy error.
5. `src/shared/types/supabase.js` exists, starts with `// GENERATED — DO NOT EDIT`, and contains a `Profile` typedef (or equivalent).
6. Editing `src/shared/types/supabase.js` by hand produces an ESLint warning.
7. All RLS/trigger tests in `profile.test.js` pass against the local Supabase dev branch.
8. `pnpm typecheck`, `pnpm lint`, `pnpm build` all green.

## Agents & Skills

**Agents (mandatory invocation):**

- `test-writer` — drives the RLS test suite at step 6. Each policy gets at least one positive case (signed-in owner can do X) and one negative case (signed-in non-owner blocked, anon blocked). Parameterized over policy names.

**Skills (consulted by the agents during this spec):**

- **`.claude/skills/supabase-postgres-best-practices/SKILL.md`** — authoritative source for the RLS phrasing (`to authenticated`, `(select auth.uid())`), security-definer triggers, and migration file conventions used here. Mandatory read.
- **`.claude/skills/supabase/SKILL.md`** — informs the auth.users → public.profiles relationship and signup-trigger pattern.

**MCPs available during this spec:**

- **Supabase MCP** — Claude applies the migration via `apply_migration`, verifies tables/policies/triggers via `list_tables` + `execute_sql`, and runs the RLS test queries directly without leaving the IDE.

**Notes:**

- No `fsd-architect` invocation (no source-tree changes outside the protected `src/shared/types/supabase.js` regen).
- No `prompt-engineer` invocation.
- The migration filename `0001_profiles.sql` is set as immutable by `ai-workflow-rules.md` §"Protected files" — never edited in place; future schema changes ship in new numbered migrations.
