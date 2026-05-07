// @ts-check
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import hoverReducer from '@/features/trailer/hover-store';
import userReducer from '@/entities/user/user-slice';
import Row from './row';

vi.mock('@/shared/api/supabase', () => ({
  supabase: { from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })) },
}));

vi.mock('@/entities/movie/queries', async () => {
  const actual = /** @type {object} */ (await vi.importActual('@/entities/movie/queries'));
  return {
    ...actual,
    useMovieVideos: vi.fn(() => ({ data: undefined, isError: false, isPending: false })),
  };
});

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/shared/types/auth').Session} Session */

const fakeSession = /** @type {Session} */ (
  /** @type {unknown} */ ({
    user: { id: 'user-1' },
    access_token: 'jwt-1',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'r',
  })
);

const makeStore = () =>
  configureStore({
    reducer: { hover: hoverReducer, user: userReducer },
    preloadedState: {
      user: {
        session: fakeSession,
        status: /** @type {const} */ ('authenticated'),
        error: null,
      },
    },
  });

const renderRow = (/** @type {React.ReactElement} */ ui) =>
  render(<Provider store={makeStore()}>{ui}</Provider>);

/**
 * @param {number} n
 * @returns {Movie[]}
 */
const mockMovies = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    title: `Movie ${i + 1}`,
    originalTitle: `Movie ${i + 1}`,
    releaseDate: '2020-01-01',
    year: 2020,
    posterPath: `/poster-${i + 1}.jpg`,
    backdropPath: null,
    genreIds: [],
    voteAverage: 7,
    overview: '',
    tagline: null,
    runtime: 100,
    director: null,
    moodTags: [],
    mediaType: /** @type {const} */ ('movie'),
  }));

describe('Row', () => {
  it('renders the title as an h2', () => {
    renderRow(<Row title="Trending" tiles={mockMovies(3)} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Trending' })).toBeInTheDocument();
  });

  it('renders the caption when provided', () => {
    renderRow(<Row title="Trending" caption="Updated weekly" tiles={mockMovies(3)} />);

    expect(screen.getByText('Updated weekly')).toBeInTheDocument();
  });

  it('renders the optional badge slot when provided', () => {
    renderRow(
      <Row
        title="For you"
        tiles={mockMovies(3)}
        badge={<span data-testid="badge">For you</span>}
      />,
    );

    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('omits the badge slot when not provided', () => {
    renderRow(<Row title="Trending" tiles={mockMovies(3)} />);

    expect(screen.queryByTestId('badge')).toBeNull();
  });

  it('returns null when tiles is empty', () => {
    const { container } = renderRow(<Row title="Trending" tiles={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('eager-renders only the first 12 tiles in a 30-tile array', () => {
    renderRow(<Row title="Trending" tiles={mockMovies(30)} onTileClick={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(12);
    expect(document.querySelectorAll('[data-placeholder]')).toHaveLength(18);
    expect(document.querySelectorAll('[data-tile]')).toHaveLength(12);
  });

  it('lazy-mounts remaining tiles when their placeholders intersect the viewport', () => {
    renderRow(<Row title="Trending" tiles={mockMovies(30)} onTileClick={vi.fn()} />);

    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true });
    });

    expect(screen.getAllByRole('button')).toHaveLength(30);
    expect(document.querySelectorAll('[data-tile]')).toHaveLength(30);
  });

  it('marks the rail with horizontal scroll-snap', () => {
    renderRow(<Row title="Trending" tiles={mockMovies(3)} />);

    const scroller = /** @type {HTMLElement} */ (
      document.querySelector('[data-row-scroller]')
    );
    expect(scroller).not.toBeNull();
    expect(scroller.style.scrollSnapType).toBe('x mandatory');
    expect(scroller.className).toContain('overflow-x-auto');
  });

  it('moves focus to the next tile on ArrowRight inside the row', async () => {
    const user = userEvent.setup();
    renderRow(<Row title="Trending" tiles={mockMovies(5)} onTileClick={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons[0].focus();

    await user.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(buttons[1]);
  });

  it('moves focus to the previous tile on ArrowLeft inside the row', async () => {
    const user = userEvent.setup();
    renderRow(<Row title="Trending" tiles={mockMovies(5)} onTileClick={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons[2].focus();

    await user.keyboard('{ArrowLeft}');

    expect(document.activeElement).toBe(buttons[1]);
  });

  it('forwards onTileClick with the clicked movie', async () => {
    const user = userEvent.setup();
    const onTileClick = vi.fn();
    const tiles = mockMovies(1);
    renderRow(<Row title="Trending" tiles={tiles} onTileClick={onTileClick} />);

    await user.click(screen.getAllByRole('button')[0]);

    expect(onTileClick).toHaveBeenCalledTimes(1);
    expect(onTileClick).toHaveBeenCalledWith(tiles[0]);
  });

  it('renders without crashing when hoverPlayer is enabled (HoverTile path)', () => {
    renderRow(
      <Row title="Trending" tiles={mockMovies(3)} hoverPlayer onTileClick={vi.fn()} />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByTestId('player')).toBeNull();
  });
});
