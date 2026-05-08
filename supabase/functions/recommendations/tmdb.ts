// Thin TMDB v3 client built on `fetch` (no axios — that's the browser
// singleton's lane in `src/shared/api/tmdb.js`). Owns a per-invocation
// `Map<string, Promise<unknown>>` cache so repeat reads inside one Edge
// Function call coalesce, but no shared state across invocations — matches
// spec 17 "Design Decisions" §3 step 4 ("re-fetched each function call").
//
// 429 from upstream → throws `TmdbRateLimitError`; the request handler
// translates that to a 502 with `{ error: "tmdb_unavailable" }`.

import type { TmdbMovieDetails, TmdbMovieLite } from "./algorithm.ts";

export class TmdbRateLimitError extends Error {
  constructor() {
    super("tmdb_rate_limited");
    this.name = "TmdbRateLimitError";
  }
}

export type TmdbList<T> = { results: T[] };

const TMDB_BASE = "https://api.themoviedb.org/3";

export type TmdbClient = {
  popular(): Promise<TmdbList<TmdbMovieLite>>;
  movieWithCredits(id: number): Promise<TmdbMovieDetails>;
  similar(id: number): Promise<TmdbList<TmdbMovieLite>>;
};

export function makeTmdbClient(apiKey: string): TmdbClient {
  if (!apiKey) {
    throw new Error("makeTmdbClient: missing TMDB_API_KEY");
  }
  // Per-invocation memoization: same path+params returns the in-flight
  // promise instead of issuing a duplicate request. Critical when two of
  // the top-5 engaged movies share a candidate that we then re-fetch as a
  // candidate detail.
  const inflight = new Map<string, Promise<unknown>>();

  const get = async <T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T> => {
    const search = new URLSearchParams({ api_key: apiKey, ...params });
    // Stable cache key — `URLSearchParams` insertion order is preserved by
    // the browser/Deno spec, but we sort defensively to keep the key
    // identical regardless of caller order.
    const sortedKey = `${path}?${[...search.entries()]
      .filter(([k]) => k !== "api_key")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&")}`;
    const cached = inflight.get(sortedKey);
    if (cached) return cached as Promise<T>;

    const promise = (async () => {
      const res = await fetch(`${TMDB_BASE}${path}?${search.toString()}`);
      if (res.status === 429) throw new TmdbRateLimitError();
      if (!res.ok) {
        throw new Error(
          `tmdb ${path} failed: ${res.status} ${res.statusText}`,
        );
      }
      return (await res.json()) as T;
    })();
    inflight.set(sortedKey, promise);
    return promise;
  };

  return {
    popular: () =>
      get<TmdbList<TmdbMovieLite>>("/movie/popular", { page: "1" }),
    movieWithCredits: (id: number) =>
      get<TmdbMovieDetails>(`/movie/${id}`, {
        append_to_response: "credits",
      }),
    similar: (id: number) => get<TmdbList<TmdbMovieLite>>(`/movie/${id}/similar`),
  };
}
