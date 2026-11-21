# Variation 1: the timeline

Every film shows its own layers. The lane motif, which today lives only in the `/video-components`
hero and without labels, becomes the structure of the home hero, every template card and the template page.

Pages: `home.html`, `templates.html`, `template.html` (Kinetic quote), `menu.html` (the phone menu
open). Open them through any static server from the repo root; they read `../../tokens.css`,
`../../base.css` and the posters in `site/public/`.

## What it leans on

- **Lanes** (`--lane-text`, `--lane-shape`, `--lane-camera`, `--lane-comp`, `--lane-sound`) with the
  rule from `globals.css`: a lane colour always travels with its label or icon. Every track has a
  label column (icon plus mono caps), which fixes the drift on `/video-components`.
- **The playhead**: the shipped `.mv-playhead` (2 px `--accent`, the pentagon head), scanning once per
  film length. Reduced motion parks it.
- **The film frame**: the landing's 28 px frame and bottom scrim, unchanged. The timeline sits in the
  frame's bottom band, on 85% black.
- **The shipped card** (`.mv-card`): poster, mono chips on the corners, title on a hairline; the lanes
  are added between poster and title.
- **The bar**: unchanged at 1440 (hairline separators group Make, Learn, Docs). Under 900 it is the
  mark, the current page in mono caps, GitHub as an icon and a Menu button. One row at 390.

## Header at 390

`mark · HOME | [GitHub icon] [Menu]`. Menu opens a full-height sheet (a `<details>`, no script) with
three mono-headed groups and the counts in `dim`.

## Assets (made here, no stock)

- `assets/layer-icons.svg`: eight layer-type icons on the 24 grid of `Icon.tsx` (text, shape, camera,
  sound, media, comp, cap, fx), `currentColor`, so the lane token colours them.
- `assets/lanes-poster.svg`: a looping 16:9 poster of five lanes, keyframes and the playhead (9 s), text
  free so the page sets the lane names in Plex Mono beside it. Token colours as custom properties.

## Timings

The lanes on the cards and the detail page come from each template's worlds and `<audio data-at>` cues
in `site/public/templates/*.page.html`; block lengths between cues are approximate. A real build would
read them from the page, as `scripts/site/templates.mjs` reads the inputs.

## Contrast

See `CONTRAST.md`. All text passes AA; the one tight pair is the black beat label on a text block (4.51:1).

## Screenshots

`shots/<page>-<width>.png` at 1440 and 390, full page.
