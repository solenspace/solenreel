// @ts-check
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Row from './row';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

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
    render(<Row title="Trending" tiles={mockMovies(3)} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Trending' })).toBeInTheDocument();
  });

  it('renders the caption when provided', () => {
    render(<Row title="Trending" caption="Updated weekly" tiles={mockMovies(3)} />);

    expect(screen.getByText('Updated weekly')).toBeInTheDocument();
  });

  it('renders the optional badge slot when provided', () => {
    render(
      <Row
        title="For you"
        tiles={mockMovies(3)}
        badge={<span data-testid="badge">For you</span>}
      />,
    );

    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('omits the badge slot when not provided', () => {
    render(<Row title="Trending" tiles={mockMovies(3)} />);

    expect(screen.queryByTestId('badge')).toBeNull();
  });

  it('returns null when tiles is empty', () => {
    const { container } = render(<Row title="Trending" tiles={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('eager-renders only the first 12 tiles in a 30-tile array', () => {
    render(<Row title="Trending" tiles={mockMovies(30)} onTileClick={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(12);
    expect(document.querySelectorAll('[data-placeholder]')).toHaveLength(18);
    expect(document.querySelectorAll('[data-tile]')).toHaveLength(12);
  });

  it('lazy-mounts remaining tiles when their placeholders intersect the viewport', () => {
    render(<Row title="Trending" tiles={mockMovies(30)} onTileClick={vi.fn()} />);

    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true });
    });

    expect(screen.getAllByRole('button')).toHaveLength(30);
    expect(document.querySelectorAll('[data-tile]')).toHaveLength(30);
  });

  it('marks the rail with horizontal scroll-snap', () => {
    render(<Row title="Trending" tiles={mockMovies(3)} />);

    const scroller = /** @type {HTMLElement} */ (
      document.querySelector('[data-row-scroller]')
    );
    expect(scroller).not.toBeNull();
    expect(scroller.style.scrollSnapType).toBe('x mandatory');
    expect(scroller.className).toContain('overflow-x-auto');
  });

  it('moves focus to the next tile on ArrowRight inside the row', async () => {
    const user = userEvent.setup();
    render(<Row title="Trending" tiles={mockMovies(5)} onTileClick={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons[0].focus();

    await user.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(buttons[1]);
  });

  it('moves focus to the previous tile on ArrowLeft inside the row', async () => {
    const user = userEvent.setup();
    render(<Row title="Trending" tiles={mockMovies(5)} onTileClick={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons[2].focus();

    await user.keyboard('{ArrowLeft}');

    expect(document.activeElement).toBe(buttons[1]);
  });

  it('forwards onTileClick with the clicked movie', async () => {
    const user = userEvent.setup();
    const onTileClick = vi.fn();
    const tiles = mockMovies(1);
    render(<Row title="Trending" tiles={tiles} onTileClick={onTileClick} />);

    await user.click(screen.getAllByRole('button')[0]);

    expect(onTileClick).toHaveBeenCalledTimes(1);
    expect(onTileClick).toHaveBeenCalledWith(tiles[0]);
  });
});
