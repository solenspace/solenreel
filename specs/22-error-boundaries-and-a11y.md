# Spec 22 — Error boundaries & accessibility polish

## Goal

Tighten the rough edges before deploy. Repurpose the existing `ErrorBoundary`/`ErrorFallback` (post-spec-01: `src/shared/ui/`) for every reel feature surface, formalize the prose-first error catalog, and run a full keyboard + `prefers-reduced-motion` + contrast pass per `ui-context.md`. After this spec, reel is operable end-to-end with the keyboard, motion-sensitive users see static art instead of autoplaying trailers, and every error in the app degrades to a useful message.

## Dependencies

- **Specs 11, 13, 18, 21** — every UI surface that can error.
- **Spec 12** — trailer hover already honors `prefers-reduced-motion`; this spec verifies + extends.
- **Spec 07** — design tokens + focus ring already in `@layer base`.
- **Context invariants**: `ui-context.md` §"Accessibility", §"Voice"; `architecture.md` §"Failure modes" (the prose-first error catalog).
- **Agents that gate this spec**: `fsd-architect` (boundary placement), `test-writer` (a11y assertions).

## Design Decisions

- **Error boundary placement**: route-level. Each top route (`/`, `/search`, `/movie/:id`, `/profile`, `/auth/*`) wraps its content in `<ErrorBoundary fallback={<ErrorFallback />} />`. Inner widgets (For You row, Intent Results) handle their _expected_ error states inline (per their own specs); the route-level boundary catches unexpected exceptions only.
- **Prose-first error catalog** at `src/shared/ui/error-messages.js`:
  ```js
  /** @type {Record<string, string>} */
  export const errorMessages = {
    tmdb_unavailable: "the movies aren't loading. trying again.",
    assistant_offline: 'the assistant is offline — try a literal title search.',
    assistant_rate_limit: 'the free tier is rate-limited. give it a minute and try again.',
    sign_in_required: 'sign in to ask reel for recommendations.',
    unknown: 'something broke. reload the page.',
  };
  ```
  Centralized so wording stays consistent and reviewable. No emojis. No marketing voice.
- **`prefers-reduced-motion`**:
  - Trailer hover autoplay → no mount (already enforced in spec 12; verify here).
  - Framer Motion transitions → bypassed via the `useReducedMotion()` hook from `framer-motion` itself; transitions become instant.
  - Skeleton shimmer → static gray placeholder instead of animated gradient.
- **Keyboard nav (full pass)**:
  - `/` focuses the search bar (spec 20; verify global).
  - `Tab` order is logical: skip-link (added in this spec) → header nav → main content → footer.
  - Tile rows: arrow keys cycle focus between tiles in a row; `Enter` activates.
  - `/movie/:id`: `Esc` returns (already in spec 13; verify).
  - Search results: `↓` from the bar focuses the first tile; `↑` returns focus to the bar.
