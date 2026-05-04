# reel — Progress Tracker

This is the only context file that mutates frequently. Update it after every meaningful change: completed work, in-progress work, new open questions, and architecture decisions.

## Current phase

**Structure bootstrap** — environment, six-file context, validated agents, validated skills installed via `skills.sh` (the script self-deletes after run). No source code yet.

## Completed

- 2026-05-04 — Plan approved (`/Users/mateo/.claude/plans/we-ve-discovered-a-very-fluffy-lamport.md`).
- 2026-05-04 — Empty reel-app workspace confirmed; agentic-flagship template structure mapped.
- 2026-05-04 — Decisions locked: stack (React 19 + Vite 6 + JS+JSDoc + Tailwind v4), backend (Supabase, drop Firebase), AI (OpenRouter free tier, single model, no fallback), v1 scope (click tracking + click-based recs + AI mood/intent search + trailer-first browsing), UI direction (editorial / Letterboxd-style), AI surface (search bar with intent mode).
- 2026-05-04 — Three agents adapted from agentic-flagship (`fsd-architect`, `test-writer`, `prompt-engineer`); Next/FastAPI/SSE-isms removed.
- 2026-05-04 — Three skills validated against `vercel-labs/agent-skills` and installed via `pnpx skills add` (skill names use `vercel-` prefix per the SKILL.md `name:` field): `vercel-composition-patterns`, `vercel-react-best-practices`, `web-design-guidelines`. Installed under `.claude/skills/` (CLI default `--copy` mode); `skills-lock.json` records source + commit hash.
- 2026-05-04 — `skills.sh` ran once and self-deleted as designed; `skills-lock.json` is the durable record going forward.
- 2026-05-04 — Six context files written: `project-overview`, `architecture`, `code-standards`, `ai-workflow-rules`, `ui-context`, `progress-tracker`.
- 2026-05-04 — `CLAUDE.md`, `AGENTS.md`, `.gitignore`, `.claude/settings.json` written.
- 2026-05-04 — `specs/` created empty (`.gitkeep` only) — spec authoring deferred to next run.

## In progress

Nothing. Bootstrap complete; awaiting the next run, which will draft the numbered specs into the empty `specs/` folder.

## Next

The next run drafts spec files into `specs/` in this order. Spec contract: **Goal · Dependencies · Design Decisions · Implementation · Success Criteria**.

1. `specs/01-import-netflix-clone.md` — `git init`; clone netflix-clone; copy `src/`, `public/`, root configs into reel-app; install deps with pnpm; strip Firebase Auth references; verify `pnpm dev` boots the imported app.
2. `specs/02-supabase-foundation.md` — Supabase project, env wiring, migrations for `profiles` + `events`, RLS policies, Supabase Auth UI replacing Firebase.
3. `specs/03-tmdb-data-layer.md` — TanStack Query setup, TMDB axios wrapper in `src/shared/api/tmdb.js`, JSDoc typedefs for movie entity.
4. `specs/04-editorial-ui-system.md` — Tailwind v4 token layer matching `ui-context.md`, base typography, navigation chrome, tile primitives.
5. `specs/05-trailer-first-tiles.md` — `react-player` wrapper, hover-autoplay with 250 ms delay, `IntersectionObserver` lazy mount, fallback to poster on error.
6. `specs/06-click-event-tracking.md` — `useClickTracker` hook, append-only writes to `events`, batching/dedupe, RLS verification tests.
7. `specs/07-recommendation-row.md` — Edge Function `/recommendations` reads recent events + TMDB similarity, returns ranked list; "For You" widget consumes it; cold-start fallback to TMDB popular.
8. `specs/08-ai-intent-search.md` — Search bar intent-mode detection, Edge Function `/intent-search` proxies to OpenRouter free model with JSON-schema-constrained response, results render as editorial row with reasoning per pick.

The build order is intentional: data → UI primitives → behavior → intelligence.

## Open questions (track until resolved)

- Which exact OpenRouter free model is most reliable for the mood→ids task? Candidates: `openai/gpt-oss-20b:free`, `meta-llama/llama-3.3-70b-instruct:free`, others. Resolve in spec 08 with a 10–20 input test set.
- Does trailer hover autoplay need an `IntersectionObserver` lazy mount on every tile, or only on tiles below the fold? Resolve in spec 05 with a perf measurement on a 20-tile row.
- Should TMDB responses be cached server-side in Supabase (to dedupe across users) or only client-side via TanStack Query? Resolve in spec 03 — start client-only, escalate to server cache only if rate limits force it.
- How does intent-mode detection feel in practice? The current heuristic ("> 3 words and at least one verb/adjective") may be too eager or too cautious. Resolve in spec 08 with manual tries, then iterate.
- Trailer fallback when YouTube blocks embedding for a given video — do we silently fall back to poster art, or show an explicit "trailer unavailable" affordance? Resolve in spec 05.

## Architecture decisions (append-only log)

- **2026-05-04 — Stack**: React 19 + Vite 6 + JS with JSDoc + Tailwind v4. Reason: minimize migration cost from netflix-clone while keeping enough type safety via JSDoc + `tsc --noEmit`.
- **2026-05-04 — Backend**: Supabase (Postgres + Auth + Edge Functions). Reason: Postgres is a better data fit than Firestore for events/recommendations; Edge Functions are the right home for the OpenRouter key; one platform to operate.
- **2026-05-04 — Auth**: Supabase Auth replaces Firebase Auth. Reason: single auth provider, native RLS integration. Migration happens during spec 01 import.
- **2026-05-04 — AI provider**: OpenRouter free tier, single model, no fallback. Reason: complexity ceiling; one moving part. Reconsider only if the chosen model fails the spec 08 test set.
- **2026-05-04 — UI direction**: Editorial / Letterboxd-style (typography-forward, dense metadata, muted palette + burnt-amber accent used sparingly). Reason: the differentiator vs Netflix is signal density, not bigger posters.
- **2026-05-04 — AI surface**: Single search bar with intent-mode auto-detect + `Tab` toggle. Reason: avoids ceremony of a separate AI page or chat drawer; one input, two modes.
- **2026-05-04 — Skills**: Three skills installed from `vercel-labs/agent-skills` (`composition-patterns`, `react-best-practices`, `web-design-guidelines`). Skills installed via `skills.sh` then deleted; `skills-lock.json` is the durable record.
- **2026-05-04 — Agents**: Three agents kept from agentic-flagship (`fsd-architect`, `test-writer`, `prompt-engineer`). Dropped: `i18n-keeper` (no i18n in v1), `sse-streaming-reviewer` (no SSE), `scrape-pipeline-doctor` (no scraping).
