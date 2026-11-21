import { CHECKS, JOB_DAYS, isoDate } from './marketplace-schema.mjs';
import { pool, rows, transaction } from './db.mjs';

// Everything the marketplace reads and writes in Postgres. The rules for what a row may hold are in
// marketplace-schema.mjs; an entry is checked again here before it is inserted.

export class Conflict extends Error {}
export class Refused extends Error {}

const PENDING_PER_IP_PER_DAY = 10;
const PENDING_TOTAL = 1000;

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));

// ===== rows to entries ============================================================================

const creatorOf = (r) => clean({ handle: r.handle, name: r.name, link: r.link, avatar: r.avatar, bio: r.bio });

const listingOf = (r) =>
  clean({
    id: r.id, title: r.title, summary: r.summary, creator: r.creator, software: r.software, version: r.version, category: r.category,
    preview: r.preview, poster: r.poster, price: { amount: r.price_amount, currency: r.price_currency.trim() }, url: r.url,
    tags: r.tags, length: r.length, resolution: r.resolution, plugins: r.plugins, added: r.added,
  });

const jobOf = (r) =>
  clean({
    id: r.id, title: r.title, company: r.company, companyUrl: r.company_url, workplace: r.workplace, city: r.city, countries: r.countries,
    employment: r.employment, pay: r.pay, software: r.software, description: r.description, apply: r.apply, posted: r.posted,
  });

const designerOf = (r) =>
  clean({
    handle: r.handle, name: r.name, link: r.link, avatar: r.avatar, reel: r.reel, rate: r.rate, software: r.software, availability: r.availability,
    availableFrom: r.available_from, location: r.location, bio: r.bio, updated: r.updated,
  });

// ===== public reads ===============================================================================

export const listCreators = async () => (await rows('SELECT * FROM creators ORDER BY handle')).map(creatorOf);
export const listListings = async () => (await rows('SELECT * FROM listings ORDER BY added DESC, id')).map(listingOf);
export const listDesigners = async () => (await rows('SELECT * FROM designers ORDER BY handle')).map(designerOf);

// A job is live through its 60th day: the same rule as isExpired in marketplace-schema.mjs, in SQL.
export const listLiveJobs = async (today = isoDate(new Date())) =>
  (await rows('SELECT * FROM jobs WHERE posted + $2::int >= $1::date ORDER BY posted DESC, id', [today, JOB_DAYS])).map(jobOf);

export const getListing = async (id) => (await rows('SELECT * FROM listings WHERE id = $1', [id])).map(listingOf)[0] ?? null;
export const getCreator = async (handle) => (await rows('SELECT * FROM creators WHERE handle = $1', [handle])).map(creatorOf)[0] ?? null;
export const getDesigner = async (handle) => (await rows('SELECT * FROM designers WHERE handle = $1', [handle])).map(designerOf)[0] ?? null;
export const listingsBy = async (handle) => (await rows('SELECT * FROM listings WHERE creator = $1 ORDER BY added DESC, id', [handle])).map(listingOf);
export const getLiveJob = async (id, today = isoDate(new Date())) =>
  (await rows('SELECT * FROM jobs WHERE id = $1 AND posted + $3::int >= $2::date', [id, today, JOB_DAYS])).map(jobOf)[0] ?? null;

export const profileHandles = async () =>
  (await rows('SELECT handle FROM creators UNION SELECT handle FROM designers ORDER BY handle')).map((r) => r.handle);

export const listProfileNames = async () =>
  rows(`SELECT DISTINCT ON (handle) handle, name FROM (SELECT handle, name, 1 AS rank FROM creators UNION ALL SELECT handle, name, 2 FROM designers) t ORDER BY handle, rank`);

// ===== writes =====================================================================================

const exists = async (client, table, key, value) => (await client.query(`SELECT 1 FROM ${table} WHERE ${key} = $1`, [value])).rowCount > 0;

async function insertCreator(client, entry) {
  const had = (await client.query('SELECT link FROM creators WHERE handle = $1', [entry.handle])).rows[0];
  if (had && had.link !== entry.link) throw new Conflict(`The handle ${entry.handle} is taken by a creator with another link.`);
  if (had) return false;
  await client.query('INSERT INTO creators (handle, name, link, avatar, bio) VALUES ($1, $2, $3, $4, $5)', [entry.handle, entry.name, entry.link, entry.avatar ?? null, entry.bio ?? null]);
  return true;
}

async function insertListing(client, e) {
  if (await exists(client, 'listings', 'id', e.id)) throw new Conflict(`A listing named ${e.id} exists.`);
  await client.query(
    `INSERT INTO listings (id, title, summary, creator, software, version, category, preview, poster, price_amount, price_currency, url, tags, length, resolution, plugins, added)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [e.id, e.title, e.summary, e.creator, e.software, e.version ?? null, e.category, e.preview, e.poster, e.price.amount, e.price.currency, e.url, e.tags ?? null, e.length ?? null, e.resolution ?? null, e.plugins ?? null, e.added],
  );
  return true;
}

async function insertJob(client, e) {
  if (await exists(client, 'jobs', 'id', e.id)) throw new Conflict(`A job named ${e.id} exists.`);
  await client.query(
    `INSERT INTO jobs (id, title, company, company_url, workplace, city, countries, employment, pay, software, description, apply, posted)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [e.id, e.title, e.company, e.companyUrl ?? null, e.workplace, e.city ?? null, e.countries, e.employment, e.pay ?? null, e.software ?? [], e.description, e.apply, e.posted],
  );
  return true;
}

