// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import hoverReducer from '@/features/trailer/hover-store';

const { navigateMock, usePopularMock, useMovieVideosMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  usePopularMock: vi.fn(),
  useMovieVideosMock: vi.fn(() => ({ data: undefined, isError: false, isPending: false })),
}));

vi.mock('react-router-dom', async () => {
  const actual = /** @type {object} */ (await vi.importActual('react-router-dom'));
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/entities/movie/queries', async (importOriginal) => {
  const actual = /** @type {object} */ (await importOriginal());
  return { ...actual, usePopular: usePopularMock, useMovieVideos: useMovieVideosMock };
});

const Home = (await import('./home')).default;

const renderHome = () =>
  render(
    <Provider store={configureStore({ reducer: { hover: hoverReducer } })}>
      <Home />
    </Provider>,
  );

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/entities/movie/types').TmdbResponse<Movie>} MovieResponse */

/**
 * @typedef {object} QueryShape
 * @property {MovieResponse | undefined} data
 * @property {boolean} isPending
 * @property {boolean} isError
 * @property {Error | null} error
 * @property {() => unknown} refetch
 */

/**
 * @param {Partial<Movie>} [overrides]
 * @returns {Movie}
 */
const mockMovie = (overrides = {}) => ({
  id: 27205,
  title: 'Inception',
  originalTitle: 'Inception',
  releaseDate: '2010-07-15',
  year: 2010,
  posterPath: '/inception.jpg',
  backdropPath: '/inception-bd.jpg',
  genreIds: [28, 878],
  voteAverage: 8.4,
  overview: 'A thief who steals corporate secrets...',
  tagline: null,
  runtime: 148,
  director: 'Christopher Nolan',
  moodTags: [],
  mediaType: 'movie',
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
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

/**
 * @param {Movie[]} tiles
 * @returns {QueryShape}
 */
const successQuery = (tiles) =>
  mockQuery({
    isPending: false,
    data: { page: 1, results: tiles, totalPages: 1, totalResults: tiles.length },
  });

describe('Home page', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    usePopularMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the skeleton row while the popular query is pending', () => {
    usePopularMock.mockReturnValue(mockQuery({ isPending: true }));

    renderHome();

    expect(screen.getByTestId('skeleton-row')).toBeInTheDocument();
  });

  it('renders the popular row with the spec title on success', () => {
    const tiles = [mockMovie({ id: 1, title: 'Tile One' })];
    usePopularMock.mockReturnValue(successQuery(tiles));

    renderHome();

    expect(
      screen.getByRole('heading', { level: 2, name: /Popular this week/i }),
    ).toBeInTheDocument();
  });

  it('navigates to /movie/<id> exactly once on tile click', async () => {
    const tiles = [
      mockMovie({ id: 1, title: 'Tile One' }),
      mockMovie({ id: 2, title: 'Tile Two' }),
    ];
    usePopularMock.mockReturnValue(successQuery(tiles));
    const user = userEvent.setup();

    renderHome();
    await user.click(screen.getByRole('button', { name: /Tile One/i }));

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/movie/1');
  });

  it('renders nothing user-facing when the popular results array is empty', () => {
    usePopularMock.mockReturnValue(successQuery([]));

    renderHome();

    expect(screen.queryByRole('heading', { name: /Popular this week/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('skeleton-row')).not.toBeInTheDocument();
  });

  it('renders the prose-first ErrorFallback message and retries on click', async () => {
    const refetch = vi.fn();
    usePopularMock.mockReturnValue(
      mockQuery({ isPending: false, isError: true, error: new Error('boom'), refetch }),
    );
    const user = userEvent.setup();

    renderHome();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText("the movies aren't loading. trying again.")).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Popular this week/i })).not.toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the skeleton visible just before the 800 ms threshold', () => {
    vi.useFakeTimers();
    usePopularMock.mockReturnValue(mockQuery({ isPending: true }));

    renderHome();
    act(() => {
      vi.advanceTimersByTime(799);
    });

    expect(screen.getByTestId('skeleton-row')).toBeInTheDocument();
    expect(screen.queryByText(/reel is loading/i)).not.toBeInTheDocument();
  });

  it('swaps the skeleton for "reel is loading" once pending crosses 800 ms', () => {
    vi.useFakeTimers();
    usePopularMock.mockReturnValue(mockQuery({ isPending: true }));

    renderHome();
    act(() => {
      vi.advanceTimersByTime(801);
    });

    expect(screen.queryByTestId('skeleton-row')).not.toBeInTheDocument();
    expect(screen.getByText(/reel is loading/i)).toBeInTheDocument();
  });

  it('sets the document title to "reel — for you" on mount', () => {
    usePopularMock.mockReturnValue(mockQuery({ isPending: true }));

    renderHome();

    expect(document.title).toBe('reel — for you');
  });
});
