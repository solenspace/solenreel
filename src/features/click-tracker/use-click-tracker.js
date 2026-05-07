// @ts-check
import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '@/shared/api/supabase';
import { selectSession } from '@/entities/user/user-slice';

/**
 * @typedef {import('@/shared/types/supabase').EventKind} EventKind
 * @typedef {import('@/shared/types/supabase').EventInsert} EventInsert
 * @typedef {import('@/shared/types/supabase-database').Json} Json
 *
 * @typedef {object} UseClickTrackerResult
 * @property {(kind: EventKind, tmdbId: number, payload?: Record<string, Json>) => void} track
 *   Push an event onto the session-scoped queue. No-op when signed out.
 *   Deduped per `(kind, tmdbId)` for `tile_click` / `hover_start` /
 *   `trailer_play`; never deduped for `trailer_complete`.
 */

const BATCH_SIZE = 5;
const FLUSH_INTERVAL_MS = 2_000;
const RETRY_DELAY_MS = 500;
/** @type {Set<EventKind>} */
const DEDUPED_KINDS = new Set(['tile_click', 'hover_start', 'trailer_play']);

// Module-scope, intentionally singleton across the app: the queue must outlive
// component unmounts during route transitions (clicking a tile unmounts the
// home page mid-flight; the queued tile_click must still flush from the next
// route). All consumers share this state via `useClickTracker`.

/** @type {EventInsert[]} */
let pendingQueue = [];
/** @type {Set<string>} */
let dedupeSet = new Set();
/** @type {ReturnType<typeof setTimeout> | null} */
let flushTimer = null;
/** @type {string | null} */
let currentUserId = null;
/** @type {string | null} */
let currentAccessToken = null;
let visibilityListenerInstalled = false;

const clearFlushTimer = () => {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
};

/**
 * @param {EventInsert[]} batch
 * @param {0 | 1} attempt
 */
const flushBatch = async (batch, attempt) => {
  const { error } = await supabase.from('events').insert(batch);
  if (!error) return;
  if (attempt === 0) {
    setTimeout(() => {
      void flushBatch(batch, 1);
    }, RETRY_DELAY_MS);
    return;
  }
  if (import.meta.env.DEV) {
    console.warn('[click-tracker] flush failed after retry; dropping batch', error);
  }
};

const flush = () => {
  clearFlushTimer();
  if (pendingQueue.length === 0) return;
  const batch = pendingQueue;
  pendingQueue = [];
  void flushBatch(batch, 0);
};

const beaconFlush = () => {
  if (pendingQueue.length === 0) return;
  if (!currentAccessToken) {
    pendingQueue = [];
    clearFlushTimer();
    return;
  }
  const batch = pendingQueue;
  pendingQueue = [];
  clearFlushTimer();
  // `fetch` with `keepalive: true` is the modern equivalent of `sendBeacon`
  // — sendBeacon cannot set the Authorization header that PostgREST needs
  // for RLS, so we use keepalive-fetch to survive the unload while still
  // carrying the user's JWT.
  try {
    void fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${currentAccessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(batch),
    });
  } catch {
    // Best-effort. If the browser refuses keepalive (e.g., body too large)
    // we silently drop — telemetry, not user content.
  }
};

const handleVisibilityChange = () => {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'hidden') beaconFlush();
};

/**
 * Session-scoped batched click tracker. Returns a stable `track` function.
 * Reads `auth.uid()` from Redux; signed-out callers are silent no-ops.
 *
 * Module-scope singleton state means the listener and queue install once and
 * stay installed for the app's lifetime — every consumer shares the same
 * queue. The hook itself is a thin wrapper that (a) syncs Redux session into
 * module scope, (b) installs the visibility listener once, (c) returns a
 * stable `track` reference.
 *
 * @returns {UseClickTrackerResult}
 */
export const useClickTracker = () => {
  const session = useSelector(selectSession);
  const userId = session?.user?.id ?? null;
  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    const prevUserId = currentUserId;
    currentUserId = userId;
    currentAccessToken = accessToken;
    if (prevUserId && !userId) {
      pendingQueue = [];
      dedupeSet.clear();
      clearFlushTimer();
    }
  }, [userId, accessToken]);

  useEffect(() => {
    if (visibilityListenerInstalled) return;
    if (typeof document === 'undefined') return;
    visibilityListenerInstalled = true;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // No cleanup — the listener is a module singleton intentionally; a single
    // app session installs it once and lets it live until the page unloads.
  }, []);

  const track = useCallback(
    /**
     * @param {EventKind} kind
     * @param {number} tmdbId
     * @param {Record<string, Json>} [payload]
     */
    (kind, tmdbId, payload) => {
      if (currentUserId === null) return;
      if (DEDUPED_KINDS.has(kind)) {
        const key = `${kind}:${tmdbId}`;
        if (dedupeSet.has(key)) return;
        dedupeSet.add(key);
      }
      pendingQueue.push({
        user_id: currentUserId,
        kind,
        tmdb_id: tmdbId,
        payload: payload ?? {},
      });
      if (pendingQueue.length >= BATCH_SIZE) {
        flush();
        return;
      }
      if (flushTimer == null) {
        flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
      }
    },
    [],
  );

  return { track };
};

/**
 * Test-only helper to reset module-scope state between specs. Production code
 * has no use for this; vitest imports it via `vi.resetModules` is not enough
 * because the listener-installed flag is captured by closure.
 *
 * @internal
 */
export const __resetForTests = () => {
  pendingQueue = [];
  dedupeSet = new Set();
  clearFlushTimer();
  currentUserId = null;
  currentAccessToken = null;
  if (visibilityListenerInstalled && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  visibilityListenerInstalled = false;
};
