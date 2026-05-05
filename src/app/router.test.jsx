// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

vi.mock('@/app/pages/home', () => ({ default: () => <div>Home page</div> }));
vi.mock('@/app/pages/search', () => ({ default: () => <div>Search page</div> }));
vi.mock('@/app/pages/movie', () => ({ default: () => <div>Movie placeholder</div> }));
vi.mock('@/app/pages/profile', () => ({ default: () => <div>Profile page</div> }));
vi.mock('@/app/pages/welcome', () => ({ default: () => <div>Welcome page</div> }));
vi.mock('@/app/pages/login', () => ({ default: () => <div>Login page</div> }));

import { routes } from './router';
import { createTestStore } from '@/shared/test/redux-wrapper';

/** @typedef {'idle' | 'loading' | 'authenticated' | 'unauthenticated'} AuthStatus */

const fakeSession = /** @type {any} */ ({
  user: { id: 'u-1', email: 'reader@reel.dev' },
  access_token: 't',
  refresh_token: 'r',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
});

/**
 * @param {{
 *   path: string,
 *   status?: AuthStatus,
 *   session?: import('@/shared/types/auth').Session | null,
 * }} opts
 */
const renderAt = ({ path, status = 'authenticated', session = fakeSession }) => {
  const store = createTestStore({
    preloadedState: { user: { session, status, error: null } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    store,
    router,
    ...render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>,
    ),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('router — authenticated routes under AppLayout', () => {
  it.each([
    { path: '/', expected: /Home page/ },
    { path: '/search', expected: /Search page/ },
    { path: '/movie/123', expected: /Movie placeholder/ },
    { path: '/profile', expected: /Profile page/ },
  ])('renders $path', async ({ path, expected }) => {
    renderAt({ path });

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });
});

describe('router — auth routes under AuthLayout', () => {
  it.each([
    { path: '/auth', expected: /Welcome page/ },
    { path: '/auth/login', expected: /Login page/ },
  ])('renders $path when unauthenticated', async ({ path, expected }) => {
    renderAt({ path, status: 'unauthenticated', session: null });

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });
});

describe('router — auth-state redirects', () => {
  it('redirects unauthenticated user from /profile to /auth/login', async () => {
    renderAt({ path: '/profile', status: 'unauthenticated', session: null });

    expect(await screen.findByText(/Login page/)).toBeInTheDocument();
    expect(screen.queryByText(/Profile page/)).not.toBeInTheDocument();
  });

  it('redirects authenticated user from /auth/login to /', async () => {
    renderAt({ path: '/auth/login' });

    expect(await screen.findByText(/Home page/)).toBeInTheDocument();
    expect(screen.queryByText(/Login page/)).not.toBeInTheDocument();
  });
});
