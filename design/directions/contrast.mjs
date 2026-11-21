// WCAG 2 contrast of each direction's text and UI pairs. Run: node design/directions/contrast.mjs
// Text needs 4.5:1 (AA, under 24px), large text and UI marks need 3:1.
const lum = (hex) => {
  const c = hex.replace("#", "").match(/../g).map((h) => parseInt(h, 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const directions = {
  a: [
    ["ink (titles)", "#ffffff", "ground", "#000000", 4.5],
    ["ink-2 (body)", "#d6d6d6", "ground", "#000000", 4.5],
    ["meta (credit roles, labels)", "#9b9b9b", "ground", "#000000", 4.5],
    ["meta on the film frame", "#9b9b9b", "frame", "#0d0d0d", 4.5],
    ["on-action (button text)", "#000000", "action", "#b4ccff", 4.5],
    ["action as focus ring", "#b4ccff", "ground", "#000000", 3],
    ["line-2 (quiet button edge)", "#3d3d3d", "ground", "#000000", 1],
  ],
  b: [
    ["ink (titles)", "#f4f4f6", "ground", "#131316", 4.5],
    ["ink-2 (body)", "#cdcdd3", "ground", "#131316", 4.5],
    ["meta (labels, timecode)", "#9a9aa4", "ground", "#131316", 4.5],
    ["meta on a panel", "#9a9aa4", "panel", "#19191d", 4.5],
    ["meta on raised", "#9a9aa4", "raised", "#222227", 4.5],
    ["ink-2 on raised (tags)", "#cdcdd3", "raised", "#222227", 4.5],
    ["on-action (button text)", "#000000", "action", "#3291ff", 4.5],
    ["ground on ink (GitHub button)", "#131316", "ink", "#f4f4f6", 4.5],
    ["field edge (inputs, select)", "#70707c", "ground", "#131316", 3],
    ["lane text on panel (mark)", "#a67dff", "panel", "#19191d", 3],
    ["lane media on panel (mark)", "#8b8b96", "panel", "#19191d", 3],
    ["lane shape on panel (mark)", "#e0714f", "panel", "#19191d", 3],
    ["lane group on panel (mark)", "#cf5b98", "panel", "#19191d", 3],
    ["lane caption on panel (mark)", "#3ea3ff", "panel", "#19191d", 3],
    ["lane sound on panel (mark)", "#0eaf80", "panel", "#19191d", 3],
    ["lane camera on panel (mark)", "#4fb3d9", "panel", "#19191d", 3],
    ["lane effect on panel (mark)", "#d9c34f", "panel", "#19191d", 3],
  ],
  c: [
    ["ink (titles)", "#0a0a0a", "ground", "#ffffff", 4.5],
    ["ink-2 (body)", "#2e2e2e", "ground", "#ffffff", 4.5],
    ["meta (captions)", "#616161", "ground", "#ffffff", 4.5],
    ["meta on the wall", "#616161", "wall", "#f2f2f0", 4.5],
    ["ink on the wall (command)", "#0a0a0a", "wall", "#f2f2f0", 4.5],
    ["ground on ink (button, frame count)", "#ffffff", "ink", "#0a0a0a", 4.5],
    ["on-signal (hovered button)", "#ffffff", "signal", "#1a3cff", 4.5],
    ["signal as focus ring", "#1a3cff", "ground", "#ffffff", 3],
    ["quiet button edge (ink)", "#0a0a0a", "ground", "#ffffff", 3],
  ],
};

let failed = 0;
for (const [dir, rows] of Object.entries(directions)) {
  console.log(`\n### Direction ${dir.toUpperCase()}\n`);
  console.log("| pair | colours | ratio | needs | result |");
  console.log("|---|---|---|---|---|");
  for (const [name, fg, bgName, bg, need] of rows) {
    const r = ratio(fg, bg);
    const label = need === 1 ? "decor" : `${need}:1`;
    const ok = r >= need;
    if (!ok) failed++;
    console.log(`| ${name} on ${bgName} | ${fg} on ${bg} | ${r.toFixed(2)}:1 | ${label} | ${need === 1 ? "exempt" : ok ? "pass" : "FAIL"} |`);
  }
}
process.exitCode = failed ? 1 : 0;
