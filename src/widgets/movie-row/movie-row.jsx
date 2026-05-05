// @ts-check
import { useRef, useState } from 'react';
import MovieCard from '@/entities/movie/movie-card';
import SkeletonRow from '@/shared/ui/skeleton-row';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

/**
 * @param {{
 *   title: string,
 *   movies: Movie[] | undefined,
 *   isLoading: boolean,
 *   isLargeRow?: boolean,
 *   onMovieClick?: (movie: Movie) => void,
 * }} props
 */
const MovieRow = ({ title, movies, isLoading, isLargeRow = false, onMovieClick }) => {
  /** @type {React.RefObject<HTMLDivElement | null>} */
  const rowRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  if (isLoading) return <SkeletonRow />;
  if (!movies?.length) return null;

  /** @param {'left' | 'right'} direction */
  const scroll = (direction) => {
    if (!rowRef.current) return;
    const scrollAmount = rowRef.current.clientWidth * 0.8;
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setShowLeftArrow(scrollLeft > 20);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 20);
  };

  return (
    <div className="group relative my-6 px-4 md:px-12">
      <h2 className="text-ink hover:text-ink-muted mb-2 inline-flex cursor-pointer items-center gap-2 text-lg font-bold transition-colors md:text-xl">
        {title}
        <span className="text-accent text-sm opacity-0 transition-opacity group-hover:opacity-100">
          Explore All ›
        </span>
      </h2>

      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="bg-bg-overlay text-ink hover:bg-bg-elevated absolute top-0 bottom-0 left-0 z-20 flex w-12 items-center justify-center rounded-r-md text-3xl opacity-0 transition-opacity group-hover:opacity-100"
          >
            ‹
          </button>
        )}

        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto scroll-smooth py-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              isLargeRow={isLargeRow}
              onClick={onMovieClick}
            />
          ))}
        </div>

        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="bg-bg-overlay text-ink hover:bg-bg-elevated absolute top-0 right-0 bottom-0 z-20 flex w-12 items-center justify-center rounded-l-md text-3xl opacity-0 transition-opacity group-hover:opacity-100"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
};

export default MovieRow;
