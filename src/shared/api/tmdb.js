// @ts-check
import axios from 'axios';

/**
 * Singleton TMDB client. The single source of truth for any HTTP call to TMDB
 * in the codebase. Components and entities never import `axios` directly —
 * they read movies through the typed hooks in `@/entities/movie/queries`.
 *
 * All list fetchers return a normalized `TmdbResponse<Movie>`; details
 * fetchers return a `MovieDetails`. Image paths in the normalized records
 * are kept as raw TMDB paths (e.g. `/abc.jpg`) so consumers can compose URLs
 * at any size via the helpers below.
 */

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const IMAGE_BASE = import.meta.env.VITE_TMDB_IMAGE_BASE;

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: {
    api_key: TMDB_API_KEY,
    language: 'en-US',
  },
});

// ---------------------------------------------------------------------------
// Image URL helpers
// ---------------------------------------------------------------------------

/**
 * Compose a poster URL from a raw TMDB path.
 * Sizes documented by TMDB: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original'.
 *
 * @param {string|null|undefined} path
 * @param {string} [size]
 * @returns {string|null}
 */
export const posterUrl = (path, size = 'w342') =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;

/**
 * Compose a backdrop URL from a raw TMDB path.
 * Sizes documented by TMDB: 'w300' | 'w780' | 'w1280' | 'original'.
 *
 * @param {string|null|undefined} path
 * @param {string} [size]
 * @returns {string|null}
 */
export const backdropUrl = (path, size = 'original') =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;

/**
 * Compose a logo URL from a raw TMDB path.
 *
 * @param {string|null|undefined} path
 * @param {string} [size]
 * @returns {string|null}
 */
export const logoUrl = (path, size = 'original') =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;

/**
 * Compose a person profile-photo URL from a raw TMDB path.
 *
 * @param {string|null|undefined} path
 * @param {string} [size]
 * @returns {string|null}
 */
export const profileUrl = (path, size = 'w185') =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;

// ---------------------------------------------------------------------------
// Genre map (TMDB v3 canonical)
// ---------------------------------------------------------------------------

const GENRE_NAMES = /** @type {const} */ ({
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
});

/**
 * Subset of `GENRE_NAMES` used as named query selectors in `useByGenre`.
 * Keep the keys human-friendly; the underlying numeric ids match TMDB.
 */
export const GENRES = {
  ACTION: 28,
  COMEDY: 35,
  HORROR: 27,
  ROMANCE: 10749,
  DOCUMENTARY: 99,
  THRILLER: 53,
  ANIMATION: 16,
  SCIFI: 878,
};

/**
 * Resolve TMDB genre ids to display names. Unknown ids are dropped.
 *
 * @param {number[]} ids
 * @returns {string[]}
 */
export const genreIdsToNames = (ids) => {
  if (!Array.isArray(ids)) return [];
  /** @type {string[]} */
  const out = [];
  for (const id of ids) {
    const name = /** @type {Record<number, string>} */ (GENRE_NAMES)[id];
    if (name) out.push(name);
  }
  return out;
};

// ---------------------------------------------------------------------------
// Mappers (raw TMDB → normalized Movie / MovieDetails)
// ---------------------------------------------------------------------------

/**
 * @param {string} releaseDate
 * @returns {number}
 */
const yearOf = (releaseDate) => {
  if (!releaseDate) return 0;
  const y = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isFinite(y) ? y : 0;
};

/**
 * @param {Record<string, any>} raw
 * @returns {'movie' | 'tv'}
 */
const mediaTypeOf = (raw) => {
  if (raw.media_type === 'tv') return 'tv';
  if (raw.media_type === 'movie') return 'movie';
  // TV-only fields imply media_type='tv' when TMDB omitted it (e.g. /tv/:id).
  if (raw.first_air_date || raw.name || raw.original_name) return 'tv';
  return 'movie';
};

/**
 * @param {Record<string, any> | null | undefined} creditsRaw
 * @returns {string|null}
 */
const directorFromCredits = (creditsRaw) => {
  const crew = creditsRaw?.crew;
  if (!Array.isArray(crew)) return null;
  const dir = crew.find(
    /** @param {Record<string, any>} c */
    (c) => c?.job === 'Director',
  );
  return dir?.name ?? null;
};

/**
 * Map a raw TMDB movie/tv record (list-shape OR details-shape) into a
 * normalized `Movie`. Fields absent on list shapes are returned as their
 * empty/null defaults; the details shape extension lives in `mapDetails`.
 *
 * @param {Record<string, any>} raw
 * @returns {import('@/entities/movie/types').Movie}
 */
