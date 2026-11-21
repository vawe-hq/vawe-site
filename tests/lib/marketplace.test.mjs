import test from 'node:test';
import assert from 'node:assert/strict';
import { CHECKS, FORMS, addDays, entriesFromForm, isExpired, jobValidThrough } from '../../site/lib/marketplace-schema.mjs';
import { Conflict } from '../../site/lib/marketplace-store.mjs';
import { RateLimiter, checkMedia, handleSubmit, isPrivateAddress } from '../../site/lib/marketplace-submit.ts';

const TODAY = '2026-11-21';

const creator = (over = {}) => ({ handle: 'ana-motion', name: 'Ana Ruiz', link: 'https://ana.example.com', ...over });
const listing = (over = {}) => ({
  id: 'glitch-titles', title: 'Glitch titles', summary: 'Twelve glitch title cards for trailers.', creator: 'ana-motion', software: 'after-effects',
  category: 'titles', preview: 'https://cdn.example.com/glitch.mp4', poster: 'https://cdn.example.com/glitch.jpg', price: { amount: 19, currency: 'USD' },
  url: 'https://ana.gumroad.com/l/glitch', added: TODAY, ...over,
});
const job = (over = {}) => ({
  id: 'northwind-motion-designer-20261121', title: 'Motion designer', company: 'Northwind', workplace: 'remote', countries: ['US', 'CA'],
  employment: ['FULL_TIME'], software: ['after-effects'], description: 'You make launch films and product loops. You know After Effects well and can show a reel of shipped work.',
  apply: 'https://northwind.example.com/jobs/1', posted: TODAY, ...over,
});
const designer = (over = {}) => ({
  handle: 'ana-motion', name: 'Ana Ruiz', reel: 'https://vimeo.com/123', software: ['after-effects', 'cinema-4d'], availability: 'available', updated: TODAY, ...over,
});

// ===== the schema ===============================================================================

test('a complete entry of each kind passes', () => {
  assert.deepEqual(CHECKS.creator(creator()), []);
  assert.deepEqual(CHECKS.listing(listing()), []);
  assert.deepEqual(CHECKS.job(job()), []);
  assert.deepEqual(CHECKS.designer(designer()), []);
  assert.deepEqual(CHECKS.listing(listing({ price: { amount: 0, currency: 'EUR' }})), []);
  assert.deepEqual(CHECKS.job(job({ workplace: 'hybrid', city: 'Berlin', countries: ['DE'], apply: 'mailto:jobs@northwind.example.com', pay: { min: 60, max: 90, currency: 'EUR', unit: 'HOUR' } })), []);
});

test('each broken field is named with its fix', () => {
  const cases = [
    [CHECKS.listing(listing({ extra: 1 })), /^extra: is not a known field$/],
    [CHECKS.listing(listing({ preview: 'http://cdn.example.com/a.mp4' })), /^preview: must be an https link/],
    [CHECKS.listing(listing({ preview: 'https://cdn.example.com/a.exe' })), /^preview: must end in \.mp4 or \.webm$/],
    [CHECKS.listing(listing({ poster: 'https://cdn.example.com/a.svg' })), /^poster: must end in/],
    [CHECKS.listing(listing({ preview: 'media/x.mp4' })), /^preview: must be an https link to a mp4, webm file$/],
    [CHECKS.listing(listing({ software: 'flash' })), /^software: must be one of/],
    [CHECKS.listing(listing({ price: { amount: -1, currency: 'USD' } })), /^price\.amount: must be from 0/],
    [CHECKS.listing(listing({ price: { amount: 1.005, currency: 'USD' } })), /^price\.amount: takes at most 2 decimals$/],
    [CHECKS.listing(listing({ price: { amount: 5, currency: 'usd' } })), /^price\.currency:/],
    [CHECKS.listing(listing({ title: 'x'.repeat(81) })), /^title: must be 80 characters or fewer$/],
    [CHECKS.listing(listing({ title: ' padded' })), /^title: must not start or end with spaces$/],
    [CHECKS.listing(listing({ summary: 'two\nlines' })), /^summary: must be one line$/],
    [CHECKS.listing(listing({ url: 'javascript:alert(1)' })), /^url: must be an https link$/],
    [CHECKS.listing(listing({ url: 'https://user:pw@shop.example.com/x' })), /^url: must be an https link$/],
    [CHECKS.listing(listing({ added: '2026-02-30' })), /^added: must be a date/],
    [CHECKS.listing(listing({ id: 'Bad_Id' })), /^id: must be lowercase/],
    [CHECKS.creator(creator({ handle: '-ana' })), /^handle:/],
    [CHECKS.job(job({ workplace: 'onsite' })), /^city: is required$/],
    [CHECKS.job(job({ countries: [] })), /^countries: must list 1 to 10/],
    [CHECKS.job(job({ countries: ['USA'] })), /^countries: each country is a 2-letter code/],
    [CHECKS.job(job({ employment: ['GIG'] })), /^employment: GIG is not one of/],
    [CHECKS.job(job({ description: 'Too short.' })), /^description: must be at least 80 characters$/],
    [CHECKS.job(job({ apply: 'ftp://x.example.com' })), /^apply: must be an https link or a mailto: address$/],
    [CHECKS.job(job({ pay: { min: 90, max: 60, currency: 'EUR', unit: 'HOUR' } })), /^pay\.max: must not be under pay\.min$/],
    [CHECKS.job(job({ pay: { min: 90, currency: 'EUR', unit: 'SHIFT' } })), /^pay\.unit:/],
    [CHECKS.designer(designer({ availability: 'soon' })), /^availableFrom: is required/],
    [CHECKS.designer(designer({ software: [] })), /^software: needs at least 1$/],
    [CHECKS.designer(designer({ rate: { amount: 50, currency: 'USD', unit: 'YEAR' } })), /^rate\.unit:/],
    [CHECKS.designer(designer({ bio: 'a\u0007b' })), /^bio: holds a control character$/],
  ];
  for (const [errors, want] of cases) assert.ok(errors.some((e) => want.test(e)), `${want} not in ${JSON.stringify(errors)}`);
});

