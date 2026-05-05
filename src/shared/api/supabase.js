// @ts-check
import { createClient } from '@supabase/supabase-js';

/** @typedef {import('@/shared/types/supabase').SupabaseClient} SupabaseClient */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. Set it in .env.local — see .env.example.',
  );
}
if (!anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY. Set it in .env.local — see .env.example.',
  );
}

/** @type {SupabaseClient} */
export const supabase = createClient(url, anonKey);
