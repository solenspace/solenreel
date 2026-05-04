# Spec 17 — Recommendations Edge Function

## Goal

Stand up `supabase/functions/recommendations/`, an Edge Function that reads a user's recent events, computes a content-based recommendation list from TMDB metadata (genre + cast + crew overlap), writes the result to `public.recommendations`, and returns it. Cold-start case (fewer than 5 events of any kind) returns TMDB popular as a fallback. After this spec, hitting the function from the browser produces a usable list; the UI lands in spec 18.

## Dependencies

- **Spec 14** — `events` table is the input.
- **Spec 16** — `recommendations` table is the output.
- **Spec 04** — Supabase project + `functions/` folder.
- **Spec 09** — TMDB client patterns (the function calls TMDB server-side, but the URL conventions and key handling mirror the client-side code).
- **Context invariants**: `architecture.md` §"Invariants" 1, 2, 6, 7, 11; `ai-workflow-rules.md` §"Splitting rule" (this spec is the function only — UI in 18; schema in 16).
- **Agents that gate this spec**: `prompt-engineer` (this function does not call an LLM, but the JSON-schema response discipline still applies for symmetry with spec 19), `test-writer`.

## Design Decisions

- **Runtime**: Deno (Supabase Edge Functions). TypeScript files (`index.ts` + `schema.ts`); we accept TS *here* because the runtime is Deno and the `.ts` files don't ship to the client. Reel's "JS + JSDoc only" rule applies to the `src/` browser bundle, not to Edge Functions.
- **Endpoint**: `POST /functions/v1/recommendations`. No body; the user is identified by the JWT `Authorization: Bearer <supabase_jwt>` header. Method-restricted: `GET` returns 405.
- **Auth**: the function reads `auth.uid()` from the JWT. If the JWT is missing or invalid, return 401. Service-role key is **only** used to write the result row to `recommendations` (RLS-bypassing path); reading events uses the user's JWT (RLS-enforcing path).
- **Algorithm (content-based, deterministic)**:
  1. Fetch the user's last 50 `events` (any kind) ordered desc by `created_at`. Drop events older than 90 days.
  2. If fewer than 5 events remain → cold-start path: return TMDB popular list (top 20) with `score = popularity / max(popularity)` and `reason = null`. Skip step 3+.
  3. Aggregate per-tmdb_id event weight: `tile_click=1, hover_start=0.3, trailer_play=2, trailer_complete=4`. Sum to a per-movie engagement score.
  4. For the top 5 most-engaged movies, fetch TMDB details (`/movie/{id}` + `/movie/{id}/similar`) once each, batched with `Promise.all`. TMDB results cached in a per-invocation in-memory map (re-fetched each function call; no shared cache across invocations in v1).
  5. Score candidate movies (from the union of `/similar` lists) with: `genre_overlap * 0.4 + cast_overlap * 0.3 + crew_overlap * 0.2 + popularity_norm * 0.1`. Filter out movies the user has already engaged with (any event).
  6. Sort desc, take top 20.
  7. Output: `{ tmdb_id, score, reason: null }[]`.
- **Output schema** (declared in `schema.ts` and validated before returning):
    ```ts
    type Output = {
      items: Array<{ tmdb_id: number; score: number; reason: string | null }>;
      computed_from_event_count: number;
      cold_start: boolean;
    };
    ```
- **Cold-start invariant** (matches `architecture.md` §"Invariants" 6): when `cold_start === true`, items are TMDB popular; the UI renders without the "For You" badge. The function output makes this explicit so the UI doesn't have to re-derive.
- **Write-then-return**: after computing, the function `upsert`s into `recommendations` (via service role) before returning. This keeps the table as a fresh cache; the UI in spec 18 reads from the table on subsequent loads instead of re-invoking the function on every page view.
- **Single TMDB key shared with the browser**: the function reads `TMDB_API_KEY` from the function's env (set in Supabase dashboard). It's the same key the browser uses; server-side use is purely for batching, not secret-keeping.
- **No LLM in this function** — it's deterministic content-based scoring. The LLM-driven path is spec 19's intent-search.
- **Error handling**:
  - TMDB rate limit (429) → return `502 { error: 'tmdb_unavailable' }`.
  - DB write failure → still return computed items in the response body so the UI works; log the error to function stdout (Supabase log drain).
