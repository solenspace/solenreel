# Spec 20 — Intent-mode detection in the search bar

## Goal

Wire the single search bar to operate in two modes — `literal` (TMDB title query, default) and `intent` (mood prompt, routed to spec 19's Edge Function) — with auto-detection from input characteristics, manual `Tab` toggle, an obvious accent indicator, and a placeholder swap. After this spec, the bar is the single entry point for both kinds of queries; results rendering is spec 21.

## Dependencies

- **Spec 08** — Header chrome reserves a search-bar slot.
- **Spec 09** — `useSearchMulti(query)` hook exists for literal mode (already wired in netflix-clone Search page).
- **Spec 19** — `useIntentSearch()` hook for intent mode.
- **Spec 07** — accent token applied to the indicator.
- **Context invariants**: `ui-context.md` §"Search bar — mode switching", §"Voice", §"Trailer hover behavior" (peripheral — the search bar is its own surface).
- **Agents that gate this spec**: `fsd-architect`, `test-writer`.

## Design Decisions

- **Component**: `src/features/search-bar/search-bar.jsx`. Mounted into the header slot reserved by spec 08.
- **State**: a small Redux slice (`src/features/search-bar/slice.js`) holds `{ query: string, mode: 'literal' | 'intent', userPinned: boolean }`. The slice is small — Redux fits because it's the same store the rest of the app uses. `userPinned: true` after a manual `Tab` toggle freezes auto-detection until the user clears the bar.
- **Detection heuristic** at `src/shared/lib/intent-mode.js`:
    ```js
    /**
     * @param {string} text
     * @returns {'literal' | 'intent'}
     */
    export function detectMode(text) {
      const tokens = text.trim().split(/\s+/).filter(Boolean);
      if (tokens.length <= 3) return 'literal';
      const moodyMarker = /\b(want|feel|need|something|like|kinda|mood|vibe|vibes|sad|happy|melancholy|cozy|slow|fast|funny|scary|hopeful|romantic|dark|light|tired)\b/i;
      if (moodyMarker.test(text)) return 'intent';
      // 4+ words without moody marker → still literal (probably a long title)
      return 'literal';
    }
    ```
  Heuristic is intentionally simple and corrigible. The user can always override.
- **Auto-detect timing**: re-evaluates mode on every keystroke (debounced 200 ms via `useDebounce` from `src/shared/lib/use-debounce.js`). If `userPinned`, do not re-evaluate.
- **`Tab` toggle**: pressing Tab while focus is in the input flips mode and sets `userPinned: true`. Tab is intercepted (`event.preventDefault()`) only when the input is focused.
- **Visual feedback**:
  - Mode indicator is a small pill on the right of the input: `literal` (muted ink) / `intent` (matte-purple `--color-accent` background, `--color-accent-ink` text).
  - Placeholder swap: `'Search titles'` → `'Tell reel how you feel'` per `ui-context.md`.
  - Border / caret color subtly shift: literal uses `--color-ink-faint` border; intent uses `--color-accent` border. ≤ 1 px width change.
- **Submit**: pressing Enter submits.
  - Literal mode → navigate to `/search?q=<query>` (existing route's debounced `useSearchMulti` takes over).
  - Intent mode → navigate to `/search?intent=<query>` and trigger `useIntentSearch` mutation. The same Search page handles both modes (spec 21).
- **Slash to focus**: `/` keystroke from anywhere on the page focuses the input, unless the user is already in another text field. Implemented via the spec-13 `useKeyDown(key, handler)` hook.
- **Esc**: clears the input and unsets `userPinned` (back to auto-detect).
- **Accessibility**: input has `role="combobox"`, `aria-expanded` reflects the result-list state in spec 21, `aria-label` reads `"Search reel — literal or intent mode"`.

## Implementation

1. Create `src/shared/lib/intent-mode.js` with the `detectMode` function. Add a unit test next to it covering: 1-word literal, multi-word literal title, multi-word intent prompt, mixed.
2. Create `src/features/search-bar/slice.js`: Redux slice with `setQuery`, `setMode`, `pinMode`, `clear`. Selectors: `selectQuery`, `selectMode`, `selectUserPinned`. Wire into `src/app/store.js`.
3. Create `src/features/search-bar/search-bar.jsx`:
   - Reads `query`, `mode`, `userPinned` from Redux.
   - On change: dispatches `setQuery`. If not pinned, runs `detectMode` (debounced) and dispatches `setMode`.
   - On `Tab`: dispatches `pinMode` toggle.
   - On `Enter`: dispatches the submit (navigation) per mode.
   - Renders input + mode pill + placeholder + accent border.
4. Mount the component into `src/widgets/header/header.jsx` (spec 08) where the slot was reserved.
5. Add the `/` global focus shortcut: in `src/app/providers.jsx` (or a small `src/app/keyboard-bindings.jsx` mounted there), listen for `/` and focus the search input via a ref exposed through context (`src/features/search-bar/search-bar-ref-context.js`).
6. Update `src/app/pages/Search.jsx` (post-spec-01) to read both `?q=` and `?intent=` from the URL — used by spec 21 to render the right results panel.
7. Tests (run through `test-writer`):
   - `src/shared/lib/intent-mode.test.js` — parameterized: 8+ cases hitting both branches.
   - `src/features/search-bar/search-bar.test.jsx`:
     - Typing a long mood prompt swaps the mode pill from `literal` to `intent` after 200 ms.
     - Pressing Tab while focused toggles the pill and pins; subsequent typing does not auto-re-detect.
     - Pressing `/` from outside focuses the input.
     - Pressing Esc clears + unpins.
     - Submitting Enter in literal mode navigates to `/search?q=<query>`.
     - Submitting Enter in intent mode navigates to `/search?intent=<query>`.
8. Manual smoke: type `aftersun` → pill stays `literal`; press Enter → `/search?q=aftersun`. Clear, type `something slow and quiet that hurts` → pill flips to `intent` → press Enter → `/search?intent=something%20slow%20and%20quiet%20that%20hurts`.
9. Run all gates. Commit as `feat: intent-mode detection + Tab toggle + accent indicator in single search bar`.

## Success Criteria

1. Typing 1-word query keeps `literal` pill. Typing 5+ words containing a mood word flips to `intent` within 200 ms.
2. Tab toggles mode and pins; subsequent typing does not auto-re-detect (until Esc clears).
3. `/` keystroke focuses the input from anywhere (unless already in a text field).
4. Esc clears + unpins.
5. Enter in literal mode → URL is `/search?q=<encoded query>`. Enter in intent mode → URL is `/search?intent=<encoded query>`.
6. Mode pill uses `--color-accent` background + `--color-accent-ink` text in intent mode; muted ink in literal mode.
7. Input border/caret subtly shift to accent in intent mode (≤ 1 px width change; verifiable via computed style).
8. The bar reads from + writes to Redux state; URL navigation reflects the submitted state.
9. All tests pass; `test-writer` confirms style.
10. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green; `fsd-architect` reports zero violations.

## Agents & Skills

**Agents (mandatory invocation):**
- `fsd-architect` — verifies the search-bar feature lives in `features/search-bar/`, the slice integrates into `src/app/store.js`, and the heuristic at `src/shared/lib/intent-mode.js` is reachable from any layer.
- `test-writer` — runs at step 7 for `intent-mode.test.js` (parameterized over 8+ phrases) and `search-bar.test.jsx` (Tab toggle, `/`, `Esc`, Enter routing).

**Skills (consulted by the agents during this spec):**
- **`.claude/skills/vercel-composition-patterns/rules/state-context-interface.md`** — informs the search-bar-ref-context shape (forwarding the input ref to global keyboard bindings).
- `.claude/skills/vercel-composition-patterns/rules/state-decouple-implementation.md` — keeps the slice independent of the input element.
- `.claude/skills/vercel-react-best-practices/rules/advanced-event-handler-refs.md` — Tab interception only when the input is focused.
- `.claude/skills/web-design-guidelines/SKILL.md` — `/` shortcut convention, mode-indicator placement.

**Notes:**
- Intent-mode heuristic word list is tentative; revised in this spec's execution after manual smoke if false-positive/negative rate is high. Open question tracked in `progress-tracker.md`.
- No `prompt-engineer` here (no LLM prompt is changed).
