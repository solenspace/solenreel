// @ts-check
/**
 * Spec 06 — types:gen
 *
 * Runs `pnpx supabase gen types typescript --local --schema public` against
 * the running local Supabase stack and writes two protected artifacts:
 *
 *   src/shared/types/supabase-database.d.ts  (raw `Database` type from CLI)
 *   src/shared/types/supabase.js             (JSDoc shim with Profile typedef)
 *
 * Both files start with `// GENERATED — DO NOT EDIT.` so the
 * `reel/supabase-generated-check` ESLint rule keeps them out of human edits.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPES_DIR = resolve(HERE, '..', 'src', 'shared', 'types');
const DTS_PATH = resolve(TYPES_DIR, 'supabase-database.d.ts');
const JS_PATH = resolve(TYPES_DIR, 'supabase.js');

const HEADER = '// GENERATED — DO NOT EDIT. Run `pnpm types:gen` to regenerate.\n';

const JS_SHIM = `${HEADER}// @ts-check

/**
 * Project-wide DB-derived typedefs, generated from the live Postgres schema
 * via \`pnpx supabase gen types typescript --local\`. The raw \`Database\` type
 * lives in ./supabase-database.d.ts; this file exposes named JSDoc typedefs
 * that the rest of the codebase imports from.
 *
 * @typedef {import('./supabase-database').Database} Database
 * @typedef {Database['public']['Tables']['profiles']['Row']} Profile
 * @typedef {Database['public']['Tables']['profiles']['Insert']} ProfileInsert
 * @typedef {Database['public']['Tables']['profiles']['Update']} ProfileUpdate
 */

export {};
`;

let raw;
try {
  raw = execFileSync(
    'pnpx',
    ['supabase', 'gen', 'types', 'typescript', '--local', '--schema', 'public'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
} catch (err) {
  console.error('[types:gen] supabase gen types failed.');
  console.error('Is the local stack running? Run `pnpx supabase status` to check.');
  console.error('Expected URL: http://127.0.0.1:54421 (db on 54422).\n');
  if (err && typeof err === 'object' && 'stderr' in err) {
    console.error(String(err.stderr));
  }
  process.exit(1);
}

mkdirSync(TYPES_DIR, { recursive: true });
writeFileSync(DTS_PATH, HEADER + raw, 'utf8');
writeFileSync(JS_PATH, JS_SHIM, 'utf8');

console.log(`[types:gen] wrote ${DTS_PATH}`);
console.log(`[types:gen] wrote ${JS_PATH}`);
