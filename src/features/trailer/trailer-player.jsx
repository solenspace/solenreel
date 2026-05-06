// @ts-check
import ReactPlayer from 'react-player/youtube';

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
  onEnded,
  onReady,
  onError,
  className = '',
  style = {},
}) => {
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
        onEnded={onEnded}
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
