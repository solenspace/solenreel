# Spec 19 — Intent search Edge Function (OpenRouter)

## Goal

Stand up `supabase/functions/intent-search/`, an Edge Function that takes a natural-language mood/intent prompt, calls the OpenRouter free-tier model with a JSON-schema-constrained response, and returns 5–10 TMDB ids accompanied by the model's one-line reasoning per pick. The function is the **only** place reel's OpenRouter API key is used. Hallucinated ids (returned by the model but not in the catalog snippet we sent) are filtered out before responding.

## Dependencies

- **Spec 04** — Supabase project with env management for `OPENROUTER_API_KEY`.
- **Spec 09** — TMDB client patterns; the function uses TMDB to build the catalog snippet.
- **Spec 17** — Edge Function conventions, schema validation, JWT handling.
- **Context invariants**: `architecture.md` §"Invariants" 1, 7; `code-standards.md` §"Auth & secrets"; `ai-workflow-rules.md` §"Splitting rule".
- **Agents that gate this spec**: **`prompt-engineer` (mandatory)** — every prompt change here goes through them; `test-writer`.

## Design Decisions

- **Endpoint**: `POST /functions/v1/intent-search`. Body: `{ prompt: string, count?: number }`. `count` defaults to 8, clamped to `[5, 10]`.
- **Auth**: JWT required. Same 401 behavior as spec 17. (Public unauth'd intent search would expose us to free-tier model abuse.)
- **Provider**: OpenRouter free tier, single model. Model id read from env: `OPENROUTER_MODEL` (e.g. `openai/gpt-oss-20b:free`). **No fallback** — if OpenRouter returns 5xx/429, we return a structured error and the UI shows the offline message.
- **Catalog snippet**: a precomputed list of ~200 movies (TMDB top-rated + popular union, deduped). Cached at module load (cold-start of the function); regenerated daily. Format injected into the prompt:
    ```
    id|title|year|genres|tagline
    550|Fight Club|1999|Drama,Thriller|Mischief. Mayhem. Soap.
    ...
    ```
  Token budget: this snippet is the bulk of the prompt; aim for ~3-4 K tokens to leave headroom on the model's window. 200 movies × ~25 tokens each ≈ 5 K — trim or refine if it overflows on chosen model.
- **System prompt** (drafted; revisable through `prompt-engineer`):
  > You recommend movies to a user who described what they want to watch. You only return ids from the provided catalog snippet — never invent ids, never return ids outside the snippet. For each recommendation, write one short sentence (≤ 12 words) of reasoning, prose-first, no genre lists, no marketing words.
- **User prompt**: the user's `prompt` body field, sandwiched between fixed framing.
- **Response format**: `response_format: { type: 'json_schema', json_schema: { name: 'recommendations', strict: true, schema: {...} } }` with the schema declared in `supabase/functions/intent-search/schema.ts`:
    ```ts
    {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          minItems: 5,
          maxItems: 10,
          items: {
            type: 'object',
            properties: {
              tmdb_id: { type: 'integer' },
              reason: { type: 'string', maxLength: 100 },
            },
            required: ['tmdb_id', 'reason'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    }
    ```
- **Hallucination guard**: after parsing the response, drop any `item` whose `tmdb_id` is not in the catalog snippet's id set. If the result drops below 5 items, return what we have (don't pad with cold-start), and surface a metadata flag `partial: true` in the response so the UI can show a "limited matches" hint.
- **Determinism**: `temperature: 0.2`. Higher temperature led to noisier reasoning lines in pilot runs.
- **Caching**: identical (prompt, count) pair within 5 minutes returns the same result without re-calling OpenRouter. In-process map with TTL; cleared on cold-start. (No cross-invocation cache in v1 — we run on Supabase Edge Functions which spin up cold per invocation; this is just fast-repeat protection within a single warm container.)
- **Output schema** (function response, distinct from the LLM response):
    ```ts
    type Output = {
      items: Array<{ tmdb_id: number; reason: string }>;
      partial: boolean;
      catalog_size: number;
      model: string;
    };
    ```
- **Refusing inputs**: empty prompt → 400 `{ error: 'empty_prompt' }`. Prompt > 200 chars → 400 `{ error: 'prompt_too_long' }`. No content moderation in v1; the prompt-engineer agent flags this as future work.

## Implementation

