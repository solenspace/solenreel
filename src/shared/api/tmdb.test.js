// @ts-check
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted axios mock — `axios.create()` returns a single shared client whose
// `.get` is the spy every test reads from.
const mockGet = vi.fn();
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({ get: mockGet })),
  },
}));

vi.stubEnv('VITE_TMDB_API_KEY', 'TEST_KEY');
vi.stubEnv('VITE_TMDB_IMAGE_BASE', 'https://image.tmdb.org/t/p');

const {
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
  posterUrl,
  backdropUrl,
  logoUrl,
  profileUrl,
  genreIdsToNames,
  mapMovie,
  mapDetails,
} = await import('./tmdb');

/** Fixture: TMDB list-shape movie record (raw, snake_case). */
const RAW_LIST_MOVIE = {
  id: 42,
  title: 'Blade Runner 2049',
  original_title: 'Blade Runner 2049',
  release_date: '2017-10-06',
  poster_path: '/blade.jpg',
  backdrop_path: '/blade-bg.jpg',
  genre_ids: [28, 878],
  vote_average: 8.1,
  overview: 'Thirty years after...',
  media_type: 'movie',
};

/** Fixture: TMDB details-shape with append_to_response (videos/credits/similar/images). */
const RAW_DETAILS = {
  ...RAW_LIST_MOVIE,
  tagline: 'The key to the future is...',
  runtime: 164,
  genres: [
    { id: 28, name: 'Action' },
    { id: 878, name: 'Science Fiction' },
  ],
  videos: {
    results: [
      { key: 'abc', site: 'YouTube', type: 'Trailer', name: 'Official Trailer' },
      { key: 'xyz', site: 'YouTube', type: 'Teaser', name: 'Teaser' },
    ],
  },
  credits: {
    cast: [
      { id: 1, name: 'Ryan Gosling', character: 'K', profile_path: '/rg.jpg' },
      { id: 2, name: 'Harrison Ford', character: 'Deckard', profile_path: null },
    ],
    crew: [
      { id: 99, name: 'Denis Villeneuve', job: 'Director', profile_path: '/dv.jpg' },
      { id: 100, name: 'Hampton Fancher', job: 'Writer', profile_path: null },
    ],
  },
  similar: {
    results: [{ id: 7, title: 'Arrival', release_date: '2016-11-11', poster_path: '/arrival.jpg' }],
  },
  images: {
    logos: [{ file_path: '/logo.png', width: 800, height: 200, iso_639_1: 'en' }],
    backdrops: [{ file_path: '/bd.jpg', width: 1920, height: 1080, iso_639_1: null }],
    posters: [{ file_path: '/poster.jpg', width: 500, height: 750, iso_639_1: 'en' }],
  },
};

/** Fixture: TMDB tv-shape (uses `name` / `first_air_date` / `original_name`). */
const RAW_TV = {
  id: 100,
  name: 'Stranger Things',
  original_name: 'Stranger Things',
  first_air_date: '2016-07-15',
  poster_path: '/st.jpg',
  backdrop_path: null,
  genre_ids: [18, 9648],
  vote_average: 8.6,
  overview: 'A small town...',
  media_type: 'tv',
};

/**
 * @param {Array<Record<string, any>>} results
 * @param {number} [page]
 */
const wrapEnvelope = (results, page = 1) => ({
  page,
  results,
  total_pages: 10,
  total_results: results.length * 10,
});

beforeEach(() => {
  mockGet.mockReset();
});

describe('image URL helpers', () => {
  it('posterUrl returns null for null/undefined paths', () => {
    expect(posterUrl(null)).toBeNull();
    expect(posterUrl(undefined)).toBeNull();
  });

  it('posterUrl uses w342 by default and accepts size overrides', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
    expect(posterUrl('/abc.jpg', 'w780')).toBe('https://image.tmdb.org/t/p/w780/abc.jpg');
  });

  it('backdropUrl uses original by default', () => {
    expect(backdropUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/original/abc.jpg');
    expect(backdropUrl(null)).toBeNull();
  });

  it('logoUrl and profileUrl produce expected shapes', () => {
    expect(logoUrl('/l.png')).toBe('https://image.tmdb.org/t/p/original/l.png');
    expect(profileUrl('/p.jpg')).toBe('https://image.tmdb.org/t/p/w185/p.jpg');
    expect(logoUrl(null)).toBeNull();
    expect(profileUrl(null)).toBeNull();
  });
});

describe('genreIdsToNames', () => {
  it('maps known TMDB genre ids to display names', () => {
    expect(genreIdsToNames([28, 35])).toEqual(['Action', 'Comedy']);
  });

  it('drops unknown ids', () => {
    expect(genreIdsToNames([28, 99999, 27])).toEqual(['Action', 'Horror']);
  });

  it('returns empty for empty / non-array input', () => {
    expect(genreIdsToNames([])).toEqual([]);
    // @ts-expect-error — intentionally exercising defensive branch
    expect(genreIdsToNames(null)).toEqual([]);
  });
});

