# reel for Codex / other agents

Read `CLAUDE.md` for all project instructions, the six-file context
system, and behavioral rules. They apply equally to every agent.

Skills are installed via [skills.sh](https://skills.sh) and live in
`.claude/skills/` (the canonical location for Claude Code; symlinked from
`.agents/skills/` if other agents are added). The bootstrap installer
(`skills.sh`) is one-shot and self-deletes after running; `skills-lock.json`
is the durable record of what's installed.

For Codex- or tool-specific overrides, append them below this line.
