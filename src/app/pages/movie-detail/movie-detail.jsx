// @ts-check
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMovieDetails, useMovieVideos } from '@/entities/movie/queries';
import TrailerPlayer from '@/features/trailer/trailer-player';
import SkeletonBanner from '@/shared/ui/skeleton-banner';
import { useDocumentTitle } from '@/shared/lib/use-document-title';
import { useLoadingTooLong } from '@/shared/lib/use-loading-too-long';
import { useKeyDown } from '@/shared/lib/use-key-down';
import MetadataGrid from './metadata-grid';
import MoreLikeThisRow from './more-like-this-row';

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/entities/movie/types').MovieDetails} MovieDetails */
/** @typedef {import('@/entities/movie/types').Video} Video */

const MORE_LIKE_THIS_ENABLED = import.meta.env.VITE_FEATURE_MORE_LIKE_THIS === 'true';

/**
 * Pick the best YouTube key for the hero. Prefers `Trailer`-typed videos so
 * teasers and behind-the-scenes clips don't outrank the real trailer; falls
 * back to the first YouTube video when no `Trailer` entry exists.
 *
 * @param {Video[] | undefined} videos
 * @returns {string | null}
 */
const pickTrailerKey = (videos) => {
  if (!videos || videos.length === 0) return null;
  const youtube = videos.filter((v) => v.site === 'YouTube');
  if (youtube.length === 0) return null;
  const trailer = youtube.find((v) => v.type === 'Trailer');
  return (trailer ?? youtube[0]).key ?? null;
};

const BackArrowIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
);

const MovieDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  /** @type {React.RefObject<HTMLElement | null>} */
  const articleRef = useRef(null);

  // Two parallel queries:
  //   useMovieVideos  — lighter; paints the trailer as soon as it resolves.
  //   useMovieDetails — full metadata for the overlay, prose, and grid.
  // Together they satisfy success criterion #6 (two TMDB requests on first load).
  const detailsQuery = useMovieDetails(id, { retry: 1 });
  const videosQuery = useMovieVideos(id);
  const longPending = useLoadingTooLong(detailsQuery.isPending, 800);

  const details = /** @type {MovieDetails | undefined} */ (detailsQuery.data ?? undefined);
  const trailerKey = pickTrailerKey(videosQuery.data ?? details?.videos);

  useDocumentTitle(
    details ? `${details.title}${details.year > 0 ? ` (${details.year})` : ''} — reel` : 'reel',
  );

  useKeyDown('Escape', () => {
    navigate(-1);
  });

  // The autoplay YouTube iframe steals focus on mount; once focus is inside a
  // cross-origin iframe, the parent's window-level keydown listener never sees
  // the user's keystrokes. Pulling focus back onto the article root keeps `Esc`
  // in the parent context until the user explicitly clicks into the player.
  useEffect(() => {
    articleRef.current?.focus({ preventScroll: true });
  }, [id]);

  // 404 — invalid id, TMDB returned no payload.
  if (!detailsQuery.isPending && !details) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="display text-ink text-2xl">that movie isn&apos;t on tmdb.</p>
        <Link to="/" className="text-accent text-sm">
          go home
        </Link>
      </section>
    );
  }

  if (detailsQuery.isPending || !details) {
    if (longPending) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-6">
          <p className="text-accent display text-2xl">reel is loading</p>
        </div>
      );
    }
    return <SkeletonBanner />;
  }

  return (
    <article ref={articleRef} tabIndex={-1} className="bg-bg relative w-full focus:outline-none">
      <header className="bg-bg-elevated relative aspect-video w-full overflow-hidden">
        {trailerKey ? (
          <div className="absolute inset-0">
            <TrailerPlayer
              videoKey={trailerKey}
              playing
              muted={false}
              mode="full"
              className="h-full w-full"
            />
          </div>
        ) : null}

        <div
          aria-hidden="true"
          className="from-bg via-bg/60 pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t to-transparent"
        />

        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="border-border bg-bg-overlay text-ink hover:bg-bg-elevated absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition-colors md:top-6 md:left-6"
        >
          <BackArrowIcon />
        </button>

        <div className="absolute right-0 bottom-0 left-0 z-10 px-6 pb-8 md:px-12 md:pb-12">
          {details.year > 0 ? (
            <p className="text-ink-muted font-sans text-xs tracking-widest uppercase">
              {details.year}
            </p>
          ) : null}
          <h1 className="display text-ink mt-2 max-w-3xl text-4xl drop-shadow-lg md:text-6xl">
            {details.title}
          </h1>
          {details.tagline ? (
            <p className="text-ink mt-3 max-w-2xl text-base italic md:text-lg">
              {details.tagline}
            </p>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12 md:px-12">
        {details.overview ? (
          <p className="display text-ink text-lg leading-relaxed md:text-xl">{details.overview}</p>
        ) : null}
        <MetadataGrid details={details} className="mt-10" />
      </section>

      {MORE_LIKE_THIS_ENABLED ? (
        <MoreLikeThisRow
          genreId={details.genreIds?.[0] ?? null}
          onTileClick={(/** @type {Movie} */ movie) => navigate(`/movie/${movie.id}`)}
        />
      ) : null}
    </article>
  );
};

export default MovieDetail;
