# The vawe.dev design system, as it ships

Read on 2026-11-22 from `site/app/globals.css`, `site/app/layout.tsx`, the route stylesheets and the
running pages at 1440 and 390 px (home, `/video-components`, `/video-components/mask-rise`, `/easing`,
`/easing/land`, `/springs`, `/blog`, a blog post, `/inspiration`, `/features`,
`/compare/remotion-vs-hyperframes`). `/templates`, `/marketplace`, `/jobs` and `/hire` were left out:
they are one day old. `site/DESIGN.md` is the contract; this file says what the pages really do, and
"Drift" at the end lists where the two disagree.

## 1. Ground and colour

| token | value | job |
|---|---|---|
| `--bg`, `--field` | `#000000` | the ground on every route; `color-scheme: dark`, no light mode |
| `--surface`, `--bg-2` | `#0a0a0a` | a panel |
| `--surface-2` | `#111111` | a well or track inside a panel; the faint grid lines |
| `--raised` / `--raised-2` | `#171717` / `#222222` | a ghost button, a selected nav item or chip; its hover |
| `--line` / `--line-2` | `#242424` / `#3a3a3a` | the hairline; the hairline that must be seen (film frames, hovered edges) |
| `--ink` / `--ink-2` | `#fff` / `#ededed` | titles / body (21:1, 17.9:1) |
| `--muted` / `--dim` | `#a1a1a1` / `#8f8f8f` | meta and leads (8.1:1) / code comments (6.5:1) |
| `--accent` | `#3291ff` | you can act on it, or it is live: in-prose links, focus ring, the playhead, the selected filmstrip frame, the easing curve |
| `--accent-2` | `#6cb0ff` | the accent's hover |
| `--accent-ink` | `#000` | text on the accent (6.6:1); white on it is 3.2:1 and never used |
| `--accent-soft` / `--accent-line` | 16% / 42% blue | a tint and an underline; never a selected state |
| `--lane-text` `#a67dff`, `--lane-shape` `#e0714f`, `--lane-comp` `#cf5b98`, `--lane-cap` `#3ea3ff`, `--lane-sound` `#0eaf80`, `--lane-camera` `#4fb3d9`, `--lane-fx` `#d9c34f`, `--lane-media` `#52525a` | | a layer type, as in a timeline; `--lane-on` black for text on a lane fill, `--lane-media-on` white |
| `--gold` | `#f5c542` | one use: the star that pops from the GitHub button on hover |

Rules the pages keep: buttons are ink on black (`btn-primary`) or ink on `raised` (`btn-ghost`); a
selected item is `ink` on `raised`, never blue on a blue tint; a code block shows syntax by tone and
weight, never by hue. The film is the colour on the page.

Illustration colour is a separate, declared voice: the blog's riso cover art (blue on black) and the
`MatTile` tones (mat green, cobalt, oxblood, ochre, graphite). They never carry state.

## 2. Type

- **Geist** (`next/font/google`, `--font-sans`) for headings, titles, prose and controls. Body 400,
  headings 600 (`--fw-head`, the only weight above 500). Controls and nav are 500 or 600.
- **IBM Plex Mono** 400 and 500 (`--font-mono`) for anything literal: counts, clocks, file paths,
  commands, breadcrumbs, chip read-outs. `.meta` is its uppercase read-out: 12 px, `.06em` tracking,
  tabular numbers.
- Scale (rem): label and code 12, UI 14, body 16 (15 under 640), lead 18, card title 14 to 16 (weight
  carries rank), panel h2 `clamp(1.5rem, 2.6vw, 2rem)`, section h2 `clamp(1.9rem, 3.4vw, 2.75rem)`,
  page h1 `clamp(2.2rem, 4.6vw, 3.5rem)`. The landing has its own scale on `.lp`: hero
  `clamp(3rem, 10.5vw, 11rem)` at line height .88 and `-.07em`, chapter `clamp(2.25rem, 7vw, 7rem)`.
- Tracking tightens with size: `-.045em` display, `-.03em` head, `-.02em` sub; caps get `+.06em`
  (`.08em` in the blog). Line height 1.45 body, 1.3 UI, 1.1 head, 1.05 display.
