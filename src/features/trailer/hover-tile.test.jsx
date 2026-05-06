// @ts-check
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import hoverReducer from '@/features/trailer/hover-store';

vi.mock('@/entities/movie/queries', async () => {
  const actual = /** @type {object} */ (await vi.importActual('@/entities/movie/queries'));
  return {
    ...actual,
    useMovieVideos: vi.fn(() => ({ data: undefined, isError: false, isPending: false })),
  };
});

import { useMovieVideos } from '@/entities/movie/queries';
import HoverTile from './hover-tile';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

const mockedUseMovieVideos = vi.mocked(useMovieVideos);

/** @returns {Movie} */
const mockMovie = () => ({
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
});

const renderWithStore = (/** @type {React.ReactElement} */ ui) =>
  render(
    <Provider store={configureStore({ reducer: { hover: hoverReducer } })}>{ui}</Provider>,
  );

const dispatchMouse = (/** @type {Element} */ el, /** @type {string} */ type) =>
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: false }));
  });

describe('HoverTile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedUseMovieVideos.mockReturnValue(
      /** @type {any} */ ({
        data: [{ key: 'abc123', site: 'YouTube', type: 'Trailer', name: 'Trailer' }],
        isError: false,
        isPending: false,
      }),
    );
    globalThis.__setPrefersReducedMotion(false);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the tile poster and no player while idle', () => {
    renderWithStore(<HoverTile movie={mockMovie()} variant="grid" onClick={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Inception' })).toBeInTheDocument();
    expect(screen.queryByTestId('player')).toBeNull();
  });

  it('mounts the muted overlay player after a 250ms hover when visible', () => {
    renderWithStore(<HoverTile movie={mockMovie()} variant="grid" onClick={vi.fn()} />);

    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });

    const trigger = screen.getByRole('button');
    dispatchMouse(trigger, 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const player = screen.getByTestId('player');
    expect(player).toBeInTheDocument();
    expect(player.getAttribute('data-muted')).toBe('true');
    expect(player.getAttribute('data-playing')).toBe('true');
  });

  it('does not mount the player when prefers-reduced-motion is set', () => {
    globalThis.__setPrefersReducedMotion(true);
    renderWithStore(<HoverTile movie={mockMovie()} variant="grid" onClick={vi.fn()} />);

    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });
    dispatchMouse(screen.getByRole('button'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId('player')).toBeNull();
  });

  it('forwards onClick with the movie when the tile is clicked', () => {
    const onClick = vi.fn();
    const movie = mockMovie();
    renderWithStore(<HoverTile movie={movie} variant="grid" onClick={onClick} />);

    act(() => {
      screen.getByRole('button').click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(movie);
  });
});
