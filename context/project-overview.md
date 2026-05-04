# reel — Project Overview

## What this is

**reel** is a movie discovery app that learns from your clicks and answers in plain language when you tell it what you feel like watching. It started as a fork of a Netflix-clone reference and has been re-purposed: a different surface (editorial / Letterboxd-feel, dense), a different mechanic (trailer-first browsing, not poster art), and a different intelligence loop (per-user click telemetry feeding a content-based "For You" row, plus a free-tier LLM that maps mood prompts to catalogue picks).

reel is **not** a streaming service. It does not host video; it surfaces the trailer (YouTube via `react-player`) and lets the user decide where to watch. It is a *finder*, not a *player*.

## User goals

A first-time visitor should be able to:

1. Land on the home view and immediately see a trailer playing — the app sells with motion, not still posters.
2. Type into a single search bar in either of two modes: literal title search ("Aftersun") or intent search ("something quiet that hurts on rewatch"). The mode switch is visually obvious; no separate AI tab.
3. Browse a "For You" row that updates as they click around (after ~5 clicks the row reflects revealed taste).
4. Hover any tile to autoplay the muted trailer in place; click for the full-bleed trailer + metadata.

A returning visitor should find the For You row visibly different from session 1 — the system has learned.

## v1 scope

- **Per-user click/watch event tracking.** Append-only `events` table in Supabase, RLS by `auth.uid()`. Tracks tile-click, hover-start, trailer-play, trailer-complete.
- **Click-based "For You" row.** Content-based recommendation seeded from the user's recent events and TMDB similarity (genre + cast + crew overlap). Cold-start fallback: TMDB popular.
- **AI mood/intent search.** Single search bar with intent-mode detection. Intent prompts go to a Supabase Edge Function that calls the OpenRouter free-tier model with a JSON-schema-constrained response listing 5–10 TMDB ids and a one-line reasoning per pick. Results render as an editorial row with the model's reasoning visible.
- **Trailer-first browsing UX.** Tiles autoplay muted trailers (250 ms hover delay, `react-player`, `IntersectionObserver` lazy mount) instead of static poster art. Audio only on click.

## Out of scope (v1)

The following are intentionally deferred and should not creep into v1 work:

- Watchlist / saved movies
- Mood-tagged editorial collections (curated rows)
- i18n / translations
- Server-side rendering
- Mobile apps (native iOS/Android)
- Social features (follows, comments, shared lists)
- Native trailer hosting (we always embed YouTube via `react-player`)
- Multi-provider LLM fallback (single OpenRouter free model, no fallback)
- Detailed analytics dashboards / admin UI
- Payments, subscriptions, paid tiers

If a v1 work item creeps into this list, split it into a follow-up spec rather than expanding scope.

## Success criteria

- **Cold-start latency.** Home view + first row of trailers visible in < 1.5 s on a warm cache; < 3 s on a cold load on a typical home connection.
- **Intent-search latency.** From submit to first rendered row: < 3 s p50 on the chosen OpenRouter free model.
- **Recommendation freshness.** After 5 logged events in a session, the For You row contains at least 3 movies not present in the cold-start fallback.
- **Trailer hover budget.** Autoplaying a hovered trailer must not cause frame drops on a list of 20 tiles (Chrome devtools performance budget: < 50 ms scripting per autoplay).
- **Cost ceiling.** Monthly infrastructure cost on free tiers (Supabase free + OpenRouter free model + TMDB free key + Vercel-or-equivalent free hosting). Any decision that breaks this ceiling needs explicit user approval.

## Why these choices

- **Editorial / Letterboxd UI**, not Netflix-style poster grid: the differentiator is information density and typography, not bigger art. Netflix already wins on poster shelves.
- **Trailer autoplay on hover**, not click: the trailer is the most efficient way to convey what a movie *is*. Letting the page sell with motion is the central UX bet.
- **Mood-prompt intent search**, not natural-language chat: a chat interface adds turns and ceremony for a single decision (what to watch). One-shot prompt with reasoning shown is faster.
- **Single OpenRouter free model**, no fallback: complexity ceiling. We will revisit if quality is unacceptable, but starting with one provider keeps the mental model simple.
- **Supabase**, not Firebase: Postgres is a better fit for the events / recommendations data model than Firestore, and Edge Functions are the right home for the OpenRouter key.
