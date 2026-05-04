# reel — UI Context

The reel UI takes its cues from editorial film coverage (Letterboxd, Criterion, magazine reviews). It is **dense, typographic, and low-chrome**: the trailer carries the visual weight, the type carries the meaning, and the chrome stays out of the way. Netflix wins on big poster art; reel wins on signal density.

## Theme

Dark-mode-first. A light mode exists for daytime browsing but is not the design canvas — most of the design language is tuned in the dark.

## Color tokens (CSS variables in `src/app/globals.css`)

### Dark (default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0f0d0b` | page background, warm-neutral near-black |
| `--bg-elevated` | `#181513` | cards, hovered tile states |
| `--bg-overlay` | `#0a0908cc` | trailer overlay, modal scrim |
| `--ink` | `#ece6d8` | primary text |
| `--ink-muted` | `#bfb8a8` | metadata, secondary text |
| `--ink-faint` | `#7a7466` | tertiary text, placeholders |
| `--border` | `#2a2622` | dividers, tile borders |
| `--border-subtle` | `#1c1917` | row separators |
| `--accent` | `#e85d3a` | burnt amber — buttons, "For You" badge, intent-mode indicator. Used sparingly. |
| `--accent-ink` | `#0f0d0b` | text on accent backgrounds |
| `--success` | `#7ea96b` | confirmation states (rare) |
| `--danger` | `#c64a3a` | destructive confirmations (very rare) |

### Light

| Token | Value | Use |
|---|---|---|
| `--bg` | `#fafaf7` | page background |
| `--bg-elevated` | `#f0eee8` | cards |
| `--ink` | `#1a1816` | primary text |
| `--ink-muted` | `#615a4d` | metadata |
| `--ink-faint` | `#a39d8e` | tertiary |
| `--border` | `#d8d4ca` | dividers |
| `--accent` | `#c44a28` | burnt amber, slightly darker for AA contrast on light |

Accent is used **only for emphasis** — never as a default button color, never on more than ~3% of pixels in any view.

## Typography

| Role | Family | Weight | Notes |
|---|---|---|---|
| Display (movie titles, hero) | `Newsreader` (variable serif) | 500–600 | optical size on large headlines |
| Body (metadata, prose, AI reasoning) | `Inter` (variable sans) | 400–500 | tabular numerics on by default |
| Mono (debug, raw ids) | `JetBrains Mono` | 400 | only in dev affordances |

Line height: 1.4 for body, 1.1 for display. Letter spacing: −0.01em on display, default on body.

Metadata columns (year · director · runtime) use **tabular nums** so widths line up across rows.

## Density

Editorial. A movie tile in **list view** carries:

- Poster (small, 48×72 px) on the left
- Title (display serif, 18 px)
- Year · director · runtime (Inter, 13 px, muted)
- 3 mood tags (Inter, 11 px, faint, separated by `·`)
- TMDB score (tabular nums, right-aligned, 13 px)

In **grid view** the tile collapses to:

- Poster (192×288 px)
- Title + year on a single line below

Browse rows default to grid; the AI intent search results default to list (so reasoning has room).

## Voice

- Terse. No marketing copy. No emojis (unless the user explicitly asks).
- Sentence case. `For you`, not `FOR YOU`. `Ask reel`, not `ASK REEL`.
- Verbs for buttons (`Watch trailer`, `Add reasoning`, `Search`). Nouns for labels.
- AI reasoning lines are prose-first: `slow, observational, hurts on rewatch` — not `Genre: Drama. Mood: Melancholy. Pace: Slow.`
- Error states tell the user what to do, not what failed: `the assistant is offline — try a literal title search`, not `Error 502: upstream failure`.

## Layout patterns

- **Grid**: 12-column at ≥1024px, 6-column at ≥640px, 2-column on mobile. 24 px gutter on desktop, 16 px on mobile.
- **Hero**: full-bleed trailer (autoplay, muted, looped) with title + metadata bottom-left, CTAs bottom-right. No big poster art behind.
- **Rows**: horizontal scroll snap; row title (display serif, 24 px) + caption (Inter, 13 px, muted) above the row. The "For You" row gets the accent badge to its right of the title.
- **Search bar**: top-of-page, full width on mobile, max-width 720px centered on desktop. A small mode indicator (`literal` / `intent`) sits on the right, switchable by `Tab` and shown as accent when in intent mode.

## Trailer hover behavior

- 250 ms hover delay before autoplay begins (avoids jittery scroll triggers).
- Trailer fades in over the poster at `opacity: 0.7` so the title underneath remains legible.
- Audio is **off** by default; clicking the tile mounts a full-bleed player with audio enabled.
- Trailer mount is gated by `IntersectionObserver` (≥40% visible) to keep off-screen tiles from instantiating players.
- On exit (mouse leave + 100ms), the player unmounts to free memory.

## Search bar — mode switching

The single search bar has two modes:

- **Literal** (default) — interpreted as a TMDB title query.
- **Intent** — interpreted as a mood/intent prompt; routed to the `intent-search` Edge Function.

Mode is auto-detected: a query with **>3 words and at least one verb or adjective** triggers an "ask reel" hint and the indicator switches to `intent` (accent color). The user can override with `Tab` (toggle) at any time.

When in intent mode, the placeholder changes from `Search titles` to `Tell reel how you feel`.

## Accessibility

- All interactive elements have a visible focus ring (`outline: 2px solid var(--accent)` with 2px offset).
- Color contrast meets WCAG AA against the dark background (`--ink` ≥ 4.5:1 on `--bg`).
- Trailer autoplay is muted (per browser policy) and does not flash. Users with `prefers-reduced-motion` see static poster art instead of autoplay trailers.
- The search bar is keyboard-first: `/` focuses it from anywhere; `Esc` clears; `Tab` toggles literal/intent; `Enter` submits.
- Tiles are reachable with arrow keys when focused inside a row.

## What we do not do

- No carousels with auto-rotate that the user didn't ask for.
- No more than one accent-colored element in a viewport at a time.
- No emoji icons inside UI chrome.
- No pop-up modals to confirm browsing actions (clicking a tile, hovering, etc.). Modals are reserved for irreversible actions, of which v1 has none.
- No skeleton screens longer than 800 ms — if data takes longer, switch to a "reel is loading" message with the accent color.