- A page h1 often ends with a full stop ("Video components.", "Templates."). The blog h1 sets its second
  half in `muted`.
- Headings balance, paragraphs are `pretty`, prose caps at `--measure` (46ch).

## 3. Space, size, radius, depth, stacking

- Space: `--sp-1`..`--sp-9` = 4, 8, 12, 16, 24, 32, 48, 64, 96. Card gap 12 to 24, head to grid 32,
  section to section 96 (64 to 80 under 640). Panel padding `--sp-panel` (24 to 32).
- Width: `.wrap` 1160 px with 26 px gutters (16 under 640); content column 1040 px; `/inspiration`
  widens to 1800. The landing is full bleed with `--gutter: clamp(16px, 4vw, 56px)`.
- Hit target `--hit`: 40 px, 44 under 640. Buttons are 44 px tall.
- Radius: panel `--r` 12, control `--r-ctl` 8, inner `--r-in` 4, `--r-pill`; the landing film frame
  `--r-frame` 28 (16 under 640). Pills are common: page-head facts (`mv-pill`), the features and easing
  tab chips, the blog filter and grid/list switch. Category filters on `/templates` are `--r-ctl`.
- Depth: one step. A panel is `surface` plus a 1 px `--ring`; a well inside it is `bg` or `surface-2`.
- Breakpoints: 640, 760, 900 (and 360, 1000, 1280 in a few places).
- z-index: a closed set, `--z-under` -2, `--z-base` 1, `--z-raise` 2, `--z-badge` 3, `--z-sticky` 5,
  `--z-nav` 6, `--z-skip` 100. Never a number.

## 4. Motion

- Curves: `--ease-out` Out Quint `cubic-bezier(.23,1,.32,1)` for enters and hovers, `--ease-in` In Cubic
  for exits, `--ease-in-out` for a view on the move, `--ease-press` for the press.
- Durations: press 120 ms, hover 150, state 200, exit 150. Press is `scale: .96` on buttons, never on cards.
- Hover lives in `@media (hover: hover)`: `raised` to `raised-2`, a link gains its underline, a card gains
  the `line-2` ring. Never a lift, never a weight change.
- Deliberate exceptions: the landing chapters scale `.84 + .16 * in` on scroll (one rAF handler, no
  library), the 600 ms reveal, the 320 ms overshoot of the GitHub star, the 9 s playhead scan on the
  `/video-components` timeline, the easing demos that loop because they are the subject.
- Reduced motion: every clip holds its poster, chapters do not pin, transitions are 0.01 ms.

## 5. Components

- **Header (`.bar`)**: 60 px, the mark (playhead over three lanes, `currentColor`) plus the word "vawe"
  in Geist 600 18 px, a centred row of 8 text links in Geist 500 14 px (`ink-2`, `raised` on hover,
  the current page a `<span aria-current>` on `raised`), and one filled white GitHub button with the
  gold star. On the landing it floats (`.bar-overlay`: 72% black, 12 px blur, one hairline). Under 640
  it wraps: mark and GitHub on row 1, links on rows 2 and 3 at 390 px (seen in the 390 capture: 3 rows before any content).
- **Buttons**: `btn-primary` white on black, `btn-ghost` ink on `raised`, the landing's `lp-btn-line`
  (transparent with a `line-2` border). 44 px, 14 px Geist 600, 8 px radius, an arrow that moves 3 px on hover.
- **Page head (`.phead`)**: mono breadcrumb in `muted` (`Templates / Product`), h1, a muted lead at 46ch,
  then a row of pills (tier, category, a clock with the length, the aspect) or mono file chips
  (`index.json`, `templates.json`).
- **Cards (`.mv-card`)**: a panel with a 16:9 poster at rest; the video fades in (200 ms) on hover or
  focus; mono chips sit on the poster corners (`Free`/`Pro` top left, a play glyph and `10 s` top right,
  black 72% with a white 14% ring, 4 px radius); title in Geist 600 14 px below on a hairline; the whole
  card is one link through `::after`. Grid: auto-fill, min 300 px, gap 24/16.
