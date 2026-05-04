# Spec 16 — `recommendations` schema

## Goal

Land the third migration: a `recommendations` table that caches each user's most recent recommendation list, computed by the spec-17 Edge Function. Read by the client (own row only); written only by the service role inside Edge Functions. After this spec, the database is ready to receive cached recs; the Edge Function logic and the UI come in specs 17 and 18.

## Dependencies

- **Spec 06** — first migration set the precedent.
- **Spec 14** — `events` table is the input to the rec function (referenced here only as a domain dependency; this spec does not query events).
- **Context invariants**: `architecture.md` §"Storage model", §"Invariants" 2.
- **Agents that gate this spec**: `test-writer` (RLS tests).

## Design Decisions

- **Migration filename**: `supabase/migrations/0003_recommendations.sql`.
- **Schema**:
    ```sql
    create table public.recommendations (
      user_id uuid primary key references auth.users(id) on delete cascade,
      items jsonb not null default '[]'::jsonb,
      computed_at timestamptz not null default now(),
      computed_from_event_count integer not null default 0
    );
    alter table public.recommendations enable row level security;
    ```
  - `user_id` is the primary key (one row per user; the latest rec list overwrites the previous). No history table in v1 — we don't need to compare yesterday's vs today's recs in the UI.
  - `items` is `jsonb` of `{ tmdb_id: int, score: number, reason: string | null }` objects, ordered by score desc. Capped at 50 items per row by a check constraint.
  - `computed_at` lets the UI display "recommendations updated 5 minutes ago" if useful (not in v1 UI; available for spec 23 or beyond).
  - `computed_from_event_count` is a debug breadcrumb — how many events were considered. Useful when investigating "why are my recs the same as a cold start?" — answer is in the row.
- **RLS policies** (uses Supabase's recommended `to authenticated` + `(select auth.uid())` form):
  - `recommendations_select_own` — `for select to authenticated using ((select auth.uid()) = user_id)`.
  - **No insert/update/delete policy** for clients. The only writes are from the Edge Function using the service role key (which bypasses RLS).
  - This is symmetric to `events`: clients are read-only here, write-only over there.
- **Check constraint**: `jsonb_array_length(items) <= 50` so the row stays bounded.
- **No indexes** beyond the PK. We always look up by `user_id`; PK suffices.

## Implementation

1. Author `supabase/migrations/0003_recommendations.sql`. Style-match prior migrations.
2. Apply locally: `pnpx supabase migration up`. Verify table, single policy, check constraint.
3. Regenerate types: `pnpm types:gen`. Generated `Recommendation` typedef + `RecommendationItem` typedef are added to `src/shared/types/supabase.js`. Commit the regen.
4. Add hand-authored typedef refinement at `src/entities/recommendation/types.js`:
    ```js
    /**
     * @typedef {object} RecommendationItem
     * @property {number} tmdbId
     * @property {number} score             // 0..1
     * @property {string|null} reason       // populated by intent-search reuse, null for content-based
     */

    /**
     * @typedef {object} Recommendation
     * @property {string} userId
     * @property {RecommendationItem[]} items
     * @property {string} computedAt        // ISO timestamp
     * @property {number} computedFromEventCount
     */
    ```
   The hand-authored version uses camelCase + a richer shape than the raw generated `Database['public']['Tables']['recommendations']`. Mappers between the two live in `src/entities/recommendation/mappers.js` (added in spec 17 when first consumed).
5. Tests at `src/entities/recommendation/recommendation.test.js` (env-gated):
   - **RLS read**: signed in as A, `select * from recommendations where user_id = A.id` returns A's row (or none if not yet computed); cannot select B's row.
   - **No client insert**: signed in as A, `insert { user_id: A.id, items: [...] }` fails (no policy).
   - **No client update**: `update recommendations set items = '[]' where user_id = A.id` fails.
   - **No client delete**: `delete from recommendations where user_id = A.id` fails.
   - **Service-role insert**: using the service-role key (test fixture), insert works (this is the Edge Function's path; verify the schema accepts the shape).
   - **Items cap**: service-role insert with an `items` array of length 51 fails the check constraint.
   - **Cascade**: deleting a user from `auth.users` removes their `recommendations`.
6. Run all gates. Manual smoke: sign in, query own row (returns empty initially); attempt to insert from the browser (RLS error).
7. Commit as `feat: recommendations table + read-only-by-client RLS + cap`.

## Success Criteria

1. `0003_recommendations.sql` is committed; running migrations from scratch creates the table, the single select-own policy, and the items-cap check constraint.
2. RLS as designed: signed-in user A reads own row; cannot read B's; cannot insert/update/delete any row from the client.
3. Service-role inserts succeed (verified by an env-gated test using `SUPABASE_SERVICE_ROLE_KEY`).
4. `items` array of length ≤ 50 inserts; length 51 fails.
5. Deleting a user from `auth.users` removes their rec row (cascade).
6. `src/shared/types/supabase.js` exposes the `Recommendation` typedef after `pnpm types:gen`.
7. `src/entities/recommendation/types.js` defines the camelCase `Recommendation` and `RecommendationItem` typedefs reel uses.
8. All tests in this spec pass.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green.

## Agents & Skills

**Agents (mandatory invocation):**
- `test-writer` — runs at step 5 for the seven RLS / constraint / cascade tests.

**Skills (consulted by the agents during this spec):**
- **`.claude/skills/supabase-postgres-best-practices/SKILL.md`** — RLS phrasing for read-only-by-client + service-role-write tables, jsonb constraint patterns, cascade conventions.
- **`.claude/skills/supabase/SKILL.md`** — service-role bypass rules for Edge Function writes.

**MCPs available during this spec:**
- **Supabase MCP** — `apply_migration` for `0003_recommendations.sql`; `list_tables` and `execute_sql` for the seven RLS / constraint tests in step 5.

**Notes:**
- No `fsd-architect` (only the protected types file is touched, regenerated).
- No `prompt-engineer`.
- The migration filename `0003_recommendations.sql` is immutable per `ai-workflow-rules.md` §"Protected files".
