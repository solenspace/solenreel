// @ts-check
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useMovieImages,
  useMovieVideos,
  backdropUrl,
  logoUrl,
} from '@/entities/movie/queries';
import TrailerPlayer from '@/features/trailer/trailer-player';
import Button from '@/shared/ui/button';
import SkeletonBanner from '@/shared/ui/skeleton-banner';
import { PlayIcon, InformationIcon } from '@/shared/ui/icons';

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/entities/movie/types').Video} Video */

/**
 * @param {string | null | undefined} str
 * @param {number} n
 * @returns {string | null | undefined}
 */
const truncate = (str, n) => (str && str.length > n ? str.substring(0, n - 1) + '...' : str);

/**
 * @param {{ movie: Movie | null | undefined, onMoreInfo?: (movie: Movie) => void }} props
 */
const Banner = ({ movie, onMoreInfo }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const { data: images } = useMovieImages(movie?.id);
  const { data: videos } = useMovieVideos(movie?.id);

  const trailerKey =
    videos?.find(
      /** @param {Video} v */
      (v) => v.type === 'Trailer' && v.site === 'YouTube',
    )?.key ?? videos?.[0]?.key;

  const logoPath = images?.logos[0]?.filePath ?? null;
  const backdrop = backdropUrl(movie?.backdropPath);

  useEffect(() => {
    if (!trailerKey) return;
    const timer = setTimeout(() => {
      setIsPlaying(true);
      setShowTrailer(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [trailerKey]);

  const handleTrailerEnd = useCallback(() => {
    setIsPlaying(false);
    setShowTrailer(false);
    setTimeout(() => {
      setIsPlaying(true);
      setShowTrailer(true);
    }, 20000);
  }, []);

  if (!movie) return <SkeletonBanner />;

  return (
    <div className="relative h-[85vh] w-full overflow-hidden">
      {/* Backdrop image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{ backgroundImage: backdrop ? `url(${backdrop})` : undefined }}
      />

      {/* Trailer overlay */}
      <AnimatePresence>
        {showTrailer && trailerKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <TrailerPlayer
              videoKey={trailerKey}
              playing={isPlaying}
              muted={isMuted}
              onEnded={handleTrailerEnd}
              className="h-full w-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradients */}
      <div className="from-bg absolute inset-0 bg-gradient-to-t via-transparent to-black/40" />
      <div className="from-bg absolute right-0 bottom-0 left-0 h-40 bg-gradient-to-t to-transparent" />

      {/* Content */}
      <div className="absolute bottom-28 left-4 z-10 max-w-xl space-y-4 md:left-12">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-accent text-lg font-bold">N</span>
          <span className="text-ink-muted text-xs font-semibold tracking-widest uppercase">
            {movie.mediaType === 'tv' ? 'S E R I E S' : 'M O V I E'}
          </span>
        </div>

        {logoPath ? (
          <motion.img
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            src={logoUrl(logoPath) ?? undefined}
            alt={movie.title}
            className="max-h-[120px] w-auto max-w-[350px] object-contain drop-shadow-2xl"
          />
        ) : (
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-ink text-4xl font-bold drop-shadow-lg md:text-6xl"
          >
            {movie.title}
          </motion.h1>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-ink line-clamp-3 max-w-lg text-sm drop-shadow-md md:text-base"
        >
          {truncate(movie.overview, 200)}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3"
        >
          <Button
            variant="play"
            size="lg"
            onClick={() => {
              setIsPlaying(true);
              setShowTrailer(true);
              setIsMuted(false);
            }}
          >
            <PlayIcon /> Play
          </Button>
          <Button variant="secondary" size="lg" onClick={() => onMoreInfo?.(movie)}>
            <InformationIcon /> More Info
          </Button>
        </motion.div>
      </div>

      {/* Mute / Replay control */}
      {trailerKey && (
        <div className="absolute right-4 bottom-28 z-10 flex items-center gap-3 md:right-12">
          {showTrailer && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="border-border bg-bg-overlay text-ink hover:bg-bg-elevated flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          )}
          <button
            onClick={() => {
              if (showTrailer) {
                setIsPlaying(false);
                setShowTrailer(false);
              } else {
                setIsPlaying(true);
                setShowTrailer(true);
              }
            }}
            className="border-border bg-bg-overlay text-ink hover:bg-bg-elevated flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-colors"
            title={showTrailer ? 'Stop trailer' : 'Play trailer'}
          >
            {showTrailer ? '⏹' : '▶'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Banner;
