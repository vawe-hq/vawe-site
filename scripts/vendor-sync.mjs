// Copies the vawe engine files this site reads into vendor/vawe/, and records the commit in vendor/vawe/PIN.
//
//   node scripts/vendor-sync.mjs <path to a vawe-hq/vawe checkout>     copy, write PIN
//   node scripts/vendor-sync.mjs <path> --check                        report drift, write nothing
//
// The files keep their engine paths under vendor/vawe/, so an import reads the same as in the engine.
// Nothing under vendor/vawe/ is edited by hand.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'vendor', 'vawe');
const FILES = [
  'package.json',
  'generators/media/fonts.mjs',
  'harness/media/fonts.lock.json',
  'harness/lib/clip-hash.mjs',
  'harness/lib/findings.mjs',
  'assets/brand-art/art.js',
  'assets/brand-art/cards.js',
];
const DIRS = [{ dir: 'core/motion', ext: '.js' }];

const args = process.argv.slice(2);
const check = args.includes('--check');
const src = args.find((a) => !a.startsWith('--'));
if (!src) { console.error('usage: node scripts/vendor-sync.mjs <vawe checkout> [--check]'); process.exit(2); }
const from = path.resolve(src);
if (!fs.existsSync(path.join(from, 'bin', 'vawe'))) { console.error(`${from} is not a vawe checkout (no bin/vawe)`); process.exit(2); }

const wanted = [...FILES];
for (const { dir, ext } of DIRS) {
  for (const f of fs.readdirSync(path.join(from, dir)).sort()) if (f.endsWith(ext)) wanted.push(`${dir}/${f}`);
}

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: from, encoding: 'utf8' }).trim();
let changed = 0;
for (const rel of wanted) {
  const a = path.join(from, rel);
  const b = path.join(OUT, rel);
  if (!fs.existsSync(a)) { console.error(`✗ ${rel} is missing in ${from}`); process.exit(1); }
  if (fs.existsSync(b) && fs.readFileSync(a).equals(fs.readFileSync(b))) continue;
  changed++;
  console.log(`${check ? '~ drift' : '+ copy '}  ${rel}`);
  if (check) continue;
  fs.mkdirSync(path.dirname(b), { recursive: true });
  fs.copyFileSync(a, b);
}

const keep = new Set(wanted.map((r) => path.join(OUT, r)));
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
for (const f of walk(OUT)) {
  const rel = path.relative(OUT, f);
  if (rel === 'PIN' || rel.startsWith(`assets${path.sep}fonts${path.sep}`) || keep.has(f)) continue;
  changed++;
  console.log(`${check ? '~ stale' : '- drop '}  ${rel}`);
  if (!check) fs.rmSync(f);
}

const pin = `vawe-hq/vawe@${sha}\n`;
const pinFile = path.join(OUT, 'PIN');
const pinned = fs.existsSync(pinFile) ? fs.readFileSync(pinFile, 'utf8') : '';
if (check) {
  console.log(changed ? `\n~ ${changed} file(s) differ from ${sha.slice(0, 9)}` : `\n✓ vendor/vawe matches ${sha.slice(0, 9)}`);
  process.exit(changed ? 1 : 0);
}
if (pinned !== pin) fs.writeFileSync(pinFile, pin);
console.log(`✓ vendor/vawe pinned to ${sha.slice(0, 9)} (${changed} file(s) changed)`);
