// @ts-check
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/shared/api/supabase';

// Spec 14 — public.events RLS / append-only / constraint / cascade smoke tests.
// Hits the real local Supabase stack on http://127.0.0.1:54421. Skipped
// automatically if the stack isn't reachable (CI without supabase, offline dev).
//
// The cascade test (test 8) needs admin access to `auth.users`, which the
// anon-key client cannot provide. It builds a separate service-role client
// from `process.env.SUPABASE_SERVICE_ROLE_KEY` (NOT VITE_-prefixed, so Vite
// never inlines the secret into a browser bundle). When the env var is
// missing the cascade test alone skips via `it.skipIf`.

const url = import.meta.env.VITE_SUPABASE_URL;
let isLive = false;
try {
  const res = await fetch(`${url}/auth/v1/health`);
  isLive = res.ok;
} catch {
  isLive = false;
}
const d = isLive ? describe : describe.skip;

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient =
  isLive && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

const uniqueEmail = () => `spec14-${crypto.randomUUID()}@test.local`;
const PASSWORD = 'matte-purple-42';

d('events RLS + append-only + constraints + cascade', () => {
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

  afterEach(async () => {
    await supabase.auth.signOut();
  });

  it('signed-in user A can insert and select their own event', async () => {
    await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { data: inserted, error: insertErr } = await supabase
      .from('events')
      .insert({ user_id: userAId, kind: 'tile_click', tmdb_id: 550 })
      .select()
      .single();
    expect(insertErr).toBeNull();
    expect(inserted?.user_id).toBe(userAId);
    expect(inserted?.kind).toBe('tile_click');
    expect(inserted?.tmdb_id).toBe(550);

    const { data: rows, error: selectErr } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userAId);
    expect(selectErr).toBeNull();
    expect(rows?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(rows?.every((r) => r.user_id === userAId)).toBe(true);
  });

  it("signed-in user A cannot select user B's events (RLS filters to empty)", async () => {
    // Seed a row for B as B, then verify A sees nothing.
    await supabase.auth.signInWithPassword({ email: emailB, password: PASSWORD });
    const { error: seedErr } = await supabase
      .from('events')
      .insert({ user_id: userBId, kind: 'hover_start', tmdb_id: 680 });
    expect(seedErr).toBeNull();
    await supabase.auth.signOut();

    await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { data, error } = await supabase.from('events').select('*').eq('user_id', userBId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('signed-in user A cannot insert a row with user_id = user B (RLS denies)', async () => {
    await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { error } = await supabase
      .from('events')
      .insert({ user_id: userBId, kind: 'tile_click', tmdb_id: 550 });
    expect(error).not.toBeNull();
    expect(error?.message ?? '').toMatch(/row-level security/i);
  });

  it('update on own event row is silently denied (no update policy)', async () => {
    // Arrange: seed a row owned by A.
    await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { data: seeded, error: seedErr } = await supabase
      .from('events')
      .insert({ user_id: userAId, kind: 'trailer_play', tmdb_id: 9999 })
      .select()
      .single();
    expect(seedErr).toBeNull();
    const seededId = /** @type {number} */ (seeded?.id);

    // Act: attempt to update kind on A's own row.
    const { data: updated, error: updateErr } = await supabase
      .from('events')
      .update({ kind: 'trailer_complete' })
      .eq('id', seededId)
      .select();

    // Assert: missing UPDATE policy filters the row out before the write
    // applies, so the operation reports zero affected rows (no error). Either
    // an error OR an empty result is acceptable; the row's `kind` must not
    // have changed.
    if (updateErr === null) {
      expect(updated).toEqual([]);
    } else {
      expect(updateErr.message).toMatch(/row-level security|denied/i);
    }
    const { data: after } = await supabase
      .from('events')
      .select('kind')
      .eq('id', seededId)
      .single();
    expect(after?.kind).toBe('trailer_play');
  });

  it('delete on own event row is silently denied (no delete policy)', async () => {
    // Arrange: seed a row owned by A.
    await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { data: seeded, error: seedErr } = await supabase
      .from('events')
      .insert({ user_id: userAId, kind: 'trailer_complete', tmdb_id: 8888 })
      .select()
      .single();
    expect(seedErr).toBeNull();
    const seededId = /** @type {number} */ (seeded?.id);

    // Act: attempt to delete A's own row.
    const { data: deleted, error: deleteErr } = await supabase
      .from('events')
      .delete()
      .eq('id', seededId)
      .select();

    // Assert: same dual-tolerance pattern as the update test; the row must
    // still exist after the call.
    if (deleteErr === null) {
      expect(deleted).toEqual([]);
    } else {
      expect(deleteErr.message).toMatch(/row-level security|denied/i);
    }
    const { data: after, error: afterErr } = await supabase
      .from('events')
      .select('id')
      .eq('id', seededId)
      .maybeSingle();
    expect(afterErr).toBeNull();
    expect(after?.id).toBe(seededId);
  });

  it('insert with tmdb_id <= 0 fails events_tmdb_id_positive', async () => {
    await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { error } = await supabase
      .from('events')
      .insert({ user_id: userAId, kind: 'tile_click', tmdb_id: 0 });
    expect(error).not.toBeNull();
    expect(error?.message ?? '').toMatch(/events_tmdb_id_positive|check constraint/i);
  });

  it('insert with payload >= 4096 bytes fails events_payload_size_check', async () => {
    await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { error } = await supabase.from('events').insert({
      user_id: userAId,
      kind: 'tile_click',
      tmdb_id: 1,
      payload: { blob: 'x'.repeat(5000) },
    });
    expect(error).not.toBeNull();
    expect(error?.message ?? '').toMatch(/events_payload_size_check|check constraint/i);
  });

  it.skipIf(!adminClient)(
    'deleting a user from auth.users cascades to their events',
    async () => {
      const admin = /** @type {NonNullable<typeof adminClient>} */ (adminClient);
      // Spin up a fresh user dedicated to this test (so the teardown doesn't
      // wipe userA / userB whose ids the other tests rely on).
      const cascadeEmail = uniqueEmail();
      const signUp = await supabase.auth.signUp({ email: cascadeEmail, password: PASSWORD });
      if (signUp.error) throw signUp.error;
      const cascadeUid = /** @type {string} */ (signUp.data.user?.id);

      const { error: insertErr } = await supabase
        .from('events')
        .insert({ user_id: cascadeUid, kind: 'tile_click', tmdb_id: 1234 });
      expect(insertErr).toBeNull();
      await supabase.auth.signOut();

      // Verify the row is visible via the admin client (bypasses RLS).
      const { count: beforeCount, error: beforeErr } = await admin
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', cascadeUid);
      expect(beforeErr).toBeNull();
      expect(beforeCount).toBeGreaterThanOrEqual(1);

      const { error: deleteErr } = await admin.auth.admin.deleteUser(cascadeUid);
      expect(deleteErr).toBeNull();

      await expect
        .poll(
          async () => {
            const { count } = await admin
              .from('events')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', cascadeUid);
            return count ?? 0;
          },
          { timeout: 2000, interval: 100 },
        )
        .toBe(0);
    },
  );
});
