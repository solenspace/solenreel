# reel — Application Building Context

This is the canonical entry file for **reel**, a movie discovery app built on
React 19 + Vite 6 + JavaScript (with JSDoc) + Tailwind v4 + Supabase + OpenRouter

- TMDB. The repository is a single-app workspace; there are no app-level
  overlays.

Read the following files in order before implementing or making any
architectural decision:

1. `context/project-overview.md` — product definition, user goals, v1 scope,
   out-of-scope list, success criteria
2. `context/architecture.md` — stack, data flow, system boundaries, storage
   model, and the **invariants** that govern every change
3. `context/ui-context.md` — theme, color tokens, typography, density,
   trailer hover behavior, search-bar mode switching, accessibility
4. `context/code-standards.md` — language (JS + JSDoc), React rules, FSD
   layering, data fetching, styling, file organization, verification gates
5. `context/ai-workflow-rules.md` — spec-driven workflow, splitting rule,
   protected files, decision protocol, agent usage
6. `context/progress-tracker.md` — current phase, completed work, in
   progress, open questions, architecture decisions

Before any code change, re-read the **Invariants** section of
`context/architecture.md`. Invariants are non-negotiable; everything else
is convention.

Update `context/progress-tracker.md` after each meaningful implementation
change.

If implementation changes the architecture, scope, or standards documented
in the context files, update the relevant file **before** continuing.

## Locked-in facts (do not hallucinate around these)

- **Palette is dark by default**, black-dominant canvas (`--color-bg #0a090c`)
  with a single matte purple accent (`--color-accent #b69ad8`) used on no more
  than ~3% of pixels. Editorial / material-friendly, **not** futuristic. Light
  mode is opt-in via `data-theme="light"`.
- **`react-player` v2.x is intentional in v1.** Version 3 (Nov 2025) is breaking
  and is on the v1.1 backlog. Do not "helpfully" upgrade.
- **AI provider is OpenRouter free tier, single model `openai/gpt-oss-20b:free`**
  (131K context, $0/M tokens, structured outputs supported). No fallback. Key
  lives only inside Supabase Edge Functions.
- **Skills live canonically in `.agents/skills/<name>/`**, with symlinks at
  `.claude/skills/<name>` → `../../.agents/skills/<name>`. Six skills are
  installed: `vercel-composition-patterns`, `vercel-react-best-practices`,
  `web-design-guidelines`, `supabase`, `supabase-postgres-best-practices`,
  `playwright-best-practices`. All six are validated entries in the
  https://skills.sh registry. `skills-lock.json` is the durable record.
  Reinstall: `pnpx skills experimental_install`.
- **Two MCPs** are configured at project scope in `.mcp.json`:
  - **`playwright`** (stdio, `npx -y @playwright/mcp@latest`) — Claude drives
    a real Chromium for visual smoke and live UI verification. **No
    `@playwright/test` is installed in `package.json`**; the MCP is the test
    runner. Spec 23's smoke procedure lives in `tests/smoke/PROCEDURE.md` and
    Claude executes it via `browser_*` tools.
  - **`supabase`** (HTTP, `https://mcp.supabase.com/mcp`) — Claude can apply
    migrations, deploy Edge Functions, run RLS test queries, and inspect
    logs without a human in the loop. First-use triggers dynamic client
    registration (browser auth flow); subsequent calls reuse the token.
- **Three project-local agents** at `.claude/agents/`: `fsd-architect`,
  `test-writer`, `prompt-engineer`. No invented agents — new ones must be
  validated against an external registry first.
- **`specs/` contains 23 numbered build specs** (drafted, not executed). They
  must be executed strictly in order, one at a time, with all five verification
  gates green before the next begins.
- **`react-player/youtube`** is the import path used by the trailer player —
  works in v2.x.
- **CLI permissions** (`.claude/settings.json` allowlist): `pnpm`, `pnpx`,
  `npx`, `supabase`, `vercel`, `gh`, plus read-only `git` ops. The `supabase`
  CLI complements the Supabase MCP for `init` / `link` / `functions serve`
  paths the MCP doesn't cover.

## Git workflow (gitflow)

Remote: **https://github.com/solenspace/solenreel.git** (origin).

Two long-lived branches:

- `main` — production. Only releases land here. Direct commits forbidden.
- `development` — integration. Default target for feature PRs.

**Before implementing any new feature or spec**, branch off `development`:

```sh
git checkout development && git pull
git checkout -b feat/<spec-slug>     # or fix/, chore/, docs/, refactor/
```

Open the PR against `development` (`gh pr create --base development`). When
`development` is release-ready, open a separate PR `development` → `main`.

Commit messages must follow conventional-commits format
(`<type>(<scope>)?: <subject>`). The `commit-msg` hook enforces this. Do not
add `Co-Authored-By: Claude …` trailers — keep the log authored by the human
operator.

Hooks live in `.githooks/` and are activated by the `prepare` npm script
(runs `git config core.hooksPath .githooks` after `pnpm install`):

- `pre-commit` — runs `pnpm lint`.
- `pre-push` — runs `pnpm lint && pnpm exec vite build`.
- `commit-msg` — enforces conventional-commits format.
