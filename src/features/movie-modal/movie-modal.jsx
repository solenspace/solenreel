// @ts-check
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useMovieDetails,
  useTVDetails,
  backdropUrl,
  profileUrl,
} from '@/entities/movie/queries';
import TrailerPlayer from '@/shared/ui/trailer-player';
import Button from '@/shared/ui/button';
import { PlayIcon } from '@/shared/ui/icons';

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/entities/movie/types').Video} Video */
/** @typedef {import('@/entities/movie/types').Credit} Credit */

/**
 * @param {{ movie: Movie, onClose: () => void }} props
 */
const MovieModal = ({ movie, onClose }) => {
  const isTV = movie.mediaType === 'tv';

  const movieQuery = useMovieDetails(!isTV ? movie.id : null);
  const tvQuery = useTVDetails(isTV ? movie.id : null);
  const { data: details } = isTV ? tvQuery : movieQuery;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    /** @param {KeyboardEvent} e */
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const trailerKey =
    details?.videos.find(
      /** @param {Video} v */
      (v) => v.type === 'Trailer' && v.site === 'YouTube',
    )?.key ?? details?.videos[0]?.key;

  const cast = details?.credits.cast.slice(0, 12) ?? [];
  const similar = details?.similar.slice(0, 9) ?? [];
  const genres =
    details?.genres
      .map(/** @param {{ id: number, name: string }} g */ (g) => g.name)
      .join(', ') ?? '';
  const rating = details?.voteAverage ? `${Math.round(details.voteAverage * 10)}%` : '';
  const year = details?.year && details.year > 0 ? String(details.year) : '';
  const runtime = details?.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : '';
  const fallbackBackdrop = backdropUrl(details?.backdropPath ?? movie.backdropPath);
  const title = details?.title || movie.title;
  const overview = details?.overview || movie.overview;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 pt-8 pb-16 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-bg-elevated relative w-full max-w-4xl overflow-hidden rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="bg-bg-elevated/80 hover:bg-bg-elevated text-ink absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full text-xl transition-colors"
          >
            ✕
          </button>

          {/* Trailer or backdrop */}
          <div className="bg-bg relative aspect-video w-full">
            {trailerKey ? (
              <TrailerPlayer videoKey={trailerKey} playing muted className="h-full w-full" />
            ) : (
              <div
                className="h-full w-full bg-cover bg-center"
                style={{
                  backgroundImage: fallbackBackdrop ? `url(${fallbackBackdrop})` : undefined,
                }}
              />
            )}
            <div className="from-bg-elevated absolute right-0 bottom-0 left-0 h-24 bg-gradient-to-t to-transparent" />
            <div className="absolute bottom-6 left-8 flex items-center gap-3">
              <Button variant="play" size="lg">
                <PlayIcon /> Play
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 md:p-8">
            <h2 className="text-ink mb-3 text-2xl font-bold">{title}</h2>

            <div className="flex flex-col gap-6 md:flex-row md:gap-8">
              <div className="flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  {rating && <span className="text-success font-semibold">{rating} Match</span>}
                  {year && <span className="text-ink-muted">{year}</span>}
                  {runtime && <span className="text-ink-muted">{runtime}</span>}
                  <span className="border-border text-ink-muted rounded border px-1.5 py-0.5 text-xs">
                    HD
                  </span>
                </div>
                <p className="text-ink text-sm leading-relaxed">{overview}</p>
              </div>
              <div className="space-y-2 text-sm md:w-64">
                {cast.length > 0 && (
                  <p className="text-ink-muted">
                    <span className="text-ink-faint">Cast: </span>
                    {cast
                      .slice(0, 4)
                      .map(/** @param {Credit} c */ (c) => c.name)
                      .join(', ')}
                    {cast.length > 4 && ', more...'}
                  </p>
                )}
                {genres && (
                  <p className="text-ink-muted">
                    <span className="text-ink-faint">Genres: </span>
                    {genres}
                  </p>
                )}
              </div>
            </div>

            {/* Cast */}
            {cast.length > 0 && (
              <div className="mt-8">
                <h3 className="text-ink mb-4 font-semibold">Cast</h3>
                <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {cast.map(/** @param {Credit} person */ (person) => {
                    const photo = profileUrl(person.profilePath);
                    return (
                      <div key={person.id} className="w-20 flex-shrink-0 text-center">
                        {photo ? (
                          <img
                            src={photo}
                            alt={person.name}
                            className="mx-auto mb-1 h-16 w-16 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="bg-bg-elevated text-ink-faint mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-full text-xs">
                            N/A
                          </div>
                        )}
                        <p className="text-ink-muted truncate text-xs">{person.name}</p>
                        <p className="text-ink-faint truncate text-xs">{person.character}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Similar */}
            {similar.length > 0 && (
              <div className="mt-8">
                <h3 className="text-ink mb-4 font-semibold">More Like This</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {similar.map(/** @param {Movie} item */ (item) => {
                    const tile = backdropUrl(item.backdropPath, 'w500');
                    return (
                      <div
                        key={item.id}
                        className="bg-bg-elevated overflow-hidden rounded-md transition-all hover:ring-1 hover:ring-white/20"
                      >
                        {tile ? (
                          <div
                            className="aspect-video w-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${tile})` }}
                          />
                        ) : (
                          <div className="bg-bg text-ink-faint flex aspect-video w-full items-center justify-center text-sm">
                            No Image
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-ink truncate text-sm font-medium">{item.title}</p>
                          <p className="text-ink-muted mt-1 line-clamp-3 text-xs">
                            {item.overview}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MovieModal;