describe('mapMovie', () => {
  it('normalizes a list-shape movie record', () => {
    expect(mapMovie(RAW_LIST_MOVIE)).toEqual({
      id: 42,
      title: 'Blade Runner 2049',
      originalTitle: 'Blade Runner 2049',
      releaseDate: '2017-10-06',
      year: 2017,
      posterPath: '/blade.jpg',
      backdropPath: '/blade-bg.jpg',
      genreIds: [28, 878],
      voteAverage: 8.1,
      overview: 'Thirty years after...',
      tagline: null,
      runtime: null,
      director: null,
      moodTags: [],
      mediaType: 'movie',
    });
  });

  it('falls back to TV-only fields when movie fields are absent', () => {
    const out = mapMovie(RAW_TV);
    expect(out.title).toBe('Stranger Things');
    expect(out.originalTitle).toBe('Stranger Things');
    expect(out.releaseDate).toBe('2016-07-15');
    expect(out.year).toBe(2016);
    expect(out.mediaType).toBe('tv');
  });

  it('infers mediaType="tv" from TV-only fields when media_type is absent', () => {
    const out = mapMovie({ id: 1, name: 'X', first_air_date: '2020-01-01' });
    expect(out.mediaType).toBe('tv');
  });

  it('extracts director from credits.crew when present', () => {
    const out = mapMovie(RAW_DETAILS);
    expect(out.director).toBe('Denis Villeneuve');
  });

  it('returns year=0 when releaseDate is empty', () => {
    expect(mapMovie({ id: 1, title: 'X' }).year).toBe(0);
  });

  it('initializes moodTags as an empty array', () => {
    expect(mapMovie(RAW_LIST_MOVIE).moodTags).toEqual([]);
  });

  it('flattens raw.genres[].id when genre_ids is absent (details shape)', () => {
    const out = mapMovie({
      id: 1,
      title: 'X',
      genres: [{ id: 28, name: 'Action' }, { id: 35, name: 'Comedy' }],
    });
    expect(out.genreIds).toEqual([28, 35]);
  });
});

describe('mapDetails', () => {
  it('extends mapMovie with normalized videos / credits / similar / images', () => {
    const out = mapDetails(RAW_DETAILS);

    expect(out.id).toBe(42);
    expect(out.runtime).toBe(164);
    expect(out.tagline).toBe('The key to the future is...');
    expect(out.director).toBe('Denis Villeneuve');

    expect(out.videos).toEqual([
      { key: 'abc', site: 'YouTube', type: 'Trailer', name: 'Official Trailer' },
      { key: 'xyz', site: 'YouTube', type: 'Teaser', name: 'Teaser' },
    ]);

    expect(out.credits.cast).toHaveLength(2);
    expect(out.credits.cast[0]).toEqual({
      id: 1,
      name: 'Ryan Gosling',
      character: 'K',
      profilePath: '/rg.jpg',
    });
    expect(out.credits.crew[0]).toEqual({
      id: 99,
      name: 'Denis Villeneuve',
      job: 'Director',
      profilePath: '/dv.jpg',
    });

    expect(out.similar).toHaveLength(1);
    expect(out.similar[0].title).toBe('Arrival');

    expect(out.images.logos[0]).toEqual({
      filePath: '/logo.png',
      width: 800,
      height: 200,
      iso6391: 'en',
    });
    expect(out.images.backdrops).toHaveLength(1);
    expect(out.images.posters).toHaveLength(1);

    expect(out.genres).toEqual([
      { id: 28, name: 'Action' },
      { id: 878, name: 'Science Fiction' },
    ]);
  });

  it('tolerates missing append_to_response sections', () => {
    const out = mapDetails({ id: 1, title: 'X', release_date: '' });
    expect(out.videos).toEqual([]);
    expect(out.credits.cast).toEqual([]);
    expect(out.credits.crew).toEqual([]);
    expect(out.similar).toEqual([]);
    expect(out.images.logos).toEqual([]);
    expect(out.images.backdrops).toEqual([]);
    expect(out.images.posters).toEqual([]);
    expect(out.genres).toEqual([]);
  });
});

