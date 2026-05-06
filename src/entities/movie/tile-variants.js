// @ts-check

/** @typedef {'grid' | 'list' | 'compact'} TileVariant */

/**
 * @typedef {object} TileVariantSpec
 * @property {string} root
 * @property {string} posterSize         // TMDB size token, e.g. 'w342'
 * @property {string} posterClass
 * @property {string} placeholderClass
 */

/**
 * Per-variant geometry, TMDB poster size, and placeholder dimensions. Sizes
 * are spec-locked: grid 192×288, list 48×72, compact 96×144 (spec 10
 * §"Variants"). Lifted out of `tile.jsx` so the component file exports only
 * components (react-refresh discipline) and `Row` can read placeholder
 * dimensions without importing from the component module.
 *
 * @type {Record<TileVariant, TileVariantSpec>}
 */
export const tileVariants = {
  grid: {
    root: 'group flex w-48 flex-col gap-2 rounded-md p-1 text-left transition-colors duration-100 hover:bg-bg-elevated',
    posterSize: 'w342',
    posterClass: 'h-72 w-48 rounded-md object-cover',
    placeholderClass: 'h-80 w-48 shrink-0',
  },
  list: {
    root: 'group flex w-80 flex-row items-start gap-3 rounded-md p-1 text-left transition-colors duration-100 hover:bg-bg-elevated',
    posterSize: 'w92',
    posterClass: 'h-[72px] w-12 rounded-sm object-cover',
    placeholderClass: 'h-24 w-80 shrink-0',
  },
  compact: {
    root: 'group flex w-24 flex-col gap-1 rounded-md p-1 text-left transition-colors duration-100 hover:bg-bg-elevated',
    posterSize: 'w185',
    posterClass: 'h-36 w-24 rounded-md object-cover',
    placeholderClass: 'h-44 w-24 shrink-0',
  },
};
