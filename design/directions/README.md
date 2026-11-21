# Three directions for vawe.dev

Static mockups for the owner to pick one look. Nothing here touches the live site in `site/`.

Each direction has the home hero and header, the templates gallery and one template detail page (Kinetic quote),
shot at 1440 and 390 px wide, plus the menu open at 390. Open `<a|b|c>/index.html` in a browser; the pages load
their fonts from Google Fonts and the template posters from `site/public/templates/`.

| | A: Credits | B: Timeline | C: Reel |
|---|---|---|---|
| Family | editorial, film titles | product tool, the studio | studio reel |
| Ground | black | graphite | white (argued in `c/README.md`) |
| Type | Instrument Serif + Hanken Grotesk | IBM Plex Sans + IBM Plex Mono | Anybody (width axis) + Instrument Sans |
| Signature | credit blocks on a centre axis | ruler and playhead under the header, beat strips | width-axis type, crop marks with a frame count |
| Asset | end-credits poster | eight layer-type icons | three loop posters |
| Colour | films only, one pale blue for actions | lane colours by layer type, blue for actions | black and white, one signal blue for focus and hover |

## What all three share

- The locked logo, mono only, from `vawe-lockup.svg` (the ship set in vawe-hq/vawe `films/logo-lab/final/`).
- A header that fits one row on a phone: four primary links (Components, Templates, Marketplace, Docs), a More list
  (Jobs, Inspiration, Resources, Blog) and GitHub on desktop; the lockup and one Menu control under 900 px.
  Today's header has eight links and wraps into three rows at 390.
- The real template data and posters (titles, lengths, the eight Kinetic quote words, `npx vawe new` command).
- One orchestrated motion moment at most, and `prefers-reduced-motion` turns all motion off.
- Every text colour passes WCAG AA. `node design/directions/contrast.mjs` prints the tables in each README.

## Skills used

Fetched from the ui-skills registry (`command npx -y ui-skills get <slug>`) and applied as principles; the
local system wins on specifics.

| skill | used for | rejected from it |
|---|---|---|
| `anthropics/frontend-design` | the builder skill: a plan per direction from the subject (film credits, the editor, a reel), one place for boldness, its list of generated-page tells to avoid | nothing; its tells list removed eyebrow labels and one-word accents |
| `jakubkrehel/better-typography` | unitless line height by role, tracking by size, balance on headings and pretty on paragraphs, tabular figures on timecodes, 16 px inputs | none of its specifics conflicted |
| `raphaelsalaja/color` | role tokens, the action colour only on what you can press, 3:1 field edges (raised B's field edge), states mixed in oklch from their token | its off-white body rule for C's ink: C keeps near-black ink on white, which is the light-theme form |
| `zeke/swiss-design` | the 12-column reel grid of C and the narrow measure | its IBM Plex Sans and stone palette as defaults; light-weight headings |
| `emilkowalski/animate` | the motion gate (one moment, nothing on frequent actions), ease-out on entrances, strong ease-in-out for on-screen change, durations under 300 ms for UI | springs: no motion here needs one |
| `web-design-guidelines` (accessibility category) | skip link, visible focus, real buttons and links, no horizontal scroll at 390 | nothing |

Not used: the other builder skills (`impeccable`, `taste-skill`), so that one builder shapes each surface.

## Rebuild

The screenshots were taken with headless Chrome at 1440 x 900 (device scale 1) and 390 x 844 (device scale 2),
full page, with reduced motion on so the shots show the rest state.
