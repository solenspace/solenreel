// @ts-check
import { createContext, useContext } from 'react';
import { posterUrl } from '@/entities/movie/queries';
import { tileVariants } from '@/entities/movie/tile-variants';

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/entities/movie/tile-variants').TileVariant} TileVariant */

/**
 * @typedef {object} TileContextValue
 * @property {Movie} movie
 * @property {TileVariant} variant
 * @property {React.ReactNode} posterOverlay
 *   Optional overlay rendered absolutely on top of the poster (spec 12 hover
 *   trailer; spec 18 reasoning chip; etc.). Tile entity stays presentational —
 *   it only positions whatever node the consumer hands it.
 */

/** @type {React.Context<TileContextValue | null>} */
const TileContext = createContext(/** @type {TileContextValue | null} */ (null));

/** @returns {TileContextValue} */
const useTileContext = () => {
  const ctx = useContext(TileContext);
  if (!ctx) throw new Error('Tile.* used outside <Tile>');
  return ctx;
};

/**
 * @param {{ children?: React.ReactNode }} props
 */
const TileBody = ({ children }) => <div className="min-w-0 flex-1">{children}</div>;

const TilePoster = () => {
  const { movie, variant, posterOverlay } = useTileContext();
  const url = posterUrl(movie.posterPath, tileVariants[variant].posterSize);
  const posterClass = tileVariants[variant].posterClass;
  const posterImg = url ? (
    <img
      src={url}
      alt={movie.title}
      loading="lazy"
      className={`${posterClass} shrink-0`}
      data-slot="poster"
    />
  ) : (
    <div
      className={`${posterClass} bg-bg-elevated`}
      aria-hidden="true"
      data-slot="poster-placeholder"
    />
  );
  if (!posterOverlay) return posterImg;
  return (
    <div className={`${posterClass.includes('shrink-0') ? '' : 'shrink-0'} relative`} data-slot="poster-frame">
      {posterImg}
      {posterOverlay}
    </div>
  );
};

const TileTitle = () => {
  const { movie, variant } = useTileContext();
  const sizeClass = variant === 'compact' ? 'text-sm' : 'text-base';
  return (
    <span
      className={`display text-ink block truncate leading-tight ${sizeClass}`}
      data-slot="title"
    >
      {movie.title}
    </span>
  );
};

/**
 * @param {Movie} movie
 * @returns {string[]}
 */
const listMetaSegments = (movie) => {
  /** @type {string[]} */
  const out = [];
  if (movie.year > 0) out.push(String(movie.year));
  if (movie.director) out.push(movie.director);
  if (typeof movie.runtime === 'number' && movie.runtime > 0) {
    out.push(`${movie.runtime} min`);
  }
  return out;
};

const TileMeta = () => {
  const { movie, variant } = useTileContext();
  if (variant === 'compact') return null;
  if (variant === 'grid') {
    if (movie.year <= 0) return null;
    return (
      <span className="text-ink-muted text-xs" data-slot="meta">
        {movie.year}
      </span>
    );
  }
  const segments = listMetaSegments(movie);
  if (segments.length === 0) return null;
  return (
    <span className="text-ink-muted text-xs" data-slot="meta">
      {segments.join(' · ')}
    </span>
  );
};

