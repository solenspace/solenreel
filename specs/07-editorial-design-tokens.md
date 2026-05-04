# Spec 07 — Editorial design tokens & typography

## Goal

Replace the placeholder grayscale palette (set in spec 01) with reel's real editorial palette per `ui-context.md`: warm-neutral background, ink/ink-muted/ink-faint text, burnt-amber accent used sparingly. Wire up the editorial typography stack (`Newsreader` serif for display, `Inter` sans for body, `JetBrains Mono` for dev affordances). Both dark (default) and light mode tokens land. After this spec, the app *looks* like reel even though tile/row primitives, trailer behavior, and feature surfaces are still pre-reel structures.

## Dependencies

- **Spec 01** — placeholder `@theme` block exists in `src/main.css`.
- **Spec 02** — `pnpm format` with the Tailwind plugin sorts class names; lint/typecheck must stay green after the swap.
- **Context invariants**: `ui-context.md` (entire file — color tokens, typography roles, density, voice).
- **Skills referenced**: `web-design-guidelines` (under `.claude/skills/`) for general design-system structure; `vercel-composition-patterns` for token-token referencing patterns.

## Design Decisions

- **Tailwind v4 `@theme` block** is the single source of truth for color and font tokens. CSS variables are emitted from there and used directly via Tailwind utilities (`bg-bg`, `text-ink`, `text-ink-muted`, `bg-accent`, etc.).
- **Token names mirror `ui-context.md` exactly** (no renames):
    ```css
    @theme {
      --color-bg: #0f0d0b;
      --color-bg-elevated: #181513;
      --color-bg-overlay: #0a0908cc;
      --color-ink: #ece6d8;
      --color-ink-muted: #bfb8a8;
      --color-ink-faint: #7a7466;
      --color-border: #2a2622;
      --color-border-subtle: #1c1917;
      --color-accent: #e85d3a;
      --color-accent-ink: #0f0d0b;
      --color-success: #7ea96b;
      --color-danger: #c64a3a;

      --font-display: 'Newsreader', ui-serif, Georgia, serif;
      --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
    }
    ```
- **Light mode** is opt-in via a `data-theme="light"` attribute on `<html>`. Tokens are overridden inside `[data-theme="light"]` block in `src/main.css`. No system-pref auto-switch in v1 (defer to spec 22 a11y polish — `prefers-color-scheme` honored only if v1 ships dark-only).
- **Font hosting**: `@fontsource/newsreader`, `@fontsource/inter`, `@fontsource/jetbrains-mono` packages — self-hosted, no external CDN. Imported once in `src/main.jsx`. Licensed OFL/SIL, free to bundle.
- **Variable fonts**: `Newsreader` and `Inter` are variable; subset to `latin` to keep bundle size down. Weights used: 400, 500, 600 for both.
- **Tabular numerics**: enabled by default in `Inter` via `font-feature-settings: 'tnum'` in the base layer (so `13:42` durations align across rows without per-instance opt-in).
- **Letter-spacing** per `ui-context.md`: `-0.01em` on display, `0` on body.
- **`@layer base`** in `src/main.css` covers: body background+ink color, link color (accent), focus ring (`outline: 2px solid var(--color-accent)` with 2px offset on `:focus-visible`), `prefers-reduced-motion` blocks for any future animation defaults.

## Implementation

1. Add devDependencies / dependencies to `package.json`:
   - `@fontsource-variable/newsreader`
   - `@fontsource-variable/inter`
   - `@fontsource/jetbrains-mono`
2. In `src/main.jsx`, import the font CSS:
    ```js
    import '@fontsource-variable/newsreader/index.css';
    import '@fontsource-variable/inter/index.css';
    import '@fontsource/jetbrains-mono/400.css';
    ```
3. Replace the placeholder `@theme` block in `src/main.css` with the real token block (above), plus light-mode override block.
4. Add `@layer base` rules to `src/main.css`:
   - `html { background: var(--color-bg); color: var(--color-ink); font-family: var(--font-sans); font-feature-settings: 'tnum'; }`
   - `h1, h2, h3, .display { font-family: var(--font-display); letter-spacing: -0.01em; line-height: 1.1; }`
   - `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`
   - `@media (prefers-reduced-motion: reduce) { ... }` block (placeholder, populated in spec 22).
5. Update any pages/widgets/features that referenced the spec-01 placeholder tokens (`bg-bg`, `text-ink`, `bg-accent`, etc.) — token names didn't change, so most usages are already correct; just validate with a grep and fix any drift.
6. Add a `Token` reference page under `src/app/pages/_dev/tokens.jsx` (dev-only route, hidden from production via `import.meta.env.DEV`) that renders every token as a swatch — useful for visual verification and for future spec authors.
7. Add a snapshot-style test at `src/main.css.test.js`: parses `main.css`, asserts every token from `ui-context.md` is present and has the documented value (catches accidental drift). Implementation: use `postcss` to parse the CSS, walk the `@theme` block, compare.
8. Run all gates. Manual smoke: load the dev server, walk every existing route, confirm the burnt-amber accent appears only on accent-class elements (Buttons, etc.), background is warm-neutral dark, type renders Newsreader on titles and Inter on body.
9. Toggle `data-theme="light"` via dev tools; confirm light tokens apply.
10. Commit as `feat: editorial design tokens (warm-neutral palette, Newsreader+Inter)`.

## Success Criteria

1. `src/main.css` `@theme` block matches `ui-context.md` token-for-token. Verifiable by the css test in step 7.
2. Loading the home view shows warm-neutral background (`#0f0d0b`), ink-colored text (`#ece6d8`), and burnt-amber accent visible only on Buttons / accent-flagged elements (≤ 3% of pixels in the viewport, manually verified).
3. Movie titles render in `Newsreader` serif; metadata renders in `Inter` sans (visible via dev-tools computed font).
4. Setting `document.documentElement.dataset.theme = 'light'` swaps to the light palette without a refresh.
5. The dev-only `/tokens` route renders one swatch per token, labeled with the token name and computed value.
6. `:focus-visible` shows a 2px burnt-amber ring on every interactive element.
7. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green.
8. Bundle size for fonts stays under 200 KB (variable Newsreader + variable Inter latin subsets + Mono 400). Verifiable from the Vite build report.
