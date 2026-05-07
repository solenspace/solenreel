// @ts-check
import { TrackingContext } from './tracking-context';

/** @typedef {import('./tracking-context').TrackingSource} TrackingSource */

/**
 * Provider that tags every `<TrackedTile>` in its subtree with the given
 * `source`. Mount once per page (home → "home", search → "search", etc.) so
 * `tile_click` events can be partitioned downstream.
 *
 * @param {{ source: TrackingSource, children: React.ReactNode }} props
 */
export const TrackingProvider = ({ source, children }) => (
  <TrackingContext.Provider value={source}>{children}</TrackingContext.Provider>
);
