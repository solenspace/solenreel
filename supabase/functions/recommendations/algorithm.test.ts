// Pure-unit Deno tests for the scoring algorithm. No env, no network — runs
// anywhere `deno test` can execute. Run with:
//   deno test supabase/functions/recommendations/algorithm.test.ts
import {
  assert,
  assertAlmostEquals,
  assertEquals,
} from "jsr:@std/assert@^1";
import {
  aggregateEngagement,
  buildEngagedProfile,
  CAST_TOPN,
  CREW_JOBS,
  dropOlderThan90Days,
  EVENT_WEIGHTS,
  jaccard,
  preRankScore,
  scoreCandidate,
  topByValue,
  type EventRow,
  type TmdbMovieDetails,
  type TmdbMovieLite,
} from "./algorithm.ts";

const ev = (
  kind: EventRow["kind"],
  tmdb_id: number,
  ageMs = 0,
): EventRow => ({
  kind,
  tmdb_id,
  created_at: new Date(Date.now() - ageMs).toISOString(),
});

Deno.test("dropOlderThan90Days removes events past the cutoff", () => {
  const now = Date.parse("2026-05-07T00:00:00Z");
  const fresh = ev("tile_click", 1, 0);
  const edge = {
    kind: "tile_click" as const,
    tmdb_id: 2,
    created_at: new Date(now - 89 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const old = {
    kind: "tile_click" as const,
    tmdb_id: 3,
    created_at: new Date(now - 91 * 24 * 60 * 60 * 1000).toISOString(),
  };
  fresh.created_at = new Date(now).toISOString();

  const kept = dropOlderThan90Days([fresh, edge, old], now);
  assertEquals(
    kept.map((e) => e.tmdb_id),
    [1, 2],
  );
});

Deno.test("aggregateEngagement sums per-kind weights per tmdb_id", () => {
  const events: EventRow[] = [
    ev("tile_click", 100),
    ev("hover_start", 100),
    ev("trailer_play", 100),
    ev("trailer_complete", 100),
    ev("tile_click", 200),
  ];
  const totals = aggregateEngagement(events);
  // 1 + 0.3 + 2 + 4 = 7.3 for movie 100; 1 for movie 200.
  assertAlmostEquals(totals.get(100)!, 7.3);
  assertEquals(totals.get(200), 1);
});

Deno.test("aggregateEngagement preserves first-seen insertion order", () => {
  // First event (most-recent in caller's desc-sorted list) must be the first
  // key inserted — downstream topByValue relies on this for tie-break by
  // recency.
  const events: EventRow[] = [
    ev("tile_click", 42),
    ev("tile_click", 7),
    ev("tile_click", 7),
    ev("tile_click", 42),
  ];
  const totals = aggregateEngagement(events);
  assertEquals([...totals.keys()], [42, 7]);
});

Deno.test("EVENT_WEIGHTS matches spec literal", () => {
  // Spec 17 "Design Decisions" §3 step 3 — these weights are load-bearing.
  // A regression here silently degrades recommendation quality.
  assertEquals(EVENT_WEIGHTS, {
    tile_click: 1,
    hover_start: 0.3,
    trailer_play: 2,
    trailer_complete: 4,
  });
});

Deno.test("topByValue returns top-N entries desc by value", () => {
  const m = new Map([
    ["a", 1],
    ["b", 5],
    ["c", 3],
    ["d", 5],
    ["e", 0],
  ]);
  // Stable sort: 'b' inserted before 'd' for the tied weight 5.
  assertEquals(topByValue(m, 3), ["b", "d", "c"]);
});

Deno.test("topByValue ties preserve insertion order (recency tie-break)", () => {
  const m = new Map([
    [10, 2],
    [20, 2],
    [30, 2],
  ]);
  assertEquals(topByValue(m, 2), [10, 20]);
});

Deno.test("jaccard computes |A∩B| / |A∪B|", () => {
  assertEquals(jaccard(new Set([1, 2, 3]), new Set([2, 3, 4])), 2 / 4);
  assertEquals(jaccard(new Set([1, 2, 3]), new Set([1, 2, 3])), 1);
  assertEquals(jaccard(new Set([1, 2]), new Set([3, 4])), 0);
});

Deno.test("jaccard short-circuits to 0 when either side is empty", () => {
  assertEquals(jaccard(new Set<number>(), new Set([1])), 0);
  assertEquals(jaccard(new Set([1]), new Set<number>()), 0);
  assertEquals(jaccard(new Set<number>(), new Set<number>()), 0);
});

const detailsFixture = (overrides: Partial<TmdbMovieDetails> = {}): TmdbMovieDetails => ({
  id: 1,
  popularity: 50,
  genres: [{ id: 28 }, { id: 12 }],
  credits: {
    cast: [
      { id: 101, order: 0 },
      { id: 102, order: 1 },
      { id: 103, order: 2 },
    ],
    crew: [
      { id: 201, job: "Director" },
      { id: 202, job: "Writer" },
      { id: 203, job: "Composer" }, // not in CREW_JOBS — should be excluded
    ],
  },
  ...overrides,
});

Deno.test("buildEngagedProfile unions genres / top-N cast / filtered crew", () => {
  const profile = buildEngagedProfile([
    detailsFixture({
      id: 1,
      genres: [{ id: 28 }],
      credits: {
        cast: [{ id: 101 }, { id: 102 }],
        crew: [
          { id: 201, job: "Director" },
          { id: 999, job: "Composer" },
        ],
      },
    }),
    detailsFixture({
      id: 2,
      genres: [{ id: 35 }],
      credits: {
        cast: [{ id: 103 }],
        crew: [{ id: 202, job: "Writer" }],
      },
    }),
  ]);
  assertEquals(profile.genres, new Set([28, 35]));
  assertEquals(profile.cast, new Set([101, 102, 103]));
  assertEquals(profile.crew, new Set([201, 202])); // Composer 999 dropped
});

Deno.test("buildEngagedProfile caps each movie's cast at top-10", () => {
  const movie: TmdbMovieDetails = {
    id: 1,
    popularity: 0,
    genres: [],
    credits: {
      cast: Array.from({ length: 20 }, (_, i) => ({ id: 1000 + i, order: i })),
      crew: [],
    },
  };
  const profile = buildEngagedProfile([movie]);
  assertEquals(profile.cast.size, CAST_TOPN);
  // Ids 1000..1009 included; 1010..1019 dropped.
  assert(profile.cast.has(1009));
  assert(!profile.cast.has(1010));
});

Deno.test("CREW_JOBS matches the documented co-author set", () => {
  // Lock the set so a future contributor can't silently broaden it (which
  // would make crew_overlap noise-dominated).
  assertEquals(
    [...CREW_JOBS].sort(),
    ["Director", "Producer", "Screenplay", "Story", "Writer"],
  );
});

Deno.test("scoreCandidate composes the weighted Jaccard sum + popularity term", () => {
  const engaged = {
    genres: new Set([28, 12]),
    cast: new Set([101, 102]),
    crew: new Set([201]),
  };
  const candidate: TmdbMovieDetails = {
    id: 99,
    popularity: 50,
    genres: [{ id: 28 }],
    credits: {
      cast: [{ id: 101 }],
      crew: [{ id: 201, job: "Director" }],
    },
  };
  // genre overlap = |{28}| / |{28,12}| = 0.5
  // cast overlap  = |{101}| / |{101,102}| = 0.5
  // crew overlap  = 1
  // popularity_norm = 50 / 100 = 0.5
  // total = 0.4*0.5 + 0.3*0.5 + 0.2*1 + 0.1*0.5 = 0.2 + 0.15 + 0.2 + 0.05 = 0.6
  assertAlmostEquals(scoreCandidate(candidate, engaged, 100), 0.6);
});

Deno.test("scoreCandidate handles maxPopularity = 0 without NaN", () => {
  const engaged = { genres: new Set<number>(), cast: new Set<number>(), crew: new Set<number>() };
  const candidate: TmdbMovieDetails = {
    id: 1,
    popularity: 0,
    genres: [],
    credits: { cast: [], crew: [] },
  };
  assertEquals(scoreCandidate(candidate, engaged, 0), 0);
});

Deno.test("preRankScore uses /similar lite data only", () => {
  const engaged = {
    genres: new Set([28, 12]),
    cast: new Set([101]),
    crew: new Set([201]),
  };
  const candidate: TmdbMovieLite = {
    id: 99,
    popularity: 100,
    genre_ids: [28],
  };
  // genreOverlap = 0.5, popularityNorm = 1
  // pre-rank = 0.4*0.5 + 0.1*1 = 0.3
  assertAlmostEquals(preRankScore(candidate, engaged, 100), 0.3);
});
