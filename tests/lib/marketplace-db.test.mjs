// Runs against a throwaway Postgres 16:
//   docker run -d --name vawe-pg-test -e POSTGRES_PASSWORD=test -p 54329:5432 postgres:16-alpine
//   TEST_DATABASE_URL=postgres://postgres:test@localhost:54329/postgres npm test
// Without TEST_DATABASE_URL these tests are skipped. Each run makes its own database and drops it.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { migrate, migrationFiles } from '../../site/db/migrate.mjs';
import { closePool, pool } from '../../site/lib/db.mjs';
import * as store from '../../site/lib/marketplace-store.mjs';
import { CHECKS, entriesFromForm } from '../../site/lib/marketplace-schema.mjs';
import { RateLimiter, handleSubmit } from '../../site/lib/marketplace-submit.ts';
import { readEntries, importEntries } from '../../site/db/import-json.mjs';
import { COOKIE, SESSION_SECONDS, checkLogin, csrfFor, csrfValid, issueSession, sessionValid } from '../../site/lib/admin-auth.mjs';

const pg = createRequire(path.join(import.meta.dirname, '../../site/package.json'))('pg');
const ADMIN = process.env.TEST_DATABASE_URL;
const skip = ADMIN ? false : 'TEST_DATABASE_URL is not set';
const NAME = `vawe_test_${crypto.randomBytes(4).toString('hex')}`;
const TODAY = '2026-11-21';
let admin;

const urlFor = (name) => {
  const u = new URL(ADMIN);
  u.pathname = `/${name}`;
  return u.toString();
};

before(async () => {
  if (skip) return;
  admin = new pg.Client({ connectionString: ADMIN });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${NAME}`);
  process.env.DATABASE_URL = urlFor(NAME);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await migrate(client);
  await client.end();
});

after(async () => {
  if (skip) return;
  await closePool();
  await admin.query(`DROP DATABASE ${NAME} WITH (FORCE)`);
  await admin.end();
});

const q = (sql, params) => pool().query(sql, params).then((r) => r.rows);
const reset = () => q('TRUNCATE listings, jobs, designers, creators, submissions, audit_log CASCADE');

const listingForm = (over = {}) => ({
  kind: 'listing', title: 'Glitch titles', summary: 'Twelve glitch title cards for trailers.', software: 'after-effects', category: 'titles',
  preview: 'https://cdn.example.com/glitch.mp4', poster: 'https://cdn.example.com/glitch.jpg', price: '19', currency: 'usd', url: 'https://ana.gumroad.com/l/glitch',
  tags: 'glitch, trailer', handle: 'ana-motion', name: 'Ana Ruiz', link: 'https://ana.example.com', ...over,
});
const jobForm = (over = {}) => ({
  kind: 'job', title: 'Motion designer', company: 'Northwind', workplace: 'remote', countries: 'us', employment: ['FULL_TIME'], software: ['after-effects'],
  apply: 'https://northwind.example.com/jobs/1', description: 'You make launch films and product loops. You know After Effects well and can show a reel of shipped work.', ...over,
});
const designerForm = (over = {}) => ({ kind: 'designer', handle: 'bo-motion', name: 'Bo Lin', reel: 'https://vimeo.com/9', software: ['blender'], availability: 'soon', availableFrom: '2026-12-15', rateAmount: '70', unit: 'DAY', ...over });

const okMedia = async (u) => new Response(null, { status: 200, headers: { 'content-type': String(u).endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', 'content-length': '1000' } });

function send(form, { ip = '203.0.113.9' } = {}) {
  const req = new Request('https://vawe.dev/api/marketplace/submit', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(form) });
  return handleSubmit(req, { IP_HASH_KEY: 'k' }, { fetch: okMedia, lookup: async () => ['93.184.216.34'], limiter: new RateLimiter(100, 3600000), now: () => new Date(`${TODAY}T12:00:00Z`), store: store.createSubmission });
}

// ===== migrations ===============================================================================

test('the migrations create every table, and a second run applies nothing', { skip }, async () => {
  const tables = (await q(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`)).map((r) => r.table_name);
  for (const t of ['audit_log', 'creators', 'designers', 'jobs', 'listings', 'schema_migrations', 'submissions']) assert.ok(tables.includes(t), t);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  assert.deepEqual(await migrate(client), []);
  await client.end();
  assert.deepEqual((await q('SELECT name FROM schema_migrations')).map((r) => r.name), migrationFiles());
});

