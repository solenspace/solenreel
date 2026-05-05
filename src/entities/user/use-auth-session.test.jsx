// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { Provider } from 'react-redux';

vi.mock('@/shared/api/supabase', () => {
  /** @type {Array<(event: string, session: any) => void>} */
  const callbacks = [];
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn((cb) => {
    callbacks.push(cb);
    return { data: { subscription: { unsubscribe } } };
  });
  const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
  return {
    supabase: { auth: { getSession, onAuthStateChange, signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn() } },
    __callbacks: callbacks,
    __unsubscribe: unsubscribe,
  };
});

import * as supabaseModule from '@/shared/api/supabase';
import { useAuthSession } from './use-auth-session';
import { createTestStore } from '@/shared/test/redux-wrapper';

const Probe = () => {
  useAuthSession();
  return null;
};

const FAKE_SESSION = /** @type {any} */ ({
  access_token: 'a',
  refresh_token: 'r',
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: 'bearer',
  user: { id: 'u-1', email: 'reader@reel.dev' },
});

beforeEach(() => {
  vi.clearAllMocks();
  /** @type {any} */ (supabaseModule).__callbacks.length = 0;
  /** @type {any} */ (supabaseModule.supabase.auth.getSession).mockResolvedValue({
    data: { session: null },
  });
});

describe('useAuthSession', () => {
  it('subscribes to onAuthStateChange exactly once on mount', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );

    expect(supabaseModule.supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('hydrates the slice from getSession when no session exists yet', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );

    // Flush the getSession promise.
    await act(async () => {});

    expect(store.getState().user.session).toBeNull();
    expect(store.getState().user.status).toBe('unauthenticated');
  });

  it('hydrates the slice with an existing session from getSession', async () => {
    /** @type {any} */ (supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: FAKE_SESSION },
    });
    const store = createTestStore();
    render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );

    await act(async () => {});

    expect(store.getState().user.session).toBe(FAKE_SESSION);
    expect(store.getState().user.status).toBe('authenticated');
  });

  it.each([
    { event: 'SIGNED_IN', payload: FAKE_SESSION, expectedStatus: 'authenticated' },
    { event: 'SIGNED_OUT', payload: null, expectedStatus: 'unauthenticated' },
    { event: 'TOKEN_REFRESHED', payload: FAKE_SESSION, expectedStatus: 'authenticated' },
  ])('dispatches setSession on $event', async ({ event, payload, expectedStatus }) => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );
    await act(async () => {});

    const callbacks = /** @type {any} */ (supabaseModule).__callbacks;
    await act(async () => {
      callbacks[0](event, payload);
    });

    expect(store.getState().user.session).toEqual(payload);
    expect(store.getState().user.status).toBe(expectedStatus);
  });

  it('unsubscribes from onAuthStateChange on unmount', () => {
    const store = createTestStore();
    const { unmount } = render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );

    unmount();

    expect(/** @type {any} */ (supabaseModule).__unsubscribe).toHaveBeenCalledTimes(1);
  });
});
