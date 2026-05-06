// @ts-check
import { Fragment } from 'react';

/** @typedef {import('@/entities/movie/types').MovieDetails} MovieDetails */

/**
 * @param {number} minutes
 * @returns {string}
 */
const formatRuntime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * @param {MovieDetails} details
 * @returns {Array<[string, string]>}
 */
const buildRows = (details) => {
  /** @type {Array<[string, string | null]>} */
  const candidates = [
    ['Director', details.director],
    [
      'Runtime',
      typeof details.runtime === 'number' && details.runtime > 0
        ? formatRuntime(details.runtime)
        : null,
    ],
    [
      'Genres',
      details.genres && details.genres.length > 0
        ? details.genres.map((g) => g.name).join(', ')
        : null,
    ],
    ['Year', details.year > 0 ? String(details.year) : null],
    ['Score', details.voteAverage > 0 ? `tmdb ${details.voteAverage.toFixed(1)} / 10` : null],
  ];
  /** @type {Array<[string, string]>} */
  const rows = [];
  for (const [label, value] of candidates) {
    if (value !== null && value !== '') rows.push([label, value]);
  }
  return rows;
};

/**
 * Editorial metadata table for the movie-detail page. Pure presentational.
 * Empty fields are omitted (null director, zero runtime, no genres, etc.) so
 * the grid never renders dangling labels.
 *
 * @param {{ details: MovieDetails, className?: string }} props
 */
const MetadataGrid = ({ details, className = '' }) => {
  const rows = buildRows(details);
  if (rows.length === 0) return null;

  const wrapperClass =
    `grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 font-sans text-sm tabular-nums md:text-base ${className}`.trim();

  return (
    <dl className={wrapperClass}>
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-ink-muted">{label}</dt>
          <dd className="text-ink">{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
};

export default MetadataGrid;
