// @ts-check
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryWrapper, createTestQueryClient } from '@/shared/test/query-wrapper';

// Mock the singleton TMDB client. Every hook in queries.js calls into one of
// these spies; tests assert the spy was called with the expected args and
// that the hook surfaces the (already-normalized) data.
vi.mock('@/shared/api/tmdb', () => ({
  fetchTrending: vi.fn(),
  fetchPopular: vi.fn(),
  fetchTopRated: vi.fn(),
  fetchByGenre: vi.fn(),
  fetchOriginals: vi.fn(),
  fetchMovieDetails: vi.fn(),
  fetchTVDetails: vi.fn(),
  fetchMovieVideos: vi.fn(),
  fetchMovieImages: vi.fn(),
  searchMulti: vi.fn(),
  posterUrl: vi.fn(),
  backdropUrl: vi.fn(),
  logoUrl: vi.fn(),
  profileUrl: vi.fn(),
  genreIdsToNames: vi.fn(),
  GENRES: { ACTION: 28, COMEDY: 35 },
}));

const tmdb = await import('@/shared/api/tmdb');
const queries = await import('./queries');

const sampleEnvelope = (id = 1) => ({
  page: 1,
  results: [{ id, title: 'Sample', moodTags: [] }],
  totalPages: 1,
  totalResults: 1,
});

const sampleDetails = (id = 1) => ({
  id,
  title: 'Sample',
  videos: [],
  credits: { cast: [], crew: [] },
  similar: [],
  images: { logos: [], backdrops: [], posters: [] },
});

/**
 * @template T
 * @param {() => T} callback
 */
