// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';

const reelLocal = {
  rules: {
    'require-ts-check': {
      meta: {
        type: 'problem',
        docs: { description: 'Require `// @ts-check` directive in the first 3 lines.' },
        schema: [],
      },
      create(context) {
        return {
          Program(node) {
            const src = context.sourceCode || context.getSourceCode();
            const head = src.getText().split('\n').slice(0, 3).join('\n');
            if (!/@ts-check\b/.test(head)) {
              context.report({
                node,
                message: 'File must start with `// @ts-check` (within the first 3 lines).',
              });
            }
          },
        };
      },
    },
    'no-ts-ignore': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow `@ts-ignore`. Use `@ts-expect-error` with a one-line reason instead.',
        },
        schema: [],
      },
      create(context) {
        return {
          Program() {
            const src = context.sourceCode || context.getSourceCode();
            for (const comment of src.getAllComments()) {
              if (/@ts-ignore\b/.test(comment.value)) {
                context.report({
                  loc: comment.loc,
                  message: '`@ts-ignore` is forbidden. Use `@ts-expect-error <reason>` instead.',
                });
              }
            }
          },
        };
      },
    },
  },
};

const fsdZones = [
  {
    target: './src/shared',
    from: ['./src/entities', './src/features', './src/widgets', './src/app'],
    message: 'FSD: shared/ cannot import from layers above it.',
  },
  {
    target: './src/entities',
    from: ['./src/features', './src/widgets', './src/app'],
    message: 'FSD: entities/ cannot import from layers above it.',
  },
  {
    target: './src/features',
    from: ['./src/widgets', './src/app'],
    message: 'FSD: features/ cannot import from layers above it.',
  },
  {
    target: './src/widgets',
    from: './src/app',
    message: 'FSD: widgets/ cannot import from app/.',
  },
];

export default [
  { ignores: ['dist', 'node_modules', '.vite', 'coverage'] },

  // Base JS recommended rules + browser globals + ESM parser config.
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      reel: reelLocal,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // React 19 uses the new JSX runtime — React doesn't need to be in scope.
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      // But JSX usage of identifiers must count toward no-unused-vars.
      'react/jsx-uses-vars': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'reel/no-ts-ignore': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Node globals for build-config files at the repo root.
  {
    files: ['*.config.{js,cjs,mjs}', 'vite.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // FSD import-direction zones + path-alias resolution + ts-check presence.
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      import: importPlugin,
      reel: reelLocal,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: { extensions: ['.js', '.jsx'] },
      },
    },
    rules: {
      'reel/require-ts-check': 'error',
      'import/no-restricted-paths': ['error', { zones: fsdZones }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message:
                'Import the singleton `supabase` from @/shared/api/supabase instead. ' +
                'Spec 04 invariant — only src/shared/api/supabase.js may touch this module directly.',
            },
          ],
        },
      ],
    },
  },

  // JSDoc: validate any block that exists; do not force every function to have one.
  // Spec 02 §Design Decisions explicitly skips components, hooks, and arrow callbacks
  // because @ts-check + checkJs already enforces param types via TS7006.
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': ['error', { definedTags: ['typedef'] }],
      'jsdoc/check-types': 'error',
      'jsdoc/no-undefined-types': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
    },
  },

  // Test files: declare vitest globals (belt-and-suspenders next to the explicit
  // `import { describe, it, ... } from 'vitest'` at the top of each test), allow
  // multiple non-component exports, and lift the FSD zone rule for the
  // `src/shared/test/**` helpers (redux-wrapper legitimately reaches into
  // `@/entities/user/user-slice` to construct a real reducer for tests).
  {
    files: ['src/**/*.test.{js,jsx}', 'src/test-setup.js', 'src/shared/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
      'import/no-restricted-paths': 'off',
    },
  },

  // Spec 04 invariant: only the Supabase singleton (and its smoke test) may
  // import `@supabase/supabase-js` directly. Every other importer is a defect.
  {
    files: ['src/shared/api/supabase.js', 'src/shared/api/supabase.test.jsx'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
