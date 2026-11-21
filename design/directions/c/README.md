# Direction C: Reel

Family: studio reel. This one argues for a light site.

## Rationale

Motion studios show their work on a white wall, and for a reason: a white ground frames any film, dark or bright,
and lets the work be the only colour. Every developer tool around vawe is black, so a white reel is the fastest way
to be told apart, and the films in this site's own catalogue (a dark terminal, a black-on-white quote, a warm title)
all sit well on it. The type does the motion: the display face has a width axis, so headlines arrive by stretching
on load and card titles widen on hover, which is a keyframe you can see in a static font. Each film sits inside crop
marks with a frame counter, like a frame on a contact sheet. The costs are real: it breaks the "dark by decision"
rule, films with a white ground need the hairline frame to keep their edge, and a dark theme would have to be built
as a second palette, not an inversion.

Why light, with reasons: (1) it frames dark and light films equally, a black site only frames bright ones;
(2) it separates vawe from every neighbouring tool in one glance; (3) black buttons and black type on white give
the highest contrast available (19.8:1) with no accent needed for structure.

## System

| part | choice |
|---|---|
| Type | Anybody (display, variable width 50 to 150, weight 600 to 800) and Instrument Sans (body, 400 to 600). |
| Colour | ground `#ffffff`, wall `#f2f2f0` (behind films and code), ink `#0a0a0a`, ink-2 `#2e2e2e`, meta `#616161`, line `#e4e4e4`, line-2 `#bdbdbd`, signal `#1a3cff` with white text (focus ring and the hovered primary button only). Buttons are black. |
| Grid | full bleed, 12 columns, 16 px gaps, gutter 16 to 32 px. Home reel: 8 + a stack of two 4s, then 6 + 6. Templates: 7 + 5, then 5 + 7. One column under 900 px. |
| Signature | width-axis type (`.stretch`, the hover on `.tile h3`) and crop marks with a frame counter on every film (`.film`, `.fc`). |
| Motion | the hero headline stretches from width 50 to 62 on load (1.1 s, strong ease-in-out); menu links do the same when the phone menu opens; card titles widen to 112 on hover (320 ms ease-out) and the film inside scales 2 %. Reduced motion turns all of it off. |
| Header | lockup, four links, More, GitHub, all text, no buttons. Under 900 px: the lockup and an underlined Menu, one row; the menu sets the links in the display face. |

## Asset

`assets/leader.svg`, `assets/wipe.svg`, `assets/lanes.svg` (and `.png`, 1600 x 900): three loop posters made for
the reel. The count-in leader is the poster a film shows before it plays; the wipe and the lanes are poster frames
for components. Each carries the frame counter and the word mark position the site uses. Made by hand as SVG; the
PNGs are rendered from them. The home mockup shows two of them in the reel, captioned "Poster frame".

## Files

- `index.html` (header, stretched hero, reel), `templates.html` (tabs and the 7 + 5 reel), `template.html` (full-width film, the words as a type specimen, specs and the command).
- `shots/index-1440.png`, `shots/index-390.png`, `shots/menu-390.png`, `shots/templates-1440.png`, `shots/templates-390.png`, `shots/template-1440.png`, `shots/template-390.png`.

## Contrast (WCAG 2, from `../contrast.mjs`)

| pair | colours | ratio | needs | result |
|---|---|---|---|---|
| ink (titles) on ground | #0a0a0a on #ffffff | 19.80:1 | 4.5:1 | pass |
| ink-2 (body) on ground | #2e2e2e on #ffffff | 13.58:1 | 4.5:1 | pass |
| meta (captions) on ground | #616161 on #ffffff | 6.19:1 | 4.5:1 | pass |
| meta on the wall | #616161 on #f2f2f0 | 5.53:1 | 4.5:1 | pass |
| ink on the wall (command) | #0a0a0a on #f2f2f0 | 17.66:1 | 4.5:1 | pass |
| ground on ink (button, frame count) | #ffffff on #0a0a0a | 19.80:1 | 4.5:1 | pass |
| white on signal (hovered button) | #ffffff on #1a3cff | 6.70:1 | 4.5:1 | pass |
| signal as focus ring on ground | #1a3cff on #ffffff | 6.70:1 | 3:1 | pass |
| quiet button edge (ink) on ground | #0a0a0a on #ffffff | 19.80:1 | 3:1 | pass |
