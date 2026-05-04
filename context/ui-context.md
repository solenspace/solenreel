# reel — UI Context

The reel UI takes its cues from editorial film coverage (Letterboxd, Criterion, magazine reviews). It is **dense, typographic, low-chrome, and material-friendly**: the trailer carries the visual weight, the type carries the meaning, the chrome stays out of the way, and a single matte-purple accent appears sparingly against a black-dominant canvas. Netflix wins on big poster art; Letterboxd wins on green-on-black; reel takes the same density formula and rotates the accent to matte purple. Not futuristic, not neon — material-like, friendly, calm.

## Theme

Dark-by-default with a black-dominant canvas (≥ 95% of pixel area in any view is `bg` + `bg-elevated`). A light mode is opt-in via `data-theme="light"` for daytime browsing but is not the design canvas. Tailwind v4 ships dark as the default `@theme` block; the light variant is declared via `@custom-variant light (&:where([data-theme=light], [data-theme=light] *))`.

## Color tokens (CSS variables in `src/main.css` `@theme` block)

### Dark (default) — matte purple accent on near-black

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0a090c` | page background — near-black with hint of warm violet |
| `--color-bg-elevated` | `#14121a` | cards, hovered tile state |
| `--color-bg-overlay` | `#08070bcc` | trailer overlay, modal scrim |
| `--color-ink` | `#ece8f0` | primary text |
| `--color-ink-muted` | `#a89fb3` | metadata, secondary text |
| `--color-ink-faint` | `#6b6377` | tertiary text, placeholders |
| `--color-border` | `#27232e` | dividers, tile borders |
| `--color-border-subtle` | `#1a161f` | row separators |
| `--color-accent` | `#b69ad8` | matte lavender — For You badge, intent-mode indicator, focus rings, primary CTA |
| `--color-accent-strong` | `#9b7bc9` | hover / pressed state for accent |
| `--color-accent-ink` | `#15101e` | text on accent backgrounds (buttons, badges) |
| `--color-success` | `#7ea96b` | rare confirmation states |
| `--color-danger` | `#c64a3a` | rare destructive confirmations |

### Light (opt-in via `data-theme="light"`)

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#faf8fb` | warm near-white |
| `--color-bg-elevated` | `#f1eef5` | cards |
| `--color-ink` | `#1a1620` | primary text |
| `--color-ink-muted` | `#5a5363` | metadata |
| `--color-ink-faint` | `#8e8898` | tertiary |
| `--color-border` | `#d8d1de` | dividers |
| `--color-accent` | `#6b4ba0` | deeper purple for AA contrast on light |
| `--color-accent-strong` | `#553a82` | hover / pressed |
| `--color-accent-ink` | `#fafafa` | text on accent |

The accent is used **only for emphasis** and on no more than ~3% of pixels in any view. The five places it appears: For You row badge, intent-mode pill, focus rings, the single primary CTA per view, the "ask reel" hint when intent-mode is auto-detected. Everywhere else is ink-on-bg typography.

### Contrast (WCAG AA verified)

- ink (`#ece8f0`) on bg (`#0a090c`) → ~17:1
- ink-muted (`#a89fb3`) on bg → ~9.4:1
- accent (`#b69ad8`) on bg → ~9.8:1
- accent-ink (`#15101e`) on accent (`#b69ad8`) → ~9.6:1

All pairs ≥ 4.5:1 (body) or ≥ 3:1 (large). Light-mode pairs designed to the same target; verified by an automated test in spec 07.

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
- `react-player` v2.x is the player API in v1; v3 (Nov 2025) is breaking and stays on the v1.1 backlog.

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
