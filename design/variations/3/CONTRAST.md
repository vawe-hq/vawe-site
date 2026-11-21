# WCAG AA contrast

Measured with the WCAG 2 relative-luminance formula. AA: 4.5:1 for text, 3:1 for large text and for graphics that carry meaning. A scrim over a film is measured at its worst case, over a white frame. Hairlines are structure, not information, and are exempt.

| pair | colours | ratio | verdict |
|---|---|---|---|
| title: ink on ground | #ffffff on #000000 | 21.00:1 | AA text |
| body: ink-2 on ground | #ededed on #000000 | 17.94:1 | AA text |
| meta, lead: muted on ground | #a1a1a1 on #000000 | 8.13:1 | AA text |
| counts: dim on ground | #8f8f8f on #000000 | 6.49:1 | AA text |
| selected nav or chip: ink on raised | #ffffff on #171717 | 17.93:1 | AA text |
| primary button: bg on ink | #000000 on #ffffff | 21.00:1 | AA text |
| in-prose link: accent on ground | #3291ff on #000000 | 6.63:1 | AA text |
| live chip: ink-2 on 85% black over white | #ededed on #262626 | 12.93:1 | AA text |
| live dot on 85% black over white (graphic) | #3291ff on #262626 | 4.78:1 | AA text |
| More panel link: ink-2 on surface | #ededed on #0a0a0a | 16.91:1 | AA text |
| More panel count: dim on surface | #8f8f8f on #0a0a0a | 6.12:1 | AA text |
| hero poster: lit lane against unlit lane (graphic) | #ffffff on #3a3a3a | 11.37:1 | AA text |
| frame marks on a dark poster (decorative) | #ffffff on #000000 | 21.00:1 | AA text |

The frame marks are decoration over a film; the film border also turns `--muted` on hover, so the state never depends on the marks.
