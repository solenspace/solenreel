// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { navigateMock, useMovieDetailsMock, useMovieVideosMock, useByGenreMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useMovieDetailsMock: vi.fn(),
  useMovieVideosMock: vi.fn(),
  useByGenreMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = /** @type {object} */ (await vi.importActual('react-router-dom'));
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: '550' }),
  };
});

vi.mock('@/entities/movie/queries', async (importOriginal) => {
  const actual = /** @type {object} */ (await importOriginal());
  return {
    ...actual,
    useMovieDetails: useMovieDetailsMock,
    useMovieVideos: useMovieVideosMock,
    useByGenre: useByGenreMock,
  };
});

vi.mock('@/features/trailer/trailer-player', () => ({
  default: (
    /** @type {{ videoKey?: string|null, mode?: string, muted?: boolean, playing?: boolean }} */ props,
  ) => {
    if (!props.videoKey) return null;
    return (
      <div
        data-testid="trailer-player"
        data-key={props.videoKey}
        data-mode={props.mode ?? ''}
        data-muted={String(!!props.muted)}
        data-playing={String(!!props.playing)}
      />
    );
  },
}));

const MovieDetail = (await import('./movie-detail')).default;

/** @typedef {import('@/entities/movie/types').MovieDetails} MovieDetails */
/** @typedef {import('@/entities/movie/types').Video} Video */

/**
 * @typedef {object} QueryShape
 * @property {unknown} data
 * @property {boolean} isPending
 * @property {boolean} isError
 * @property {boolean} isSuccess
 * @property {Error | null} error
 * @property {() => unknown} refetch
 */

/**
 * @param {Partial<MovieDetails>} [overrides]
 * @returns {MovieDetails}
 */
const mockDetails = (overrides = {}) => ({
  id: 27205,
  title: 'Inception',
  originalTitle: 'Inception',
  releaseDate: '2010-07-15',
  year: 2010,
  posterPath: '/inception.jpg',
  backdropPath: '/inception-bd.jpg',
  genreIds: [28, 878],
  voteAverage: 8.4,
  overview: 'A thief who steals corporate secrets.',
  tagline: null,
  runtime: 148,
  director: 'Christopher Nolan',
  moodTags: [],
  mediaType: 'movie',
  videos: [],
  credits: { cast: [], crew: [] },
  similar: [],
  images: { logos: [], backdrops: [], posters: [] },
  genres: [
    { id: 28, name: 'Action' },
    { id: 878, name: 'Science Fiction' },
  ],
  ...overrides,
});

/**
 * @param {Partial<QueryShape>} [overrides]
 * @returns {QueryShape}
 */
const mockQuery = (overrides = {}) => ({
  data: undefined,
  isPending: true,
  isError: false,
  isSuccess: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

/** @param {unknown} data @returns {QueryShape} */
const successQuery = (data) =>
  mockQuery({ data, isPending: false, isError: false, isSuccess: true });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/movie/550']}>
      <MovieDetail />
    </MemoryRouter>,
  );

describe('MovieDetail page', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useMovieDetailsMock.mockReset();
    useMovieVideosMock.mockReset();
    useByGenreMock.mockReset();
    // useByGenre is feature-flagged off by default; the page never mounts the
    // row, but we wire a safe default in case the flag flips in CI.
    useByGenreMock.mockReturnValue(mockQuery());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, year, and director once details resolve', () => {
    useMovieDetailsMock.mockReturnValue(successQuery(mockDetails()));
    useMovieVideosMock.mockReturnValue(successQuery([]));

    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: /^Inception$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Christopher Nolan')).toBeInTheDocument();
    // Year appears in the metadata grid (label + value) and as the small
    // editorial caption above the title; both are valid surface area.
    expect(screen.getAllByText('2010').length).toBeGreaterThan(0);
  });

  it('plays the first YouTube Trailer-typed video in mode="full" with audio enabled', () => {
    /** @type {Video[]} */
    const videos = [
      { key: 'TEASER1', site: 'YouTube', type: 'Teaser', name: 'Teaser' },
      { key: 'TRAILER1', site: 'YouTube', type: 'Trailer', name: 'Trailer' },
      { key: 'OTHER', site: 'YouTube', type: 'Featurette', name: 'Featurette' },
    ];
    useMovieDetailsMock.mockReturnValue(successQuery(mockDetails()));
    useMovieVideosMock.mockReturnValue(successQuery(videos));

    renderPage();

    const player = screen.getByTestId('trailer-player');
    expect(player.getAttribute('data-key')).toBe('TRAILER1');
    expect(player.getAttribute('data-mode')).toBe('full');
    expect(player.getAttribute('data-muted')).toBe('false');
    expect(player.getAttribute('data-playing')).toBe('true');
  });

  it('navigates back when Escape is pressed', () => {
    useMovieDetailsMock.mockReturnValue(successQuery(mockDetails()));
    useMovieVideosMock.mockReturnValue(successQuery([]));

    renderPage();
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('focuses the article root on mount so Esc reaches the parent before the iframe steals focus', () => {
    useMovieDetailsMock.mockReturnValue(successQuery(mockDetails()));
    useMovieVideosMock.mockReturnValue(successQuery([]));

    renderPage();

    const article = document.querySelector('article');
    expect(article).not.toBeNull();
    expect(article?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(article);
  });

  it('navigates back when the back-arrow button is clicked', () => {
    useMovieDetailsMock.mockReturnValue(successQuery(mockDetails()));
    useMovieVideosMock.mockReturnValue(successQuery([]));

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders the prose 404 fallback and a home link when details resolve with no payload', () => {
    useMovieDetailsMock.mockReturnValue(successQuery(null));
    useMovieVideosMock.mockReturnValue(successQuery([]));

    renderPage();

    expect(screen.getByText(/that movie isn't on tmdb\./i)).toBeInTheDocument();
    const homeLink = screen.getByRole('link', { name: /go home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.getAttribute('href')).toBe('/');
  });

  it('swaps the skeleton banner for "reel is loading" once pending crosses 800 ms', () => {
    vi.useFakeTimers();
    useMovieDetailsMock.mockReturnValue(mockQuery({ isPending: true }));
    useMovieVideosMock.mockReturnValue(mockQuery({ isPending: true }));

    renderPage();
    expect(screen.queryByText(/reel is loading/i)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(801);
    });

    expect(screen.getByText(/reel is loading/i)).toBeInTheDocument();
  });
});
