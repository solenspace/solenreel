# Spec 14 — `events` schema & RLS

## Goal

Land the second migration: an append-only `events` table that records every per-user click, hover, and trailer interaction reel needs to power recommendations. RLS makes events strictly per-user (own writes/reads only); update/delete from clients are forbidden by the absence of those policies. After this spec, the database can accept event writes from authenticated clients via Supabase JS — but no client code writes to it yet (that's spec 15).

## Dependencies

- **Spec 04** — Supabase project + migrations folder.
- **Spec 06** — first migration (`profiles`) is the precedent for migration conventions and security-definer trigger pattern.
- **Spec 02** — generated types are kept in sync via `pnpm types:gen`.
- **Context invariants**: `architecture.md` §"Storage model" (events shape), §"Invariants" 2 (RLS), 5 (append-only); `ai-workflow-rules.md` §"Protected files" (migrations are append-only).
- **Agents that gate this spec**: `test-writer` (RLS/append-only tests).

## Design Decisions

- **Migration filename**: `supabase/migrations/0002_events.sql`.
- **Schema**:

  ```sql
  create type public.event_kind as enum (
    'tile_click',
    'hover_start',
    'trailer_play',
    'trailer_complete'
  );

  create table public.events (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    kind public.event_kind not null,
    tmdb_id integer not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create index events_user_id_created_at_desc
    on public.events (user_id, created_at desc);
  create index events_user_id_tmdb_id
    on public.events (user_id, tmdb_id);
  alter table public.events enable row level security;
  ```

  - `id` is `bigserial`, not `uuid`. Reason: events are per-user, never cross-tenant, and a monotonic int makes batch flushing easier (see spec 15). UUIDs would add 16 bytes per row for no win.
  - `payload` is `jsonb` for forward flexibility (e.g., adding `dwell_ms` later for hover events without a migration). v1 payload contents documented in spec 15.
  - Two indexes — the desc one is for "recent events" queries (recommendations), the per-tmdb_id one is for "have I seen this movie before" lookups (dedupe in spec 15).

- **RLS policies** (greppable names; uses Supabase's recommended `to authenticated` + `(select auth.uid())` form for performance per current docs):
  - `events_select_own` — `for select to authenticated using ((select auth.uid()) = user_id)`.
  - `events_insert_own` — `for insert to authenticated with check ((select auth.uid()) = user_id)`.
  - **No update policy.** No delete policy. The append-only invariant is enforced by the absence of those policies, not by a check constraint (constraints are weaker and allow update via privilege escalation). RLS without an `update`/`delete` policy denies them by default.
  - `to authenticated` skips evaluating the policy for `anon`. `(select auth.uid())` triggers initPlan caching — important because `events` will accumulate fast.
  - Service role inside Edge Functions bypasses RLS — that's the only way `events` rows are ever read across users (only the user themselves; even the rec function reads only one user's events at a time using the user's JWT, not service role, see spec 17).
- **Validation** at the DB layer:
  - `tmdb_id > 0` check constraint (catches 0/negative bugs early).
  - `payload` size constraint: `pg_column_size(payload) < 4096` — keeps the table from being abused as a payload store.
- **No batch insert RPC** in this spec — the client uses plain `supabase.from('events').insert([...])` which already batches. RPC would be overkill.

## Implementation

1. Author `supabase/migrations/0002_events.sql` with the enum, table, indexes, RLS, two policies, two check constraints. Style-match `0001_profiles.sql`.
2. Apply locally: `pnpx supabase migration up`. Confirm the table, enum, indexes, policies via `\d public.events` and `select * from pg_policies where tablename='events'`.
3. Regenerate types: `pnpm types:gen`. The generated `src/shared/types/supabase.js` now exposes an `Event` typedef and the `EventKind` enum-as-union. Commit the regen.
4. Add tests at `src/entities/event/event.test.js` (env-gated to skip without local Supabase):
   - **RLS read**: signed in as A, can `select * from events where user_id = A.id`; cannot select B's rows (returns empty).
   - **RLS insert**: signed in as A, `insert { user_id: A.id, kind: 'tile_click', tmdb_id: 100 }` succeeds; `insert { user_id: B.id, ... }` fails with policy error.
   - **No update**: `update events set kind='trailer_play' where id=<own>` fails (no policy → denied).
   - **No delete**: `delete from events where id=<own>` fails.
   - **`tmdb_id` constraint**: `insert { ..., tmdb_id: 0 }` fails the check.
   - **payload size**: `insert { ..., payload: <5kb json> }` fails.
   - **Cascade**: deleting a user from `auth.users` removes their events (verified via cascade test).
5. Update the protected-files marker in `src/shared/types/supabase.js` is unchanged (still `// GENERATED — DO NOT EDIT`); the new `Event` typedef appeared via the regen.
6. Run all gates. Manual smoke: from the browser dev console signed in as a real user, `await supabase.from('events').insert({ kind: 'tile_click', tmdb_id: 550, user_id: <my uid> })` returns success; `await supabase.from('events').select()` returns the row.
7. Commit as `feat: events table + append-only RLS + indexes + cascade`.

## Success Criteria

1. `0002_events.sql` is committed; running migrations from scratch creates the enum, the table, the two indexes, the two policies, the two check constraints.
2. RLS enforced as designed: signed-in user A can read/insert own rows; cannot read B's; cannot update or delete _any_ events; cannot insert rows with `user_id != auth.uid()`.
3. The `event_kind` enum has exactly 4 values: `tile_click`, `hover_start`, `trailer_play`, `trailer_complete`.
4. `pg_column_size(payload) >= 4096` insert is rejected with a check-constraint error.
5. `tmdb_id <= 0` insert is rejected.
6. Deleting a user from `auth.users` removes their `events` (cascade).
7. `src/shared/types/supabase.js` exports `Event` + `EventKind` typedefs after `pnpm types:gen`.
8. All RLS / constraint tests in `event.test.js` pass against the local Supabase dev branch.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green.

## Agents & Skills

**Agents (mandatory invocation):**

- `test-writer` — runs at step 4 for the seven RLS / constraint tests. Validates parameterized cases over policy + operation × authorized/unauthorized.

**Skills (consulted by the agents during this spec):**

- **`.claude/skills/supabase-postgres-best-practices/SKILL.md`** — RLS phrasing, append-only patterns (no UPDATE/DELETE policy), check-constraint guidance, index strategy. Mandatory read.
- **`.claude/skills/supabase/SKILL.md`** — Edge-Function service-role exception pattern (this spec doesn't use it directly, but downstream specs 17 + 19 do; keeping the cross-reference here).

**MCPs available during this spec:**

- **Supabase MCP** — `apply_migration` for `0002_events.sql`; `list_tables` + `execute_sql` for the seven RLS / constraint / cascade tests in step 4.

**Notes:**

- No `fsd-architect` invocation; only the protected `src/shared/types/supabase.js` is touched (regenerated).
- No `prompt-engineer`.
- The migration filename `0002_events.sql` is set as immutable by `ai-workflow-rules.md` §"Protected files".
