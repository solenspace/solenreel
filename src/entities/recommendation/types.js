// @ts-check

/**
 * Single recommendation item — one movie reel suggests for a user. Stored
 * inside `Recommendation.items` (jsonb array, descending by `score`, capped
 * at 50 by the `recommendations_items_cap` check constraint).
 *
 * Hand-authored camelCase shape consumed by the rec UI (spec 18). The raw
 * generated `Database['public']['Tables']['recommendations']['Row'].items`
 * is `Json`; this typedef constrains the per-item shape and is the form
 * `src/entities/recommendation/mappers.js` (spec 17) maps to/from on read.
 *
 * @typedef {object} RecommendationItem
 * @property {number} tmdbId
 * @property {number} score             // 0..1, descending order in items[]
 * @property {string|null} reason       // intent-search reuse may populate;
 *                                      // null for content-based recs
 */

/**
 * Cached recommendation row for a single user. One row per user; the latest
 * rec list overwrites the previous (no history table in v1). RLS lets the
 * client read its own row only; writes happen via the spec-17 Edge Function
 * using the service role.
 *
 * @typedef {object} Recommendation
 * @property {string} userId
 * @property {RecommendationItem[]} items
 * @property {string} computedAt              // ISO timestamp
 * @property {number} computedFromEventCount  // debug breadcrumb: how many
 *                                            // events fed the computation
 */

export {};
