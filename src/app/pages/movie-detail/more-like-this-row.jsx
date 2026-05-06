// @ts-check
import { useByGenre } from '@/entities/movie/queries';
import Row from '@/widgets/row/row';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

/**
 * Editorial similar-movies rail rendered below the metadata grid. Spec 13
 * marks this as v1.1 and gates it behind `VITE_FEATURE_MORE_LIKE_THIS`; the
 * parent only mounts the component when the flag is on, so the `useByGenre`
 * query here never fires during v1.
 *
 * Returns `null` while pending or on error — non-essential content must never
 * blur the rest of the page on slow networks.
 *
 * @param {{ genreId: number | null, onTileClick?: (movie: Movie) => void }} props
 */
const MoreLikeThisRow = ({ genreId, onTileClick }) => {
  const query = useByGenre(genreId, 1);
  if (!genreId || query.isPending || query.isError || !query.data) return null;
  const tiles = query.data.results.slice(0, 12);
  return <Row title="more like this" tiles={tiles} variant="compact" onTileClick={onTileClick} />;
};

export default MoreLikeThisRow;
