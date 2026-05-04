# reel — Progress Tracker

This is the only context file that mutates frequently. Update it after every meaningful change: completed work, in-progress work, new open questions, and architecture decisions.

## Current phase

**Pre-implementation.** Bootstrap, netflix-clone import, 23 spec drafts, validation pass, palette overhaul, and agent/skill wiring are all complete. No source modifications yet. Next action: execute spec 01 (`specs/01-prune-and-fsd-restructure.md`).

## Completed

*None yet.* (Spec execution starts here. The pre-implementation work — bootstrap, import, spec drafting, validation — is recorded in git history, not in this tracker.)

## In progress

*Nothing.*

## Open questions (track until resolved)

- Trailer fallback when YouTube blocks embedding — silent poster fallback in v1; revisit in spec 12 if user feedback demands a visible affordance.
- TMDB caching: client-only via TanStack Query in v1; revisit in spec 09 if rate limits force a server-side cache in `recommendations` Edge Function.
- Intent-mode regex word list (spec 20): tentative; iterated during spec-20 execution after manual smoke if false-positive/negative rate is high.
- Lazy vs eager fetch of trailer video keys per tile (spec 12): default is lazy. Revisit if the popular row's network panel shows a sequential-fetch waterfall.
- Edge Function index for `events` (spec 17 perf): may need a partial index `(user_id) where kind='trailer_complete'` once the table grows. Decide during spec-17 execution after profiling on synthetic data.

## Architecture decisions (append-only log)

- 2026-05-04 — **MCPs (project-scope `.mcp.json`)**: `playwright` (stdio, `microsoft/playwright-mcp`) — drives Chromium for visual smoke; `@playwright/test` is **not** a devDep. `supabase` (HTTP, `supabase-community/supabase-mcp`) — applies migrations, deploys Edge Functions, runs SQL. Together they enable autonomous spec execution without human intervention beyond one-time OAuth flows (Supabase project create, Vercel import, MCP first-use auth).
- 2026-05-04 — **Skills updated to 6**: added `supabase` (50.1K installs, `supabase/agent-skills`), `supabase-postgres-best-practices` (141.8K installs, same repo), `playwright-best-practices` (34.8K installs, `currents-dev/playwright-best-practices-skill`). Existing three (`vercel-composition-patterns`, `vercel-react-best-practices`, `web-design-guidelines`) retained. All installed via `pnpx skills add ... -y` with default symlink behavior; `.agents/skills/<name>/` canonical, `.claude/skills/<name>` symlinks.
- 2026-05-04 — **Visual testing pattern**: Playwright MCP, not written Playwright test files. Spec 23's smoke is a documented procedure in `tests/smoke/PROCEDURE.md` that Claude executes via `browser_navigate` / `browser_click` / `browser_type` / `browser_snapshot`. *Reason: keeps `package.json` lean, gives the agent a richer feedback loop than a green/red CI line, mirrors the project's "Claude is the operator" autonomy goal.*
- 2026-05-04 — **CLI permissions**: `.claude/settings.json` allowlists `pnpm`, `pnpx`, `npx`, `supabase`, `vercel`, `gh`, plus read-only `git`. Sufficient for end-to-end spec execution.
- 2026-05-04 — **Stack**: React 19 + Vite 6 + JS+JSDoc + Tailwind v4 + Redux Toolkit + TanStack Query v5 + React Router v7 + Framer Motion + react-player **v2.x**. *Reason: minimize netflix-clone migration cost; type safety via JSDoc + `tsc --noEmit`. react-player v3 (Nov 2025) is breaking; deferred to v1.1.*
- 2026-05-04 — **Backend**: Supabase (Postgres + Auth + Edge Functions). *Reason: Postgres fits events/recs better than Firestore; Edge Functions are the right home for the OpenRouter key.*
- 2026-05-04 — **Auth**: Supabase Auth replaces Firebase Auth. Performed in spec 05.
- 2026-05-04 — **AI**: OpenRouter free tier, locked v1 model **`openai/gpt-oss-20b:free`** (131K context, $0/M tokens in/out, structured outputs supported per OpenRouter model registry 2026-05-04). Single provider, **no fallback**.
- 2026-05-04 — **UI direction**: editorial / Letterboxd-style — typography-forward, dense metadata, low-chrome, calm.
- 2026-05-04 — **Palette**: **matte purple accent on black-dominant canvas** (`--color-bg #0a090c`, `--color-accent #b69ad8`). Friendly, material-like, **NOT futuristic**. Light mode opt-in via `data-theme="light"` using Tailwind v4 `@custom-variant`.
- 2026-05-04 — **Skills**: 3 installed from `vercel-labs/agent-skills` via `pnpx skills add`. Canonical at `.agents/skills/<name>/`, symlinked at `.claude/skills/<name>`. `skills-lock.json` is the durable record. Reinstall command: `pnpx skills experimental_install`.
- 2026-05-04 — **Agents**: 3 carried from agentic-flagship and scope-adapted (`fsd-architect`, `test-writer`, `prompt-engineer`). No invented agents.
- 2026-05-04 — **Specs**: 23 numbered, drafted, dependency-respecting build order locked. Each spec carries an explicit `Agents & Skills` section that names the mandatory agent invocations and the rule-file references inside each skill.
- 2026-05-04 — **RLS pattern (specs 06, 14, 16)**: all policies use `to authenticated` + `(select auth.uid())` for performance per Supabase 2026 docs.
- 2026-05-04 — **Edge Function auth pattern (specs 17, 19)**: forward `Authorization` header into `createClient`, then `await supabase.auth.getUser()`; 401 if no user. Service-role key used only for write paths that intentionally bypass RLS.
- 2026-05-04 — **Edge Function secrets (specs 04, 19, 23)**: `pnpx supabase secrets set --env-file .env.functions`. Dashboard env vars are an alternative but not the canonical path.