test('a job closes 60 days after it was posted, and is still open on its last day', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(jobValidThrough(job()), '2027-01-20');
  assert.equal(isExpired(job(), '2027-01-20'), false);
  assert.equal(isExpired(job(), '2027-01-21'), true);
});

// ===== the submit API, the database faked =======================================================

const listingForm = (over = {}) => ({
  kind: 'listing', title: 'Glitch titles', summary: 'Twelve glitch title cards for trailers.', software: 'after-effects', category: 'titles',
  preview: 'https://cdn.example.com/glitch.mp4', poster: 'https://cdn.example.com/glitch.jpg', price: '19', currency: 'usd', url: 'https://ana.gumroad.com/l/glitch',
  tags: 'glitch, trailer', handle: 'ana-motion', name: 'Ana Ruiz', link: 'https://ana.example.com', fax: '', ...over,
});
const jobForm = (over = {}) => ({
  kind: 'job', title: 'Motion designer', company: 'Northwind', workplace: 'remote', countries: 'us, ca', employment: ['FULL_TIME', 'CONTRACTOR'],
  payMin: '90000', payMax: '120000', currency: 'USD', unit: 'YEAR', software: ['after-effects'], apply: 'https://northwind.example.com/jobs/1',
  description: 'You make launch films and product loops.\r\nYou know After Effects well and can show a reel of shipped work.', ...over,
});
const designerForm = (over = {}) => ({ kind: 'designer', handle: 'ana-motion', name: 'Ana Ruiz', reel: 'https://vimeo.com/123', software: ['after-effects'], availability: 'available', rateAmount: '80', unit: 'HOUR', ...over });

function fakeFetch({ media = {} } = {}) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, method: init.method ?? 'GET', headers: init.headers });
    const m = media[u] ?? { status: 200, type: u.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', size: 1000 };
    return new Response(null, { status: m.status, headers: { ...(m.type ? { 'content-type': m.type } : {}), ...(m.size ? { 'content-length': String(m.size) } : {}), ...(m.location ? { location: m.location } : {}) } });
  };
  return { impl, calls };
}

const publicLookup = async () => ['93.184.216.34'];

function fakeStore(over = {}) {
  const saved = [];
  const store = async (kind, planned, ipHash) => {
    if (over.throws) throw over.throws;
    saved.push({ kind, planned, ipHash });
    return 'sub-1';
  };
  return { store, saved };
}

function submit(form, { env = { IP_HASH_KEY: 'k' }, fetchImpl = fakeFetch().impl, limiter = new RateLimiter(5, 3600000), ip = '203.0.113.9', headers = {}, raw, lookup = publicLookup, store = fakeStore().store, reservedIds } = {}) {
  const req = new Request('https://vawe.dev/api/marketplace/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `${ip}, 10.0.0.1`, ...headers },
    body: raw ?? JSON.stringify(form),
  });
  return handleSubmit(req, env, { fetch: fetchImpl, lookup, limiter, now: () => new Date(`${TODAY}T12:00:00Z`), store, reservedIds });
}

