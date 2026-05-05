// @ts-check
import { useQuery } from '@tanstack/react-query';
import {
  fetchTrending,
  fetchPopular,
  fetchTopRated,
  fetchByGenre,
  fetchOriginals,
  fetchMovieDetails,
  fetchTVDetails,
  fetchMovieVideos,
  fetchMovieImages,
  searchMulti,
} from '@/shared/api/tmdb';
import { useDebounce } from '@/shared/lib/use-debounce';

/**
 * @typedef {import('@tanstack/react-query').UseQueryOptions} UseQueryOptions
 */

/** Catalogue queries reuse a 5-minute stale window per architecture invariant 3. */
const DEFAULT_STALE_TIME = 5 * 60_000;
const DEFAULT_GC_TIME = 30 * 60_000;

/**
 * Trending movies for the given window. Default `'week'` matches the legacy
 * Netflix-clone Banner data source.
 *
 * @param {'day'|'week'} [window]
 * @param {Partial<UseQueryOptions>} [options]
 */
export function useTrending(window = 'week', options) {
  return useQuery({
    queryKey: ['tmdb', 'trending', window],
    queryFn: () => fetchTrending(window),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...options,
  });
}

/**
 * Popular movies (TMDB `/movie/popular`).
 *
 * @param {number} [page]
 * @param {Partial<UseQueryOptions>} [options]
 */
export function usePopular(page = 1, options) {
  return useQuery({
    queryKey: ['tmdb', 'popular', page],
    queryFn: () => fetchPopular(page),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...options,
  });
}

/**
 * Top-rated movies.
 *
 * @param {number} [page]
 * @param {Partial<UseQueryOptions>} [options]
 */
export function useTopRated(page = 1, options) {
  return useQuery({
    queryKey: ['tmdb', 'top-rated', page],
    queryFn: () => fetchTopRated(page),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...options,
  });
}

/**
 * Movies for a single TMDB genre id (uses `GENRES` constants for
 * known-good ids). Disabled when `genreId` is falsy.
 *
 * @param {number|null|undefined} genreId
 * @param {number} [page]
 * @param {Partial<UseQueryOptions>} [options]
 */
export function useByGenre(genreId, page = 1, options) {
  return useQuery({
    queryKey: ['tmdb', 'by-genre', genreId, page],
    queryFn: () => fetchByGenre(/** @type {number} */ (genreId), page),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: !!genreId,
    ...options,
  });
}

/**
 * "Originals" row (TMDB `/discover/tv?with_networks=213`). Retained for v1
 * content parity; spec 11 retires this in favor of mood shelves.
 *
 * @param {Partial<UseQueryOptions>} [options]
 */
export function useOriginals(options) {
  return useQuery({
    queryKey: ['tmdb', 'originals'],
    queryFn: () => fetchOriginals(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...options,
  });
}

/**
 * Full movie details with `videos`, `credits`, `similar`, and `images`
 * appended. Disabled when `id` is falsy.
 *
 * @param {number|string|null|undefined} id
 * @param {Partial<UseQueryOptions>} [options]
 */
export function useMovieDetails(id, options) {
  return useQuery({
    queryKey: ['tmdb', 'movie', id],
    queryFn: () => fetchMovieDetails(/** @type {number|string} */ (id)),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: !!id,
    ...options,
  });
}

/**
 * Full TV details (parallel of `useMovieDetails`).
 *
 * @param {number|string|null|undefined} id
 * @param {Partial<UseQueryOptions>} [options]
 */
export function useTVDetails(id, options) {
  return useQuery({
    queryKey: ['tmdb', 'tv', id],
    queryFn: () => fetchTVDetails(/** @type {number|string} */ (id)),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: !!id,
    ...options,
  });
}

/**
 * Lightweight videos-only fetch (Banner trailer auto-play).
 *
 * @param {number|string|null|undefined} id
 * @param {Partial<UseQueryOptions>} [options]
 */
export function useMovieVideos(id, options) {
  return useQuery({
    queryKey: ['tmdb', 'movie-videos', id],
    queryFn: () => fetchMovieVideos(/** @type {number|string} */ (id)),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: !!id,
    ...options,
  });
}

/**
 * Image set (logos / backdrops / posters) — used by Banner for editorial
 * logo rendering when a localized logo is available.
 *
 * @param {number|string|null|undefined} id
 * @param {Partial<UseQueryOptions>} [options]
 */
export function useMovieImages(id, options) {
  return useQuery({
    queryKey: ['tmdb', 'movie-images', id],
    queryFn: () => fetchMovieImages(/** @type {number|string} */ (id)),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: !!id,
    ...options,
  });
}

/**
 * Multi-search across movies + TV. Debounces internally (400ms) so callers
 * can pass the live input value without wiring `useDebounce` themselves.
 * The fetch is suppressed until the debounced query is at least 2 chars.
 *
 * @param {string} query
 * @param {Partial<UseQueryOptions>} [options]
 */
export function useSearchMulti(query, options) {
  const debounced = useDebounce(query, 400);
  return useQuery({
    queryKey: ['tmdb', 'search', debounced],
    queryFn: () => searchMulti(debounced),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: debounced.length >= 2,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Re-exports — entity-layer surface for image URL helpers + genre map.
// Consumers import these from `@/entities/movie/queries` so that
// `@/shared/api/tmdb` is only imported here and in the singleton's own
// test (success criterion 3 of spec 09).
// ---------------------------------------------------------------------------

export {
  posterUrl,
  backdropUrl,
  logoUrl,
  profileUrl,
  genreIdsToNames,
  GENRES,
} from '@/shared/api/tmdb';
