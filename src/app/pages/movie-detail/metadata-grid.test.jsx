// @ts-check
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetadataGrid from './metadata-grid';

/** @typedef {import('@/entities/movie/types').MovieDetails} MovieDetails */

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
  overview: 'A thief...',
  tagline: 'Your mind is the scene of the crime.',
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

describe('MetadataGrid', () => {
  it('renders director, runtime, genres, year, and score from a populated MovieDetails', () => {
    render(<MetadataGrid details={mockDetails()} />);

    expect(screen.getByText('Director')).toBeInTheDocument();
    expect(screen.getByText('Christopher Nolan')).toBeInTheDocument();

    expect(screen.getByText('Runtime')).toBeInTheDocument();
    expect(screen.getByText('2h 28m')).toBeInTheDocument();

    expect(screen.getByText('Genres')).toBeInTheDocument();
    expect(screen.getByText('Action, Science Fiction')).toBeInTheDocument();

    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();

    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('tmdb 8.4 / 10')).toBeInTheDocument();
  });

  it('omits empty fields (null director, zero runtime, empty genres, zero score)', () => {
    render(
      <MetadataGrid
        details={mockDetails({
          director: null,
          runtime: 0,
          genres: [],
          voteAverage: 0,
        })}
      />,
    );

    expect(screen.queryByText('Director')).not.toBeInTheDocument();
    expect(screen.queryByText('Runtime')).not.toBeInTheDocument();
    expect(screen.queryByText('Genres')).not.toBeInTheDocument();
    expect(screen.queryByText('Score')).not.toBeInTheDocument();
    // Year is still present because year > 0.
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
  });

  it('renders nothing when every metadata field is missing', () => {
    const { container } = render(
      <MetadataGrid
        details={mockDetails({
          director: null,
          runtime: null,
          genres: [],
          year: 0,
          voteAverage: 0,
        })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('formats sub-hour runtimes without a leading "0h"', () => {
    render(<MetadataGrid details={mockDetails({ runtime: 47 })} />);
    expect(screen.getByText('47m')).toBeInTheDocument();
  });
});
