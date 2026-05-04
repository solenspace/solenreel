# reel for Codex / Cursor / other agents

Read `CLAUDE.md` for all project instructions, the six-file context system,
and behavioral rules. They apply equally to every agent.

## Skills

Skills are installed via the [skills.sh](https://skills.sh) CLI (run as
`pnpx skills add <repo> --skill <name> -y`, no `--agent` flag → CLI
auto-detects which agents are present and chooses canonical-vs-symlink
placement). Files live canonically in `.agents/skills/<name>/` (real files);
each agent that wants them gets a symlink at its own folder. For Claude Code:

```
.agents/skills/<name>/SKILL.md         (canonical, real file)
.claude/skills/<name>  →  ../../.agents/skills/<name>   (symlink)
```

"Universal" agents (OpenCode, Amp, Antigravity, Cline, Codex, etc.) read
directly from `.agents/skills/`. Claude Code reads through the
`.claude/skills/` symlinks. The CLI's install message confirms the layout
("symlinked: Claude Code") on every install.

`skills-lock.json` is the durable record (source repo, sub-skill name,
computed hash). Restore on a fresh checkout: `pnpx skills experimental_install`.

### Currently installed (6 skills)

| Skill                              | Source                                         | Load-bearing for                                                                  |
| ---------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `vercel-composition-patterns`      | `vercel-labs/agent-skills`                     | specs 10, 18, 20, 21 (compound components, slot APIs, variant enums)              |
| `vercel-react-best-practices`      | `vercel-labs/agent-skills`                     | specs 09, 12, 15, 18, 21 (data fetching, event handlers, bundle, server cache)    |
| `web-design-guidelines`            | `vercel-labs/agent-skills`                     | specs 07, 08, 22 (a11y, contrast, navigation, motion)                             |
| `supabase`                         | `supabase/agent-skills`                        | specs 04, 05, 17, 19, 23 (client init, auth, Edge Function patterns, deploy)      |
| `supabase-postgres-best-practices` | `supabase/agent-skills`                        | specs 06, 14, 16, 17 (RLS, migrations, indexes, jsonb constraints)                |
| `playwright-best-practices`        | `currents-dev/playwright-best-practices-skill` | spec 23 (drives Playwright MCP usage; locator hierarchy, accessibility snapshots) |

All six have meaningful install counts on the skills.sh registry (validated
by community use). To add a new skill, validate it on https://skills.sh first,
then run the install command above. Never hand-create or hand-move skill
files — the CLI is the source of truth.

## MCPs (`.mcp.json` at repo root)

Two MCP servers are configured at **project scope** so they ship with the
repo. Claude Code reads `.mcp.json` automatically.

| Server       | Transport | URL / command                                                      | What Claude can do                                                                                                                                                                                                          |
| ------------ | --------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playwright` | stdio     | `npx -y @playwright/mcp@latest`                                    | Drive a real Chromium: navigate, click, type, snapshot the accessibility tree. Replaces written Playwright test files (no `@playwright/test` devDep). Used for visual smoke in spec 23 and ad-hoc UI verification any time. |
| `supabase`   | HTTP      | `https://mcp.supabase.com/mcp` (`supabase-community/supabase-mcp`) | Apply migrations, run SQL, deploy Edge Functions, list tables, get logs. First use triggers dynamic client registration; the token persists.                                                                                |

To reinstall MCPs on a fresh checkout (the `.mcp.json` file is enough — Claude
Code reads it directly), but to recreate the JSON if it was lost:

```bash
claude mcp add -s project playwright -- npx -y @playwright/mcp@latest
claude mcp add -s project --transport http supabase https://mcp.supabase.com/mcp
```

Verify: `claude mcp list` shows both as `✓ Connected` (Supabase will say
`! Needs authentication` until the first OAuth flow completes).

## Project-local agents

Three agents live at `.claude/agents/`. Each is scope-adapted from the
agentic-flagship sibling project; none were invented for reel.

- `fsd-architect` — enforces Feature-Sliced Design layer direction,
  single-Supabase-client invariant, single-TMDB-client invariant,
  no-fetch-in-useEffect, JSDoc discipline. Mandatory after any change that
  moves files between layers or touches data-fetching boundaries.
- `test-writer` — Vitest scaffolding (AAA, parameterized, behavior-over-
  implementation). Mandatory when authoring or revising unit tests. The
  visual-smoke surface is the Playwright MCP, not Vitest, so test-writer's
  scope is unit-test-only.
- `prompt-engineer` — owns prompts under `supabase/functions/intent-search/`.
  Mandatory for spec 19 (the OpenRouter intent-search Edge Function); not
  needed elsewhere.

No agent is invented for reel; new ones come from a validated external
registry only.

## CLI tools

The `.claude/settings.json` allowlist includes `pnpm`, `pnpx`, `npx`,
`supabase`, `vercel`, `gh`, plus read-only `git` ops. Together with the two
MCPs, this gives Claude enough surface to set up the project end-to-end —
install deps, init Supabase, deploy Edge Functions, deploy to Vercel, run
the smoke flow — without human intervention beyond one-time browser-auth
flows (Supabase project creation, Vercel project import, MCP first-use OAuth).

## For tool-specific overrides

Append below this line.
