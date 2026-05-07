// @ts-check
import { useCallback, useEffect, useRef } from 'react';
import Tile from '@/entities/movie/tile';
import TrailerPlayer from '@/features/trailer/trailer-player';
import { useTrailerOnHover } from '@/features/trailer/use-trailer-on-hover';
import { useClickTracker } from '@/features/click-tracker/use-click-tracker';
import { useTrackingSource } from '@/features/click-tracker/tracking-context';

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/entities/movie/tile-variants').TileVariant} TileVariant */

/**
 * Hover-aware Tile wrapper. Calls `useTrailerOnHover`, attaches the returned
 * ref to Tile's root, and feeds an absolutely-positioned `<TrailerPlayer
 * mode="overlay" />` into Tile's generic `posterOverlay` prop when the hook
 * transitions to `'playing'`. Tile itself stays inside `entities/` and
 * receives no feature-layer types — the wrapper is the seam that lets
 * `features/trailer/` extend a tile without inverting FSD layering.
 *
 * Tracking: emits `tile_click` on click and `hover_start` the first time the
 * hover state machine leaves `'idle'` (the canonical "confirmed hover" — the
 * 250 ms threshold and visibility gate have already passed). The TrailerPlayer
 * underneath gets `tmdbId` so it auto-emits `trailer_play` /
 * `trailer_complete` for the overlay path.
 *
 * @param {{
 *   movie: Movie,
 *   variant?: TileVariant,
 *   onClick?: (movie: Movie) => void,
 * }} props
 */
const HoverTile = ({ movie, variant, onClick }) => {
  const { ref, state, videoKey, onError } = useTrailerOnHover(movie.id);
  const { track } = useClickTracker();
  const source = useTrackingSource();

  const hoverEmittedRef = useRef(false);
  useEffect(() => {
    if (state !== 'idle' && !hoverEmittedRef.current) {
      hoverEmittedRef.current = true;
      track('hover_start', movie.id);
    }
  }, [state, movie.id, track]);

  const handleClick = useCallback(
    /** @param {Movie} m */
    (m) => {
      track('tile_click', m.id, { source });
      onClick?.(m);
    },
    [track, source, onClick],
  );

  const overlay =
    state === 'playing' && videoKey ? (
      <TrailerPlayer
        mode="overlay"
        videoKey={videoKey}
        playing
        muted
        tmdbId={movie.id}
        onError={onError}
      />
    ) : null;
  return (
    <Tile
      movie={movie}
      variant={variant}
      onClick={onClick ? handleClick : undefined}
      rootRef={ref}
      posterOverlay={overlay}
    />
  );
};

export default HoverTile;
