// @ts-check
import { useEffect, useRef, useState } from 'react';
import { tileVariants } from '@/entities/movie/tile-variants';
import HoverTile from '@/features/trailer/hover-tile';
import TrackedTile from '@/features/click-tracker/tracked-tile';

/** @typedef {import('@/entities/movie/types').Movie} Movie */
/** @typedef {import('@/entities/movie/tile-variants').TileVariant} TileVariant */

/**
 * Tiles past this index in a row mount lazily via IntersectionObserver. Spec
 * 10 step 2 ("only the first 12 tiles render eagerly").
 */
const EAGER_COUNT = 12;

/**
 * Choose between presentational `Tile` and the hover-aware `HoverTile`
 * (spec 12). Centralised here so eager and lazy slots stay in sync.
 *
 * @param {{
 *   movie: Movie,
 *   variant: TileVariant,
 *   onClick?: (movie: Movie) => void,
 *   hoverPlayer: boolean,
 * }} props
 */
const RenderedTile = ({ movie, variant, onClick, hoverPlayer }) =>
  hoverPlayer ? (
    <HoverTile movie={movie} variant={variant} onClick={onClick} />
  ) : (
    <TrackedTile movie={movie} variant={variant} onClick={onClick} />
  );

/**
 * Eagerly-mounted tile wrapped in a list-item with scroll-snap alignment.
 *
 * @param {{
 *   movie: Movie,
 *   variant: TileVariant,
 *   onClick?: (movie: Movie) => void,
 *   hoverPlayer: boolean,
 * }} props
 */
const TileSlot = ({ movie, variant, onClick, hoverPlayer }) => (
  <div role="listitem" className="shrink-0" style={{ scrollSnapAlign: 'start' }}>
    <RenderedTile movie={movie} variant={variant} onClick={onClick} hoverPlayer={hoverPlayer} />
  </div>
);

/**
 * Lazy slot — renders a same-sized placeholder until its IntersectionObserver
 * fires `isIntersecting`. The Tile mounts on first hit and the observer is
 * disconnected. Placeholders are `<div>`s, never buttons, so the row's
 * "first-12-tiles-eager" assertion can count buttons cleanly.
 *
 * @param {{
 *   movie: Movie,
 *   variant: TileVariant,
 *   onClick?: (movie: Movie) => void,
 *   hoverPlayer: boolean,
 * }} props
 */
const LazyTileSlot = ({ movie, variant, onClick, hoverPlayer }) => {
  /** @type {React.RefObject<HTMLDivElement | null>} */
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      role="listitem"
      data-placeholder={visible ? undefined : ''}
      className={visible ? 'shrink-0' : tileVariants[variant].placeholderClass}
      style={{ scrollSnapAlign: 'start' }}
    >
      {visible && (
        <RenderedTile
          movie={movie}
          variant={variant}
          onClick={onClick}
          hoverPlayer={hoverPlayer}
        />
      )}
    </div>
  );
};

/**
 * Move keyboard focus to the previous/next tile button inside the row when
 * arrow keys fire. Spec 22 owns full a11y polish (Home/End, RTL, focus traps);
 * this hooks up the basic horizontal traversal.
 *
 * @param {React.KeyboardEvent<HTMLDivElement>} e
 */
const handleKeyDown = (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const buttons = /** @type {HTMLButtonElement[]} */ (
    Array.from(e.currentTarget.querySelectorAll('button[data-tile]'))
  );
  if (buttons.length === 0) return;
  const active = document.activeElement;
  if (!(active instanceof HTMLButtonElement)) return;
  const idx = buttons.indexOf(active);
  if (idx === -1) return;
  const nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= buttons.length) return;
  e.preventDefault();
  buttons[nextIdx].focus();
};

/**
 * Editorial horizontal rail. Composes a Newsreader serif title, an optional
 * Inter caption, an optional accent badge slot, and a CSS-scroll-snap rail of
 * `<Tile>` instances (tiles past index 12 mount on scroll-into-view via
 * IntersectionObserver). Returns `null` when `tiles` is empty.
 *
 * `hoverPlayer` (spec 12) opts every tile in the row into hover-driven trailer
 * autoplay via the feature-level `<HoverTile>` wrapper. Pages that want
 * editorial tiles without motion (search results, profile) pass `false`
 * (default).
 *
 * @param {{
 *   title: string,
 *   caption?: string,
 *   badge?: React.ReactNode,
 *   tiles: Movie[],
 *   variant?: TileVariant,
 *   hoverPlayer?: boolean,
 *   onTileClick?: (movie: Movie) => void,
 * }} props
 */
const Row = ({
  title,
  caption,
  badge,
  tiles,
  variant = 'grid',
  hoverPlayer = false,
  onTileClick,
}) => {
  if (tiles.length === 0) return null;
  return (
    <section className="my-8 px-6 md:px-12">
      <header className="mb-3 flex items-baseline gap-3">
        <h2 className="display text-ink text-2xl">{title}</h2>
        {caption ? <p className="text-ink-muted text-sm">{caption}</p> : null}
        {badge ? <div className="ml-auto">{badge}</div> : null}
      </header>
      <div
        role="list"
        onKeyDown={handleKeyDown}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-1"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
        data-row-scroller=""
      >
        {tiles.map((movie, i) =>
          i < EAGER_COUNT ? (
            <TileSlot
              key={movie.id}
              movie={movie}
              variant={variant}
              onClick={onTileClick}
              hoverPlayer={hoverPlayer}
            />
          ) : (
            <LazyTileSlot
              key={movie.id}
              movie={movie}
              variant={variant}
              onClick={onTileClick}
              hoverPlayer={hoverPlayer}
            />
          ),
        )}
      </div>
    </section>
  );
};

export default Row;