- **Filter bar (`.mv-bar`)**: search field, chips with mono counts, a mono total at the right, a hairline
  under it; sticky on `/video-components`.
- **Code blocks**: `bg` or `surface` well, 12 px Plex Mono at line height 1.75, a mono label bar,
  `$` prompts in `dim`, a quiet Copy button.
- **Tables**: hairline rows on a `surface` panel, mono caps column heads, tabular figures.
- **Galleries**: the move grid (16:9 cards), the inspiration wall (6 columns of 16:9 tiles, details on
  hover over an 85% scrim, a 28 px avatar), the blog grid (riso cover art plus title on a split panel).
- **Footer**: a closing panel (h2 plus two buttons) above a panel of mono-headed link columns, then a
  hairline and the Apache 2.0 line.

## 6. Signature motifs

1. **The film in a big rounded frame.** 28 px radius, `line-2` hairline, a bottom scrim only where text
   sits on it. The hero is a frame the height of the screen.
2. **The lanes.** The logo is a playhead crossing three lanes; `/video-components` opens on a filmstrip of
   five real frames over a four-track timeline with lane-coloured clip blocks, white keyframe diamonds
   and the blue playhead with a shield head. It is the most "vawe" picture on the site.
3. **The playhead.** A 2 px accent line with a square/shield head; it means "now" (live) and so it is the
   one place the accent is a shape.
4. **Mono read-outs.** Counts after every chip (`All 4`, `Titles 2`), `10 s` on posters, `01` above a
   move title, `01-25` at the right of a group heading.
5. **The faint grid.** A 96 px `surface-2` lattice masked to an ellipse behind two landing sections.
6. **Full stops in titles** and the two-line hero "One page in. / One film out.".

## 7. What the site never does

- No second typeface, no serif, no condensed or display face.
- No graphite, off-black or white ground; no light mode.
- No gradients except the dark scrim over a film; no glow; no colour on a surface.
- No drop shadow or lift on a panel (one documented exception: the clip on a move page).
- No accent on a button fill, no white text on the accent, no tinted selected state.
- No stock photos or illustrations; every picture is a real frame of a real render or our own SVG.
- No animation library; no motion on a repeated control beyond colour and the press.
- No logo walls, no testimonials, no icon badges.

## Drift: DESIGN.md against the CSS and the pages

| topic | DESIGN.md says | the code and pages do | the pages follow |
|---|---|---|---|
| header links | "five links (Moves, Inspiration, Resources, Blog, Docs)"; the 640 rule comment says five fit one line at 390 | `Header.tsx` has 7 links plus Docs; at 390 the nav wraps into 2 extra rows | the code (8 links, 3 rows) |
| lane colours on pages | "No page uses one since the JSON engine left the site" | `/video-components` hero timeline uses text, media, shape, comp, camera, sound blocks with no labels (`aria-hidden`); the blog maps sections to lanes (how-to = shape, rendering = camera, agents = sound, motion = text) | the code; both bend "a lane colour means a layer type and sits beside a label" |
| body line height | front matter 1.45; "Type scale" says `--lh-body` 1.55 | `--lh-body: 1.45` | 1.45 |
| media lane contrast | 2.35:1 on the ground | CSS comment 2.7:1; measured 2.71:1 | CSS (measured) |
| composite lane on a panel | "composite fails on a panel" | measured 5.28:1 on `#0a0a0a`, 4.78:1 on `raised` | it passes |
| panel shadow | "no drop shadow"; shadow only on the move-page clip | `.mv-hero` (the components timeline) has `0 24px 48px -24px` | the code |
| radii | four radii, all tokens | also 28 px frame (documented under Landing), 5 px clip blocks, 3, 14, 20 px literals | tokens plus a few literals |
| breakpoints | {640, 760, 900} | also 360, 1000, 1280 | the code |
| `.kicker` | a quiet breadcrumb | base `.kicker` is accent blue; `.phead` and the blog override it to `muted` | muted on every page seen |
| current nav item | the bar marks the current page | `/features` and `/easing` mark "Resources" as current, since they have no own link | the code |
