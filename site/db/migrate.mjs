// Runs db/migrations/*.sql in name order, each in its own transaction, and records it in
// schema_migrations. A second run applies nothing. An applied file that was edited stops the run.
//
//   DATABASE_URL=postgres://... node db/migrate.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = path.join(here, 'migrations');
// One number for every instance, so two containers starting together run the migrations one at a time.
const LOCK = 7280311;

const checksum = (sql) => crypto.createHash('sha256').update(sql).digest('hex');

export function migrationFiles(dir = MIGRATIONS_DIR) {
  return fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
}

export async function migrate(client, { dir = MIGRATIONS_DIR, log = () => {} } = {}) {
  await client.query('SELECT pg_advisory_lock($1)', [LOCK]);
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Map((await client.query('SELECT name, checksum FROM schema_migrations')).rows.map((r) => [r.name, r.checksum]));
    const applied = [];
    for (const file of migrationFiles(dir)) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const sum = checksum(sql);
      if (done.has(file)) {
        if (done.get(file) !== sum) throw new Error(`${file} was applied and then edited. Add a new migration instead.`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, sum]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`${file} failed and was rolled back: ${e.message}`);
      }
      log(`applied ${file}`);
      applied.push(file);
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK]);
  }
}

async function connectWithRetry(url, tries = 30) {
  for (let i = 1; ; i++) {
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      return client;
    } catch (e) {
      await client.end().catch(() => {});
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('~ migrate: DATABASE_URL is not set, nothing to do');
    process.exit(0);
  }
  const client = await connectWithRetry(url).catch((e) => {
    console.error(`✗ migrate: cannot reach the database (${e.message})`);
    process.exit(1);
  });
  try {
    const applied = await migrate(client, { log: (m) => console.log(`  migrate: ${m}`) });
    console.log(`✓ migrate: ${applied.length ? `${applied.length} applied` : 'up to date'}`);
  } catch (e) {
    console.error(`✗ migrate: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
