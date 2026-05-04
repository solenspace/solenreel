# reel — Progress Tracker

This is the only context file that mutates frequently. Update it after every meaningful change: completed work, in-progress work, new open questions, and architecture decisions.

## Current phase

**Specs drafted, ready to execute spec 01.** Bootstrap is committed; netflix-clone source is imported as a separate commit; all 23 numbered specs are drafted in `specs/` with the canonical contract. No source modifications yet — that begins when spec 01 is executed in a separate run.

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
- 2026-05-04 — `git init` on reel-app; bootstrap committed (commit 1); netflix-clone source imported verbatim into reel-app via clone+copy and committed (commit 2). `.gitignore` merged with netflix-clone's; `README.md` renamed to `NETFLIX-CLONE-README.md` for attribution.
- 2026-05-04 — All 23 numbered specs drafted under `specs/`, each following the canonical contract (Goal · Dependencies · Design Decisions · Implementation · Success Criteria). No source modifications performed; spec execution is a future run.

## Specs drafted (this run)

| # | File | Phase |
|---|---|---|
| 01 | `01-prune-and-fsd-restructure.md` | Foundation |
| 02 | `02-jsdoc-and-tooling-baseline.md` | Foundation |
| 03 | `03-vitest-setup.md` | Foundation |
| 04 | `04-supabase-foundation.md` | Auth migration |
| 05 | `05-supabase-auth-migration.md` | Auth migration |
| 06 | `06-profiles-schema-and-rls.md` | Auth migration |
| 07 | `07-editorial-design-tokens.md` | Editorial UI |
| 08 | `08-app-shell-and-routing.md` | Editorial UI |
| 09 | `09-tmdb-data-layer.md` | TMDB |
| 10 | `10-tile-and-row-primitives.md` | Primitives |
| 11 | `11-home-popular-row.md` | Primitives |
| 12 | `12-trailer-hover-autoplay.md` | Trailer |
| 13 | `13-full-bleed-trailer-page.md` | Trailer |
| 14 | `14-events-schema-and-rls.md` | Events |
| 15 | `15-click-tracker-hook.md` | Events |
| 16 | `16-recommendations-schema.md` | Recs |
| 17 | `17-recommendations-edge-function.md` | Recs |
| 18 | `18-for-you-row.md` | Recs |
| 19 | `19-intent-search-edge-function.md` | AI |
| 20 | `20-intent-mode-detection.md` | AI |
| 21 | `21-intent-results-row.md` | AI |
| 22 | `22-error-boundaries-and-a11y.md` | Polish |
| 23 | `23-production-build-and-deploy.md` | Ship |

The build order is intentional: foundation (FSD + tooling + tests) → auth → UI tokens → data → primitives → first home row → trailer behavior → events → recs → AI intent search → polish → ship.

## In progress

Nothing. Specs drafted; awaiting the next run, which executes spec 01 and continues sequentially through the list. Each spec executes against its own branch + commit; all five verification gates must pass before the next spec begins.

## Open questions (track until resolved)

- Which exact OpenRouter free model is most reliable for the mood→ids task? Candidates: `openai/gpt-oss-20b:free`, `meta-llama/llama-3.3-70b-instruct:free`, others. Resolve in **spec 19** with a 10–20 input test set.
- Does trailer hover autoplay need an `IntersectionObserver` lazy mount on every tile, or only on tiles below the fold? Resolve in **spec 12** with a perf measurement on a 20-tile row.
- Should TMDB responses be cached server-side in Supabase (to dedupe across users) or only client-side via TanStack Query? Resolve in **spec 09** — start client-only, escalate to server cache only if rate limits force it.
- How does intent-mode detection feel in practice? The current heuristic ("> 3 words and at least one mood-marker word") may be too eager or too cautious. Resolve in **spec 20** with manual tries, then iterate.
- Trailer fallback when YouTube blocks embedding for a given video — do we silently fall back to poster art, or show an explicit "trailer unavailable" affordance? Resolve in **spec 12** (silent fallback chosen by default; revisit if user feedback says otherwise).
- Lazy vs eager fetch of video keys per tile — current decision (spec 12) is lazy. Revisit if perf measurements show too many sequential network calls per row.

## Architecture decisions (append-only log)

- **2026-05-04 — Stack**: React 19 + Vite 6 + JS with JSDoc + Tailwind v4. Reason: minimize migration cost from netflix-clone while keeping enough type safety via JSDoc + `tsc --noEmit`.
- **2026-05-04 — Backend**: Supabase (Postgres + Auth + Edge Functions). Reason: Postgres is a better data fit than Firestore for events/recommendations; Edge Functions are the right home for the OpenRouter key; one platform to operate.
- **2026-05-04 — Auth**: Supabase Auth replaces Firebase Auth. Reason: single auth provider, native RLS integration. Migration happens during spec 01 import.
- **2026-05-04 — AI provider**: OpenRouter free tier, single model, no fallback. Reason: complexity ceiling; one moving part. Reconsider only if the chosen model fails the spec 08 test set.
- **2026-05-04 — UI direction**: Editorial / Letterboxd-style (typography-forward, dense metadata, muted palette + burnt-amber accent used sparingly). Reason: the differentiator vs Netflix is signal density, not bigger posters.
- **2026-05-04 — AI surface**: Single search bar with intent-mode auto-detect + `Tab` toggle. Reason: avoids ceremony of a separate AI page or chat drawer; one input, two modes.
- **2026-05-04 — Skills**: Three skills installed from `vercel-labs/agent-skills` (`composition-patterns`, `react-best-practices`, `web-design-guidelines`). Skills installed via `skills.sh` then deleted; `skills-lock.json` is the durable record.
- **2026-05-04 — Agents**: Three agents kept from agentic-flagship (`fsd-architect`, `test-writer`, `prompt-engineer`). Dropped: `i18n-keeper` (no i18n in v1), `sse-streaming-reviewer` (no SSE), `scrape-pipeline-doctor` (no scraping).
