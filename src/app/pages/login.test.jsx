// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

import { supabase } from '@/shared/api/supabase';
import Login from './login';
import { createTestStore } from '@/shared/test/redux-wrapper';

const renderLogin = () => {
  const store = createTestStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>,
    ),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login page', () => {
  it('dispatches signInWithPassword with the entered credentials on submit', async () => {
    const user = userEvent.setup();
    /** @type {any} */ (supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: { user: { id: 'u-1' } } },
      error: null,
    });
    renderLogin();

    await user.type(screen.getByPlaceholderText('Email address'), 'reader@reel.dev');
    await user.type(screen.getByPlaceholderText('Password'), 'matte-purple-42');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'reader@reel.dev',
      password: 'matte-purple-42',
    });
  });

  it('toggles to sign-up mode and dispatches signUp on submit', async () => {
    const user = userEvent.setup();
    /** @type {any} */ (supabase.auth.signUp).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: null,
    });
    renderLogin();

    await user.click(screen.getByRole('button', { name: 'Sign up now' }));
    expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Email address'), 'new@reel.dev');
    await user.type(screen.getByPlaceholderText('Password'), 'matte-purple-42');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@reel.dev',
      password: 'matte-purple-42',
    });
  });

  it.each([
    { code: 'invalid_credentials', expected: /Invalid email or password\./ },
    { code: 'email_not_confirmed', expected: /confirm your email/i },
    { code: 'over_email_send_rate_limit', expected: /Too many attempts/i },
  ])('renders mapped copy when sign-in fails with $code', async ({ code, expected }) => {
    const user = userEvent.setup();
    /** @type {any} */ (supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null },
      error: { code, message: 'raw supabase message', status: 400 },
    });
    renderLogin();

    await user.type(screen.getByPlaceholderText('Email address'), 'reader@reel.dev');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it.each([
    { code: 'weak_password', expected: /Password is too weak/i },
    { code: 'user_already_exists', expected: /already registered/i },
  ])('renders mapped copy when sign-up fails with $code', async ({ code, expected }) => {
    const user = userEvent.setup();
    /** @type {any} */ (supabase.auth.signUp).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { code, message: 'raw', status: 422 },
    });
    renderLogin();

    await user.click(screen.getByRole('button', { name: 'Sign up now' }));
    await user.type(screen.getByPlaceholderText('Email address'), 'taken@reel.dev');
    await user.type(screen.getByPlaceholderText('Password'), 'pw');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('falls back to a generic message for unmapped error codes', async () => {
    const user = userEvent.setup();
    /** @type {any} */ (supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null },
      error: { code: 'never_seen_before', message: 'oops', status: 500 },
    });
    renderLogin();

    await user.type(screen.getByPlaceholderText('Email address'), 'reader@reel.dev');
    await user.type(screen.getByPlaceholderText('Password'), 'pw');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('clears any prior error when the user types in the email field', async () => {
    const user = userEvent.setup();
    /** @type {any} */ (supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'bad', status: 400 },
    });
    renderLogin();

    await user.type(screen.getByPlaceholderText('Email address'), 'reader@reel.dev');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText(/Invalid email or password\./)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Email address'), 'x');

    expect(screen.queryByText(/Invalid email or password\./)).not.toBeInTheDocument();
  });
});
