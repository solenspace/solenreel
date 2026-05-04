# reel — Progress Tracker

This is the only context file that mutates frequently. Update it after every meaningful change: completed work, in-progress work, new open questions, and architecture decisions.

## Current phase

**Spec 01 complete.** `src/` now lives under reel's FSD layout (`app / widgets / features / entities / shared`); user-facing Netflix branding pruned; placeholder grayscale `@theme` palette in `src/main.css` (real editorial matte-purple palette lands in spec 07). Next action: execute spec 02 (`specs/02-tooling-jsdoc-eslint.md`).

## Completed

- **Spec 01 — Prune Netflix branding & restructure src/ into FSD layers** (2026-05-04). All 41 imported source files moved via `git mv` into `app/widgets/features/entities/shared`. 32-pair `@/` import rewrite applied. Five user-facing Netflix strings replaced (`'Netflix Originals'` row title → `'Originals'`; footer disclaimer; navbar sign-out; profile and login copy). `index.html` `<title>` and meta-description also depluralised from "Netflix Clone" to "reel" (out of strict src/ scope but in the spec's "prune branding" intent). Placeholder grayscale `@theme` block + 22-pair `netflix-*` Tailwind class migration. All five static gates green (file count, legacy dirs gone, no legacy `@/` imports, no JSX "Netflix" text, no `netflix-*` tokens). Vite dev server boots; Welcome and Login routes render with gray accents; the wordmark SVG correctly stays red (deferred to spec 07). All 18 relocated modules transform via Vite without errors. `fsd-architect` reports zero layer-direction violations.

## In progress

*Nothing.*

## Open questions (track until resolved)

- Trailer fallback when YouTube blocks embedding — silent poster fallback in v1; revisit in spec 12 if user feedback demands a visible affordance.
- TMDB caching: client-only via TanStack Query in v1; revisit in spec 09 if rate limits force a server-side cache in `recommendations` Edge Function.
- Intent-mode regex word list (spec 20): tentative; iterated during spec-20 execution after manual smoke if false-positive/negative rate is high.
- Lazy vs eager fetch of trailer video keys per tile (spec 12): default is lazy. Revisit if the popular row's network panel shows a sequential-fetch waterfall.
- Edge Function index for `events` (spec 17 perf): may need a partial index `(user_id) where kind='trailer_complete'` once the table grows. Decide during spec-17 execution after profiling on synthetic data.

## Architecture decisions (append-only log)

- 2026-05-04 — **TrailerPlayer placement (spec 01 deviation)**: placed at `src/shared/ui/trailer-player.jsx` instead of the spec's literal `src/features/trailer/trailer-player.jsx`. *Reason: Banner (widget) and MovieModal (feature) both consume it; placing it in `features/` would create a layer-direction violation (widgets cannot import from features) and fail spec 01 success criterion #6. The component is a stateless prop-driven `react-player` wrapper with zero domain logic — fits `shared/ui` exactly. fsd-architect verified zero violations on the post-restructure tree.*
- 2026-05-04 — **firebase.js placement (spec 01 implicit decision)**: `src/firebase.js` moved to `src/shared/api/firebase.js` (next to `tmdb.js`). *Reason: spec 01's enumerated layer mapping covers every other imported file; leaving firebase at `src/` root would be the only non-Vite-entry exception. Spec 05 will replace it with `src/shared/api/supabase.js` — same neighborhood, cleaner diff.*
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
