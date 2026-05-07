// @ts-check
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';

const insertMock = vi.fn();
vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: insertMock })),
  },
}));

import { Provider } from 'react-redux';
import { createTestStore } from '@/shared/test/redux-wrapper';
import { setSession } from '@/entities/user/user-slice';
import { useClickTracker, __resetForTests } from './use-click-tracker';

/** @typedef {import('@/shared/types/auth').Session} Session */

const SUPABASE_URL = 'http://test-supabase.local';
const SUPABASE_ANON = 'anon-key-1234';

vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);
vi.stubEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_ANON);

/**
 * @param {string} userId
 * @param {string} accessToken
 * @returns {Session}
 */
const fakeSession = (userId, accessToken) =>
  /** @type {Session} */ (
    /** @type {unknown} */ ({
      user: { id: userId },
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'refresh',
    })
  );

const preloadedSession = (userId = 'user-1', accessToken = 'jwt-1') => ({
  user: {
    session: fakeSession(userId, accessToken),
    status: /** @type {const} */ ('authenticated'),
    error: null,
  },
});

/** @param {ReturnType<typeof preloadedSession> | { user: { session: null, status: 'unauthenticated', error: null } }} preloaded */
const mountTracker = (preloaded = preloadedSession()) => {
  const store = createTestStore({ preloadedState: preloaded });
  /** @type {{ current: ReturnType<typeof useClickTracker> | null }} */
  const sink = { current: null };
  const Harness = () => {
    sink.current = useClickTracker();
    return null;
  };
  const utils = render(
    <Provider store={store}>
      <Harness />
    </Provider>,
  );
  return { sink, store, ...utils };
};

describe('useClickTracker', () => {
  beforeEach(() => {
    __resetForTests();
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    __resetForTests();
  });

  it('flushes a single insert with 5 events when the batch threshold is hit', async () => {
    const { sink } = mountTracker();
    act(() => {
      sink.current?.track('tile_click', 1, { source: 'home' });
      sink.current?.track('tile_click', 2, { source: 'home' });
      sink.current?.track('tile_click', 3, { source: 'home' });
      sink.current?.track('tile_click', 4, { source: 'home' });
      sink.current?.track('tile_click', 5, { source: 'home' });
    });
    await vi.runAllTimersAsync();

    expect(insertMock).toHaveBeenCalledTimes(1);
    const batch = insertMock.mock.calls[0][0];
    expect(batch).toHaveLength(5);
    expect(batch[0]).toMatchObject({
      kind: 'tile_click',
      tmdb_id: 1,
      user_id: 'user-1',
      payload: { source: 'home' },
    });
  });

  it('flushes after the 2-second idle timer', async () => {
    const { sink } = mountTracker();
    act(() => {
      sink.current?.track('tile_click', 7, { source: 'home' });
    });
    expect(insertMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toHaveLength(1);
  });

  it('dedupes tile_click for the same tmdb_id within a session', async () => {
    const { sink } = mountTracker();
    act(() => {
      sink.current?.track('tile_click', 42, { source: 'home' });
      sink.current?.track('tile_click', 42, { source: 'home' });
      sink.current?.track('tile_click', 42, { source: 'home' });
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toHaveLength(1);
  });

  it('does NOT dedupe trailer_complete', async () => {
    const { sink } = mountTracker();
    act(() => {
      sink.current?.track('trailer_complete', 9, { mode: 'full', duration_ms: 1000 });
      sink.current?.track('trailer_complete', 9, { mode: 'full', duration_ms: 2000 });
      sink.current?.track('trailer_complete', 9, { mode: 'full', duration_ms: 3000 });
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toHaveLength(3);
  });

  it('is a no-op when signed out', () => {
    const { sink } = mountTracker({
      user: { session: null, status: 'unauthenticated', error: null },
    });
    act(() => {
      sink.current?.track('tile_click', 1, { source: 'home' });
      sink.current?.track('tile_click', 2, { source: 'home' });
    });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('drops queue + clears dedupe on sign-out, accepts new session afterward', async () => {
    const { sink, store } = mountTracker();
    act(() => {
      sink.current?.track('tile_click', 11, { source: 'home' });
      sink.current?.track('tile_click', 12, { source: 'home' });
    });

    act(() => {
      store.dispatch(setSession(null));
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    expect(insertMock).not.toHaveBeenCalled();

    // Re-authenticate; dedupe set was cleared, so re-emitting tmdb_id 11
    // (which was queued before sign-out) produces a fresh row.
    act(() => {
      store.dispatch(setSession(fakeSession('user-2', 'jwt-2')));
    });
    act(() => {
      sink.current?.track('tile_click', 11, { source: 'home' });
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0][0].user_id).toBe('user-2');
  });

  it('flushes via fetch(keepalive) on visibilitychange → hidden', () => {
    /** @type {import('vitest').Mock<(url: string, init: RequestInit) => Promise<Response>>} */
    const fetchMock = vi.fn((/** @type {string} */ _url, /** @type {RequestInit} */ _init) =>
      Promise.resolve(new Response()),
    );
    vi.stubGlobal('fetch', fetchMock);
    const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'visibilityState',
    );
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    try {
      const { sink } = mountTracker();
      act(() => {
        sink.current?.track('tile_click', 99, { source: 'home' });
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${SUPABASE_URL}/rest/v1/events`);
      expect(init?.method).toBe('POST');
      expect(init?.keepalive).toBe(true);
      const headers = /** @type {Record<string, string>} */ (init?.headers);
      expect(headers.Authorization).toBe('Bearer jwt-1');
      expect(headers.apikey).toBe(SUPABASE_ANON);
      const body = JSON.parse(/** @type {string} */ (init?.body));
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ kind: 'tile_click', tmdb_id: 99 });
    } finally {
      vi.unstubAllGlobals();
      if (originalVisibilityDescriptor) {
        Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor);
      }
    }
  });

  it('retries an insert error once after 500 ms, then drops with a dev-warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    insertMock.mockResolvedValueOnce({ error: { message: 'boom' } });
    insertMock.mockResolvedValueOnce({ error: { message: 'still boom' } });

    const { sink } = mountTracker();
    act(() => {
      sink.current?.track('tile_click', 50, { source: 'home' });
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
    expect(insertMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
