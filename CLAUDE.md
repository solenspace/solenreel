# reel — Application Building Context

This is the canonical entry file for **reel**, a movie discovery app built on
React 19 + Vite 6 + JavaScript (with JSDoc) + Tailwind v4 + Supabase + OpenRouter
+ TMDB. The repository is a single-app workspace; there are no app-level
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
