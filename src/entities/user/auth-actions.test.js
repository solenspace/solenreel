// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

import { supabase } from '@/shared/api/supabase';
import { signIn, signUp, signOut } from './auth-actions';
import { createTestStore } from '@/shared/test/redux-wrapper';

const CREDS = { email: 'reader@reel.dev', password: 'matte-purple-42' };

const FAKE_SESSION = /** @type {any} */ ({
  access_token: 'access',
  refresh_token: 'refresh',
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: 'bearer',
  user: { id: 'u-1', email: CREDS.email },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signIn thunk', () => {
  it('resolves with the session and leaves the slice in loading until the auth listener fires', async () => {
    /** @type {any} */ (supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: FAKE_SESSION },
      error: null,
    });
    const store = createTestStore();

    const result = await store.dispatch(signIn(CREDS));

    expect(signIn.fulfilled.match(result)).toBe(true);
    expect(/** @type {any} */ (result).payload).toBe(FAKE_SESSION);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(CREDS);
    // .fulfilled is intentionally not handled by the slice — onAuthStateChange owns
    // the session transition. Status stays at 'loading' until setSession fires.
    expect(store.getState().user.status).toBe('loading');
    expect(store.getState().user.error).toBeNull();
  });

  it.each([
    {
      name: 'invalid_credentials',
      error: { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 },
    },
    {
      name: 'over_email_send_rate_limit',
      error: {
        code: 'over_email_send_rate_limit',
        message: 'Email rate limit exceeded',
        status: 429,
      },
    },
  ])('rejects with normalized AppAuthError on $name and sets slice error', async ({ error }) => {
    /** @type {any} */ (supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null },
      error,
    });
    const store = createTestStore();

    const result = await store.dispatch(signIn(CREDS));

    expect(signIn.rejected.match(result)).toBe(true);
    expect(/** @type {any} */ (result).payload).toEqual(error);
    expect(store.getState().user.status).toBe('unauthenticated');
    expect(store.getState().user.error).toEqual(error);
  });
});

describe('signUp thunk', () => {
  it('resolves with the session', async () => {
    /** @type {any} */ (supabase.auth.signUp).mockResolvedValueOnce({
      data: { session: FAKE_SESSION, user: FAKE_SESSION.user },
      error: null,
    });
    const store = createTestStore();

    const result = await store.dispatch(signUp(CREDS));

    expect(signUp.fulfilled.match(result)).toBe(true);
    expect(supabase.auth.signUp).toHaveBeenCalledWith(CREDS);
  });

  it.each([
    {
      name: 'weak_password',
      error: {
        code: 'weak_password',
        message: 'Password should be at least 6 characters',
        status: 422,
      },
    },
    {
      name: 'user_already_exists',
      error: { code: 'user_already_exists', message: 'User already registered', status: 422 },
    },
  ])('rejects on $name with normalized payload', async ({ error }) => {
    /** @type {any} */ (supabase.auth.signUp).mockResolvedValueOnce({
      data: { session: null, user: null },
      error,
    });
    const store = createTestStore();

    const result = await store.dispatch(signUp(CREDS));

    expect(signUp.rejected.match(result)).toBe(true);
    expect(/** @type {any} */ (result).payload).toEqual(error);
    expect(store.getState().user.error).toEqual(error);
  });
});

describe('signOut thunk', () => {
  it('resolves with null on success', async () => {
    /** @type {any} */ (supabase.auth.signOut).mockResolvedValueOnce({ error: null });
    const store = createTestStore({
      preloadedState: {
        user: { session: FAKE_SESSION, status: 'authenticated', error: null },
      },
    });

    const result = await store.dispatch(signOut());

    expect(signOut.fulfilled.match(result)).toBe(true);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('rejects with normalized error and preserves authenticated status when the session is still in state', async () => {
    const supabaseError = { code: 'unexpected_failure', message: 'Network error', status: 500 };
    /** @type {any} */ (supabase.auth.signOut).mockResolvedValueOnce({ error: supabaseError });
    const store = createTestStore({
      preloadedState: {
        user: { session: FAKE_SESSION, status: 'authenticated', error: null },
      },
    });

    const result = await store.dispatch(signOut());

    expect(signOut.rejected.match(result)).toBe(true);
    expect(/** @type {any} */ (result).payload).toEqual(supabaseError);
    // Session is still in state — recovery path should restore 'authenticated'.
    expect(store.getState().user.status).toBe('authenticated');
    expect(store.getState().user.error).toEqual(supabaseError);
  });
});