test('a valid listing becomes one pending submission holding the creator and the listing, and the ip is only stored hashed', async () => {
  const { store, saved } = fakeStore();
  const { impl, calls } = fakeFetch();
  const res = await submit(listingForm(), { store, fetchImpl: impl });
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { ok: true, id: 'sub-1' });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].kind, 'listing');
  assert.deepEqual(saved[0].planned, [{ kind: 'creator', entry: creator() }, { kind: 'listing', entry: { ...listing(), tags: ['glitch', 'trailer'] } }]);
  assert.match(saved[0].ipHash, /^[0-9a-f]{64}$/);
  assert.ok(!saved[0].ipHash.includes('203.0.113.9'));
  assert.equal(calls.length, 2);
  for (const c of calls) assert.equal(c.method, 'HEAD');
});

test('a listing without a preview or poster link is refused: media is linked, never added by hand', async () => {
  const { store, saved } = fakeStore();
  const res = await submit(listingForm({ preview: '', poster: '' }), { store });
  assert.equal(res.status, 400);
  const errors = (await res.json()).errors;
  assert.ok(errors.includes('preview: is required') && errors.includes('poster: is required'));
  assert.equal(saved.length, 0);
});

test('a job gets its date, upper-case countries and a normalised description; a designer keeps its handle', async () => {
  const one = fakeStore();
  assert.equal((await submit(jobForm(), { store: one.store })).status, 201);
  const j = one.saved[0].planned[0].entry;
  assert.equal(j.id, 'northwind-motion-designer-20261121');
  assert.deepEqual(j.countries, ['US', 'CA']);
  assert.equal(j.posted, TODAY);
  assert.deepEqual(j.pay, { min: 90000, max: 120000, currency: 'USD', unit: 'YEAR' });
  assert.ok(!j.description.includes('\r'));
  const two = fakeStore();
  assert.equal((await submit(designerForm(), { store: two.store })).status, 201);
  assert.deepEqual(two.saved[0].planned[0].entry.rate, { amount: 80, currency: 'USD', unit: 'HOUR' });
});

test('an invalid form is a 400 that names each field, and nothing is stored or fetched', async () => {
  const { store, saved } = fakeStore();
  const { impl, calls } = fakeFetch();
  const res = await submit(listingForm({ software: 'flash', url: 'http://shop.example.com', price: 'ten' }), { store, fetchImpl: impl });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.errors.some((e) => e.startsWith('software:')));
  assert.ok(body.errors.some((e) => e.startsWith('url:')));
  assert.ok(body.errors.some((e) => e.startsWith('price.amount:')));
  assert.equal(calls.length + saved.length, 0);
});

