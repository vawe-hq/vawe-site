// Syncs site/lib/motion-resources.json from data/resources.json in vawe-hq/awesome-motion-design, the
// list behind /resources/motion-design. The committed copy is the fallback: if the fetch fails or the
// data does not pass the checks, the build keeps it and says so.
//
//   node scripts/site/motion-resources.mjs            sync (the site prebuild)
//   node scripts/site/motion-resources.mjs --file x   read x instead of fetching it
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'site/lib/motion-resources.json');
export const SOURCE = 'https://raw.githubusercontent.com/vawe-hq/awesome-motion-design/main/data/resources.json';
export const PRICING = ['Free', 'Open source', 'Freemium', 'Paid'];
const FETCH_TIMEOUT_MS = 10000;

export function normalize(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new Error('resources.json must be a non-empty list');
  const seen = new Set();
  const resources = raw.map((r, i) => {
    const at = `entry ${i + 1}${r?.name ? ` (${r.name})` : ''}`;
    for (const f of ['name', 'url', 'section', 'description']) if (typeof r?.[f] !== 'string' || !r[f].trim()) throw new Error(`${at}: ${f} is required`);
    if (!/^https?:\/\/[^\s]+$/.test(r.url)) throw new Error(`${at}: url must be an http or https link`);
    if (!PRICING.includes(r.pricing)) throw new Error(`${at}: pricing must be one of ${PRICING.join(', ')}`);
    if (seen.has(r.url)) throw new Error(`${at}: url is listed twice`);
    seen.add(r.url);
    if (!Array.isArray(r.tags) || r.tags.some((t) => typeof t !== 'string')) throw new Error(`${at}: tags must be a list of text`);
    return { name: r.name.trim(), url: r.url, section: r.section.trim(), description: r.description.trim(), pricing: r.pricing, licence: r.licence ?? null, tags: r.tags };
  });
  const checked = raw.map((r) => r.checked).filter((d) => typeof d === 'string').sort().at(-1) ?? null;
  return { source: 'https://github.com/vawe-hq/awesome-motion-design', checked, resources };
}

async function load() {
  const i = process.argv.indexOf('--file');
  if (i > 0) return JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${SOURCE} answered ${res.status}`);
  return res.json();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const data = normalize(await load());
    fs.writeFileSync(OUT, `${JSON.stringify(data, null, 1)}\n`);
    console.log(`✓ motion-resources: ${data.resources.length} entries -> site/lib/motion-resources.json`);
  } catch (e) {
    console.log(`~ motion-resources: ${e.message}; using the committed site/lib/motion-resources.json`);
  }
}
