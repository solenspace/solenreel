// @ts-check
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryWrapper, createTestQueryClient } from '@/shared/test/query-wrapper';

// Mock the supabase singleton at module scope. The hook only reads
// `supabase.functions.invoke` — every other field is irrelevant here.
vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

const { supabase } = await import('@/shared/api/supabase');
const { useRecommendations } = await import('./use-recommendations');

const invokeMock = /** @type {import('vitest').Mock} */ (supabase.functions.invoke);

/**
 * @template T
 * @param {() => T} callback
 */
const renderWithClient = (callback) => {
  const client = createTestQueryClient();
  return renderHook(callback, {
    wrapper: (
      /** @type {{ children: import('react').ReactNode }} */ { children },
    ) => <QueryWrapper client={client}>{children}</QueryWrapper>,
  });
};

const sampleResponse = () => ({
  items: [
    { tmdb_id: 550, score: 0.91, reason: null },
    { tmdb_id: 680, score: 0.87, reason: null },
  ],
  computed_from_event_count: 12,
  cold_start: false,
});

beforeEach(() => {
  invokeMock.mockReset();
});

describe('useRecommendations', () => {
  it('invokes the recommendations Edge Function with POST', async () => {
    invokeMock.mockResolvedValueOnce({ data: sampleResponse(), error: null });

    const { result } = renderWithClient(() => useRecommendations('user-123'));

    await waitFor(() =>
      expect(/** @type {{ isSuccess: boolean }} */ (result.current).isSuccess).toBe(true),
    );

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('recommendations', { method: 'POST' });
  });

  it('maps snake_case response to camelCase RecommendationsResult', async () => {
    invokeMock.mockResolvedValueOnce({ data: sampleResponse(), error: null });

    const { result } = renderWithClient(() => useRecommendations('user-123'));
    await waitFor(() =>
      expect(/** @type {{ isSuccess: boolean }} */ (result.current).isSuccess).toBe(true),
    );

    const data = /** @type {{ data: { items: Array<{ tmdbId: number, score: number, reason: string | null }>, computedFromEventCount: number, coldStart: boolean } }} */ (
      result.current
    ).data;
    expect(data.coldStart).toBe(false);
    expect(data.computedFromEventCount).toBe(12);
    expect(data.items).toEqual([
      { tmdbId: 550, score: 0.91, reason: null },
      { tmdbId: 680, score: 0.87, reason: null },
    ]);
  });

  it('does NOT invoke the function when userId is falsy', () => {
    renderWithClient(() => useRecommendations(null));
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('surfaces invoke errors through TanStack Query isError', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error('Edge 502') });

    const { result } = renderWithClient(() => useRecommendations('user-123'));
    await waitFor(() =>
      expect(/** @type {{ isError: boolean }} */ (result.current).isError).toBe(true),
    );
    expect(
      /** @type {{ error: Error | null }} */ (result.current).error,
    ).toBeInstanceOf(Error);
  });

  it('treats an empty items array safely', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { items: [], computed_from_event_count: 0, cold_start: true },
      error: null,
    });

    const { result } = renderWithClient(() => useRecommendations('user-123'));
    await waitFor(() =>
      expect(/** @type {{ isSuccess: boolean }} */ (result.current).isSuccess).toBe(true),
    );

    const data = /** @type {{ data: { items: unknown[], coldStart: boolean } }} */ (
      result.current
    ).data;
    expect(data.items).toEqual([]);
    expect(data.coldStart).toBe(true);
  });
});
