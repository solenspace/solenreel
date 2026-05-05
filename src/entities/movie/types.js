// @ts-check

/**
 * Normalized movie record. Every consumer in reel reads movies through this
 * shape, never raw TMDB payloads. Image paths are stored as raw TMDB paths
 * (e.g. `/abc.jpg`); compose URLs via `posterUrl` / `backdropUrl` from
 * `@/entities/movie/queries`.
 *
 * @typedef {object} Movie
 * @property {number} id
 * @property {string} title
 * @property {string} originalTitle
 * @property {string} releaseDate                  // 'YYYY-MM-DD' or ''
 * @property {number} year                         // derived; 0 when releaseDate is empty
 * @property {string|null} posterPath              // raw TMDB path, e.g. '/abc.jpg'
 * @property {string|null} backdropPath
 * @property {number[]} genreIds
 * @property {number} voteAverage                  // 0..10
 * @property {string} overview
 * @property {string|null} tagline                 // only on details
 * @property {number|null} runtime                 // minutes; only on details
 * @property {string|null} director                // only on details, from credits.crew
 * @property {string[]} moodTags                   // populated by spec 18 LLM (empty here)
 * @property {'movie'|'tv'} mediaType
 */

/**
 * @typedef {object} Video
 * @property {string} key                          // YouTube key
 * @property {string} site                         // 'YouTube' for v1
 * @property {string} type                         // 'Trailer' | 'Teaser' | ...
 * @property {string} name
 */

/**
 * @typedef {object} Credit
 * @property {number} id
 * @property {string} name
 * @property {string} [character]                  // cast only
 * @property {string} [job]                        // crew only
 * @property {string|null} profilePath
 */

/**
 * @typedef {object} Image
 * @property {string} filePath                     // raw TMDB path
 * @property {number} width
 * @property {number} height
 * @property {string|null} iso6391                 // language code or null
 */

/**
 * @typedef {object} ImageSet
 * @property {Image[]} logos
 * @property {Image[]} backdrops
 * @property {Image[]} posters
 */

/**
 * Movie + the extra fields TMDB returns when `append_to_response` is set on
 * the details endpoint. Returned by `fetchMovieDetails` / `fetchTVDetails`.
 *
 * @typedef {Movie & {
 *   videos: Video[],
 *   credits: { cast: Credit[], crew: Credit[] },
 *   similar: Movie[],
 *   images: ImageSet,
 *   genres: { id: number, name: string }[],
 * }} MovieDetails
 */

/**
 * Generic envelope for paginated TMDB list endpoints, with results already
 * normalized to `Movie` shape.
 *
 * @template T
 * @typedef {object} TmdbResponse
 * @property {number} page
 * @property {T[]} results
 * @property {number} totalPages
 * @property {number} totalResults
 */

export {};
