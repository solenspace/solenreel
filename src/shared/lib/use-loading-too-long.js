// @ts-check
import { useEffect, useState } from 'react';

/**
 * Flips `true` after `threshold` ms of continuous pending. Resets on `isPending → false`.
 *
 * @param {boolean} isPending
 * @param {number} [threshold=800]
 * @returns {boolean}
 */
export function useLoadingTooLong(isPending, threshold = 800) {
  const [tooLong, setTooLong] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setTooLong(false);
      return undefined;
    }
    const id = setTimeout(() => setTooLong(true), threshold);
    return () => clearTimeout(id);
  }, [isPending, threshold]);

  return tooLong;
}
