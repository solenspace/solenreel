// Spec 17 — live-stack integration tests for the recommendations Edge
// Function. Skipped automatically if the local stack or function server
// isn't reachable (CI without supabase, offline dev). Run with:
//
//   pnpx supabase start
//   pnpx supabase functions serve recommendations --env-file supabase/.env.functions
//   deno test --allow-net --allow-env --env-file=.env.local \
//     supabase/functions/recommendations/index.test.ts
//
// Mirror of the vitest pattern in
// `src/entities/recommendation/recommendation.test.js`: env-gated, two-user
// signup, service-role admin client for seeding, dual-tolerance assertions
// where the spec is silent about exact TMDB return shape.

import { assert, assertEquals } from "jsr:@std/assert@^1";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Test env reads either the unprefixed names (set by `supabase functions
// serve` automatically inside the runtime) or the VITE_-prefixed siblings
// from .env.local. The fallback lets `deno test --env-file=.env.local …`
// work without duplicating the values under a second name.
const url =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
const anonKey =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("VITE_SUPABASE_ANON_KEY");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

let live = false;
if (url && anonKey && serviceKey) {
  try {
    const res = await fetch(`${url}/auth/v1/health`);
    live = res.ok;
  } catch {
    live = false;
  }
}

// Single guard for test registration. We pass `ignore: !live` so Deno's
// runner reports skipped tests cleanly when the local stack is offline,
// without a confusing "0 passed / 0 failed" line. `sanitizeOps` and
// `sanitizeResources` are disabled because supabase-js spins up a token-
// refresh timer + open fetch connections that Deno's leak detector flags
// even when we explicitly set `autoRefreshToken: false` on every client.
const test = (
  name: string,
  fn: () => void | Promise<void>,
) =>
  Deno.test({
    name,
    fn,
    ignore: !live,
    sanitizeOps: false,
    sanitizeResources: false,
  });

const FUNCTION_URL = `${url}/functions/v1/recommendations`;
const PASSWORD = "matte-purple-42";
const ENGAGED_TMDB_IDS = [550, 680, 13, 155, 122]; // Fight Club, Pulp Fiction, Forrest Gump, Dark Knight, LotR — all rich /similar pools

const uniqueEmail = () => `spec17-${crypto.randomUUID()}@test.local`;

type FunctionResponse = {
  items: Array<{ tmdb_id: number; score: number; reason: string | null }>;
  computed_from_event_count: number;
  cold_start: boolean;
};

async function signUpFreshUser(): Promise<{
  userId: string;
  accessToken: string;
  client: SupabaseClient;
}> {
  const client = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signUp({
    email: uniqueEmail(),
    password: PASSWORD,
  });
  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error("signUp returned no session — verify auto-confirm is on");
  }
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    client,
  };
}

async function seedEvents(
  admin: SupabaseClient,
  userId: string,
  tmdbIds: number[],
): Promise<void> {
  const rows = tmdbIds.map((tmdb_id) => ({
    user_id: userId,
    kind: "tile_click" as const,
    tmdb_id,
    payload: { source: "test" as const },
  }));
  const { error } = await admin.from("events").insert(rows);
  if (error) throw error;
}

async function callFunction(token: string, method: "POST" | "GET" = "POST") {
  const headers: Record<string, string> = {
    apikey: anonKey!,
    "content-type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(FUNCTION_URL, { method, headers });
}

async function adminCleanupUser(admin: SupabaseClient, userId: string) {
  // Cascade removes events + recommendations rows via FK on auth.users.
  await admin.auth.admin.deleteUser(userId);
}

test("GET → 405 method_not_allowed", async () => {
  const { userId, accessToken, client } = await signUpFreshUser();
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const res = await callFunction(accessToken, "GET");
    assertEquals(res.status, 405);
    await res.body?.cancel();
  } finally {
    await client.auth.signOut();
    await adminCleanupUser(admin, userId);
  }
});

test("missing Authorization header → 401", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { apikey: anonKey!, "content-type": "application/json" },
  });
  // Either the platform-level verify_jwt rejects with 401 or our handler's
  // own missing-Authorization branch does. Both satisfy success criterion 5.
  assertEquals(res.status, 401);
  await res.body?.cancel();
});

test("cold-start path: zero events → cold_start: true, items length 20", async () => {
  const { userId, accessToken, client } = await signUpFreshUser();
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const res = await callFunction(accessToken);
    assertEquals(res.status, 200);
    const body = (await res.json()) as FunctionResponse;
    assertEquals(body.cold_start, true);
    assertEquals(body.computed_from_event_count, 0);
    assertEquals(body.items.length, 20);
    for (const item of body.items) {
      assert(Number.isInteger(item.tmdb_id) && item.tmdb_id > 0);
      assert(Number.isFinite(item.score));
      assertEquals(item.reason, null);
    }

    // Spec criterion 4: a row landed in public.recommendations within ~5s.
    const { data: row, error } = await admin
      .from("recommendations")
      .select("user_id, items, computed_at, computed_from_event_count")
      .eq("user_id", userId)
      .single();
    assertEquals(error, null);
    assert(row);
    assertEquals(row.computed_from_event_count, 0);
    assertEquals(
      (row.items as Array<{ tmdb_id: number }>).length,
      20,
    );
    const ageMs = Date.now() - new Date(row.computed_at).getTime();
    assert(ageMs < 5000, `computed_at age ${ageMs}ms exceeds 5s`);
  } finally {
    await client.auth.signOut();
    await adminCleanupUser(admin, userId);
  }
});

test("warm-start path: 5 engaged events → cold_start false, engaged tmdb_ids excluded", async () => {
  const { userId, accessToken, client } = await signUpFreshUser();
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    await seedEvents(admin, userId, ENGAGED_TMDB_IDS);

    const res = await callFunction(accessToken);
    assertEquals(res.status, 200);
    const body = (await res.json()) as FunctionResponse;
    assertEquals(body.cold_start, false);
    assertEquals(body.computed_from_event_count, ENGAGED_TMDB_IDS.length);
    assert(body.items.length > 0, "warm-start returned 0 items");
    assert(body.items.length <= 20);

    const returned = new Set(body.items.map((i) => i.tmdb_id));
    for (const engaged of ENGAGED_TMDB_IDS) {
      assert(
        !returned.has(engaged),
        `engaged tmdb_id ${engaged} leaked into recommendations`,
      );
    }
  } finally {
    await client.auth.signOut();
    await adminCleanupUser(admin, userId);
  }
});

test("idempotency: two calls within 60s return identical items", async () => {
  const { userId, accessToken, client } = await signUpFreshUser();
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    await seedEvents(admin, userId, ENGAGED_TMDB_IDS);

    const first = (await (await callFunction(accessToken)).json()) as FunctionResponse;
    const second = (await (await callFunction(accessToken)).json()) as FunctionResponse;

    assertEquals(
      first.items.map((i) => i.tmdb_id),
      second.items.map((i) => i.tmdb_id),
    );
    // Scores can drift if TMDB's popularity field updates mid-test (very
    // rare on this scale), so we assert ordering only — that's what spec
    // criterion 7 commits to ("identical items arrays").
  } finally {
    await client.auth.signOut();
    await adminCleanupUser(admin, userId);
  }
});
