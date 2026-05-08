// @ts-check

/**
 * @typedef {import('./types').Recommendation} Recommendation
 * @typedef {import('./types').RecommendationItem} RecommendationItem
 */

/**
 * @typedef {object} RawRecommendationItem
 * @property {number} tmdb_id
 * @property {number} score
 * @property {string|null} reason
 */

/**
 * @typedef {object} RawRecommendationRow
 * @property {string} user_id
 * @property {RawRecommendationItem[]} items
 * @property {string} computed_at
 * @property {number} computed_from_event_count
 */

/**
 * Snake-case → camelCase boundary mapper for a single recommendation item.
 * The Edge Function emits snake_case (matches the `public.recommendations.items`
 * jsonb shape); the rest of `src/` consumes the camelCase typedefs in
 * `./types.js`. This function is the single conversion point.
 *
 * @param {RawRecommendationItem} raw
 * @returns {RecommendationItem}
 */
export function mapRecommendationItem(raw) {
  return {
    tmdbId: raw.tmdb_id,
    score: raw.score,
    reason: raw.reason,
  };
}

/**
 * Maps a raw `public.recommendations` row (as returned by PostgREST or the
 * Edge Function's upsert echo) to the camelCase `Recommendation` shape.
 *
 * @param {RawRecommendationRow} row
 * @returns {Recommendation}
 */
export function mapRecommendation(row) {
  return {
    userId: row.user_id,
    items: (row.items ?? []).map(mapRecommendationItem),
    computedAt: row.computed_at,
    computedFromEventCount: row.computed_from_event_count,
  };
}
