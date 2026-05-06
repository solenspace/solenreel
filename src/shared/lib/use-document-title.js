// @ts-check
import { useEffect } from 'react';

/**
 * Sets `document.title` for the lifetime of the component; restores the prior title on unmount.
 *
 * @param {string} title
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
