# Direction A: Credits

Family: editorial, from film titles.

## Rationale

A film ends with credits, and credits have a fixed form: a role on the left of a centre gutter, a name on the
right, everything hung on one vertical axis. This direction makes that form the site's one device. The hero is a
title card, the facts about vawe are a credit block ("Written in: HTML, CSS, SVG", "Directed by: you, or your
coding agent"), the template specs and the words you change are credit blocks, and the footer is an end card.
It answers the brief's "type voice: film credits" literally, it needs no decoration, and the films stay the only
colour on the page. The cost: a centred axis suits short facts and big films, not long prose, so docs and blog
pages would keep a plain left-aligned column.

## System

| part | choice |
|---|---|
| Type | Instrument Serif (display, 400 only) and Hanken Grotesk (body, labels, 400 to 600). No mono face: timecodes use tabular figures. |
| Colour | ground `#000000`, frame `#0d0d0d`, ink `#ffffff`, ink-2 `#d6d6d6`, meta `#9b9b9b`, line `#262626`, line-2 `#3d3d3d`, action `#b4ccff` with black text. The action colour marks only what you can press. |
| Grid | one centred column, 1240 px wide, gutter 16 to 40 px. Credit blocks are two equal columns around a 28 px axis gap (16 px on a phone, columns 0.8 : 1.2). The gallery is two big frames per row, one on a phone. |
| Signature | the credit block (`.credits`): role right-aligned, name left-aligned, on the page's centre axis. |
| Motion | one moment: the hero title fades up from black over 1.4 s on load, as a title card does. The phone menu fades in the same way. Gallery frames brighten on hover (220 ms). Reduced motion turns all of it off. |
| Header | lockup, four links (Components, Templates, Marketplace, Docs), a More list (Jobs, Inspiration, Resources, Blog), GitHub. Under 900 px: the lockup and one Menu button, one row; the menu is a full-screen title card. |

## Asset

`assets/end-credits.svg` (and `.png`, 1200 x 630): an end-credits frame with the mark, "A vawe film" and nine
credit lines that fade at the top and bottom as in a roll. Use: the share card, the poster a film shows before it
loads, and the footer end card. Made by hand as SVG; the PNG is rendered from it.

## Files

- `index.html` (home hero, header, credits, end card), `templates.html` (gallery), `template.html` (Kinetic quote detail).
- `shots/index-1440.png`, `shots/index-390.png`, `shots/menu-390.png`, `shots/templates-1440.png`, `shots/templates-390.png`, `shots/template-1440.png`, `shots/template-390.png`.

## Contrast (WCAG 2, from `../contrast.mjs`)

| pair | colours | ratio | needs | result |
|---|---|---|---|---|
| ink (titles) on ground | #ffffff on #000000 | 21.00:1 | 4.5:1 | pass |
| ink-2 (body) on ground | #d6d6d6 on #000000 | 14.45:1 | 4.5:1 | pass |
| meta (credit roles, labels) on ground | #9b9b9b on #000000 | 7.56:1 | 4.5:1 | pass |
| meta on the film frame | #9b9b9b on #0d0d0d | 6.99:1 | 4.5:1 | pass |
| button text on action | #000000 on #b4ccff | 13.02:1 | 4.5:1 | pass |
| action as focus ring on ground | #b4ccff on #000000 | 13.02:1 | 3:1 | pass |
| quiet button edge on ground | #3d3d3d on #000000 | 1.93:1 | decoration | exempt (the label names the button) |
