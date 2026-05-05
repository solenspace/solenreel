// @ts-check

/**
 * Project-local auth typedefs. Re-exports from `@supabase/supabase-js`
 * (the package types) plus the normalized `AppAuthError` shape that the
 * `signIn`/`signUp`/`signOut` thunks reject with.
 *
 * Kept separate from `./supabase.js` (which is GENERATED from the DB schema
 * via `pnpm types:gen`) so the generated file can stay strictly DB-derived.
 *
 * @typedef {import('@supabase/supabase-js').Session} Session
 * @typedef {import('@supabase/supabase-js').User} User
 * @typedef {import('@supabase/supabase-js').AuthError} AuthError
 *
 * @typedef {object} AppAuthError
 * @property {string} code
 * @property {string} message
 * @property {number} [status]
 */

export {};
