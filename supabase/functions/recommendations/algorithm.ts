// Pure scoring functions. No `Deno.*`, no `fetch` — fully unit-testable
// from `algorithm.test.ts` against synthetic fixtures.
//
// The scoring formula in spec 17 ("Design Decisions" §3, step 5) requires
// genre/cast/crew overlap between each candidate and the user's engaged
// profile. The /similar endpoint returns lite movie summaries (genre_ids +
// popularity) without cast/crew, so honouring the literal formula requires
// fetching candidate details as well; that orchestration lives in
// `index.ts`. This module operates over already-fetched data.

export const EVENT_WEIGHTS = {
  tile_click: 1,
  hover_start: 0.3,
  trailer_play: 2,
  trailer_complete: 4,
} as const;

export type EventKind = keyof typeof EVENT_WEIGHTS;

export type EventRow = {
  kind: EventKind;
  tmdb_id: number;
  created_at: string;
};

export type TmdbCastMember = { id: number; order?: number };
export type TmdbCrewMember = { id: number; job: string };
export type TmdbGenre = { id: number; name?: string };

export type TmdbMovieLite = {
  id: number;
  popularity: number;
  genre_ids: number[];
};

export type TmdbMovieDetails = {
  id: number;
  popularity: number;
  genres: TmdbGenre[];
  credits: {
    cast: TmdbCastMember[];
    crew: TmdbCrewMember[];
  };
};

export type EngagedProfile = {
  genres: Set<number>;
  cast: Set<number>;
  crew: Set<number>;
};

// Crew jobs that signal authorship/co-authorship for editorial similarity.
// Director-only would be too sparse on most films; the broader set matches
// how a Letterboxd-style audience reasons about "who made this".
export const CREW_JOBS = new Set([
  "Director",
  "Writer",
  "Screenplay",
  "Story",
  "Producer",
]);

// Top-N cast cap. /movie/{id}/credits returns cast already sorted by `order`
// asc; the leading 10 are the on-screen leads. Below that we hit bit-part
// noise that dilutes the Jaccard signal.
export const CAST_TOPN = 10;

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function dropOlderThan90Days(
  events: EventRow[],
  now: number = Date.now(),
): EventRow[] {
  const cutoff = now - NINETY_DAYS_MS;
  return events.filter((e) => Date.parse(e.created_at) >= cutoff);
}

// Sum per-tmdb_id engagement weights. Insertion order tracks event recency
// because the caller passes events sorted desc by created_at; downstream
// `topByValue` relies on stable sort to break weight ties by recency.
export function aggregateEngagement(events: EventRow[]): Map<number, number> {
  const totals = new Map<number, number>();
  for (const e of events) {
    const weight = EVENT_WEIGHTS[e.kind];
    if (weight === undefined) continue;
    totals.set(e.tmdb_id, (totals.get(e.tmdb_id) ?? 0) + weight);
  }
  return totals;
}

// Stable top-N over Map<K, number> by descending value. Ties preserve
// insertion order (Array.prototype.sort is stable from ES2019; Deno V8
// honours that). Spec criterion 7 ("idempotent within 60s") requires
// stability everywhere we sort.
export function topByValue<K>(map: Map<K, number>, n: number): K[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function buildEngagedProfile(
  details: TmdbMovieDetails[],
): EngagedProfile {
  const genres = new Set<number>();
  const cast = new Set<number>();
  const crew = new Set<number>();
  for (const d of details) {
    for (const g of d.genres ?? []) genres.add(g.id);
    const topCast = (d.credits?.cast ?? []).slice(0, CAST_TOPN);
    for (const c of topCast) cast.add(c.id);
    for (const c of d.credits?.crew ?? []) {
      if (CREW_JOBS.has(c.job)) crew.add(c.id);
    }
  }
  return { genres, cast, crew };
}

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  // Iterate the smaller set; membership lookup is O(1) on the larger.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const v of small) if (large.has(v)) intersection += 1;
  const unionSize = a.size + b.size - intersection;
  return unionSize === 0 ? 0 : intersection / unionSize;
}

// Candidate scoring with the full spec formula. `maxPopularity` is the max
// over the post-filter candidate set (passed in by the caller so this stays
// pure / cheap). When maxPopularity is 0 (degenerate test fixture), the
// popularity term is treated as 0 rather than NaN.
export function scoreCandidate(
  candidate: TmdbMovieDetails,
  engaged: EngagedProfile,
  maxPopularity: number,
): number {
  const candidateGenres = new Set((candidate.genres ?? []).map((g) => g.id));
  const candidateCast = new Set(
    (candidate.credits?.cast ?? []).slice(0, CAST_TOPN).map((c) => c.id),
  );
  const candidateCrew = new Set(
    (candidate.credits?.crew ?? [])
      .filter((c) => CREW_JOBS.has(c.job))
      .map((c) => c.id),
  );
  const genreOverlap = jaccard(engaged.genres, candidateGenres);
  const castOverlap = jaccard(engaged.cast, candidateCast);
  const crewOverlap = jaccard(engaged.crew, candidateCrew);
  const popularityNorm =
    maxPopularity > 0 ? candidate.popularity / maxPopularity : 0;
  return (
    genreOverlap * 0.4 +
    castOverlap * 0.3 +
    crewOverlap * 0.2 +
    popularityNorm * 0.1
  );
}

// Pre-rank score using only /similar lite data (no candidate details).
// Used to cap the candidate fetch fan-out: when |union of /similar| > N,
// we pre-rank with this and only fetch details for the top N. Lower
// resolution than `scoreCandidate` but enough to discard obviously poor
// matches before paying for their /movie/{id} round-trip.
export function preRankScore(
  candidate: TmdbMovieLite,
  engaged: EngagedProfile,
  maxPopularity: number,
): number {
  const candidateGenres = new Set(candidate.genre_ids ?? []);
  const genreOverlap = jaccard(engaged.genres, candidateGenres);
  const popularityNorm =
    maxPopularity > 0 ? candidate.popularity / maxPopularity : 0;
  return genreOverlap * 0.4 + popularityNorm * 0.1;
}
