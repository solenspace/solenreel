// @ts-check
import { useCallback, useRef } from 'react';
import ReactPlayer from 'react-player/youtube';
import { useClickTracker } from '@/features/click-tracker/use-click-tracker';

/**
 * @typedef {'full' | 'overlay'} TrailerPlayerMode
 *
 * @typedef {object} TrailerPlayerProps
 * @property {string | null | undefined} videoKey
 * @property {boolean} [playing]
 * @property {boolean} [muted]
 * @property {TrailerPlayerMode} [mode]
 *   `full` (default) — relative-positioned, full opacity. Used by banner +
 *   movie-modal hero. `overlay` — absolutely-positioned over a sibling poster
 *   at 0.7 opacity with `pointer-events-none` so the parent button continues
 *   to capture clicks. Used by the spec-12 hover-player slot.
 * @property {number} [tmdbId]
 *   When set, the player auto-emits `trailer_play` on first-frame start and
 *   `trailer_complete` (with `duration_ms` measured from start) on `onEnded`.
 *   Leave undefined for presentational use (no telemetry).
 * @property {() => void} [onEnded]
 * @property {() => void} [onReady]
 * @property {(error?: unknown) => void} [onError]
 *   Fires when the underlying iframe rejects the embed (e.g., owner blocks
 *   embedding). The hover hook routes this back to `state='unsupported'` so
 *   the tile reverts to the static poster.
 * @property {string} [className]
 * @property {React.CSSProperties} [style]
 */

/** @param {TrailerPlayerProps} props */
const TrailerPlayer = ({
  videoKey,
  playing = false,
  muted = true,
  mode = 'full',
  tmdbId,
  onEnded,
  onReady,
  onError,
  className = '',
  style = {},
}) => {
  const { track } = useClickTracker();
  /** @type {React.RefObject<number | null>} */
  const playStartedAtRef = useRef(null);

  // `onStart` (first-frame play) is the right tracking moment, not `onReady`
  // (player loaded but possibly still buffering). Capture the wall-clock
  // start so `trailer_complete` can report the elapsed watch duration.
  const handleStart = useCallback(() => {
    if (tmdbId != null) {
      playStartedAtRef.current = Date.now();
      track('trailer_play', tmdbId, { mode });
    }
  }, [tmdbId, mode, track]);

  const handleEnded = useCallback(() => {
    if (tmdbId != null && playStartedAtRef.current !== null) {
      track('trailer_complete', tmdbId, {
        mode,
        duration_ms: Date.now() - playStartedAtRef.current,
      });
    }
    onEnded?.();
  }, [tmdbId, mode, track, onEnded]);

  if (!videoKey) return null;

  const isOverlay = mode === 'overlay';
  const wrapperClass = isOverlay
    ? `pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()
    : `relative overflow-hidden ${className}`.trim();

  /** @type {React.CSSProperties} */
  const wrapperStyle = isOverlay ? { opacity: 0.7, ...style } : style;

  return (
    <div className={wrapperClass} style={wrapperStyle} data-trailer-mode={mode}>
      <ReactPlayer
        url={`https://www.youtube.com/watch?v=${videoKey}`}
        playing={playing}
        muted={muted}
        controls={false}
        onStart={handleStart}
        onEnded={handleEnded}
        onReady={onReady}
        onError={onError}
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1.3)',
        }}
        config={{
          // @ts-expect-error react-player v2 YouTubeConfig is missing the `youtube` provider key (v3 fixes this; deferred to v1.1)
          youtube: {
            playerVars: {
              autoplay: playing ? 1 : 0,
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              iv_load_policy: 3,
              disablekb: 1,
              fs: 0,
              cc_load_policy: 0,
            },
          },
        }}
      />
    </div>
  );
};

export default TrailerPlayer;