- **Skip link**: visible on focus only. `<a href="#main">skip to content</a>` as the first focusable element after `<body>`. Lands focus on `<main>` element on click.
- **Contrast verification**: every text/background combination meets WCAG AA (4.5:1 for body text, 3:1 for large text). Tokens were chosen to satisfy this; spec 22 verifies via an automated check.
- **Accessible names**: every icon-only button gets an `aria-label`. The mode pill in the search bar gets `aria-label={mode === 'intent' ? 'intent mode (press tab to switch)' : 'literal mode (press tab to switch)'}`.
- **Focus visible only on keyboard**: `:focus-visible` (already in spec 07's `@layer base`) ensures mouse clicks don't show focus rings — kept as-is.
- **Live regions**: the thinking indicator (spec 21) gets `aria-live="polite"` so screen readers announce state changes (`"reel is thinking"` → `"5 results"`).

## Implementation

1. Create `src/shared/ui/error-messages.js` with the catalog and a `getErrorMessage(code)` helper that falls back to `unknown`.
2. Update `src/shared/ui/error-fallback.jsx` (post-spec-01) to consume the catalog. Props: `code?: string`, `error?: Error`. Renders the prose message + a "reload" or "back" button per context.
3. Wrap each route in `<ErrorBoundary>` inside `src/app/router.jsx`. Pattern:
   ```jsx
   {
     path: '/',
     element: <ErrorBoundary fallback={<ErrorFallback />}><Home /></ErrorBoundary>,
   }
   ```
4. Add `<a class="skip-link" href="#main">skip to content</a>` as the first child of `<AppLayout>` and `<AuthLayout>`. CSS at `src/main.css` (`@layer utilities`) hides it off-screen, brings it on focus.
5. Add `id="main"` to the `<main>` element in both layouts.
6. Update tile rows (`<Row>`, spec 10) to handle arrow-key focus cycling. Implementation: `onKeyDown` on the row container, capture `ArrowLeft`/`ArrowRight`, focus next/prev `[data-tile]` element. `Home`/`End` jumps to first/last.
7. Add `↓`/`↑` handling in the search bar's submit context: after submission, the page should be able to focus the first tile via a small `useScrollAndFocusFirstTile()` hook on `Search.jsx`.
8. Add `aria-live="polite"` on the thinking indicator (spec 21) and update its text content with status changes.
9. Verify `prefers-reduced-motion`:
   - Trailer hover (spec 12): test passes already; re-run.
   - Add `useReducedMotion()` to any Framer Motion component left over (e.g., the skeleton shimmer animation): set `animate` to `'idle'` when `reduce` is true.
10. Add an automated contrast check at `src/main.css.test.js` (extending spec 7's): for each token pair (e.g. `--color-ink` on `--color-bg`), compute contrast ratio, assert ≥ 4.5 for ink-on-bg, ≥ 3 for ink-muted-on-bg-elevated.
11. Tests (run through `test-writer`):

- `src/shared/ui/error-fallback.test.jsx` — parameterized: each code in the catalog renders the documented message; unknown code renders the `unknown` message.
- `src/widgets/row/row.test.jsx` extension: arrow keys cycle focus through tiles; Home/End jump.
- Search bar `aria-label` reflects the current mode.

12. Manual smoke: keyboard-only walkthrough of the entire app (sign in → home → tile → trailer page → back → search bar → intent submit → tile → trailer → sign out). Verify no traps. With reduced-motion enabled in OS, hover tiles → no trailers.
13. Run all gates. Commit as `chore: error boundaries + a11y polish (keyboard, motion, contrast)`.

## Success Criteria

1. Every top route has an `<ErrorBoundary>` wrapper; throwing an error inside any route renders `<ErrorFallback>` with a prose message, not a crash screen.
2. The error catalog has at least 5 entries; consumers reference codes by name, no inline strings.
3. Keyboard-only walkthrough completes the full reel flow without a mouse: sign in → browse → click tile → trailer → back → search → intent submit → results → click → trailer → sign out.
4. `prefers-reduced-motion: reduce` set globally in dev tools → hover never autoplays trailers; Framer Motion transitions are instantaneous; skeleton shimmer is static.
5. Skip link appears on Tab from the start of the page; clicking it focuses `<main>`.
6. Tile rows: arrow keys cycle focus; Home/End jump.
7. The thinking indicator and other dynamic states are announced by VoiceOver / NVDA (manual screen-reader smoke).
8. Contrast tests in `main.css.test.js` pass for every token pair; manual axe-core scan returns no AA violations.
9. All tests pass; `test-writer` confirms style.
10. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `fsd-architect` reports zero violations.

## Agents & Skills

**Agents (mandatory invocation):**

- `fsd-architect` — verifies route-level `<ErrorBoundary>` placement and the centralized `error-messages.js` catalog (no inline error strings scattered across components).
- `test-writer` — runs at step 11 for error-fallback tests (parameterized over codes), row arrow-key tests, search-bar aria-label tests.

**Skills (consulted by the agents during this spec):**

- **`.claude/skills/web-design-guidelines/SKILL.md`** — accessibility, contrast, keyboard navigation, motion preferences (the load-bearing skill for this spec).
- `.claude/skills/vercel-react-best-practices/rules/client-passive-event-listeners.md` — informs the global keyboard listeners' `passive` flag.

**Notes:**

- `prefers-reduced-motion: reduce` honored across trailer hover (spec 12), Framer Motion transitions, skeleton shimmer.
- Contrast verified at WCAG AA: matte-purple `#b69ad8` on `#0a090c` is ~9.8:1 (well above 4.5:1).
- No `prompt-engineer` here.
