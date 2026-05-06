// @ts-check
import { useEffect, useRef } from 'react';

/**
 * Subscribe to a single keydown event for the lifetime of the component. The
 * handler is captured in a ref so callers may pass an inline arrow without
 * re-binding the listener on every render. Spec 22 reuses this for the
 * search-bar overlay's `/` and `Esc` triggers.
 *
 * @param {string} key
 * @param {(event: KeyboardEvent) => void} handler
 * @param {boolean} [enabled=true]
 */
export function useKeyDown(key, handler, enabled = true) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return undefined;
    /** @param {KeyboardEvent} event */
    const onKeyDown = (event) => {
      if (event.key === key) handlerRef.current(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, enabled]);
}
