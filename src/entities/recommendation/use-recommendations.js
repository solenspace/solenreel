// @ts-check
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { mapRecommendationItem } from './mappers';

/**
 * @typedef {import('./types').RecommendationItem} RecommendationItem
 */

/**
 * @typedef {object} RecommendationsResult
 * @property {RecommendationItem[]} items
 * @property {number} computedFromEventCount
 * @property {boolean} coldStart
 */

const STALE_TIME = 5 * 60_000;
const GC_TIME = 30 * 60_000;

/**
 * Invokes the spec-17 Edge Function and surfaces its result through
 * TanStack Query. `userId` participates in the query key so a sign-out
 * invalidates the cache for the previous user; `enabled` short-circuits
 * the fetch entirely for signed-out callers (the function would return
 * 401 anyway, but suppressing the call avoids a wasted round-trip).
 *
 * @param {string|null|undefined} userId
 * @returns {ReturnType<typeof useQuery<RecommendationsResult>>}
 */
export function useRecommendations(userId) {
  return useQuery({
    queryKey: ['recommendations', userId],
    enabled: Boolean(userId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('recommendations', {
        method: 'POST',
      });
      if (error) throw error;
      const raw = /** @type {{ items: import('./mappers').RawRecommendationItem[], computed_from_event_count: number, cold_start: boolean }} */ (
        data
      );
      return {
        items: (raw.items ?? []).map(mapRecommendationItem),
        computedFromEventCount: raw.computed_from_event_count,
        coldStart: raw.cold_start,
      };
    },
  });
}
