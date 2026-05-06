// @ts-check
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tile from './tile';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

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
  moodTags: ['mind-bending', 'cerebral', 'dreamlike'],
  mediaType: 'movie',
  ...overrides,
});

describe('Tile', () => {
  it.each([
    { variant: /** @type {const} */ ('grid') },
    { variant: /** @type {const} */ ('list') },
    { variant: /** @type {const} */ ('compact') },
  ])('renders the title in the $variant variant', ({ variant }) => {
    const movie = mockMovie();

    render(<Tile movie={movie} variant={variant} />);

    expect(screen.getByText(movie.title)).toBeInTheDocument();
  });

  it.each([
    { variant: /** @type {const} */ ('grid'), expectedSize: 'w342' },
    { variant: /** @type {const} */ ('list'), expectedSize: 'w92' },
    { variant: /** @type {const} */ ('compact'), expectedSize: 'w185' },
  ])(
    'renders the poster at the $expectedSize TMDB size for $variant',
    ({ variant, expectedSize }) => {
      const movie = mockMovie();

      render(<Tile movie={movie} variant={variant} />);

      const img = screen.getByRole('img', { name: movie.title });
      expect(img.getAttribute('src')).toContain(`/${expectedSize}`);
    },
  );

  it('renders only the year in the grid variant meta', () => {
    const movie = mockMovie();

    render(<Tile movie={movie} variant="grid" />);

    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.queryByText(/Christopher Nolan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/148 min/)).not.toBeInTheDocument();
  });

  it('renders year · director · runtime in the list variant meta', () => {
    const movie = mockMovie();

    render(<Tile movie={movie} variant="list" />);

    expect(screen.getByText('2010 · Christopher Nolan · 148 min')).toBeInTheDocument();
  });

  it('omits missing meta segments without leaving stray separators', () => {
    const movie = mockMovie({ director: null, runtime: null });

    render(<Tile movie={movie} variant="list" />);

    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('renders the meta slot as null when every list segment is missing', () => {
    const movie = mockMovie({ year: 0, director: null, runtime: null });

    render(<Tile movie={movie} variant="list" />);

    expect(document.querySelector('[data-slot="meta"]')).toBeNull();
  });

  it('renders no metadata at all in the compact variant', () => {
    const movie = mockMovie();

    render(<Tile movie={movie} variant="compact" />);

    expect(document.querySelector('[data-slot="meta"]')).toBeNull();
  });

  it('renders up to three mood tags in the list variant', () => {
    const movie = mockMovie({ moodTags: ['a', 'b', 'c', 'd', 'e'] });

    render(<Tile movie={movie} variant="list" />);

    const items = document.querySelectorAll('[data-slot="mood-tags"] li');
    expect(items).toHaveLength(3);
  });

  it('omits the mood-tag slot when the array is empty', () => {
    const movie = mockMovie({ moodTags: [] });

    render(<Tile movie={movie} variant="list" />);

    expect(document.querySelector('[data-slot="mood-tags"]')).toBeNull();
  });

  it('renders the score chip when voteAverage > 0 in the list variant', () => {
    const movie = mockMovie({ voteAverage: 8.4 });

    render(<Tile movie={movie} variant="list" />);

    expect(screen.getByText('84% match')).toBeInTheDocument();
  });

  it('omits the score chip when voteAverage is 0', () => {
    const movie = mockMovie({ voteAverage: 0 });

    render(<Tile movie={movie} variant="list" />);

    expect(document.querySelector('[data-slot="score"]')).toBeNull();
  });

  it('renders as a <button> when onClick is provided and forwards the movie on click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const movie = mockMovie();

    render(<Tile movie={movie} variant="grid" onClick={onClick} />);
    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(movie);
  });

  it('renders as an <article> when onClick is omitted', () => {
    const movie = mockMovie();

    render(<Tile movie={movie} variant="grid" />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('replaces the default score with override children passed to Tile.Score', () => {
    const movie = mockMovie({ voteAverage: 8.4 });

    render(
      <Tile movie={movie} variant="list">
        <Tile.Poster />
        <Tile.Body>
          <Tile.Title />
          <Tile.Score>Because you watched Memento</Tile.Score>
        </Tile.Body>
      </Tile>,
    );

    expect(screen.getByText('Because you watched Memento')).toBeInTheDocument();
    expect(screen.queryByText('84% match')).toBeNull();
  });

  it('renders a placeholder instead of an <img> when posterPath is null', () => {
    const movie = mockMovie({ posterPath: null });

    render(<Tile movie={movie} variant="grid" />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(document.querySelector('[data-slot="poster-placeholder"]')).toBeInTheDocument();
  });

  it('wraps the poster in a positioning frame when posterOverlay is provided', () => {
    const movie = mockMovie();

    render(
      <Tile
        movie={movie}
        variant="grid"
        posterOverlay={<div data-testid="overlay" />}
      />,
    );

    expect(screen.getByTestId('overlay')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="poster-frame"]')).toBeInTheDocument();
  });

  it('omits the poster-frame wrapper when no posterOverlay is provided', () => {
    const movie = mockMovie();

    render(<Tile movie={movie} variant="grid" />);

    expect(document.querySelector('[data-slot="poster-frame"]')).toBeNull();
  });

  it('forwards rootRef to the underlying root element', () => {
    const movie = mockMovie();
    /** @type {{ current: HTMLElement | null }} */
    const ref = { current: null };

    render(<Tile movie={movie} variant="grid" onClick={vi.fn()} rootRef={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.getAttribute('data-tile')).toBe('');
  });
});
