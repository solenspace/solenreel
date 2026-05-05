// @ts-check
import { backdropUrl } from '@/entities/movie/queries';

/** @typedef {import('@/entities/movie/types').Movie} Movie */

/**
 * @param {{ movie: Movie | null | undefined, isTrailerPlaying?: boolean }} props
 */
const BannerAmbient = ({ movie, isTrailerPlaying }) => {
  if (!movie) return null;

  const url = backdropUrl(movie.backdropPath);
  if (!url) return null;

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 scale-110 transition-opacity duration-2000"
        style={{
          backgroundImage: `url(${url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) saturate(1.5)',
          opacity: isTrailerPlaying ? 0.4 : 0.3,
          transitionDuration: '2s',
        }}
      />
    </div>
  );
};

export default BannerAmbient;