test('fields outside the allow-list, wrong value types, bad JSON, a bad kind and a big body are refused before any check', async () => {
  const { store, saved } = fakeStore();
  const { impl, calls } = fakeFetch();
  const go = (form, o = {}) => submit(form, { store, fetchImpl: impl, ...o });
  assert.match((await (await go(listingForm({ isAdmin: 'yes' }))).json()).error, /Unknown field: isAdmin/);
  assert.match((await (await go(listingForm({ title: { $gt: '' } }))).json()).error, /Wrong value type: title/);
  assert.equal((await go(null, { raw: '{nope' })).status, 400);
  assert.equal((await go(null, { raw: '[1,2]' })).status, 400);
  assert.equal((await go({ kind: 'admin' })).status, 400);
  assert.equal((await go(listingForm({ bio: 'x'.repeat(40000) }))).status, 413);
  assert.equal((await go(listingForm(), { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal(calls.length + saved.length, 0);
});

test('a filled honeypot gets a quiet 200 and nothing is stored', async () => {
  const { store, saved } = fakeStore();
  const res = await submit(listingForm({ fax: 'buy now' }), { store });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(saved.length, 0);
});

test('the sixth submission from one address in an hour is a 429; another address still passes', async () => {
  const limiter = new RateLimiter(5, 3600000);
  for (let i = 0; i < 5; i++) assert.equal((await submit(listingForm({ fax: 'x' }), { limiter })).status, 200);
  const blocked = await submit(listingForm(), { limiter });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '3600');
  assert.equal((await submit(listingForm(), { limiter, ip: '198.51.100.4' })).status, 201);
  assert.equal(limiter.allow('203.0.113.9', new Date(`${TODAY}T13:00:01Z`).getTime()), true, 'the window has passed');
});

test('media links are checked with HEAD: type, size, status, redirects and private hosts', async () => {
  const deps = (media, lookup = publicLookup) => ({ fetch: fakeFetch({ media }).impl, lookup });
  const url = 'https://cdn.example.com/a.mp4';
  assert.equal(await checkMedia(url, 'video', deps({})), null);
  assert.match(await checkMedia(url, 'video', deps({ [url]: { status: 200, type: 'text/html', size: 10 } })), /is text\/html, not video\/mp4 or video\/webm/);
  assert.match(await checkMedia(url, 'video', deps({ [url]: { status: 200, type: 'video/mp4', size: 41 * 1048576 } })), /over 40 MB/);
  assert.match(await checkMedia(url, 'video', deps({ [url]: { status: 200, type: 'video/mp4' } })), /does not state its size/);
  assert.match(await checkMedia(url, 'video', deps({ [url]: { status: 404 } })), /answered 404/);
  assert.match(await checkMedia(url, 'video', deps({ [url]: { status: 302, location: 'http://cdn.example.com/a.mp4' } })), /must stay on https/);
  assert.equal(await checkMedia(url, 'video', deps({ [url]: { status: 302, location: '/b.mp4' } })), null);
  assert.match(await checkMedia(url, 'video', deps({}, async () => ['10.0.0.5'])), /must be on a public host/);
  assert.match(await checkMedia('https://127.0.0.1/a.mp4', 'video', deps({})), /public host/);
  assert.match(await checkMedia('https://localhost/a.mp4', 'video', deps({})), /public host/);
  const loop = 'https://cdn.example.com/loop.mp4';
  assert.match(await checkMedia(loop, 'video', deps({ [loop]: { status: 301, location: loop } })), /redirects too many times/);
  for (const ip of ['10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '127.0.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', '100.64.0.1']) assert.equal(isPrivateAddress(ip), true, ip);
  for (const ip of ['93.184.216.34', '2606:4700::1111', '172.32.0.1']) assert.equal(isPrivateAddress(ip), false, ip);
});

test('a media link that fails is a 400 before anything is stored', async () => {
  const preview = 'https://cdn.example.com/glitch.mp4';
  const { impl } = fakeFetch({ media: { [preview]: { status: 200, type: 'application/zip', size: 10 } } });
  const { store, saved } = fakeStore();
  const res = await submit(listingForm(), { fetchImpl: impl, store });
  assert.equal(res.status, 400);
  assert.match((await res.json()).errors[0], /^preview: the link is application\/zip/);
  assert.equal(saved.length, 0);
});

test('a taken name is a 409, a vawe template id is a 409, a refusal from the queue is a 429, no database is a 503 after the checks', async () => {
  const taken = await submit(listingForm(), { store: fakeStore({ throws: new Conflict('A listing named glitch-titles exists.') }).store });
  assert.equal(taken.status, 409);
  assert.match((await taken.json()).error, /glitch-titles exists\. Pick another\./);
  const reserved = await submit(listingForm({ title: 'Title sting' }), { reservedIds: ['title-sting'] });
  assert.equal(reserved.status, 409);
  assert.match((await reserved.json()).error, /belongs to a vawe template/);
  const { Refused } = await import('../../site/lib/marketplace-store.mjs');
  assert.equal((await submit(listingForm(), { store: fakeStore({ throws: new Refused('The review queue is full.') }).store })).status, 429);
  assert.equal((await submit(listingForm(), { store: null })).status, 503);
  assert.equal((await submit(listingForm({ url: 'nope' }), { store: null })).status, 400);
  const boom = new Error('connection lost');
  await assert.rejects(submit(listingForm(), { store: fakeStore({ throws: boom }).store }), /connection lost/);
});

test('every form field is a field the API maps, and the form maps to entries the schema accepts', () => {
  const forms = { listing: listingForm(), job: jobForm(), designer: designerForm() };
  for (const [kind, form] of Object.entries(forms)) {
    const names = FORMS[kind].map((f) => f.name);
    for (const key of Object.keys(form)) if (!['kind', 'fax'].includes(key)) assert.ok(names.includes(key), `${kind}.${key}`);
    for (const f of entriesFromForm(kind, form, TODAY)) assert.deepEqual(CHECKS[f.kind](f.entry), [], `${kind} -> ${f.kind}`);
  }
});
