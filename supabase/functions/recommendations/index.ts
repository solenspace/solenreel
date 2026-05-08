// Spec 17 — Recommendations Edge Function. POST-only; user identified via
// JWT in the `Authorization` header. Reads recent events (RLS path) and
// either returns a TMDB-popular cold-start list or a content-based ranking
// of the union of /similar lists for the user's top-5 most-engaged movies.
// Result is upserted into `public.recommendations` via the service role
// before being returned, so spec 18's UI can read from the table on
// subsequent loads instead of re-invoking the function on every page view.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  aggregateEngagement,
  buildEngagedProfile,
  dropOlderThan90Days,
  preRankScore,
  scoreCandidate,
  topByValue,
  type EventRow,
  type TmdbMovieDetails,
  type TmdbMovieLite,
} from "./algorithm.ts";
import { makeTmdbClient, TmdbRateLimitError } from "./tmdb.ts";
import { type Output, validateOutput } from "./schema.ts";

const COLD_START_THRESHOLD = 5;
const TOP_ENGAGED_COUNT = 5;
const RESULT_LIMIT = 20;
// Cap on candidate-details fetches per warm-start invocation. The union of
// 5 /similar lists is at most ~100 candidates pre-dedup; capping at 60
// keeps tail latency bounded even when TMDB returns large similar sets.
const CANDIDATE_DETAIL_CAP = 60;

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const tmdbKey = Deno.env.get("TMDB_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !tmdbKey) {
    console.error("recommendations: missing required env vars");
    return new Response("server_misconfigured", { status: 500 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userResult, error: authErr } = await userClient.auth.getUser();
  if (authErr || !userResult?.user) {
    return new Response("unauthorized", { status: 401 });
  }
  const userId = userResult.user.id;

  // RLS-enforced read: the user JWT in the client headers means PostgREST
  // applies the `events_select_own` policy automatically.
  const { data: rawEvents, error: eventsErr } = await userClient
    .from("events")
    .select("kind, tmdb_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (eventsErr) {
    console.error("recommendations: events read failed", eventsErr);
    return new Response("db_read_failed", { status: 500 });
  }

  const events = dropOlderThan90Days((rawEvents ?? []) as EventRow[]);
  const tmdb = makeTmdbClient(tmdbKey);

  let output: Output;
  try {
    // Cheap-condition-first: branch before any TMDB round-trip
    // (vercel-react-best-practices/rules/async-cheap-condition-before-await).
    if (events.length < COLD_START_THRESHOLD) {
      output = await coldStartOutput(tmdb, events.length);
    } else {
      output = await warmStartOutput(tmdb, events);
    }
  } catch (e) {
    if (e instanceof TmdbRateLimitError) {
      return json({ error: "tmdb_unavailable" }, { status: 502 });
    }
    throw e;
  }

  validateOutput(output);

  // Service-role upsert bypasses RLS — `public.recommendations` has no
  // insert/update/delete policy; only this code path can write. A failed
  // write does NOT block the response: the UI gets a usable list either
  // way (spec 17 "Design Decisions" §"Error handling"), and the next call
  // will re-attempt the upsert.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { error: writeErr } = await adminClient
    .from("recommendations")
    .upsert(
      {
        user_id: userId,
        items: output.items,
        computed_at: new Date().toISOString(),
        computed_from_event_count: output.computed_from_event_count,
      },
      { onConflict: "user_id" },
    );
  if (writeErr) {
    console.error("recommendations: upsert failed", writeErr);
  }

  return json(output);
});

async function coldStartOutput(
  tmdb: ReturnType<typeof makeTmdbClient>,
  eventCount: number,
): Promise<Output> {
  const popular = await tmdb.popular();
  const top = popular.results.slice(0, RESULT_LIMIT);
  const maxPop = top.reduce((m, r) => Math.max(m, r.popularity), 0) || 1;
  // Stable order: TMDB returns popular descending by popularity already; we
  // preserve that ordering and break ties by ascending tmdb_id for
  // idempotency (spec criterion 7).
  const items = top
    .map((r) => ({
      tmdb_id: r.id,
      score: r.popularity / maxPop,
      reason: null,
    }))
    .sort((a, b) => b.score - a.score || a.tmdb_id - b.tmdb_id);
  return {
    items,
    computed_from_event_count: eventCount,
    cold_start: true,
  };
}