const renderWithClient = (callback) => {
  const client = createTestQueryClient();
  return renderHook(callback, {
    wrapper: (
      /** @type {{ children: import('react').ReactNode }} */ { children },
    ) => <QueryWrapper client={client}>{children}</QueryWrapper>,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Per-hook smoke: each typed hook fires its underlying fetcher with the
// expected args and surfaces the normalized data. Parameterized so the table
// is the single source of truth — adding an 11th hook is one row.
// ---------------------------------------------------------------------------

describe('typed hook → fetcher contract', () => {
  /** @type {Array<[
   *   string,                                   // label
   *   keyof typeof tmdb,                        // fetcher name on the singleton
   *   () => unknown,                            // hook factory
   *   unknown[],                                // expected fetcher args
   *   () => unknown,                            // mock return value
   * ]>} */
  const cases = [
    ['useTrending (default window)', 'fetchTrending', () => queries.useTrending(), ['week'], () => sampleEnvelope()],
    ['useTrending (day)', 'fetchTrending', () => queries.useTrending('day'), ['day'], () => sampleEnvelope()],
    ['usePopular (page 3)', 'fetchPopular', () => queries.usePopular(3), [3], () => sampleEnvelope()],
    ['useTopRated (default page)', 'fetchTopRated', () => queries.useTopRated(), [1], () => sampleEnvelope()],
    ['useByGenre (28, page 2)', 'fetchByGenre', () => queries.useByGenre(28, 2), [28, 2], () => sampleEnvelope()],
    ['useOriginals', 'fetchOriginals', () => queries.useOriginals(), [], () => sampleEnvelope()],
    ['useMovieDetails (42)', 'fetchMovieDetails', () => queries.useMovieDetails(42), [42], () => sampleDetails(42)],
    ['useTVDetails (100)', 'fetchTVDetails', () => queries.useTVDetails(100), [100], () => sampleDetails(100)],
    ['useMovieVideos (42)', 'fetchMovieVideos', () => queries.useMovieVideos(42), [42], () => []],
    [
      'useMovieImages (42)',
      'fetchMovieImages',
      () => queries.useMovieImages(42),
      [42],
      () => ({ logos: [], backdrops: [], posters: [] }),
    ],
  ];

  it.each(cases)(
    '%s fires the underlying fetcher exactly once with the right args and surfaces the result',
    async (_label, fetcherName, hook, args, mockReturn) => {
      // Arrange
      const fetcher = /** @type {import('vitest').Mock} */ (tmdb[fetcherName]);
      const value = mockReturn();
      fetcher.mockResolvedValueOnce(value);

      // Act
      const { result } = renderWithClient(hook);
      await waitFor(() =>
        expect(/** @type {{ isSuccess: boolean }} */ (result.current).isSuccess).toBe(true),
      );

      // Assert
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledWith(...args);
      expect(/** @type {{ data: unknown }} */ (result.current).data).toEqual(value);
    },
  );
});

// ---------------------------------------------------------------------------
// `enabled` gating — every id-or-genreId-bound hook must NOT fire its fetcher
// when the arg is falsy. Parameterized over null / undefined / 0 to lock the
// invariant against future regressions.
// ---------------------------------------------------------------------------

describe('enabled-gating on falsy ids', () => {
  /** @type {Array<[string, keyof typeof tmdb, (arg: unknown) => unknown]>} */
  const hooks = [
    ['useByGenre', 'fetchByGenre', (arg) => queries.useByGenre(/** @type {number} */ (arg))],
    ['useMovieDetails', 'fetchMovieDetails', (arg) => queries.useMovieDetails(/** @type {number} */ (arg))],
    ['useTVDetails', 'fetchTVDetails', (arg) => queries.useTVDetails(/** @type {number} */ (arg))],
    ['useMovieVideos', 'fetchMovieVideos', (arg) => queries.useMovieVideos(/** @type {number} */ (arg))],
    ['useMovieImages', 'fetchMovieImages', (arg) => queries.useMovieImages(/** @type {number} */ (arg))],
  ];

  /** @type {Array<[string, unknown]>} */
  const falsyValues = [
    ['null', null],
    ['undefined', undefined],
    ['0', 0],
  ];

  /** @type {Array<[string, keyof typeof tmdb, (arg: unknown) => unknown, string, unknown]>} */
  const cases = hooks.flatMap(([hookName, fetcherName, hookFactory]) =>
    falsyValues.map(([valueLabel, value]) => /** @type {[string, keyof typeof tmdb, (arg: unknown) => unknown, string, unknown]} */ ([hookName, fetcherName, hookFactory, valueLabel, value])),
  );

  it.each(cases)('%s does not fire its fetcher when arg is %4$s', (_h, fetcherName, hookFactory, _v, value) => {
    // Arrange
    const fetcher = /** @type {import('vitest').Mock} */ (tmdb[fetcherName]);

    // Act
    renderWithClient(() => hookFactory(value));

    // Assert
    expect(fetcher).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Error path — TanStack Query surfaces fetcher rejections via `isError`.
// One assertion is enough to lock the contract; the test client has
// `retry: false` so the rejection propagates immediately.
// ---------------------------------------------------------------------------

describe('error surfacing', () => {
  it('surfaces fetcher rejection through useQuery isError', async () => {
    // Arrange
    /** @type {import('vitest').Mock} */ (tmdb.fetchTrending).mockRejectedValueOnce(
      new Error('TMDB 503'),
    );

    // Act
    const { result } = renderWithClient(() => queries.useTrending());

    // Assert
    await waitFor(() =>
      expect(/** @type {{ isError: boolean }} */ (result.current).isError).toBe(true),
    );
    expect(
      /** @type {{ error: Error | null }} */ (result.current).error,
    ).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// useSearchMulti — internal debounce. Three contracts:
//  (a) within the 400ms window after a query change, the fetcher does not fire;
//  (b) once the window elapses with the value stable, it fires exactly once;
//  (c) a second change inside the window cancels the pending timer and only
//      the latest value fires once — the regression-catcher for per-keystroke
//      fetch leaks.
// Plus the >=2-char `enabled` gate.
// ---------------------------------------------------------------------------

describe('useSearchMulti — internal debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** @param {{ query: string }} initialProps */
  const mountSearch = (initialProps = { query: '' }) => {
    const client = createTestQueryClient();
    return renderHook(
      /** @param {{ query: string }} props */
      ({ query }) => queries.useSearchMulti(query),
      {
        initialProps,
        wrapper: (
          /** @type {{ children: import('react').ReactNode }} */ { children },
        ) => <QueryWrapper client={client}>{children}</QueryWrapper>,
      },
    );
  };

  it('does NOT fire searchMulti within the 400ms window after a query change', () => {
    // Arrange
    const { rerender } = mountSearch();

    // Act
    rerender({ query: 'blade' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Assert
    expect(tmdb.searchMulti).not.toHaveBeenCalled();
  });

  it('fires searchMulti exactly once after 400ms with the debounced value', async () => {
    // Arrange
    /** @type {import('vitest').Mock} */ (tmdb.searchMulti).mockResolvedValue(sampleEnvelope());
    const { rerender } = mountSearch();

    rerender({ query: 'blade' });

    // Act
    expect(tmdb.searchMulti).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Assert
    await vi.waitFor(() => expect(tmdb.searchMulti).toHaveBeenCalledTimes(1));
    expect(tmdb.searchMulti).toHaveBeenCalledWith('blade');
  });

  it('cancels the pending timer when the query changes mid-window — only the latest value fires once', async () => {
    // Arrange
    /** @type {import('vitest').Mock} */ (tmdb.searchMulti).mockResolvedValue(sampleEnvelope());
    const { rerender } = mountSearch();

    // Act — type "bl", wait 300ms, then type "blade" before the timer elapses.
    rerender({ query: 'bl' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ query: 'blade' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Assert — 600ms total has passed, but only 300ms since the last change,
    // so the fetcher must NOT have fired with either intermediate value.
    expect(tmdb.searchMulti).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await vi.waitFor(() => expect(tmdb.searchMulti).toHaveBeenCalledTimes(1));
    expect(tmdb.searchMulti).toHaveBeenCalledWith('blade');
    expect(tmdb.searchMulti).not.toHaveBeenCalledWith('bl');
  });

  it('honors the >=2-char enabled gate (single-char queries never fire)', () => {
    // Arrange + Act
    mountSearch({ query: 'a' });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Assert
    expect(tmdb.searchMulti).not.toHaveBeenCalled();
  });

  it('fires at the inclusive 2-char boundary', async () => {
    // Arrange
    /** @type {import('vitest').Mock} */ (tmdb.searchMulti).mockResolvedValue(sampleEnvelope());
    const { rerender } = mountSearch();

    // Act
    rerender({ query: 'bl' });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Assert
    await vi.waitFor(() => expect(tmdb.searchMulti).toHaveBeenCalledTimes(1));
    expect(tmdb.searchMulti).toHaveBeenCalledWith('bl');
  });
});

// ---------------------------------------------------------------------------
// Helper re-exports — entity layer is the canonical surface for image URL
// helpers and the genre map (success criterion 3 of spec 09).
// ---------------------------------------------------------------------------

describe('helper re-exports', () => {
  it('re-exports posterUrl, backdropUrl, logoUrl, profileUrl, genreIdsToNames, GENRES', () => {
    expect(queries.posterUrl).toBe(tmdb.posterUrl);
    expect(queries.backdropUrl).toBe(tmdb.backdropUrl);
    expect(queries.logoUrl).toBe(tmdb.logoUrl);
    expect(queries.profileUrl).toBe(tmdb.profileUrl);
    expect(queries.genreIdsToNames).toBe(tmdb.genreIdsToNames);
    expect(queries.GENRES).toBe(tmdb.GENRES);
  });
});