export const mapMovie = (raw) => {
  const releaseDate = raw.release_date ?? raw.first_air_date ?? '';
  /** @type {number[]} */
  const genreIds = Array.isArray(raw.genre_ids)
    ? raw.genre_ids
    : Array.isArray(raw.genres)
      ? raw.genres
          .map(/** @param {{id: number}} g */ (g) => g.id)
          .filter(/** @param {number} id */ (id) => typeof id === 'number')
      : [];

  return {
    id: raw.id,
    title: raw.title ?? raw.name ?? '',
    originalTitle: raw.original_title ?? raw.original_name ?? '',
    releaseDate,
    year: yearOf(releaseDate),
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    genreIds,
    voteAverage: typeof raw.vote_average === 'number' ? raw.vote_average : 0,
    overview: raw.overview ?? '',
    tagline: raw.tagline ?? null,
    runtime: typeof raw.runtime === 'number' ? raw.runtime : null,
    director: directorFromCredits(raw.credits),
    moodTags: [],
    mediaType: mediaTypeOf(raw),
  };
};

/**
 * @param {Record<string, any>} raw
 * @returns {import('@/entities/movie/types').Video}
 */
const mapVideo = (raw) => ({
  key: raw.key ?? '',
  site: raw.site ?? '',
  type: raw.type ?? '',
  name: raw.name ?? '',
});

/**
 * @param {Record<string, any>} raw
 * @returns {import('@/entities/movie/types').Image}
 */
const mapImage = (raw) => ({
  filePath: raw.file_path ?? '',
  width: typeof raw.width === 'number' ? raw.width : 0,
  height: typeof raw.height === 'number' ? raw.height : 0,
  iso6391: raw.iso_639_1 ?? null,
});

/**
 * @param {Record<string, any>} raw
 * @returns {import('@/entities/movie/types').Credit}
 */
const mapCredit = (raw) => {
  /** @type {import('@/entities/movie/types').Credit} */
  const credit = {
    id: raw.id,
    name: raw.name ?? '',
    profilePath: raw.profile_path ?? null,
  };
  if (typeof raw.character === 'string') credit.character = raw.character;
  if (typeof raw.job === 'string') credit.job = raw.job;
  return credit;
};

/**
 * Map a raw details payload (with `append_to_response=videos,credits,similar,images`)
 * into a normalized `MovieDetails`.
 *
 * @param {Record<string, any>} raw
 * @returns {import('@/entities/movie/types').MovieDetails}
 */
export const mapDetails = (raw) => {
  const base = mapMovie(raw);
  /** @type {Array<Record<string, any>>} */
  const rawVideos = raw.videos?.results ?? [];
  /** @type {Array<Record<string, any>>} */
  const rawCast = raw.credits?.cast ?? [];
  /** @type {Array<Record<string, any>>} */
  const rawCrew = raw.credits?.crew ?? [];
  /** @type {Array<Record<string, any>>} */
  const rawSimilar = raw.similar?.results ?? [];

  return {
    ...base,
    videos: rawVideos.map(mapVideo),
    credits: {
      cast: rawCast.map(mapCredit),
      crew: rawCrew.map(mapCredit),
    },
    similar: rawSimilar.map(mapMovie),
    images: {
      logos: (raw.images?.logos ?? []).map(mapImage),
      backdrops: (raw.images?.backdrops ?? []).map(mapImage),
      posters: (raw.images?.posters ?? []).map(mapImage),
    },
    genres: Array.isArray(raw.genres) ? raw.genres : [],
  };
};

/**
 * @template T
 * @param {Record<string, any>} envelope
 * @param {(raw: Record<string, any>) => T} map
 * @returns {import('@/entities/movie/types').TmdbResponse<T>}
 */
const mapResponse = (envelope, map) => ({
  page: typeof envelope.page === 'number' ? envelope.page : 1,
  results: Array.isArray(envelope.results) ? envelope.results.map(map) : [],
  totalPages: typeof envelope.total_pages === 'number' ? envelope.total_pages : 0,
  totalResults: typeof envelope.total_results === 'number' ? envelope.total_results : 0,
});

// ---------------------------------------------------------------------------
// List fetchers
// ---------------------------------------------------------------------------

/**
 * Trending movies on TMDB for the given window.
 *
 * @param {'day'|'week'} [window]
 * @returns {Promise<import('@/entities/movie/types').TmdbResponse<import('@/entities/movie/types').Movie>>}
 */
export const fetchTrending = (window = 'week') =>
  tmdb.get(`/trending/movie/${window}`).then((r) => mapResponse(r.data, mapMovie));

/**
 * Popular movies on TMDB.
 *
 * @param {number} [page]
 * @returns {Promise<import('@/entities/movie/types').TmdbResponse<import('@/entities/movie/types').Movie>>}
 */
export const fetchPopular = (page = 1) =>
  tmdb.get('/movie/popular', { params: { page } }).then((r) => mapResponse(r.data, mapMovie));

