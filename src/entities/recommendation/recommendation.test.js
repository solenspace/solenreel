// @ts-check
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/shared/api/supabase';

// Spec 16 — public.recommendations RLS / read-only-by-client / items-cap /
// cascade smoke tests. Hits the real local Supabase stack on
// http://127.0.0.1:54421. Skipped automatically if the stack isn't reachable
// (CI without supabase, offline dev).
//
// Recommendations is the inverse-shape table to events: clients are
// read-only, the Edge Function writes via the service role. Most cases here
// therefore need the admin client to seed, and skip cleanly via `it.skipIf`
// when SUPABASE_SERVICE_ROLE_KEY is absent.

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

const uniqueEmail = () => `spec16-${crypto.randomUUID()}@test.local`;
const PASSWORD = 'matte-purple-42';

/**
 * Build an `items` array of the requested length whose tmdb_ids are
 * deterministic and scores descend, matching the column convention.
 *
 * @param {number} length
 * @returns {Array<{ tmdb_id: number, score: number, reason: string | null }>}
 */
const makeItems = (length) =>
  Array.from({ length }, (_, i) => ({
    tmdb_id: 1000 + i,
    score: Number((1 - i / 100).toFixed(2)),
    reason: null,
  }));

d('recommendations RLS + read-only-by-client + items-cap + cascade', () => {
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

  it.skipIf(!adminClient)('signed-in user A can select their own recommendation row', async () => {
    const admin = /** @type {NonNullable<typeof adminClient>} */ (adminClient);
    // Arrange: admin seeds A's row (only the service role can write).
    const items = makeItems(3);
    const { error: seedErr } = await admin
      .from('recommendations')
      .upsert(
        { user_id: userAId, items, computed_from_event_count: 17 },
        { onConflict: 'user_id' },
      );
    expect(seedErr).toBeNull();

    // Act: A signs in and reads own row.
    await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', userAId)
      .single();

    // Assert: row visible, shape matches, breadcrumb persisted.
    expect(error).toBeNull();
    expect(data?.user_id).toBe(userAId);
    expect(/** @type {Array<unknown> | undefined} */ (data?.items)).toHaveLength(3);
    expect(data?.computed_from_event_count).toBe(17);
  });

  it.skipIf(!adminClient)(
    "signed-in user A cannot select user B's recommendation row (RLS filters to empty)",
    async () => {
      const admin = /** @type {NonNullable<typeof adminClient>} */ (adminClient);
      // Arrange: admin seeds B's row.
      const { error: seedErr } = await admin
        .from('recommendations')
        .upsert(
          { user_id: userBId, items: makeItems(2), computed_from_event_count: 5 },
          { onConflict: 'user_id' },
        );
      expect(seedErr).toBeNull();

      // Act: A signs in and tries to read B's row by user_id.
      await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', userBId);

      // Assert: RLS filters the row out before return; no error, empty result.
      expect(error).toBeNull();
      expect(data).toEqual([]);
    },
  );

  it('signed-in user A cannot insert into recommendations (no insert policy)', async () => {
    await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { error } = await supabase
      .from('recommendations')
      .insert({ user_id: userAId, items: [] });
    expect(error).not.toBeNull();
    expect(error?.message ?? '').toMatch(/row-level security/i);
  });

  it.skipIf(!adminClient)(
    'update on own recommendation row is silently denied (no update policy)',
    async () => {
      const admin = /** @type {NonNullable<typeof adminClient>} */ (adminClient);
      // Arrange: admin seeds A's row with three items.
      const seededItems = makeItems(3);
      const { error: seedErr } = await admin
        .from('recommendations')
        .upsert(
          { user_id: userAId, items: seededItems, computed_from_event_count: 9 },
          { onConflict: 'user_id' },
        );
      expect(seedErr).toBeNull();

      // Act: A signs in and tries to wipe items.
      await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
      const { data: updated, error: updateErr } = await supabase
        .from('recommendations')
        .update({ items: [] })
        .eq('user_id', userAId)
        .select();

      // Assert: missing UPDATE policy filters the row out before the write
      // applies, so the operation reports zero affected rows (no error).
      // Either an error OR an empty result is acceptable; the row's `items`
      // must not have changed (admin re-select bypasses RLS).
      if (updateErr === null) {
        expect(updated).toEqual([]);
      } else {
        expect(updateErr.message).toMatch(/row-level security|denied/i);
      }
      const { data: after, error: afterErr } = await admin
        .from('recommendations')
        .select('items')
        .eq('user_id', userAId)
        .single();
      expect(afterErr).toBeNull();
      expect(/** @type {Array<unknown> | undefined} */ (after?.items)).toHaveLength(3);
    },
  );

  it.skipIf(!adminClient)(
    'delete on own recommendation row is silently denied (no delete policy)',
    async () => {
      const admin = /** @type {NonNullable<typeof adminClient>} */ (adminClient);
      // Arrange: admin seeds A's row.
      const { error: seedErr } = await admin
        .from('recommendations')
        .upsert(
          { user_id: userAId, items: makeItems(2), computed_from_event_count: 1 },
          { onConflict: 'user_id' },
        );
      expect(seedErr).toBeNull();

      // Act: A signs in and tries to delete own row.
      await supabase.auth.signInWithPassword({ email: emailA, password: PASSWORD });
      const { data: deleted, error: deleteErr } = await supabase
        .from('recommendations')
        .delete()
        .eq('user_id', userAId)
        .select();

      // Assert: same dual-tolerance pattern as the update test; the row must
      // still exist after the call (admin re-select bypasses RLS).
      if (deleteErr === null) {
        expect(deleted).toEqual([]);
      } else {
        expect(deleteErr.message).toMatch(/row-level security|denied/i);
      }
      const { data: after, error: afterErr } = await admin
        .from('recommendations')
        .select('user_id')
        .eq('user_id', userAId)
        .maybeSingle();
      expect(afterErr).toBeNull();
      expect(after?.user_id).toBe(userAId);
    },
  );

  it.skipIf(!adminClient)('service-role insert with items at the cap (50) succeeds', async () => {
    const admin = /** @type {NonNullable<typeof adminClient>} */ (adminClient);
    // Spin up a fresh user so this test does not depend on or mutate the
    // shared A/B fixtures, and to exercise the on-conflict-free insert path.
    const email = uniqueEmail();
    const signUp = await supabase.auth.signUp({ email, password: PASSWORD });
    if (signUp.error) throw signUp.error;
    const uid = /** @type {string} */ (signUp.data.user?.id);
    await supabase.auth.signOut();

    const { error: insertErr } = await admin
      .from('recommendations')
      .insert({ user_id: uid, items: makeItems(50), computed_from_event_count: 100 });
    expect(insertErr).toBeNull();

    const { data, error: readErr } = await admin
      .from('recommendations')
      .select('items, computed_from_event_count')
      .eq('user_id', uid)
      .single();
    expect(readErr).toBeNull();
    expect(/** @type {Array<unknown> | undefined} */ (data?.items)).toHaveLength(50);
    expect(data?.computed_from_event_count).toBe(100);
  });

  it.skipIf(!adminClient)(
    'service-role insert with 51 items fails recommendations_items_cap',
    async () => {
      const admin = /** @type {NonNullable<typeof adminClient>} */ (adminClient);
      // Use a fresh user so any prior row for A/B does not turn this into an
      // upsert-conflict test instead of a constraint test.
      const email = uniqueEmail();
      const signUp = await supabase.auth.signUp({ email, password: PASSWORD });
      if (signUp.error) throw signUp.error;
      const uid = /** @type {string} */ (signUp.data.user?.id);
      await supabase.auth.signOut();

      const { error } = await admin
        .from('recommendations')
        .insert({ user_id: uid, items: makeItems(51) });
      expect(error).not.toBeNull();
      expect(error?.message ?? '').toMatch(/recommendations_items_cap|check constraint/i);
    },
  );

  it.skipIf(!adminClient)(
    'deleting a user from auth.users cascades to their recommendations row',
    async () => {
      const admin = /** @type {NonNullable<typeof adminClient>} */ (adminClient);
      // Spin up a fresh user dedicated to this test (so the teardown doesn't
      // wipe userA / userB whose ids the other tests rely on).
      const cascadeEmail = uniqueEmail();
      const signUp = await supabase.auth.signUp({ email: cascadeEmail, password: PASSWORD });
      if (signUp.error) throw signUp.error;
      const cascadeUid = /** @type {string} */ (signUp.data.user?.id);
      await supabase.auth.signOut();

      const { error: insertErr } = await admin
        .from('recommendations')
        .insert({ user_id: cascadeUid, items: makeItems(4), computed_from_event_count: 7 });
      expect(insertErr).toBeNull();

      // Verify the row is visible via the admin client (bypasses RLS).
      const { count: beforeCount, error: beforeErr } = await admin
        .from('recommendations')
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
              .from('recommendations')
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
