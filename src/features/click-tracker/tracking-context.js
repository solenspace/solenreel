// @ts-check
import { createContext, useContext } from 'react';

/**
 * @typedef {'home' | 'search' | 'movie-detail' | 'for-you' | 'intent-results' | 'unknown'} TrackingSource
 */

/** @type {React.Context<TrackingSource>} */
export const TrackingContext = createContext(/** @type {TrackingSource} */ ('unknown'));

/**
 * Read the current tracking `source` from the surrounding `<TrackingProvider>`.
 * Falls back to `'unknown'` when no provider is mounted — the literal string
 * surfaces in `events.payload.source` so missing wrapping is visible from the
 * database without runtime console noise.
 *
 * @returns {TrackingSource}
 */
export const useTrackingSource = () => useContext(TrackingContext);