/**
 * Top-rated movies on TMDB.
 *
 * @param {number} [page]
 * @returns {Promise<import('@/entities/movie/types').TmdbResponse<import('@/entities/movie/types').Movie>>}
 */
export const fetchTopRated = (page = 1) =>
  tmdb.get('/movie/top_rated', { params: { page } }).then((r) => mapResponse(r.data, mapMovie));

/**
 * Movies filtered by a single TMDB genre id, sorted by popularity.
 *
 * @param {number} genreId
 * @param {number} [page]
 * @returns {Promise<import('@/entities/movie/types').TmdbResponse<import('@/entities/movie/types').Movie>>}
 */
export const fetchByGenre = (genreId, page = 1) =>
  tmdb
    .get('/discover/movie', {
      params: { with_genres: genreId, sort_by: 'popularity.desc', page },
    })
    .then((r) => mapResponse(r.data, mapMovie));

/**
 * Streaming-platform "originals" surface. Underlying TMDB query is
 * `/discover/tv?with_networks=213` (Netflix's network id) — kept for content
 * parity until spec 11 retires this row in favor of mood-driven shelves.
 * The function name is neutral so the entity layer doesn't leak the
 * platform-specific filter.
 *
 * @returns {Promise<import('@/entities/movie/types').TmdbResponse<import('@/entities/movie/types').Movie>>}
 */
export const fetchOriginals = () =>
  tmdb
    .get('/discover/tv', { params: { with_networks: 213 } })
    .then((r) => mapResponse(r.data, mapMovie));

/**
 * Multi-search across movies, TV, and people; results are filtered to the
 * media types reel renders (movie / tv) and normalized into `Movie` shape.
 *
 * @param {string} query
 * @param {number} [page]
 * @returns {Promise<import('@/entities/movie/types').TmdbResponse<import('@/entities/movie/types').Movie>>}
 */
export const searchMulti = (query, page = 1) =>
  tmdb.get('/search/multi', { params: { query, page } }).then((r) => {
    const filtered = Array.isArray(r.data?.results)
      ? r.data.results.filter(
          /** @param {Record<string, any>} item */
          (item) => item.media_type === 'movie' || item.media_type === 'tv',
        )
      : [];
    return mapResponse({ ...r.data, results: filtered }, mapMovie);
  });

// ---------------------------------------------------------------------------
// Single-resource fetchers
// ---------------------------------------------------------------------------

/**
 * Full movie details with credits, videos, similar titles, and images
 * appended in a single request.
 *
 * @param {number|string} movieId
 * @returns {Promise<import('@/entities/movie/types').MovieDetails>}
 */
export const fetchMovieDetails = (movieId) =>
  tmdb
    .get(`/movie/${movieId}`, {
      params: {
        append_to_response: 'videos,credits,similar,images',
        include_image_language: 'en,null',
      },
    })
    .then((r) => mapDetails(r.data));

/**
 * Full TV details (mirror of `fetchMovieDetails`). Used when a multi-search
 * result resolves to a TV show rather than a movie.
 *
 * @param {number|string} tvId
 * @returns {Promise<import('@/entities/movie/types').MovieDetails>}
 */
export const fetchTVDetails = (tvId) =>
  tmdb
    .get(`/tv/${tvId}`, {
      params: {
        append_to_response: 'videos,credits,similar,images',
        include_image_language: 'en,null',
      },
    })
    .then((r) => mapDetails(r.data));

/**
 * Just the videos for a movie (lightweight; used by Banner for the auto-play
 * trailer where the full details payload is unnecessary).
 *
 * @param {number|string} movieId
 * @returns {Promise<import('@/entities/movie/types').Video[]>}
 */
export const fetchMovieVideos = (movieId) =>
  tmdb
    .get(`/movie/${movieId}/videos`)
    .then((r) => (Array.isArray(r.data?.results) ? r.data.results.map(mapVideo) : []));

/**
 * Image set for a movie (logos, backdrops, posters). Banner uses the logos
 * for editorial-style title rendering when a localized logo is available.
 *
 * @param {number|string} movieId
 * @returns {Promise<import('@/entities/movie/types').ImageSet>}
 */
export const fetchMovieImages = (movieId) =>
  tmdb
    .get(`/movie/${movieId}/images`, { params: { include_image_language: 'en,null' } })
    .then((r) => ({
      logos: Array.isArray(r.data?.logos) ? r.data.logos.map(mapImage) : [],
      backdrops: Array.isArray(r.data?.backdrops) ? r.data.backdrops.map(mapImage) : [],
      posters: Array.isArray(r.data?.posters) ? r.data.posters.map(mapImage) : [],
    }));

export default tmdb;