const TileMoodTags = () => {
  const { movie, variant } = useTileContext();
  if (variant !== 'list') return null;
  if (!movie.moodTags || movie.moodTags.length === 0) return null;
  const tags = movie.moodTags.slice(0, 3);
  return (
    <ul className="mt-1 flex flex-wrap gap-1" data-slot="mood-tags">
      {tags.map((tag) => (
        <li
          key={tag}
          className="border-border text-ink-muted rounded-full border px-2 py-px text-[10px]"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
};

/**
 * Score chip. List variant by default; consumers may override the rendered node
 * by passing `children` (used by spec 18 to inject a reasoning line).
 *
 * @param {{ children?: React.ReactNode }} props
 */
const TileScore = ({ children }) => {
  const { movie, variant } = useTileContext();
  if (children !== undefined) {
    return (
      <span className="text-success mt-1 block text-xs" data-slot="score">
        {children}
      </span>
    );
  }
  if (variant !== 'list') return null;
  if (movie.voteAverage <= 0) return null;
  return (
    <span className="text-success mt-1 block text-xs" data-slot="score">
      {Math.round(movie.voteAverage * 10)}% match
    </span>
  );
};

/**
 * Reasoning slot — placeholder for spec 18's AI-reasoning sentence. Renders
 * nothing when no children are supplied because the underlying data field is
 * not yet on the Movie shape.
 *
 * @param {{ children?: React.ReactNode }} props
 */
const TileReasoning = ({ children }) => {
  if (children === undefined) return null;
  return (
    <span className="text-ink-muted mt-1 block text-xs italic" data-slot="reasoning">
      {children}
    </span>
  );
};

const DefaultLayout = () => {
  const { variant } = useTileContext();
  if (variant === 'compact') {
    return (
      <>
        <TilePoster />
        <TileTitle />
      </>
    );
  }
  if (variant === 'list') {
    return (
      <>
        <TilePoster />
        <TileBody>
          <TileTitle />
          <TileMeta />
          <TileMoodTags />
          <TileScore />
        </TileBody>
      </>
    );
  }
  return (
    <>
      <TilePoster />
      <TileBody>
        <TileTitle />
        <TileMeta />
      </TileBody>
    </>
  );
};

/**
 * Editorial movie tile. Compound component with a shared `TileContext`
 * exposing `{ movie, variant, posterOverlay }`. When `children` is omitted, a
 * per-variant default layout renders. When `children` is supplied, the
 * consumer composes slots explicitly (see spec 10 §"Compound-component
 * shape").
 *
 * Renders as a `<button>` when `onClick` is provided (interactive), otherwise
 * as an `<article>` (presentational). Focus styling inherits the global
 * `:focus-visible` ring from `src/main.css`.
 *
 * `posterOverlay` (spec 12) is positioned absolutely over the poster and lets
 * higher layers (`features/trailer/hover-tile.jsx`) drop in a hover trailer
 * without the entity gaining a feature dependency. `rootRef` exposes the
 * underlying root element so the hover hook can install pointer/IO listeners
 * on the same node the user interacts with.
 *
 * @param {{
 *   movie: Movie,
 *   variant?: TileVariant,
 *   onClick?: (movie: Movie) => void,
 *   posterOverlay?: React.ReactNode,
 *   rootRef?: React.Ref<HTMLElement | null>,
 *   children?: React.ReactNode,
 * }} props
 */
const TileBase = ({
  movie,
  variant = 'grid',
  onClick,
  posterOverlay = null,
  rootRef,
  children,
}) => {
  const className = tileVariants[variant].root;
  const inner = children ?? <DefaultLayout />;
  return (
    <TileContext.Provider value={{ movie, variant, posterOverlay }}>
      {typeof onClick === 'function' ? (
        <button
          type="button"
          ref={/** @type {React.Ref<HTMLButtonElement>} */ (rootRef)}
          onClick={() => onClick(movie)}
          data-tile=""
          data-variant={variant}
          className={className}
        >
          {inner}
        </button>
      ) : (
        <article
          ref={/** @type {React.Ref<HTMLElement>} */ (rootRef)}
          data-tile=""
          data-variant={variant}
          className={className}
        >
          {inner}
        </article>
      )}
    </TileContext.Provider>
  );
};

const Tile = Object.assign(TileBase, {
  Poster: TilePoster,
  Body: TileBody,
  Title: TileTitle,
  Meta: TileMeta,
  MoodTags: TileMoodTags,
  Score: TileScore,
  Reasoning: TileReasoning,
});

export default Tile;