describe('list fetchers — URL + params shape', () => {
  /** @type {Array<[
   *   string,
   *   () => Promise<unknown>,
   *   string,
   *   Record<string, unknown> | undefined,
   * ]>} */
  const cases = [
    ['fetchTrending (default week)', () => fetchTrending(), '/trending/movie/week', undefined],
    ['fetchTrending (day)', () => fetchTrending('day'), '/trending/movie/day', undefined],
    ['fetchPopular (default page)', () => fetchPopular(), '/movie/popular', { page: 1 }],
    ['fetchPopular (page 3)', () => fetchPopular(3), '/movie/popular', { page: 3 }],
    ['fetchTopRated', () => fetchTopRated(), '/movie/top_rated', { page: 1 }],
    [
      'fetchByGenre',
      () => fetchByGenre(28),
      '/discover/movie',
      { with_genres: 28, sort_by: 'popularity.desc', page: 1 },
    ],
    [
      'fetchOriginals',
      () => fetchOriginals(),
      '/discover/tv',
      { with_networks: 213 },
    ],
    [
      'searchMulti',
      () => searchMulti('blade'),
      '/search/multi',
      { query: 'blade', page: 1 },
    ],
  ];

  it.each(cases)('%s hits the right URL with the right params', async (_label, call, url, params) => {
    mockGet.mockResolvedValueOnce({ data: wrapEnvelope([RAW_LIST_MOVIE]) });
    await call();
    expect(mockGet).toHaveBeenCalledTimes(1);
    if (params === undefined) {
      expect(mockGet).toHaveBeenCalledWith(url);
    } else {
      expect(mockGet).toHaveBeenCalledWith(url, { params });
    }
  });

  it('returns a normalized TmdbResponse<Movie>', async () => {
    // Arrange
    mockGet.mockResolvedValueOnce({ data: wrapEnvelope([RAW_LIST_MOVIE], 2) });

    // Act
    const out = await fetchTrending();

    // Assert
    expect(out.page).toBe(2);
    expect(out.totalPages).toBe(10);
    expect(out.totalResults).toBe(10);
    expect(out.results).toHaveLength(1);
    expect(out.results[0].title).toBe('Blade Runner 2049');
    expect(out.results[0].posterPath).toBe('/blade.jpg');
  });

  it('passes an empty results envelope through cleanly', async () => {
    // Arrange
    mockGet.mockResolvedValueOnce({ data: wrapEnvelope([]) });

    // Act
    const out = await fetchTrending();

    // Assert
    expect(out.results).toEqual([]);
    expect(out.totalResults).toBe(0);
  });

  it('searchMulti drops non-movie/tv items so consumers never see Person records', async () => {
    // Arrange
    mockGet.mockResolvedValueOnce({
      data: wrapEnvelope([
        RAW_LIST_MOVIE,
        { id: 5, name: 'Some Person', media_type: 'person' },
        RAW_TV,
      ]),
    });

    // Act
    const out = await searchMulti('x');

    // Assert
    expect(out.results.map((r) => r.id)).toEqual([42, 100]);
  });
});

describe('detail fetchers — URL + params shape', () => {
  it('fetchMovieDetails hits /movie/:id with append_to_response and returns MovieDetails', async () => {
    mockGet.mockResolvedValueOnce({ data: RAW_DETAILS });
    const out = await fetchMovieDetails(42);
    expect(mockGet).toHaveBeenCalledWith('/movie/42', {
      params: {
        append_to_response: 'videos,credits,similar,images',
        include_image_language: 'en,null',
      },
    });
    expect(out.runtime).toBe(164);
    expect(out.videos).toHaveLength(2);
    expect(out.images.logos).toHaveLength(1);
  });

  it('fetchTVDetails hits /tv/:id with the same append_to_response', async () => {
    mockGet.mockResolvedValueOnce({ data: { ...RAW_DETAILS, ...RAW_TV } });
    await fetchTVDetails(100);
    expect(mockGet).toHaveBeenCalledWith('/tv/100', {
      params: {
        append_to_response: 'videos,credits,similar,images',
        include_image_language: 'en,null',
      },
    });
  });

  it('fetchMovieVideos returns a flat Video[] mapped from .results', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        results: [
          { key: 'abc', site: 'YouTube', type: 'Trailer', name: 'Official Trailer' },
        ],
      },
    });
    const out = await fetchMovieVideos(42);
    expect(mockGet).toHaveBeenCalledWith('/movie/42/videos');
    expect(out).toEqual([
      { key: 'abc', site: 'YouTube', type: 'Trailer', name: 'Official Trailer' },
    ]);
  });

  it('fetchMovieImages returns a normalized ImageSet', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        logos: [{ file_path: '/l.png', width: 1, height: 1, iso_639_1: 'en' }],
        backdrops: [{ file_path: '/b.jpg', width: 1920, height: 1080, iso_639_1: null }],
        posters: [],
      },
    });
    const out = await fetchMovieImages(42);
    expect(mockGet).toHaveBeenCalledWith('/movie/42/images', {
      params: { include_image_language: 'en,null' },
    });
    expect(out.logos[0]).toEqual({
      filePath: '/l.png',
      width: 1,
      height: 1,
      iso6391: 'en',
    });
    expect(out.backdrops).toHaveLength(1);
    expect(out.posters).toEqual([]);
  });
});
