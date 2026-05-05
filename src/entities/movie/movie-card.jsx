// @ts-check
import { useState } from 'react';
import { motion } from 'framer-motion';
import { posterUrl, backdropUrl } from '@/entities/movie/queries';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

/**
 * @param {{
 *   movie: Movie,
 *   isLargeRow?: boolean,
 *   onClick?: (movie: Movie) => void,
 * }} props
 */
const MovieCard = ({ movie, isLargeRow = false, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const url = isLargeRow
    ? posterUrl(movie.posterPath, 'w342')
    : backdropUrl(movie.backdropPath, 'w780') ?? posterUrl(movie.posterPath, 'w342');

  if (!url) return null;

  return (
    <motion.div
      className="relative flex-shrink-0 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(movie)}
      whileHover={{ scale: 1.08, zIndex: 10 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={url}
        alt={movie.title}
        className={`rounded-md object-cover transition-shadow duration-300 ${
          isLargeRow ? 'h-[250px] w-[170px]' : 'h-[160px] w-[280px]'
        } ${isHovered ? 'shadow-2xl ring-1 shadow-black/50 ring-white/20' : ''}`}
        loading="lazy"
      />
      {isHovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="from-bg-overlay absolute right-0 bottom-0 left-0 rounded-b-md bg-gradient-to-t to-transparent p-2"
        >
          <p className="text-ink truncate text-xs font-medium">{movie.title}</p>
          {movie.voteAverage > 0 && (
            <p className="text-success text-xs">{Math.round(movie.voteAverage * 10)}% Match</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default MovieCard;