- **Idempotency**: same inputs → same outputs (within the cache TTL of TMDB rate limits and the 90-day event window). Repeat calls within a minute return identical lists.

## Implementation

1. `pnpx supabase functions new recommendations` to scaffold `supabase/functions/recommendations/index.ts`. Replace stub with the algorithm above.
2. Author `supabase/functions/recommendations/schema.ts` exporting the `Output` type and a validator function (lightweight, hand-written; no external schema library — keeps the cold-start function fast).
3. Implement the function:
   - Parse JWT, return 401 if missing.
   - Read 50 most recent events for `auth.uid()` using a `createClient` inside the function with the user's JWT (RLS path). Imports from `@supabase/supabase-js` are allowed in Edge Functions; the browser-only invariant is `src/`-scoped.
   - Decide cold-start vs warm-start path.
   - Cold-start: fetch TMDB popular, normalize, return + write.
   - Warm-start: aggregate engagement, fetch top-5 details + similar, score candidates, sort, take 20, return + write.
   - Write to `recommendations` using a service-role client created with `SUPABASE_SERVICE_ROLE_KEY`.
   - Validate the output against the schema before serializing; throw on mismatch (catches algorithm regressions).
4. Add a `supabase/functions/recommendations/index.test.ts` (Deno test runner, env-gated):
   - Cold-start path: zero events → returns TMDB popular shape with `cold_start: true`.
   - Warm-start path: mocked events of `tile_click x 5` → returns 20 items with `cold_start: false` and the engaged movies excluded from the result list.
   - Auth: missing JWT → 401; foreign user_id in JWT mismatch → not possible (Supabase derives uid from JWT) — verify by sending a malformed JWT.
   - Output schema validation: every returned response matches the declared shape.
   - Idempotency: two calls within 60 s return identical `items` arrays (ordering and ids).
5. Add a smoke client at `src/entities/recommendation/use-recommendations.js`:
    ```js
    /** @returns {ReturnType<typeof useQuery<Recommendation>>} */
    export function useRecommendations() {
      return useQuery({
        queryKey: ['recommendations'],
        queryFn: () => supabase.functions.invoke('recommendations'),
        staleTime: 5 * 60_000,
      });
    }
    ```
   This is reading-side; the UI consumes it in spec 18. Add a smoke test against a mocked invoke.
6. Deploy locally for testing: `pnpx supabase functions serve recommendations`. Manual smoke: hit it with an authenticated request, verify the response body and the row in `recommendations`.
7. Run all gates. Commit as `feat: recommendations Edge Function (content-based + cold-start fallback)`.

## Success Criteria

1. `POST /functions/v1/recommendations` with a valid JWT returns 200 and a body matching the declared `Output` schema.
2. Cold-start path: a freshly-signed-up user with zero events → `cold_start: true`, items length = 20, all TMDB popular.
3. Warm-start path: a user with 5+ events → `cold_start: false`, items length = 20, none of the items match an engaged tmdb_id from the user's events.
4. After a successful call, `select * from public.recommendations where user_id = auth.uid()` returns the freshly computed row with `computed_at` within the last 5 seconds.
5. Missing/invalid JWT → 401.
6. TMDB upstream 429 → 502 with structured error.
7. Two consecutive calls (within 60 s) return identical `items` arrays.
8. The `useRecommendations` smoke hook fires against the function via `supabase.functions.invoke` and surfaces the result through TanStack Query.
9. All Deno tests for the function pass (env-gated).
10. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; the function's `.ts` files do not leak into the client bundle (verifiable: `grep -ri "recommendations.*Edge" dist/` finds nothing).