async function insertDesigner(client, e) {
  if (await exists(client, 'designers', 'handle', e.handle)) throw new Conflict(`The handle ${e.handle} is taken by a hire-me profile.`);
  await client.query(
    `INSERT INTO designers (handle, name, link, avatar, reel, rate, software, availability, available_from, location, bio, updated)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [e.handle, e.name, e.link ?? null, e.avatar ?? null, e.reel, e.rate ?? null, e.software, e.availability, e.availableFrom ?? null, e.location ?? null, e.bio ?? null, e.updated],
  );
  return true;
}

const INSERTERS = { creator: insertCreator, listing: insertListing, job: insertJob, designer: insertDesigner };

// Resolves true when a row was added; a creator who already exists with the same link adds nothing.
export const insertEntry = (client, kind, entry) => INSERTERS[kind](client, entry);

export async function audit(client, actor, action, subjectType, subjectId, detail) {
  await client.query('INSERT INTO audit_log (actor, action, subject_type, subject_id, detail) VALUES ($1,$2,$3,$4,$5)', [actor, action, subjectType ?? null, subjectId ?? null, detail ?? null]);
}

export const logAudit = (actor, action, subjectType, subjectId, detail) => audit(pool(), actor, action, subjectType, subjectId, detail);

// What a person sent, as a pending row. Conflicts are caught now so the sender can pick another name,
// and again at approval, because two pending rows may name the same handle.
export async function createSubmission(kind, planned, ipHash) {
  return transaction(async (client) => {
    const day = (await client.query(`SELECT count(*)::int AS n FROM submissions WHERE ip_hash = $1 AND created_at > now() - interval '24 hours'`, [ipHash])).rows[0].n;
    if (day >= PENDING_PER_IP_PER_DAY) throw new Refused('Too many submissions from this address today. Try again tomorrow.');
    const open = (await client.query(`SELECT count(*)::int AS n FROM submissions WHERE status = 'pending'`)).rows[0].n;
    if (open >= PENDING_TOTAL) throw new Refused('The review queue is full. Try again in a few days.');
    await client.query('SAVEPOINT probe');
    try {
      for (const p of planned) await insertEntry(client, p.kind, p.entry);
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT probe');
    }
    const id = (await client.query('INSERT INTO submissions (kind, payload, ip_hash) VALUES ($1, $2, $3) RETURNING id', [kind, JSON.stringify(planned), ipHash])).rows[0].id;
    await audit(client, 'public', 'submission.created', 'submission', id, { kind });
    return id;
  });
}

export const listSubmissions = async (status = 'pending') =>
  (await rows('SELECT id, kind, payload, status, reviewer_note, created_at, reviewed_at FROM submissions WHERE status = $1 ORDER BY created_at', [status])).map((r) => ({
    ...r,
    created_at: r.created_at.toISOString(),
    reviewed_at: r.reviewed_at?.toISOString() ?? null,
  }));

export const countSubmissions = async () =>
  Object.fromEntries((await rows('SELECT status, count(*)::int AS n FROM submissions GROUP BY status')).map((r) => [r.status, r.n]));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function lockPending(client, id) {
  if (!UUID.test(id)) throw new Refused('That is not a submission id.');
  const row = (await client.query('SELECT id, kind, payload, status FROM submissions WHERE id = $1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new Refused('No such submission.');
  if (row.status !== 'pending') throw new Refused(`That submission was already ${row.status}.`);
  return row;
}

const ENTRY_DATE = { listing: 'added', job: 'posted', designer: 'updated' };

// The entry goes live in one transaction: every row or none. A job's 60 days and a listing's date start
// on the day of approval, not the day it was sent.
/** @param {string} id @param {{ actor?: string, note?: string | null, today?: string }} [opts] */
export async function approveSubmission(id, { actor = 'admin', note, today = isoDate(new Date()) } = {}) {
  return transaction(async (client) => {
    const sub = await lockPending(client, id);
    const paths = [];
    for (const p of sub.payload) {
      const entry = ENTRY_DATE[p.kind] ? { ...p.entry, [ENTRY_DATE[p.kind]]: today } : p.entry;
      const errors = CHECKS[p.kind](entry);
      if (errors.length) throw new Refused(`The entry no longer passes the checks: ${errors.join('; ')}`);
      const added = await insertEntry(client, p.kind, entry);
      if (added || p.kind !== 'creator') paths.push({ kind: p.kind, key: entry.id ?? entry.handle });
    }
    await client.query(`UPDATE submissions SET status = 'approved', reviewer_note = $2, reviewed_at = now() WHERE id = $1`, [id, note ?? null]);
    await audit(client, actor, 'submission.approved', 'submission', id, { kind: sub.kind, entries: paths });
    return paths;
  });
}

/** @param {string} id @param {{ actor?: string, note?: string | null }} [opts] */
export async function rejectSubmission(id, { actor = 'admin', note } = {}) {
  return transaction(async (client) => {
    const sub = await lockPending(client, id);
    await client.query(`UPDATE submissions SET status = 'rejected', reviewer_note = $2, reviewed_at = now() WHERE id = $1`, [id, note ?? null]);
    await audit(client, actor, 'submission.rejected', 'submission', id, { kind: sub.kind });
  });
}
