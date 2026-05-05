// @ts-check
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { supabase } from '@/shared/api/supabase';

// Spec 06 — RLS + signup-trigger smoke tests. Hits the real local Supabase
// stack on http://127.0.0.1:54421. Skipped automatically if the stack isn't
// reachable (CI without supabase, offline dev).

const url = import.meta.env.VITE_SUPABASE_URL;
let isLive = false;
try {
  const res = await fetch(`${url}/auth/v1/health`);
  isLive = res.ok;
} catch {
  isLive = false;
}
const d = isLive ? describe : describe.skip;

const uniqueEmail = () => `spec06-${crypto.randomUUID()}@test.local`;
const PASSWORD = 'matte-purple-42';

d('profiles RLS + signup trigger', () => {
  afterEach(async () => {
    await supabase.auth.signOut();
  });

  it('signup creates a public.profiles row via trigger within 2s', async () => {
    const email = uniqueEmail();
    const { data, error } = await supabase.auth.signUp({ email, password: PASSWORD });
    expect(error).toBeNull();
    const userId = data.user?.id;
    expect(userId).toBeTruthy();
    await expect
      .poll(
        async () => {
          const { data: row } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', /** @type {string} */ (userId))
            .maybeSingle();
          return row?.id;
        },
        { timeout: 2000, interval: 100 },
      )
      .toBe(userId);
  });

  describe('with two users (A, B)', () => {
    /** @type {string} */ let userAId;
    /** @type {string} */ let userBId;
    /** @type {string} */ let emailA;
    /** @type {string} */ let emailB;

    beforeAll(async () => {
      emailA = uniqueEmail();
      emailB = uniqueEmail();
      const a = await supabase.auth.signUp({ email: emailA, password: PASSWORD });
      if (a.error) throw a.error;
      userAId = /** @type {string} */ (a.data.user?.id);
      await supabase.auth.signOut();
      const b = await supabase.auth.signUp({ email: emailB, password: PASSWORD });
      if (b.error) throw b.error;
      userBId = /** @type {string} */ (b.data.user?.id);
      await supabase.auth.signOut();
    });

    it('signed-in user A sees only their own profile row', async () => {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailA,
        password: PASSWORD,
      });
      expect(signInErr).toBeNull();
      const { data, error } = await supabase.from('profiles').select('*');
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.id).toBe(userAId);
    });

    it("signed-in user A cannot read user B's row (RLS filters it to empty)", async () => {
      await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userBId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('signed-in user A cannot insert a row with id = user B uid (RLS denies)', async () => {
      await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
      const { error } = await supabase
        .from('profiles')
        .insert({ id: userBId, display_name: 'spoof' });
      expect(error).not.toBeNull();
      expect(error?.message ?? '').toMatch(/row-level security/i);
    });
  });
});
