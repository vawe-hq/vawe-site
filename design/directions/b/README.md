# Direction B: Timeline

Family: product tool, from the studio a film is made in.

## Rationale

The person who opens vawe.dev wants to know what a page film is made of. This direction shows it: the site is laid
out like the editor. A timecode ruler runs under the header, and its playhead is the logo's own line and shield
head, moved by scroll. The hero is a working studio panel (a frame, the transport, four layer lanes), each template
card carries a strip of its beats coloured by the layer that leads each one, and the detail page is a viewer with
an inspector that lists the words you change as fields. The lane colours, which the site already keeps as tokens
with no page to use them, become the brand's colour system, each one with a fixed meaning and an icon. It is the
direction closest to how developers and motion designers already think (layers, time, fields), and the most work
to keep honest: every strip and lane must come from real template data, never decoration.

## System

| part | choice |
|---|---|
| Type | IBM Plex Sans (headings 600, body 400) and IBM Plex Mono (timecode, specs, commands only). One family, two jobs. |
| Colour | ground `#131316`, panel `#19191d`, raised `#222227`, line `#2c2c33`, line-2 `#44444d`, field edge `#70707c`, ink `#f4f4f6`, ink-2 `#cdcdd3`, meta `#9a9aa4`, action `#3291ff` with black text (the shipped accent). Lane colours: text `#a67dff`, media `#8b8b96` (raised from the shipped `#52525a`, which fails 3:1), shape `#e0714f`, group `#cf5b98`, caption `#3ea3ff`, sound `#0eaf80`, camera `#4fb3d9`, effect `#d9c34f`. A lane colour always sits beside its name or icon. |
| Grid | 1320 px page. Home: 5 : 7 split, text and studio panel. Templates: a 220 px filter rail and a bin of cards at 300 px or more. Detail: viewer plus a 360 px inspector. All collapse to one column under 900 px; the rail becomes a row of chips. |
| Signature | the ruler and playhead under the header (`.ruler`, `.playhead`), tied to scroll with a CSS scroll timeline. The beat strip on each card repeats it at small size. |
| Motion | the playhead follows scroll progress (linear, no easing, as a playhead does). Menus open in 240 ms ease-out. Nothing animates on load. Reduced motion parks the playhead. |
| Header | lockup, four links, a More list, a search key (`/`), GitHub. Under 900 px: lockup, a GitHub icon and a menu icon on one row; the menu is a numbered list of the four links, then the More links, then GitHub. |

## Asset

`assets/layer-*.svg`: an icon set of eight layer types (text, media, shape, group, caption, sound, camera, effect),
24 x 24, 1.5 stroke, each in its lane colour. `assets/layer-icons-sheet.svg` and `.png` show the set at 3x with
names. Drawn by hand as SVG paths.

## Files

- `index.html` (header with ruler, hero with studio panel, layer legend), `templates.html` (rail and bin), `template.html` (viewer and inspector).
- `shots/index-1440.png`, `shots/index-390.png`, `shots/menu-390.png`, `shots/templates-1440.png`, `shots/templates-390.png`, `shots/template-1440.png`, `shots/template-390.png`.

## Contrast (WCAG 2, from `../contrast.mjs`)

| pair | colours | ratio | needs | result |
|---|---|---|---|---|
| ink (titles) on ground | #f4f4f6 on #131316 | 16.88:1 | 4.5:1 | pass |
| ink-2 (body) on ground | #cdcdd3 on #131316 | 11.72:1 | 4.5:1 | pass |
| meta (labels, timecode) on ground | #9a9aa4 on #131316 | 6.65:1 | 4.5:1 | pass |
| meta on a panel | #9a9aa4 on #19191d | 6.29:1 | 4.5:1 | pass |
| meta on raised | #9a9aa4 on #222227 | 5.68:1 | 4.5:1 | pass |
| ink-2 on raised (tags) | #cdcdd3 on #222227 | 10.01:1 | 4.5:1 | pass |
| button text on action | #000000 on #3291ff | 6.63:1 | 4.5:1 | pass |
| ground on ink (GitHub button) | #131316 on #f4f4f6 | 16.88:1 | 4.5:1 | pass |
| field edge (inputs, select) | #70707c on #131316 | 3.80:1 | 3:1 | pass |
| lane text on panel | #a67dff on #19191d | 5.84:1 | 3:1 | pass |
| lane media on panel | #8b8b96 on #19191d | 5.20:1 | 3:1 | pass |
| lane shape on panel | #e0714f on #19191d | 5.55:1 | 3:1 | pass |
| lane group on panel | #cf5b98 on #19191d | 4.68:1 | 3:1 | pass |
| lane caption on panel | #3ea3ff on #19191d | 6.58:1 | 3:1 | pass |
| lane sound on panel | #0eaf80 on #19191d | 6.23:1 | 3:1 | pass |
| lane camera on panel | #4fb3d9 on #19191d | 7.33:1 | 3:1 | pass |
| lane effect on panel | #d9c34f on #19191d | 9.91:1 | 3:1 | pass |
