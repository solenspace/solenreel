// @ts-check
import Tile from '@/entities/movie/tile';
import TrailerPlayer from '@/features/trailer/trailer-player';
import { useTrailerOnHover } from '@/features/trailer/use-trailer-on-hover';

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
 * @param {{
 *   movie: Movie,
 *   variant?: TileVariant,
 *   onClick?: (movie: Movie) => void,
 * }} props
 */
const HoverTile = ({ movie, variant, onClick }) => {
  const { ref, state, videoKey, onError } = useTrailerOnHover(movie.id);
  const overlay =
    state === 'playing' && videoKey ? (
      <TrailerPlayer
        mode="overlay"
        videoKey={videoKey}
        playing
        muted
        onError={onError}
      />
    ) : null;
  return (
    <Tile
      movie={movie}
      variant={variant}
      onClick={onClick}
      rootRef={ref}
      posterOverlay={overlay}
    />
  );
};

export default HoverTile;