test('a failing migration rolls back whole, and an applied file that was edited stops the run', { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
  fs.writeFileSync(path.join(dir, '0001_a.sql'), 'CREATE TABLE t_a (id int);');
  fs.writeFileSync(path.join(dir, '0002_b.sql'), 'CREATE TABLE t_b (id int); SELECT 1/0;');
  const name = `${NAME}_m`;
  await admin.query(`CREATE DATABASE ${name}`);
  const client = new pg.Client({ connectionString: urlFor(name) });
  await client.connect();
  try {
    await assert.rejects(migrate(client, { dir }), /0002_b\.sql failed and was rolled back/);
    const tables = (await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`)).rows.map((r) => r.table_name);
    assert.ok(tables.includes('t_a') && !tables.includes('t_b'), 'the first file stays, the failed one leaves nothing');
    fs.writeFileSync(path.join(dir, '0002_b.sql'), 'CREATE TABLE t_b (id int);');
    assert.deepEqual(await migrate(client, { dir }), ['0002_b.sql']);
    fs.writeFileSync(path.join(dir, '0001_a.sql'), 'CREATE TABLE t_a (id int, extra int);');
    await assert.rejects(migrate(client, { dir }), /0001_a\.sql was applied and then edited/);
  } finally {
    await client.end();
    await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
  }
});

// ===== submit to approve ========================================================================

test('a listing goes from the form to a pending row to a public listing, with its creator, in one approval', { skip }, async () => {
  await reset();
  const res = await send(listingForm());
  assert.equal(res.status, 201);
  const { id } = await res.json();
  assert.equal((await store.listListings()).length, 0, 'pending is not public');
  const [row] = await q('SELECT status, kind, ip_hash, payload FROM submissions WHERE id = $1', [id]);
  assert.equal(row.status, 'pending');
  assert.match(row.ip_hash, /^[0-9a-f]{64}$/);
  assert.equal(row.payload.length, 2);

  const published = await store.approveSubmission(id, { note: 'links checked', today: '2026-11-24' });
  assert.deepEqual(published, [{ kind: 'creator', key: 'ana-motion' }, { kind: 'listing', key: 'glitch-titles' }]);
  const [l] = await store.listListings();
  assert.equal(l.id, 'glitch-titles');
  assert.deepEqual(l.price, { amount: 19, currency: 'USD' });
  assert.deepEqual(l.tags, ['glitch', 'trailer']);
  assert.equal(l.added, '2026-11-24', 'the date is the day of approval');
  assert.deepEqual(CHECKS.listing(l), []);
  assert.equal((await store.getCreator('ana-motion')).name, 'Ana Ruiz');
  assert.deepEqual((await store.listingsBy('ana-motion')).map((x) => x.id), ['glitch-titles']);
  assert.deepEqual(await store.profileHandles(), ['ana-motion']);
  const [done] = await q('SELECT status, reviewer_note, reviewed_at FROM submissions WHERE id = $1', [id]);
  assert.equal(done.status, 'approved');
  assert.equal(done.reviewer_note, 'links checked');
  assert.ok(done.reviewed_at);
  await assert.rejects(store.approveSubmission(id), /already approved/);
  assert.deepEqual((await q('SELECT action FROM audit_log ORDER BY id')).map((r) => r.action), ['submission.created', 'submission.approved']);
});

test('a job and a designer profile are published the same way, and a reject publishes nothing', { skip }, async () => {
  await reset();
  const job = (await (await send(jobForm())).json()).id;
  const designer = (await (await send(designerForm())).json()).id;
  const nope = (await (await send(jobForm({ company: 'Spam Inc' }))).json()).id;
  await store.approveSubmission(job, { today: TODAY });
  await store.approveSubmission(designer, { today: TODAY });
  await store.rejectSubmission(nope, { note: 'asks people to pay' });
  assert.deepEqual((await store.listLiveJobs(TODAY)).map((j) => j.company), ['Northwind']);
  const [d] = await store.listDesigners();
  assert.deepEqual([d.handle, d.availability, d.availableFrom, d.rate], ['bo-motion', 'soon', '2026-12-15', { amount: 70, currency: 'USD', unit: 'DAY' }]);
  const counts = await store.countSubmissions();
  assert.deepEqual(counts, { approved: 2, rejected: 1 });
  assert.equal((await store.listSubmissions('pending')).length, 0);
  assert.equal((await store.listSubmissions('rejected'))[0].reviewer_note, 'asks people to pay');
  await assert.rejects(store.approveSubmission(nope), /already rejected/);
  await assert.rejects(store.approveSubmission('not-an-id'), /not a submission id/);
  await assert.rejects(store.approveSubmission(crypto.randomUUID()), /No such submission/);
});

test('names are checked at submit and again at approval; a failed approval changes nothing', { skip }, async () => {
  await reset();
  const first = (await (await send(listingForm())).json()).id;
  const second = (await (await send(listingForm({ handle: 'other-ana', link: 'https://other.example.com' }))).json()).id;
  const sameLink = (await (await send(listingForm({ title: 'Glitch titles two' }))).json()).id;
  await store.approveSubmission(first, { today: TODAY });
  await assert.rejects(store.approveSubmission(second, { today: TODAY }), /A listing named glitch-titles exists/);
  assert.equal((await q('SELECT status FROM submissions WHERE id = $1', [second]))[0].status, 'pending');
  assert.equal(await store.getCreator('other-ana'), null, 'the creator insert rolled back with the listing');
  await store.approveSubmission(sameLink, { today: TODAY });
  assert.equal((await q('SELECT count(*)::int AS n FROM creators'))[0].n, 1, 'the same creator with the same link is reused');

  const taken = await send(listingForm());
  assert.equal(taken.status, 409);
  assert.match((await taken.json()).error, /glitch-titles exists/);
  assert.equal((await send(listingForm({ title: 'Third', link: 'https://elsewhere.example.com' }))).status, 409, 'a handle with another link');
  assert.equal((await q(`SELECT count(*)::int AS n FROM submissions WHERE status = 'pending'`))[0].n, 1, 'a refused submission leaves no row');
});

test('one address may leave ten submissions a day', { skip }, async () => {
  await reset();
  for (let i = 0; i < 10; i++) assert.equal((await send(jobForm({ title: `Role ${i}` }), { ip: '198.51.100.7' })).status, 201);
  const eleventh = await send(jobForm({ title: 'Role 11' }), { ip: '198.51.100.7' });
  assert.equal(eleventh.status, 429);
  assert.equal((await send(jobForm({ title: 'Role 11' }), { ip: '198.51.100.8' })).status, 201);
});

// ===== expiry and the empty database ============================================================

test('a job is live through its 60th day and gone on the 61st, in the query', { skip }, async () => {
  await reset();
  await q(`INSERT INTO jobs (id, title, company, workplace, countries, employment, description, apply, posted) VALUES
    ('old-job', 'Old', 'A', 'remote', '{US}', '{FULL_TIME}', 'd', 'https://a.example.com', '2026-09-22'),
    ('new-job', 'New', 'B', 'remote', '{US}', '{FULL_TIME}', 'd', 'https://b.example.com', '2026-11-21')`);
  assert.deepEqual((await store.listLiveJobs('2026-11-21')).map((j) => j.id), ['new-job', 'old-job']);
  assert.deepEqual((await store.listLiveJobs('2026-11-22')).map((j) => j.id), ['new-job'], 'posted 2026-09-22 closes after 2026-11-21');
  assert.equal(await store.getLiveJob('old-job', '2026-11-21') !== null, true);
  assert.equal(await store.getLiveJob('old-job', '2026-11-22'), null);
  assert.equal((await store.listLiveJobs('2027-03-01')).length, 0);
});

test('an empty database and a missing DATABASE_URL both give empty lists, not errors', { skip }, async () => {
  await reset();
  for (const read of [store.listListings, store.listCreators, store.listDesigners, store.listLiveJobs, store.profileHandles, store.listSubmissions]) assert.deepEqual(await read(), []);
  assert.equal(await store.getListing('nope'), null);
  assert.equal(await store.getLiveJob('nope'), null);
  const url = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    for (const read of [store.listListings, store.listCreators, store.listDesigners, store.listLiveJobs, store.profileHandles]) assert.deepEqual(await read(), []);
    assert.equal(await store.getListing('x'), null);
  } finally {
    process.env.DATABASE_URL = url;
  }
});

// ===== the one-time import ======================================================================

test('the JSON import adds every valid entry once, skips an expired job and rejects a bad file', { skip }, async () => {
  await reset();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'import-'));
  const put = (folder, name, value) => {
    fs.mkdirSync(path.join(root, folder), { recursive: true });
    fs.writeFileSync(path.join(root, folder, name), JSON.stringify(value));
  };
  const forms = entriesFromForm('listing', listingForm(), TODAY);
  put('creators', 'ana-motion.json', forms[0].entry);
  put('listings', 'glitch-titles.json', forms[1].entry);
  put('jobs', 'new-job.json', { ...entriesFromForm('job', jobForm(), TODAY)[0].entry, id: 'new-job' });
  put('jobs', 'old-job.json', { ...entriesFromForm('job', jobForm(), '2026-01-01')[0].entry, id: 'old-job', posted: '2026-01-01' });
  const first = await importEntries(readEntries(root), TODAY);
  assert.deepEqual(first.added, ['creator ana-motion', 'listing glitch-titles', 'job new-job']);
  const again = await importEntries(readEntries(root), TODAY);
  assert.deepEqual(again.added, []);
  put('jobs', 'wrong-name.json', { ...entriesFromForm('job', jobForm(), TODAY)[0].entry, id: 'other' });
  assert.throws(() => readEntries(root), /the file name must be other\.json/);
});

// ===== the admin token ==========================================================================

const TOKEN = 'a'.repeat(40);

test('login takes the exact token and nothing else', () => {
  assert.equal(checkLogin(TOKEN, TOKEN), true);
  for (const given of ['', 'a'.repeat(39), `${TOKEN}x`, 'b'.repeat(40), null, undefined, ['x'], 42]) assert.equal(checkLogin(TOKEN, given), false, String(given));
  for (const token of [undefined, '', 'short']) assert.equal(checkLogin(token, token), false, 'no token or a short one turns the page off');
});

test('a session cookie needs the right signature and an unexpired date; a wrong token or no cookie never passes', () => {
  const now = Date.parse('2026-11-21T12:00:00Z');
  const cookie = issueSession(TOKEN, now);
  assert.equal(sessionValid(TOKEN, cookie, now), true);
  assert.equal(sessionValid(TOKEN, cookie, now + (SESSION_SECONDS - 1) * 1000), true);
  assert.equal(sessionValid(TOKEN, cookie, now + (SESSION_SECONDS + 1) * 1000), false, 'expired');
  assert.equal(sessionValid('b'.repeat(40), cookie, now), false, 'signed with another token');
  assert.equal(sessionValid(TOKEN, undefined, now), false, 'no cookie');
  assert.equal(sessionValid(TOKEN, '', now), false);
  const [expires, sig] = cookie.split('.');
  assert.equal(sessionValid(TOKEN, `${Number(expires) + 99999}.${sig}`, now), false, 'a longer date with the old signature');
  assert.equal(sessionValid(TOKEN, `${expires}.${sig.slice(0, -1)}0`, now), false, 'a changed signature');
  assert.equal(sessionValid(TOKEN, `${expires}.${sig}.x`, now), false);
  assert.equal(sessionValid(undefined, cookie, now), false);
  assert.ok(!cookie.includes(TOKEN));
  assert.equal(COOKIE, 'vawe_admin');
});

test('a POST action needs the CSRF value of its own session', () => {
  const cookie = issueSession(TOKEN);
  const other = issueSession(TOKEN, Date.now() + 1000);
  assert.equal(csrfValid(TOKEN, cookie, csrfFor(TOKEN, cookie)), true);
  assert.equal(csrfValid(TOKEN, cookie, csrfFor(TOKEN, other)), false, 'a value from another session');
  assert.equal(csrfValid(TOKEN, cookie, ''), false);
  assert.equal(csrfValid(TOKEN, cookie, null), false);
  assert.equal(csrfValid(TOKEN, undefined, csrfFor(TOKEN, cookie)), false, 'no cookie');
  assert.equal(csrfValid(TOKEN, 'forged.cookie', csrfFor(TOKEN, 'forged.cookie')), false, 'a forged cookie with its own value');
});
