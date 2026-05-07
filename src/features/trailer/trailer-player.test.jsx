// @ts-check
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { act, render, screen, cleanup } from '@testing-library/react';

const insertMock = vi.fn();
vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: insertMock })),
  },
}));

// Override the global react-player stub to expose onStart/onEnded as buttons
// so tests can drive the lifecycle without spinning up YouTube.
vi.mock('react-player/youtube', () => ({
  default: (
    /** @type {{ onStart?: () => void, onEnded?: () => void, playing?: boolean, muted?: boolean }} */ props,
  ) =>
    React.createElement(
      'div',
      {
        'data-testid': 'player',
        'data-playing': String(!!props.playing),
        'data-muted': String(!!props.muted),
      },
      React.createElement(
        'button',
        { type: 'button', 'data-testid': 'fire-start', onClick: () => props.onStart?.() },
        'start',
      ),
      React.createElement(
        'button',
        { type: 'button', 'data-testid': 'fire-ended', onClick: () => props.onEnded?.() },
        'ended',
      ),
    ),
}));

import { ReduxWrapper } from '@/shared/test/redux-wrapper';
import TrailerPlayer from './trailer-player';
import { __resetForTests } from '@/features/click-tracker/use-click-tracker';

/** @typedef {import('@/shared/types/auth').Session} Session */

const session = /** @type {Session} */ (
  /** @type {unknown} */ ({
    user: { id: 'user-1' },
    access_token: 'jwt-1',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'r',
  })
);
const preloaded = {
  user: { session, status: /** @type {const} */ ('authenticated'), error: null },
};

const renderPlayer = (/** @type {React.ReactElement} */ ui) =>
  render(<ReduxWrapper preloadedState={preloaded}>{ui}</ReduxWrapper>);

describe('TrailerPlayer tracking', () => {
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

  it('does not emit when tmdbId is omitted (presentational use)', async () => {
    const onEnded = vi.fn();
    renderPlayer(<TrailerPlayer videoKey="abc" playing onEnded={onEnded} />);

    act(() => {
      screen.getByTestId('fire-start').click();
    });
    act(() => {
      screen.getByTestId('fire-ended').click();
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('emits trailer_play on first-frame start when tmdbId is provided', async () => {
    renderPlayer(<TrailerPlayer videoKey="abc" playing tmdbId={42} mode="full" />);

    act(() => {
      screen.getByTestId('fire-start').click();
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0][0];
    expect(row).toMatchObject({
      kind: 'trailer_play',
      tmdb_id: 42,
      payload: { mode: 'full' },
    });
  });

  it('emits trailer_complete with duration_ms = end - start', async () => {
    vi.setSystemTime(new Date(0));

    const onEnded = vi.fn();
    renderPlayer(
      <TrailerPlayer videoKey="abc" playing tmdbId={77} mode="overlay" onEnded={onEnded} />,
    );

    act(() => {
      screen.getByTestId('fire-start').click();
    });
    act(() => {
      vi.advanceTimersByTime(3_500);
    });
    act(() => {
      screen.getByTestId('fire-ended').click();
    });
    await act(async () => {
      // Drain the 2-s flush timer; the system clock advances by another 2_000.
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    const allRows = insertMock.mock.calls.flatMap((c) => c[0]);
    const completeRow = allRows.find((r) => r.kind === 'trailer_complete');
    expect(completeRow).toMatchObject({
      kind: 'trailer_complete',
      tmdb_id: 77,
      payload: { mode: 'overlay', duration_ms: 3_500 },
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});
