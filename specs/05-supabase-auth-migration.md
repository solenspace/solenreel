# Spec 05 — Supabase Auth migration (rip out Firebase)

## Goal

Replace Firebase Auth with Supabase Auth across the codebase. After this spec, Firebase is gone — no `firebase` import remains, no `firebase.json` / `.firebaserc` on disk, no `firebase` chunk in `vite.config.js`, no Firebase deploy workflow in `.github/workflows/`. The Login page and the user Redux slice work entirely against Supabase. **No new tables yet** — that's spec 06 (`profiles`).

## Dependencies

- **Spec 04** — Supabase singleton client + env. Auth helpers are reached via `supabase.auth`.
- **Spec 02** — typecheck/lint must pass after the migration.
- **Spec 03** — Vitest harness; this spec adds tests for the Login page and the auth slice.
- **Context invariants**: `architecture.md` §"Stack", §"Invariants" 1, 2, 9; `code-standards.md` §"Auth & secrets".
- **Agents that gate this spec**: `fsd-architect` (entity-layer auth slice cannot import features), `test-writer` (auth-flow tests).

## Design Decisions

- **Email + password only** in v1. Magic links, OAuth providers, MFA are out of scope (the netflix-clone only supported email+password; we keep parity).
- **Session lives in Supabase**, not Redux. The Redux `user-slice` becomes a thin reflection of Supabase's session for components that prefer Redux selectors. Source of truth is `supabase.auth.getSession()` / `onAuthStateChange`.
- **`useAuthSession` hook** at `src/entities/user/use-auth-session.js`: subscribes to `onAuthStateChange` once at app mount (via the providers tree in spec 08), keeps the Redux slice in sync, and returns `{ session, user, status }`. Components prefer this hook.
- **`signIn`/`signUp`/`signOut` actions** are Redux thunks under `src/entities/user/auth-actions.js` that call `supabase.auth.signInWithPassword`, `signUp`, `signOut`. Errors map to a typed `AuthError` JSDoc typedef.
- **`Login.jsx`** changes: replace Firebase calls with the auth thunks. Form structure, validation, error display: kept as-is.
- **Protected routes**: `AppLayout`'s session check changes from Firebase's `onAuthStateChanged` to Supabase's `onAuthStateChange`. Redirect-on-logout behavior preserved.
- **No legacy Firebase files survive**: `src/firebase.js`, `firebase.json`, `.firebaserc`, `.firebase/` (gitignored), `.github/workflows/firebase-deploy.yml` are all deleted in this spec. The `firebase` package is removed from `package.json` and the `firebase` manualChunks entry in `vite.config.js` is removed.

## Implementation

1. **Add the auth surface** in entities/user (post-spec-01 location):
   - `src/entities/user/use-auth-session.js` — hook that subscribes once, syncs to Redux, returns session info. JSDoc-typed.
   - `src/entities/user/auth-actions.js` — Redux thunks for `signIn`, `signUp`, `signOut`. Each calls `supabase.auth.*` and dispatches actions on success/failure.
   - Update `src/entities/user/user-slice.js` (post-spec-01 rename): add `setSession(session)` reducer; remove any Firebase-specific state shape; expose `selectSession`, `selectUser`, `selectAuthStatus`.
2. **Migrate `src/app/pages/Login.jsx`** (post-spec-01 path) to dispatch `auth-actions` thunks instead of calling Firebase. Keep form markup, validation, and error rendering. Replace any `firebase`-typed imports with the new thunk imports.
3. **Migrate `src/app/pages/Profile.jsx`** if it currently calls `signOut` directly via Firebase: route it through the thunk.
4. **Migrate `src/app/layouts/AppLayout.jsx`** to use `useAuthSession` instead of `onAuthStateChanged`. Same redirect-on-no-session behavior.
5. **Mount `useAuthSession`** once at the providers boundary (file added/touched in spec 08, but stub the call here from `App.jsx` if spec 08 hasn't reorganized providers yet).
6. **Delete** these files:
   - `src/firebase.js` (post-spec-01 path; if it was already moved, delete from there)
   - `firebase.json`
   - `.firebaserc`
   - `.github/workflows/firebase-deploy.yml`
7. **Update `package.json`**: `npm uninstall firebase` (or `pnpm remove firebase`). Lockfile updates accordingly.
8. **Update `vite.config.js`**: remove the `firebase` entry from the `manualChunks` map.
9. **Tests** (run through `test-writer`):
   - `src/entities/user/use-auth-session.test.jsx` — verifies the hook subscribes once, syncs Redux on `onAuthStateChange` events, unsubscribes on unmount.
   - `src/entities/user/auth-actions.test.js` — parameterized tests for `signIn`/`signUp`/`signOut` happy and error paths; mocks `supabase.auth.*`.
   - `src/app/pages/Login.test.jsx` — submitting valid creds dispatches `signIn`, errors render visibly, logged-in users redirect.
10. **Verify env wiring** still works: boot the app, sign up a brand-new user via the Login page, confirm the user appears in Supabase dashboard → Authentication → Users.
11. Run all gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Manual smoke: full sign-up → sign-in → sign-out cycle.
12. Commit as `feat: replace Firebase Auth with Supabase Auth (Firebase fully removed)`.

## Success Criteria

1. `grep -r "firebase" src/` returns zero hits (no source code references Firebase).
2. `grep "firebase" package.json` returns zero hits in `dependencies` / `devDependencies`.
3. `ls firebase.json .firebaserc src/firebase.js .github/workflows/firebase-deploy.yml` all error (files gone).
4. `vite.config.js` has no `firebase` chunk reference.
5. `pnpm dev` boots; sign-up with a fresh email creates a Supabase user (verifiable in dashboard); sign-in works; sign-out clears the session and redirects.
6. After sign-in, refresh the page — session persists (Supabase session restored from local storage).
7. After sign-out, hitting a protected route (`/profile`) redirects to `/auth/login`.
8. All tests in this spec pass; `test-writer` confirms AAA structure and behavior-over-implementation.
9. `pnpm typecheck`, `pnpm lint`, `pnpm build` all green.
10. `fsd-architect` reports zero violations: `useAuthSession` is in `entities/user/`, not `features/`; only `src/shared/api/supabase.js` imports from `@supabase/supabase-js`.

## Agents & Skills

**Agents (mandatory invocation):**
- `fsd-architect` — runs after every file move/delete in step 6, and after the slice/hook authoring in step 1, to verify entities/user does not import from features.
- `test-writer` — invoked at step 9 for the three test files (use-auth-session, auth-actions, Login). Validates the parameterized error-path tests and the `onAuthStateChange` subscription test.

**Skills (consulted by the agents during this spec):**
- `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md` — informs how `onAuthStateChange` is subscribed once and unsubscribed on unmount.
- `.claude/skills/vercel-react-best-practices/rules/advanced-init-once.md` — drives the "subscribe once at the providers boundary" pattern for `useAuthSession`.

**Notes:**
- No `prompt-engineer` here.
- The Firebase deletions (firebase.json, .firebaserc, the workflow file) are physical-file removals; `fsd-architect` re-verifies after deletions land.
