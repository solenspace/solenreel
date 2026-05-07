// @ts-check
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';

const insertMock = vi.fn();
vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: insertMock })),
  },
}));

import { ReduxWrapper } from '@/shared/test/redux-wrapper';
import { TrackingProvider } from './tracking-provider';
import TrackedTile from './tracked-tile';
import { __resetForTests } from './use-click-tracker';

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/shared/types/auth').Session} Session */

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
  overview: '...',
  tagline: null,
  runtime: 148,
  director: 'Christopher Nolan',
  moodTags: [],
  mediaType: 'movie',
});

const session = /** @type {Session} */ (
  /** @type {unknown} */ ({
    user: { id: 'user-1' },
    access_token: 'jwt-1',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'r',
  })
);

const preloaded = {
  user: { session, status: /** @type {const} */ ('authenticated'), error: null },
};

describe('TrackedTile', () => {
  beforeEach(() => {
    __resetForTests();
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    __resetForTests();
  });

  it('emits tile_click with the source from <TrackingProvider> and forwards onClick', async () => {
    const onClick = vi.fn();
    const movie = mockMovie();
    render(
      <ReduxWrapper preloadedState={preloaded}>
        <TrackingProvider source="home">
          <TrackedTile movie={movie} variant="grid" onClick={onClick} />
        </TrackingProvider>
      </ReduxWrapper>,
    );

    act(() => {
      screen.getByRole('button').click();
    });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(movie);

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0][0]).toMatchObject({
      kind: 'tile_click',
      tmdb_id: 27205,
      payload: { source: 'home' },
    });
  });

  it('emits tile_click with source="unknown" when no provider is mounted', async () => {
    const movie = mockMovie();
    render(
      <ReduxWrapper preloadedState={preloaded}>
        <TrackedTile movie={movie} variant="grid" onClick={vi.fn()} />
      </ReduxWrapper>,
    );

    act(() => {
      screen.getByRole('button').click();
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(insertMock.mock.calls[0][0][0].payload).toEqual({ source: 'unknown' });
  });

  it('renders as <article> (presentational) when no onClick is supplied', () => {
    render(
      <ReduxWrapper preloadedState={preloaded}>
        <TrackingProvider source="home">
          <TrackedTile movie={mockMovie()} variant="grid" />
        </TrackingProvider>
      </ReduxWrapper>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });
});
