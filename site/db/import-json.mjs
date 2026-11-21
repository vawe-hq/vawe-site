// One-time import of the old JSON entries (creators, listings, jobs, designers) into Postgres. Every
// file passes the marketplace checks first; the run is one transaction, so it adds all or nothing.
// A row that exists already is left alone, so a second run adds nothing.
//
//   DATABASE_URL=postgres://... node db/import-json.mjs <folder holding creators/ listings/ jobs/ designers/>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS, FOLDERS, entryKey, isExpired, isoDate } from '../lib/marketplace-schema.mjs';
import { closePool, transaction } from '../lib/db.mjs';
import { Conflict, insertEntry } from '../lib/marketplace-store.mjs';

const ORDER = ['creator', 'designer', 'listing', 'job'];

export function readEntries(root) {
  return ORDER.flatMap((kind) => {
    const dir = path.join(root, FOLDERS[kind]);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((file) => {
      const entry = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const errors = CHECKS[kind](entry);
      if (errors.length) throw new Error(`${FOLDERS[kind]}/${file}: ${errors.join('; ')}`);
      if (`${entryKey(kind, entry)}.json` !== file) throw new Error(`${FOLDERS[kind]}/${file}: the file name must be ${entryKey(kind, entry)}.json`);
      return { kind, entry };
    });
  });
}

export async function importEntries(entries, today = isoDate(new Date())) {
  const live = entries.filter((e) => e.kind !== 'job' || !isExpired(e.entry, today));
  return transaction(async (client) => {
    const added = [];
    for (const e of live) {
      try {
        await client.query('SAVEPOINT one');
        if (await insertEntry(client, e.kind, e.entry)) added.push(`${e.kind} ${entryKey(e.kind, e.entry)}`);
        await client.query('RELEASE SAVEPOINT one');
      } catch (err) {
        if (!(err instanceof Conflict)) throw err;
        await client.query('ROLLBACK TO SAVEPOINT one');
      }
    }
    return { added, skipped: entries.length - added.length };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2];
  if (!root || !process.env.DATABASE_URL) {
    console.error('usage: DATABASE_URL=postgres://... node db/import-json.mjs <folder>');
    process.exit(2);
  }
  try {
    const out = await importEntries(readEntries(path.resolve(root)));
    console.log(`✓ import: ${out.added.length} added, ${out.skipped} skipped (exist already, or jobs past their 60 days)`);
  } catch (e) {
    console.error(`✗ import: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
