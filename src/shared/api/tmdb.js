// @ts-check
import axios from 'axios';

/**
 * Loose TMDB record shape. Tightened in a later spec dedicated to TMDB types;
 * for now `Record<string, any>` reflects the v1 reality that we read many
 * optional fields off catalogue/details responses without a strict schema.
 *
 * @typedef {Record<string, any>} Movie
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

export const img = {
  /**
   * @param {string | null | undefined} path
   * @param {string} [size]
   * @returns {string | undefined}
   */
  backdrop: (path, size = 'original') => (path ? `${IMAGE_BASE}/${size}${path}` : undefined),
  /**
   * @param {string | null | undefined} path
   * @param {string} [size]
   * @returns {string | undefined}
   */
  poster: (path, size = 'w500') => (path ? `${IMAGE_BASE}/${size}${path}` : undefined),
  /**
   * @param {string | null | undefined} path
   * @returns {string | undefined}
   */
  logo: (path) => (path ? `${IMAGE_BASE}/original${path}` : undefined),
  /**
   * @param {string | null | undefined} path
   * @param {string} [size]
   * @returns {string | undefined}
   */
  profile: (path, size = 'w185') => (path ? `${IMAGE_BASE}/${size}${path}` : undefined),
};

/** @returns {Promise<Movie[]>} */
export const fetchTrending = () => tmdb.get('/trending/movie/week').then((r) => r.data.results);

/** @returns {Promise<Movie[]>} */
export const fetchNetflixOriginals = () =>
  tmdb.get('/discover/tv', { params: { with_networks: 213 } }).then((r) => r.data.results);

/** @returns {Promise<Movie[]>} */
export const fetchTopRated = () => tmdb.get('/movie/top_rated').then((r) => r.data.results);

/**
 * @param {number} genreId
 * @returns {Promise<Movie[]>}
 */
export const fetchByGenre = (genreId) =>
  tmdb
    .get('/discover/movie', {
      params: { with_genres: genreId, sort_by: 'popularity.desc' },
    })
    .then((r) => r.data.results);

/**
 * @param {number | string} movieId
 * @returns {Promise<Movie>}
 */
export const fetchMovieDetails = (movieId) =>
  tmdb
    .get(`/movie/${movieId}`, {
      params: {
        append_to_response: 'videos,credits,similar,images',
        include_image_language: 'en,null',
      },
    })
    .then((r) => r.data);

/**
 * @param {number | string} tvId
 * @returns {Promise<Movie>}
 */
export const fetchTVDetails = (tvId) =>
  tmdb
    .get(`/tv/${tvId}`, {
      params: {
        append_to_response: 'videos,credits,similar,images',
        include_image_language: 'en,null',
      },
    })
    .then((r) => r.data);

/**
 * @param {string} query
 * @returns {Promise<Movie[]>}
 */
export const searchMulti = (query) =>
  tmdb.get('/search/multi', { params: { query } }).then((r) => r.data.results);

/**
 * @param {number | string} movieId
 * @returns {Promise<Movie>}
 */
export const fetchMovieImages = (movieId) =>
  tmdb
    .get(`/movie/${movieId}/images`, { params: { include_image_language: 'en,null' } })
    .then((r) => r.data);

/**
 * @param {number | string} movieId
 * @returns {Promise<Movie[]>}
 */
export const fetchMovieVideos = (movieId) =>
  tmdb.get(`/movie/${movieId}/videos`).then((r) => r.data.results);

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

export default tmdb;
