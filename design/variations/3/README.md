# Variation 3: the screening room

Fewer, larger films. The page reads like a cinema: one film now showing, the reel under it, and type
set like end credits. Closest to `IDENTITY.md`: "a screening room for films an engine made", with the
2026-09-25 interview answer "type voice: film credits".

Pages: `home.html`, `templates.html`, `template.html` (Kinetic quote), `menu.html` (More open).

## What it leans on

- **The film frame**: 28 px radius, `--line-2` hairline, 16 px under 640, at full column width.
- **Mono caps read-outs** (`.meta`) set as a credits list: label in `muted`, value in `ink`.
- **The logo's idea**, not the logo: three lanes and a white playhead with a shield head, at screen
  size, as the hero poster. White only, so the accent stays out of it, as the logo rule asks.
- **Geist 600 at display size** for the script on the detail page: the eight words you change are set
  as the quote itself, each with a dim underline and a mono index.
- **The accent** once: the live dot on the playing film ("it is live").

## Header at 390

`[mark] Components  Templates  More  [GitHub icon]`. More opens a bottom sheet (thumb reach) with
Inspiration, Docs, Marketplace, Jobs, Resources and Blog. On desktop: four links and a More panel,
so the bar holds five items instead of eight.

## Assets (made here, no stock)

- `assets/hero-poster.svg`: the looping poster (6 s, In Out Cubic, alternate); the playhead sweeps and
  the lanes light behind it. Reduced motion parks it at 62%.
- `assets/hero-poster.png`: the same poster rendered to 1440 by 810 with `bin/vawe new --from-url`,
  used as the `<video poster>`.
- `assets/frame-marks.svg`: viewfinder corners that appear on a film on hover or focus.

## Contrast

See `CONTRAST.md`. All text passes AA.

## Screenshots

`shots/<page>-<width>.png` at 1440 and 390, full page.
