// @ts-check
import { useCallback } from 'react';
import Tile from '@/entities/movie/tile';
import { useClickTracker } from '@/features/click-tracker/use-click-tracker';
import { useTrackingSource } from './tracking-context';

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/entities/movie/tile-variants').TileVariant} TileVariant */

/**
 * Tile wrapper that emits `tile_click` before invoking the user's `onClick`.
 * Reads `source` from the enclosing `<TrackingProvider>`. Use this anywhere a
 * presentational `<Tile>` would be the click surface; the existing `HoverTile`
 * already wires its own tracking.
 *
 * @param {{
 *   movie: Movie,
 *   variant?: TileVariant,
 *   onClick?: (movie: Movie) => void,
 * }} props
 */
const TrackedTile = ({ movie, variant, onClick }) => {
  const { track } = useClickTracker();
  const source = useTrackingSource();

  const handleClick = useCallback(
    /** @param {Movie} m */
    (m) => {
      track('tile_click', m.id, { source });
      onClick?.(m);
    },
    [track, source, onClick],
  );

  return <Tile movie={movie} variant={variant} onClick={onClick ? handleClick : undefined} />;
};

export default TrackedTile;
