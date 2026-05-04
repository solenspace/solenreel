# Spec 02 — JSDoc & tooling baseline

## Goal

Make the JS-with-JSDoc discipline documented in `code-standards.md` mechanically enforceable. After this spec, every file in `src/` opens with `// @ts-check`, `pnpm typecheck` runs `tsc --noEmit` in `checkJs` mode against the whole tree, ESLint enforces the FSD import-direction rule, Prettier with the Tailwind plugin formats consistently, and the verification gates from `ai-workflow-rules.md` map to `pnpm` scripts.

## Dependencies

- **Spec 01** — FSD layout in place. The ESLint import-direction rule encodes those layers.
- **Context invariants**: `code-standards.md` §"Language & types", §"Linting & formatting", §"Verification gates"; `ai-workflow-rules.md` §"Verification gates per spec".
- **Agents that gate this spec**: `fsd-architect` (validates the import-direction rule's correctness against the actual FSD tree).

## Design Decisions

- **JSDoc-only typing.** No `.ts` files. `tsconfig.json` exists solely to drive `tsc --noEmit` over `.js`/`.jsx` with `checkJs: true`, `allowJs: true`, `strict: true`, `noEmit: true`, `jsx: "preserve"`.
- **`// @ts-check` is mandatory** at the head of every file under `src/` and every Edge Function file (later specs). Enforced by an ESLint custom rule pattern (`@ts-check` directive must appear in the first 3 lines).
- **ESLint flat config** — keep the netflix-clone's existing `eslint.config.js` shape and extend it. Add:
  - `eslint-plugin-import` with the `import/no-restricted-paths` zone definitions encoding FSD upward-only direction.
  - `eslint-plugin-jsdoc` with rules to require `@param`/`@returns` on exported functions.
  - `eslint-plugin-react-hooks` strict (it's already there but checked).
- **Prettier** with `prettier-plugin-tailwindcss` for class-name sorting. No other Prettier plugins.
- **Scripts** added to `package.json`:
  - `typecheck` → `tsc --noEmit`
  - `lint` → `eslint . --max-warnings=0`
  - `lint:fix` → `eslint . --fix`
  - `format` → `prettier --write .`
  - `format:check` → `prettier --check .`
  - `test` is added in spec 03; not here.
- **No `// @ts-ignore` allowed.** ESLint flags it as error. The rare exception goes through `// @ts-expect-error` with a one-line reason.
- **`tsconfig.json`** is committed at the repo root, with `paths` mirroring the Vite `@/` alias so editor diagnostics resolve `@/widgets/header` correctly.

## Implementation

1. Add dependencies to `package.json` (devDependencies):
   - `typescript`
   - `eslint-plugin-import`
   - `eslint-plugin-jsdoc`
   - `eslint-plugin-react-hooks` (verify it's there from netflix-clone)
   - `prettier`
   - `prettier-plugin-tailwindcss`
2. Create `tsconfig.json` at repo root:
    ```json
    {
      "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "jsx": "preserve",
        "allowJs": true,
        "checkJs": true,
        "strict": true,
        "noEmit": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "isolatedModules": true,
        "resolveJsonModule": true,
        "baseUrl": ".",
        "paths": { "@/*": ["src/*"] }
      },
      "include": ["src/**/*", "vite.config.js"]
    }
    ```
3. Add `// @ts-check` as the first line of every existing file under `src/` (post-spec-01 paths). Mechanical pass; no semantic changes.
4. Author/extend `eslint.config.js`:
   - Plugins: `import`, `jsdoc`, `react-hooks` (strict).
   - `import/no-restricted-paths` rule with five zones encoding FSD upward direction (forbid `entities/` from importing `features/`, etc.).
   - `jsdoc/require-param`, `jsdoc/require-returns` on exported functions only (skip arrow callbacks, hooks, components — TypeScript-checking handles those).
   - Pattern rule: every file under `src/**/*.{js,jsx}` must contain `@ts-check` in the first 3 lines.
5. Create `.prettierrc.json`:
    ```json
    {
      "singleQuote": true,
      "trailingComma": "all",
      "printWidth": 100,
      "plugins": ["prettier-plugin-tailwindcss"]
    }
    ```
6. Create `.prettierignore` covering `node_modules`, `dist`, `.claude/`, `.agents/`, `pnpm-lock.yaml`, `package-lock.json`.
7. Add the four scripts to `package.json` (`typecheck`, `lint`, `lint:fix`, `format`, `format:check`).
8. Run all gates locally; fix every failure under spec 02 (no skipping, no suppressions). The volume of fixes is expected: imports, missing JSDoc on exports, Tailwind class ordering.
9. Commit as `chore: jsdoc + eslint flat config + tsconfig + prettier baseline`.

## Success Criteria

1. `pnpm typecheck` exits 0.
2. `pnpm lint` exits 0 with `--max-warnings=0`.
3. `pnpm format:check` exits 0.
4. Every file under `src/` begins with `// @ts-check`. Verifiable: `find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec head -1 {} \; | grep -v "@ts-check" | wc -l` returns `0`.
5. Adding a deliberate FSD violation (e.g., `import x from "@/features/foo"` inside an `entities/` file) makes `pnpm lint` fail with the import-direction rule.
6. Adding a `// @ts-ignore` line makes `pnpm lint` fail.
7. Adding a deliberate type error (e.g., `/** @type {number} */ const x = "string"`) makes `pnpm typecheck` fail.
8. `pnpm dev` still boots and renders the post-spec-01 app (no runtime regression from the tooling pass).

## Agents & Skills

**Agents (mandatory invocation):**
- `fsd-architect` — validates that the `import/no-restricted-paths` zone definitions correctly encode the FSD upward-only direction across all five layers. Run after step 4 (eslint.config.js authoring) and re-run after step 8 (full lint pass).

**Skills (consulted by the agents during this spec):**
- `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md` — informs the "no barrel files" lint rule the FSD architect enforces.
- `.claude/skills/vercel-composition-patterns/rules/architecture-avoid-boolean-props.md` — referenced indirectly through the JSDoc requirement for documenting prop shapes.

**Notes:**
- No `test-writer` here: tests authored in spec 03.
- No `prompt-engineer` here.
