// @ts-check
import React from 'react';
import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

/** @type {Array<(entries: IntersectionObserverEntry[]) => void>} */
const ioCallbacks = [];

class MockIntersectionObserver {
  /** @param {(entries: IntersectionObserverEntry[]) => void} cb */
  constructor(cb) {
    ioCallbacks.push(cb);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver = /** @type {any} */ (MockIntersectionObserver);

/** @param {Partial<IntersectionObserverEntry>} entry */
globalThis.__triggerIntersection = (entry) => {
  for (const cb of ioCallbacks) {
    cb(/** @type {IntersectionObserverEntry[]} */ ([entry]));
  }
};

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = /** @type {any} */ (MockResizeObserver);

let prefersReducedMotion = false;
/** @param {boolean} value */
globalThis.__setPrefersReducedMotion = (value) => {
  prefersReducedMotion = value;
};

window.matchMedia = vi.fn().mockImplementation((query) => ({
  get matches() {
    return query.includes('prefers-reduced-motion: reduce') ? prefersReducedMotion : false;
  },
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const playerStub = {
  default: (/** @type {{ playing?: boolean, muted?: boolean }} */ props) =>
    React.createElement('div', {
      'data-testid': 'player',
      'data-playing': String(!!props.playing),
      'data-muted': String(!!props.muted),
    }),
};
vi.mock('react-player/youtube', () => playerStub);
vi.mock('react-player', () => playerStub);

beforeEach(() => {
  ioCallbacks.length = 0;
  prefersReducedMotion = false;
});