1. `pnpx supabase functions new intent-search` to scaffold.
2. Author `supabase/functions/intent-search/schema.ts` with the JSON schema + the `Output` type + a validator.
3. Author `supabase/functions/intent-search/catalog.ts`: at module load, fetches TMDB top-rated + popular, dedupes, slices to the top 200 by `vote_average * log(vote_count)`, caches in module scope. Exports `getCatalogSnippet()` (string) and `getCatalogIdSet()` (`Set<number>`).
4. Author `supabase/functions/intent-search/prompts.ts`: exports the system prompt and a small `buildUserPrompt(text)` helper. Editable only via `prompt-engineer` agent — annotate the file head with that note.
5. Author `supabase/functions/intent-search/index.ts`:
   - JWT check; 401 if missing.
   - Body validate; 400 if invalid.
   - Build messages with system prompt + catalog snippet + user prompt.
   - Call OpenRouter `/chat/completions` with `response_format` and `temperature: 0.2`.
   - Parse and validate the LLM response against the JSON schema (defense-in-depth: the model claims `strict: true` compliance, we re-validate).
   - Filter out hallucinated ids using `getCatalogIdSet()`.
   - Construct `Output` and re-validate against our schema before returning.
   - On OpenRouter 5xx → return 502; on 429 → return 429 with `Retry-After` header parroted.
6. Add a `supabase/functions/intent-search/index.test.ts` (Deno test runner, env-gated):
   - Empty prompt → 400.
   - Prompt > 200 chars → 400.
   - Mocked OpenRouter response with all valid catalog ids → return shape matches `Output`, `partial: false`.
   - Mocked OpenRouter response with 2 hallucinated ids out of 8 → returned items length 6, `partial: false` (still ≥ 5).
   - Mocked OpenRouter response with 7 hallucinated ids out of 8 → returned items length 1, `partial: true`.
   - Mocked OpenRouter 429 → function returns 429 with `Retry-After`.
   - Mocked OpenRouter 5xx → function returns 502.
   - Schema mismatch from LLM (model returned malformed JSON despite `strict`) → function returns 502 `{ error: 'upstream_schema_violation' }`.
7. Add `src/features/intent-search/use-intent-search.js`:
    ```js
    /**
     * @param {string} prompt
     * @returns {ReturnType<typeof useMutation>}
     */
    export function useIntentSearch() {
      return useMutation({
        mutationFn: ({ prompt, count }) =>
          supabase.functions.invoke('intent-search', { body: { prompt, count } }),
      });
    }
    ```
   This is the consumer hook; UI lands in spec 21.
8. Manual smoke via `pnpx supabase functions serve intent-search`: hit it with `{ prompt: 'something slow and melancholy' }`, get back 5–10 items with reasoning per pick.
9. Run a 10-prompt manual test set through `prompt-engineer` to validate hallucination rate, schema compliance rate, and mood-match qualitative score. Store the results in `supabase/functions/intent-search/test-set.md` for future regression checks.
10. Run all gates. Commit as `feat: intent-search Edge Function (OpenRouter free-tier, JSON-schema-constrained, hallucination guard)`.

## Success Criteria

1. `POST /functions/v1/intent-search` with a valid JWT and a sane prompt returns 200 with a body matching `Output` shape: `items.length ∈ [1..10]`, every `tmdb_id` is in the catalog id set.
2. Empty prompt → 400. Prompt > 200 chars → 400.
3. Missing/invalid JWT → 401.
4. OpenRouter 429 → function 429 with `Retry-After` header. OpenRouter 5xx → function 502.
5. Hallucination guard fires: a mocked LLM response with ids outside the catalog drops them; if the surviving count < 5, `partial: true` is set.
6. Determinism: same prompt twice within 5 min → identical response (in-process cache hit; no OpenRouter call on the second).
7. **No `OPENROUTER_*` reference in `src/`**: `grep -ri "openrouter" src/` returns 0 hits.
8. The 10-prompt manual test set is checked in to `test-set.md` with annotated results (schema compliance ≥ 90%, hallucination rate ≤ 10%, mood-match ≥ 70% — qualitative thresholds).
9. All Deno tests pass; `prompt-engineer` agent confirms the prompt and schema are well-formed.
10. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `progress-tracker.md` open question on which exact OpenRouter free model to use is updated with the chosen model and the rationale.
