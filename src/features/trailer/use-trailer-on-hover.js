// @ts-check
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useMovieVideos } from '@/entities/movie/queries';
import {
  selectHoveringTileId,
  selectIsCurrentlyHovering,
  setHoveringTile,
} from '@/features/trailer/hover-store';

/** @typedef {import('@/entities/movie/types').Video} Video */

/**
 * State machine — `'idle'` while waiting for hover, `'pending'` after the
 * 250 ms threshold (TanStack Query is now allowed to fetch), `'playing'` once
 * a YouTube trailer key has resolved, `'unsupported'` if the OS reduce-motion
 * preference is on, the movie has no embeddable trailer, the iframe rejects
 * the embed (`onError`), or the video fetch errors out.
 *
 * @typedef {'idle' | 'pending' | 'playing' | 'unsupported'} HoverPlayerState
 *
 * @typedef {object} UseTrailerOnHoverResult
 * @property {React.RefObject<HTMLElement | null>} ref
 *   Attach to the tile root. The hook installs `mouseenter`/`mouseleave`/
 *   `focusin`/`focusout` listeners and an `IntersectionObserver` against this
 *   node.
 * @property {HoverPlayerState} state
 * @property {string | null} videoKey
 *   The chosen YouTube key when `state === 'playing'`. `null` otherwise.
 * @property {(error?: unknown) => void} onError
 *   Pass to `<TrailerPlayer onError>`. Transitions state to `'unsupported'`
 *   when the YouTube embed is rejected.
 */

const HOVER_DELAY_MS = 250;
const LEAVE_DELAY_MS = 100;
const VISIBILITY_THRESHOLD = 0.4;

const readReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Hover-driven trailer autoplay (Spec 12). Pass `null` to opt out — the hook
 * still runs (Rules of Hooks) but installs no listeners and stays `'idle'`.
 *
 * Honors `prefers-reduced-motion` (parks at `'unsupported'`), an
 * `IntersectionObserver` ≥40 % visibility gate, and the `hover` Redux slice's
 * single-active-tile invariant — when another tile claims the slot, this
 * hook's state collapses back to `'idle'`.
 *
 * @param {number | null | undefined} movieId
 * @returns {UseTrailerOnHoverResult}
 */
export const useTrailerOnHover = (movieId) => {
  const enabled = movieId != null;

  /** @type {React.RefObject<HTMLElement | null>} */
  const ref = useRef(null);
  const visibleRef = useRef(false);
  const claimedSlotRef = useRef(false);

  const [reducedMotion, setReducedMotion] = useState(readReducedMotion);
  const [state, setState] = useState(/** @type {HoverPlayerState} */ ('idle'));
  const [shouldFetch, setShouldFetch] = useState(false);

  const dispatch = useDispatch();
  const store = useStore();
  const isCurrentTile = useSelector(
    /** @param {{ hover: import('@/features/trailer/hover-store').HoverState }} s */
    (s) => selectIsCurrentlyHovering(s, enabled ? movieId : null),
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    /** @param {MediaQueryListEvent} e */
    const onChange = (e) => setReducedMotion(e.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      return;
    }
    if (reducedMotion) setState('unsupported');
  }, [enabled, reducedMotion]);

  const videosQuery = useMovieVideos(enabled ? movieId : 0, {
    enabled: enabled && shouldFetch && !reducedMotion,
  });
  /** @type {Video[] | undefined} */
  const videos = videosQuery.data;
  const videosError = videosQuery.isError;

  const videoKey = useMemo(() => {
    if (!videos || videos.length === 0) return null;
    const trailer = videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer');
    if (trailer) return trailer.key;
    const youtube = videos.find((v) => v.site === 'YouTube');
    return youtube?.key ?? null;
  }, [videos]);

  useEffect(() => {
    if (state !== 'pending') return;
    if (videoKey) {
      setState('playing');
      return;
    }
    if (videosError) {
      setState('unsupported');
      return;
    }
    if (videos && videos.length === 0) setState('unsupported');
    else if (videos && !videoKey) setState('unsupported');
  }, [state, videoKey, videos, videosError]);

  useEffect(() => {
    if (!enabled) return;
    if (!isCurrentTile) {
      claimedSlotRef.current = false;
      if (state === 'pending' || state === 'playing') setState('idle');
    }
  }, [enabled, isCurrentTile, state]);

  useEffect(() => {
    if (!enabled || reducedMotion) return;
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        const isVisible =
          !!entry &&
          entry.isIntersecting &&
          entry.intersectionRatio >= VISIBILITY_THRESHOLD;
        visibleRef.current = isVisible;
        if (!isVisible) {
          setState((prev) => (prev === 'playing' || prev === 'pending' ? 'idle' : prev));
        }
      },
      { threshold: [0, VISIBILITY_THRESHOLD, 1] },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      visibleRef.current = false;
    };
  }, [enabled, reducedMotion]);

  useEffect(() => {
    if (!enabled || reducedMotion) return;
    const node = ref.current;
    if (!node) return;

    /** @type {ReturnType<typeof setTimeout> | null} */
    let enterTimer = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let leaveTimer = null;

    const clearEnter = () => {
      if (enterTimer != null) {
        clearTimeout(enterTimer);
        enterTimer = null;
      }
    };
    const clearLeave = () => {
      if (leaveTimer != null) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
    };

    const onEnter = () => {
      if (!visibleRef.current) return;
      clearLeave();
      clearEnter();
      enterTimer = setTimeout(() => {
        enterTimer = null;
        if (!visibleRef.current) return;
        setState('pending');
        setShouldFetch(true);
        dispatch(setHoveringTile(/** @type {number} */ (movieId)));
        claimedSlotRef.current = true;
      }, HOVER_DELAY_MS);
    };

    const onLeave = () => {
      clearEnter();
      clearLeave();
      leaveTimer = setTimeout(() => {
        leaveTimer = null;
        setState((prev) => (prev === 'unsupported' ? prev : 'idle'));
        if (claimedSlotRef.current) {
          const current = selectHoveringTileId(
            /** @type {{ hover: import('@/features/trailer/hover-store').HoverState }} */ (
              store.getState()
            ),
          );
          if (current === movieId) dispatch(setHoveringTile(null));
          claimedSlotRef.current = false;
        }
      }, LEAVE_DELAY_MS);
    };

    node.addEventListener('mouseenter', onEnter, { passive: true });
    node.addEventListener('mouseleave', onLeave, { passive: true });
    node.addEventListener('focusin', onEnter, { passive: true });
    node.addEventListener('focusout', onLeave, { passive: true });

    return () => {
      clearEnter();
      clearLeave();
      node.removeEventListener('mouseenter', onEnter);
      node.removeEventListener('mouseleave', onLeave);
      node.removeEventListener('focusin', onEnter);
      node.removeEventListener('focusout', onLeave);
    };
  }, [enabled, reducedMotion, movieId, dispatch, store]);

  const onError = useCallback(() => {
    setState('unsupported');
  }, []);

  return { ref, state, videoKey, onError };
};
