# Variation 2: the spec sheet

Dense and literal. Every fact is a mono read-out, every picture is a numbered figure, and the gallery is
a list you can scan in one pass. Closest to the `/easing` and `/features` pages.

Pages: `home.html`, `templates.html`, `template.html` (Kinetic quote).

## What it leans on

- **IBM Plex Mono** for every number: link counts in the bar, the read-out row (130, 46, 4, 192), the
  list columns, the spec list, the input numbers, the figure captions.
- **Hairlines, not boxes**: the list, the read-out row and the spec list are `--line` rules on the
  ground, the DESIGN.md table rule ("tabular figures and hairlines, not boxes").
- **Code blocks** (`.mv-code`): the hero shows the real head of `title-sting/page.html` next to the frame
  it renders.
- **The blog's segmented control** (`.bl-view`, pill, ink fill when pressed) for category and Grid/List.
- **The accent** only on in-prose links and focus.

## Header at 390

`[mark] [Video components | Templates | Marketplace ...] [GitHub icon]`. The eight links are one strip
that scrolls sideways, with a fade at each edge as the cue; the current link is scrolled into view. The
word "vawe" drops under 900, the counts drop under 1100. No menu button, so no link is two taps away.

## Assets (made here, no stock)

- `assets/spec-icons.svg`: six column glyphs (length, aspect, inputs, slots, cues, beats) on the 24
  grid, `currentColor`.
- `assets/kq-*.png`: six frames of the Kinetic quote film, rendered with `bin/vawe frame <mp4> --at <s>`
  and cut to 640 px. They make the "Six beats" strip (Fig. 2).

## Contrast

See `CONTRAST.md`. All text passes AA.

## Screenshots

`shots/<page>-<width>.png` at 1440 and 390, full page.
