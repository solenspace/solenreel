# Spec 03 — Vitest setup

## Goal

Stand up a Vitest harness wired into Vite, with the global mocks every later spec assumes (`IntersectionObserver`, `ResizeObserver`, `react-player`, `matchMedia` for `prefers-reduced-motion`, fake timers helpers). Add one passing sample test against an existing component to prove the harness end-to-end. After this spec, every later spec's `pnpm test` gate runs against a real harness instead of vapor.

## Dependencies

- **Spec 01** — FSD tree.
- **Spec 02** — `// @ts-check`, ESLint, Prettier, scripts. Tests must pass typecheck and lint.
- **Context invariants**: `code-standards.md` §"Verification gates"; `ai-workflow-rules.md` §"Verification gates per spec".
- **Agents that gate this spec**: `test-writer` (mandatory invocation — the sample test must follow the test-writer's AAA/parameterized/behavior-over-implementation rules).

## Design Decisions

- **Vitest over Jest.** Already implied by Vite. Single config in `vitest.config.js` (separate from `vite.config.js` to keep Vite build clean).
- **Environment**: `jsdom`. The trailer page tests need DOM APIs; jsdom is sufficient for the entire surface in v1.
- **`@testing-library/react` + `@testing-library/jest-dom`** for queries and matchers. `@testing-library/user-event` for interactions.
- **Coverage**: enabled with `@vitest/coverage-v8`, reported as text + lcov, **not gated** in this spec (gating thresholds are added in spec 23 once the suite is real).
- **Global setup file** at `src/test-setup.js`:
  - Stubs `IntersectionObserver` with a controllable global (`globalThis.__triggerIntersection(entry)`).
  - Stubs `ResizeObserver` with a no-op.
  - Mocks `react-player` default export with a stub `<div data-testid="player" data-playing={...} data-muted={...} />`.
  - Stubs `window.matchMedia` so tests can flip `prefers-reduced-motion` per case.
  - Configures `@testing-library/jest-dom` matchers via `import '@testing-library/jest-dom/vitest'` (v6+ subpath; the bare `@testing-library/jest-dom` import deprecated in v6).
- **No shared TanStack Query client across tests.** Each test that needs one creates a fresh `QueryClient` with `retry: false`, `staleTime: 0`. Helper at `src/shared/test/query-wrapper.jsx` exports a `withQuery(children)` factory.
- **No shared Redux store across tests.** Helper at `src/shared/test/redux-wrapper.jsx` factories a fresh store per test, optionally pre-loaded.
- **One sample test**: a behavioral test against `src/shared/ui/Button.jsx` (post-spec-01 path). It asserts the button renders its children, calls `onClick` when clicked, and respects the `disabled` prop. AAA structure, no implementation coupling.
- **Test file co-location**: `<file>.test.jsx` next to the file under test. No separate `__tests__` folder.

## Implementation

1. Add devDependencies to `package.json`:
   - `vitest`
   - `@vitest/coverage-v8`
   - `@testing-library/react`
   - `@testing-library/jest-dom`
   - `@testing-library/user-event`
   - `jsdom`
2. Add the `test` script: `"test": "vitest run"`, plus `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`.
3. Create `vitest.config.js`:
    ```js
    // @ts-check
    import { defineConfig } from 'vitest/config';
    import path from 'node:path';

    export default defineConfig({
      resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
      test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test-setup.js'],
        css: true,
        coverage: { reporter: ['text', 'lcov'] },
      },
    });
    ```
4. Create `src/test-setup.js` with the global stubs + matcher import.
5. Create `src/shared/test/query-wrapper.jsx` and `src/shared/test/redux-wrapper.jsx` factories.
6. Update `tsconfig.json` `include` to add `vitest.config.js`, `src/**/*.test.{js,jsx}`, and `src/test-setup.js`.
7. Update `eslint.config.js` to allow `@testing-library/react`-style globals (`describe`, `it`, `expect`, `vi`) under `**/*.test.{js,jsx}` (Vitest globals: true).
8. Author the sample test at `src/shared/ui/Button.test.jsx` (3 cases: renders children, onClick fires, disabled blocks click) — run through `test-writer` agent for style validation.
9. Run `pnpm test` → green. Run `pnpm typecheck` and `pnpm lint` → green.
10. Commit as `chore: vitest harness + global mocks + sample test`.

## Success Criteria

1. `pnpm test` runs and passes (the Button sample test is the only test; it's green).
2. `pnpm test:coverage` produces `coverage/lcov.info`.
3. Removing the global `IntersectionObserver` stub (deleting it from `test-setup.js`) makes any test that uses it throw `IntersectionObserver is not defined` — proves the stub is doing its job.
4. The `react-player` stub renders `<div data-testid="player" />` instead of mounting a real iframe (verified by inspecting a test rendering a component that imports `react-player`).
5. `pnpm typecheck` and `pnpm lint` pass with `// @ts-check` enforced on `vitest.config.js`, `src/test-setup.js`, and `Button.test.jsx`.
6. `test-writer` agent reports the sample test as conforming (AAA structure, behavior-over-implementation, no snapshots, named clearly).

## Agents & Skills

**Agents (mandatory invocation):**
- `test-writer` — invoked at step 8 to validate the sample test follows AAA structure, parameterized cases, and behavior-over-implementation rules.

**Skills (consulted by the agents during this spec):**
- `.claude/skills/vercel-react-best-practices/SKILL.md` — general React testing patterns (test isolation, query priorities).
- `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md` — informs the IntersectionObserver / matchMedia stub patterns.

**Notes:**
- No `fsd-architect` here: no source-tree changes beyond test scaffolding files.
- No `prompt-engineer` here.
