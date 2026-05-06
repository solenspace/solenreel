// @ts-check
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import hoverReducer, { selectHoveringTileId } from '@/features/trailer/hover-store';

vi.mock('@/entities/movie/queries', () => ({
  useMovieVideos: vi.fn(() => ({ data: undefined, isError: false, isPending: false })),
}));

import { useMovieVideos } from '@/entities/movie/queries';
import { useTrailerOnHover } from './use-trailer-on-hover';

/** @typedef {import('./use-trailer-on-hover').UseTrailerOnHoverResult} HookResult */

const mockedUseMovieVideos = vi.mocked(useMovieVideos);

const makeStore = () => configureStore({ reducer: { hover: hoverReducer } });

/**
 * @param {number | null} movieId
 * @param {ReturnType<typeof makeStore>} [store]
 */
const mountHook = (movieId, store = makeStore()) => {
  /** @type {{ current: HookResult | null }} */
  const sink = { current: null };
  const Harness = () => {
    const result = useTrailerOnHover(movieId);
    sink.current = result;
    return <div ref={/** @type {any} */ (result.ref)} data-testid="trigger" />;
  };
  const utils = render(
    <Provider store={store}>
      <Harness />
    </Provider>,
  );
  return { sink, store, ...utils };
};

const dispatchMouse = (/** @type {Element} */ el, /** @type {string} */ type) =>
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: false }));
  });

describe('useTrailerOnHover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedUseMovieVideos.mockReturnValue(
      /** @type {any} */ ({
        data: [
          { key: 'abc123', site: 'YouTube', type: 'Trailer', name: 'Official Trailer' },
        ],
        isError: false,
        isPending: false,
      }),
    );
    globalThis.__setPrefersReducedMotion(false);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('transitions idle → playing after a 250ms hover when visible', () => {
    const { sink } = mountHook(42);
    expect(sink.current?.state).toBe('idle');

    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });

    const trigger = screen.getByTestId('trigger');
    dispatchMouse(trigger, 'mouseenter');

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(sink.current?.state).toBe('idle');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(sink.current?.state).toBe('playing');
    expect(sink.current?.videoKey).toBe('abc123');
  });

  it('returns to idle 100ms after mouseleave', () => {
    const { sink } = mountHook(42);
    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });
    const trigger = screen.getByTestId('trigger');
    dispatchMouse(trigger, 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(sink.current?.state).toBe('playing');

    dispatchMouse(trigger, 'mouseleave');
    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(sink.current?.state).toBe('playing');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(sink.current?.state).toBe('idle');
  });

  it('parks at unsupported when prefers-reduced-motion is set', () => {
    globalThis.__setPrefersReducedMotion(true);
    const { sink } = mountHook(42);
    expect(sink.current?.state).toBe('unsupported');

    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });
    dispatchMouse(screen.getByTestId('trigger'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(sink.current?.state).toBe('unsupported');
  });

  it('does not mount the player when the tile is not visible', () => {
    const { sink } = mountHook(42);
    dispatchMouse(screen.getByTestId('trigger'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(sink.current?.state).toBe('idle');
  });

  it('does not mount when intersection ratio is below 40%', () => {
    const { sink } = mountHook(42);
    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 0.2 });
    });
    dispatchMouse(screen.getByTestId('trigger'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(sink.current?.state).toBe('idle');
  });

  it('force-unmounts the previously playing tile when a second tile claims the slot', () => {
    const store = makeStore();

    /** @type {{ current: HookResult | null }} */
    const sinkA = { current: null };
    /** @type {{ current: HookResult | null }} */
    const sinkB = { current: null };

    const Harness = () => {
      const a = useTrailerOnHover(1);
      const b = useTrailerOnHover(2);
      sinkA.current = a;
      sinkB.current = b;
      return (
        <>
          <div ref={/** @type {any} */ (a.ref)} data-testid="trigger-a" />
          <div ref={/** @type {any} */ (b.ref)} data-testid="trigger-b" />
        </>
      );
    };

    render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );

    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });

    dispatchMouse(screen.getByTestId('trigger-a'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(sinkA.current?.state).toBe('playing');
    expect(selectHoveringTileId(store.getState())).toBe(1);

    dispatchMouse(screen.getByTestId('trigger-b'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(sinkB.current?.state).toBe('playing');
    expect(selectHoveringTileId(store.getState())).toBe(2);
    expect(sinkA.current?.state).toBe('idle');
  });

  it('transitions to unsupported when onError fires', () => {
    const { sink } = mountHook(42);
    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });
    dispatchMouse(screen.getByTestId('trigger'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(sink.current?.state).toBe('playing');

    act(() => {
      sink.current?.onError();
    });
    expect(sink.current?.state).toBe('unsupported');
  });

  it('stays in idle when movieId is null and installs no listeners', () => {
    const { sink } = mountHook(null);
    expect(sink.current?.state).toBe('idle');

    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });
    dispatchMouse(screen.getByTestId('trigger'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(sink.current?.state).toBe('idle');
  });

  it('marks state as unsupported when the movie has no embeddable trailer', () => {
    mockedUseMovieVideos.mockReturnValue(
      /** @type {any} */ ({ data: [], isError: false, isPending: false }),
    );
    const { sink } = mountHook(42);
    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });
    dispatchMouse(screen.getByTestId('trigger'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(sink.current?.state).toBe('unsupported');
  });

  it('falls back to a non-Trailer YouTube video if no Trailer-typed video exists', () => {
    mockedUseMovieVideos.mockReturnValue(
      /** @type {any} */ ({
        data: [{ key: 'teaser-key', site: 'YouTube', type: 'Teaser', name: 'Teaser' }],
        isError: false,
        isPending: false,
      }),
    );
    const { sink } = mountHook(42);
    act(() => {
      globalThis.__triggerIntersection({ isIntersecting: true, intersectionRatio: 1 });
    });
    dispatchMouse(screen.getByTestId('trigger'), 'mouseenter');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(sink.current?.state).toBe('playing');
    expect(sink.current?.videoKey).toBe('teaser-key');
  });
});