async function warmStartOutput(
  tmdb: ReturnType<typeof makeTmdbClient>,
  events: EventRow[],
): Promise<Output> {
  const engagement = aggregateEngagement(events);
  const topEngagedIds = topByValue(engagement, TOP_ENGAGED_COUNT);

  // Parallel fetch: 5 detail calls + 5 similar calls per
  // vercel-react-best-practices/rules/async-parallel.md.
  const [details, similars] = await Promise.all([
    Promise.all(topEngagedIds.map((id) => tmdb.movieWithCredits(id))),
    Promise.all(topEngagedIds.map((id) => tmdb.similar(id))),
  ]);

  const engagedProfile = buildEngagedProfile(details);
  const engagedSet = new Set(events.map((e) => e.tmdb_id));

  // Union of /similar results, dedup, exclude already-engaged.
  const candidateLite = new Map<number, TmdbMovieLite>();
  for (const list of similars) {
    for (const m of list.results) {
      if (!engagedSet.has(m.id)) candidateLite.set(m.id, m);
    }
  }

  // Fallback when the entire candidate pool is empty (e.g., the user has
  // engaged with every similar movie, or TMDB returned empty /similar
  // lists for all top-5). Return TMDB popular minus engaged, keeping
  // cold_start: false because the user does have events.
  if (candidateLite.size === 0) {
    const popular = await tmdb.popular();
    const filtered = popular.results.filter((r) => !engagedSet.has(r.id));
    const top = filtered.slice(0, RESULT_LIMIT);
    const maxPop = top.reduce((m, r) => Math.max(m, r.popularity), 0) || 1;
    const items = top
      .map((r) => ({
        tmdb_id: r.id,
        score: r.popularity / maxPop,
        reason: null,
      }))
      .sort((a, b) => b.score - a.score || a.tmdb_id - b.tmdb_id);
    return {
      items,
      computed_from_event_count: events.length,
      cold_start: false,
    };
  }

  // If the candidate pool exceeds CANDIDATE_DETAIL_CAP, pre-rank using
  // /similar lite data and only fetch details for the top N. Bounds the
  // worst-case TMDB fan-out without changing rankings on the typical path
  // (a 5×20 union is ~60 candidates pre-dedup, well under the cap).
  const liteMaxPop = [...candidateLite.values()].reduce(
    (m, c) => Math.max(m, c.popularity),
    0,
  );
  const lite = [...candidateLite.values()];
  const liteRanked =
    lite.length <= CANDIDATE_DETAIL_CAP
      ? lite
      : lite
          .map((c) => ({
            c,
            s: preRankScore(c, engagedProfile, liteMaxPop),
          }))
          .sort((a, b) => b.s - a.s || a.c.id - b.c.id)
          .slice(0, CANDIDATE_DETAIL_CAP)
          .map((x) => x.c);

  const candidateDetails: TmdbMovieDetails[] = await Promise.all(
    liteRanked.map((c) => tmdb.movieWithCredits(c.id)),
  );
  const fullMaxPop = candidateDetails.reduce(
    (m, c) => Math.max(m, c.popularity),
    0,
  );

  const scored = candidateDetails
    .map((c) => ({
      tmdb_id: c.id,
      score: scoreCandidate(c, engagedProfile, fullMaxPop),
      reason: null as string | null,
    }))
    .sort((a, b) => b.score - a.score || a.tmdb_id - b.tmdb_id)
    .slice(0, RESULT_LIMIT);

  return {
    items: scored,
    computed_from_event_count: events.length,
    cold_start: false,
  };
}
