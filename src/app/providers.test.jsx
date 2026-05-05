// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';

vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import AppProviders from './providers';

/** @type {import('@tanstack/react-query').QueryClient[]} */
const seenClients = [];

/** @param {{ id: string }} props */
const Consumer = ({ id }) => {
  const client = useQueryClient();
  seenClients.push(client);
  return <span data-testid={id}>{id}</span>;
};

beforeEach(() => {
  seenClients.length = 0;
});

describe('AppProviders', () => {
  it('renders children without throwing', async () => {
    render(
      <AppProviders>
        <div>hello</div>
      </AppProviders>,
    );
    await act(async () => {});

    expect(await screen.findByText('hello')).toBeInTheDocument();
  });

  it('exposes a singleton QueryClient to every consumer in the tree', async () => {
    render(
      <AppProviders>
        <>
          <Consumer id="a" />
          <Consumer id="b" />
        </>
      </AppProviders>,
    );
    await screen.findByTestId('a');
    await screen.findByTestId('b');
    await act(async () => {});

    expect(seenClients).toHaveLength(2);
    expect(seenClients[0]).toBe(seenClients[1]);
  });

  it('returns the same QueryClient across separate render passes', async () => {
    const { unmount } = render(
      <AppProviders>
        <Consumer id="first" />
      </AppProviders>,
    );
    await screen.findByTestId('first');
    await act(async () => {});
    unmount();

    render(
      <AppProviders>
        <Consumer id="second" />
      </AppProviders>,
    );
    await screen.findByTestId('second');
    await act(async () => {});

    expect(seenClients).toHaveLength(2);
    expect(seenClients[0]).toBe(seenClients[1]);
  });
});
