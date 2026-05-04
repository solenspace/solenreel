# reel — Architecture

## Stack

| Layer               | Tech                                     | Notes                                                                                    |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Framework           | React 19                                 | function components only                                                                 |
| Build               | Vite 6                                   | dev server + production build                                                            |
| Language            | JavaScript + JSDoc                       | `// @ts-check` at file head; `tsconfig.json` with `checkJs: true` for editor diagnostics |
| Styling             | Tailwind v4                              | design tokens as CSS variables (see `ui-context.md`)                                     |
| Routing             | React Router v7                          | code-split routes via `lazy` + `Suspense`                                                |
| Animation           | Framer Motion v11                        | reserved for transitions; not for trailer autoplay                                       |
| Trailer             | `react-player` v2                        | YouTube embed; muted by default per browser autoplay policy                              |
| State (UI/auth)     | Redux Toolkit v2                         | thin: auth flag + UI prefs only                                                          |
| State (server)      | TanStack Query v5                        | every server fetch goes through it                                                       |
| HTTP                | axios v1                                 | wrapped in `src/shared/api/*` clients only                                               |
| Auth + DB           | Supabase                                 | Postgres + Auth + Edge Functions; Firebase fully removed during import                   |
| Movie data          | TMDB API v3                              | client-side calls, deduped via TanStack Query                                            |
| AI                  | OpenRouter free tier                     | single model (e.g. `openai/gpt-oss-20b:free`), called only from Edge Functions           |
| Hosting (web)       | Vercel free tier (or Netlify equivalent) | static build of Vite output                                                              |
| Hosting (functions) | Supabase Edge Functions                  | Deno runtime                                                                             |

## Data flow

```
┌──────────────────────────┐
│  Browser (React + Vite)  │
└────────┬───────┬─────────┘
         │       │
         │       │ TMDB v3 (public-readable key, rate-limited, deduped via TanStack Query)
         │       └─────────► api.themoviedb.org
         │
         │ Supabase JS client (Auth + Postgres reads + RPC)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase                                                    │
│  ├── auth.users                                              │
│  ├── public.profiles    (1:1 with auth.users)                │
│  ├── public.events      (per-user click stream, append-only) │
│  ├── public.recommendations (cached recs per user)           │
│  └── functions/                                              │
│      ├── recommendations  (reads events + TMDB → rec list)   │
│      └── intent-search    (mood prompt → OpenRouter → ids)   │
└──────────────────┬──────────────────────────────────────────┘
                   │ OpenRouter API key (server-side only)
                   ▼
              openrouter.ai
              (single free model, no fallback)
```

## System boundaries

- **Client (browser, `src/`)** — React app. May read TMDB. May read/write own rows in Supabase. May invoke Edge Functions. Never sees the OpenRouter API key.
- **Edge (`supabase/functions/`)** — Deno runtime. Holds OpenRouter key. Validates JWT on every invocation. Returns JSON-schema-conforming responses.
- **External** — TMDB (read-only, public key). OpenRouter (private key, server-side only).

The boundary between browser and edge is the only place where secrets cross. Anything that reads `OPENROUTER_*` env vars in `src/` is a defect.

## Storage model

- **`public.profiles`** — `(id uuid pk references auth.users, display_name text, created_at timestamptz)`.
- **`public.events`** — append-only. `(id bigserial pk, user_id uuid references auth.users, kind enum('tile_click','hover_start','trailer_play','trailer_complete'), tmdb_id int, payload jsonb, created_at timestamptz)`. RLS: rows are visible/insertable only when `auth.uid() = user_id`. No update/delete from clients.
- **`public.recommendations`** — `(user_id uuid pk, items jsonb, computed_at timestamptz)`. RLS: same as events. Edge Function `recommendations` writes here using the service-role key; the client only reads its own row.

No row-level mutation of past events from the client; recommendations are recomputed by the Edge Function (cron-triggered or on-demand).

## Invariants

These are non-negotiable. Re-read before every change.

1. **OpenRouter API key never reaches the browser.** All OpenRouter calls happen inside `supabase/functions/*`. `src/` does not reference `OPENROUTER_*`.
2. **RLS is enforced on `events` and `recommendations`.** Every policy checks `auth.uid() = user_id`. Service-role key is used only inside Edge Functions, never in the browser bundle.
3. **TMDB key may be public-readable** (it's a fetch key, not a secret), but the client uses TanStack Query to dedupe and respect rate limits. Cache `staleTime: 5 minutes` for catalogue data.
4. **Trailer autoplay is muted.** Per browser autoplay policy. Audio enables only on explicit click.
5. **Click events are append-only.** No client-side update or delete on `events`. RLS blocks it; the schema enforces it.
6. **Recommendation row falls back to TMDB popular** when the user has fewer than 5 events of any kind. Cold-start must never error.
7. **Edge Functions return JSON-schema-validated responses.** `intent-search` uses OpenRouter's `response_format: { type: 'json_schema' }`; the function double-validates the response before returning.
8. **No third-party tracking / analytics in v1.** No Google Analytics, no Sentry, no Posthog. Add only if surfaced as an architecture decision.
9. **Single Supabase client instance.** Created in `src/shared/api/supabase.js`; imported everywhere else.
10. **Single TMDB client instance.** Created in `src/shared/api/tmdb.js`; components do not call `axios` directly.
11. **No data fetching in `useEffect`.** Server state goes through TanStack Query.
12. **Single OpenRouter model, no fallback.** Changing the model or adding fallback providers requires a documented architecture decision in `progress-tracker.md`.

## Failure modes (and what we do about them)

- **TMDB rate limit hit** → TanStack Query backoff + retry; UI shows "movies are loading" state, never a blank page.
- **OpenRouter 5xx** → Edge Function returns `502` with `{ error: 'upstream_unavailable' }`; UI shows "the assistant is offline, try a literal search".
- **OpenRouter rate limit (free tier)** → Edge Function returns `429`; UI shows "free tier rate limit, please wait".
- **Empty event history** → recommendation function returns TMDB popular; UI hides "For You" badge in this case.
- **Hallucinated TMDB id from LLM** → Edge Function filters out ids not in the catalogue snippet before returning; the response schema does not allow ids outside the input set.
- **Trailer YouTube unavailable** → tile falls back to poster art; play button disabled, tooltip explains.
