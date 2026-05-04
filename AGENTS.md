# reel for Codex / Cursor / other agents

Read `CLAUDE.md` for all project instructions, the six-file context system,
and behavioral rules. They apply equally to every agent.

## Skills

Skills are installed via the [skills.sh](https://skills.sh) CLI (run as
`pnpx skills add <repo> --skill <name>`). Files live canonically in
`.agents/skills/<name>/` (real files); each agent that wants them gets a
symlink at its own folder. For Claude Code that's:

```
.agents/skills/<name>/SKILL.md         (canonical, real file)
.claude/skills/<name>  →  ../../.agents/skills/<name>   (symlink)
```

"Universal" agents (OpenCode, Amp, Antigravity, Cline, Codex, etc.) read
directly from `.agents/skills/`. Claude Code reads through the
`.claude/skills/` symlinks. The CLI auto-detects which agents are present and
creates the symlinks accordingly.

`skills-lock.json` is the durable record of what's installed (source repo,
sub-skill name, computed hash). To restore from lock on a fresh checkout:
`pnpx skills experimental_install`.

### Currently installed (3 skills, all from `vercel-labs/agent-skills`)

- `vercel-composition-patterns` — compound components, slot APIs, variant
  enums over boolean-prop sprawl. Load-bearing for spec 10 (Tile/Row
  primitives), spec 18, 20, 21.
- `vercel-react-best-practices` — data-fetching, event handlers, bundle
  optimization, server caching. Load-bearing for specs 09, 10, 12, 15, 18, 21.
- `web-design-guidelines` — accessibility, contrast, motion preferences,
  navigation density. Load-bearing for specs 07, 08, 22.

To add a new skill, validate it on https://skills.sh first, then:

```bash
pnpx skills add <owner/repo> --skill <skill-name>
```

The CLI without `--agent` (or with `--agent claude-code` only) will create
the canonical `.agents/skills/` files and the per-agent symlinks
automatically.

## Project-local agents

Three agents live at `.claude/agents/`. Each is scope-adapted from the
agentic-flagship sibling project; none were invented for reel.

- `fsd-architect` — enforces Feature-Sliced Design layer direction,
  single-Supabase-client invariant, single-TMDB-client invariant,
  no-fetch-in-useEffect, JSDoc discipline. Mandatory after any change that
  moves files between layers or touches data-fetching boundaries.
- `test-writer` — Vitest scaffolding (AAA, parameterized, behavior-over-
  implementation). Mandatory when authoring or revising tests.
- `prompt-engineer` — owns prompts under `supabase/functions/intent-search/`.
  Mandatory for spec 19 (the OpenRouter intent-search Edge Function); not
  needed elsewhere.

No agent is invented for reel; new ones come from a validated external
registry only. To swap or extend an agent's scope, edit its `.claude/agents/
<name>.md` file directly.

## For tool-specific overrides

Append below this line.
