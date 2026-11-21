import pg from 'pg';

// Dates stay 'YYYY-MM-DD' strings and numeric columns become numbers, as the pages and the schema expect.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => Number(v));

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

const holder = globalThis;

export function pool() {
  if (!dbConfigured()) return null;
  holder.__vawePool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
  return holder.__vawePool;
}

export async function closePool() {
  await holder.__vawePool?.end();
  holder.__vawePool = undefined;
}

// A site without a database shows its empty states. A database that fails at run time throws, so a
// cached page stays up (ISR keeps the last good one); during `next build` it falls back to empty.
export async function rows(sql, params = []) {
  const p = pool();
  if (!p) return [];
  try {
    return (await p.query(sql, params)).rows;
  } catch (e) {
    if (process.env.NEXT_PHASE === 'phase-production-build') return [];
    throw e;
  }
}

export async function transaction(fn) {
  const p = pool();
  if (!p) throw new Error('DATABASE_URL is not set');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
