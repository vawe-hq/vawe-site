import crypto from "node:crypto";
import { CHECKS, FORMS, HONEYPOT, MEDIA, entriesFromForm, isoDate } from "./marketplace-schema.mjs";
import { Conflict, Refused } from "./marketplace-store.mjs";

// POST /api/marketplace/submit: a form becomes a pending submission in the database. The owner reads
// each one on /admin and approves it, which publishes the rows. Media is linked by URL and checked with
// a HEAD request.

type Fetch = typeof fetch;
type Kind = keyof typeof FORMS;
type FileKind = "creator" | "listing" | "job" | "designer";
export type SubmitEnv = { IP_HASH_KEY?: string };
export type SubmitDeps = {
  fetch: Fetch;
  lookup: (host: string) => Promise<string[]>;
  limiter: RateLimiter;
  now?: () => Date;
  store: ((kind: Kind, planned: Planned[], ipHash: string) => Promise<string>) | null;
  reservedIds?: string[];
};

const MAX_BODY_BYTES = 32 * 1024;
const MAX_REDIRECTS = 3;
const HEAD_TIMEOUT_MS = 5000;
const KINDS = Object.keys(FORMS) as Kind[];

export class RateLimiter {
  private hits = new Map<string, number[]>();
  private limit: number;
  private windowMs: number;
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  allow(key: string, nowMs: number) {
    const since = nowMs - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(nowMs);
    this.hits.set(key, recent);
    if (this.hits.size > 10000) for (const [k, ts] of this.hits) if (!ts.some((t) => t > since)) this.hits.delete(k);
    return true;
  }
}

export const ipHash = (key: string | undefined, ip: string) => crypto.createHmac("sha256", key || "vawe").update(ip).digest("hex");

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

// Coolify's proxy replaces any X-Forwarded-For the client sends, so its first entry is the client.
export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

function privateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function isPrivateAddress(ip: string) {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v)) return privateV4(v);
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  if (mapped) return privateV4(mapped[1]);
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}

async function publicHost(host: string, lookup: SubmitDeps["lookup"]) {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
  if (/^[\d.]+$/.test(host) || host.includes(":")) return !isPrivateAddress(host);
  const addresses = await lookup(host).catch(() => []);
  return addresses.length > 0 && addresses.every((a) => !isPrivateAddress(a));
}

export async function checkMedia(url: string, kind: keyof typeof MEDIA, deps: Pick<SubmitDeps, "fetch" | "lookup">) {
  const spec = MEDIA[kind];
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = new URL(current);
    if (u.protocol !== "https:") return "must stay on https";
    if (!(await publicHost(u.hostname, deps.lookup))) return "must be on a public host";
    const res = await deps.fetch(current, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(HEAD_TIMEOUT_MS), cache: "no-store" }).catch(() => null);
    if (!res) return "did not answer";
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    if (res.status !== 200) return `answered ${res.status}`;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!spec.types.includes(type)) return `is ${type || "a file of no stated type"}, not ${spec.types.join(" or ")}`;
    const size = Number(res.headers.get("content-length"));
    if (!Number.isFinite(size) || size <= 0) return "does not state its size";
    if (size > spec.maxBytes) return `is ${(size / 1048576).toFixed(1)} MB, over ${spec.maxBytes / 1048576} MB`;
    return null;
  }
  return "redirects too many times";
}

export type Planned = { kind: FileKind; entry: Record<string, unknown> };

const MEDIA_FIELDS: Record<FileKind, [string, keyof typeof MEDIA][]> = {
  creator: [["avatar", "image"]],
  listing: [["preview", "video"], ["poster", "image"]],
  job: [],
  designer: [["avatar", "image"]],
};

async function mediaProblems(files: Planned[], deps: SubmitDeps) {
  const checks = files.flatMap((f) =>
    MEDIA_FIELDS[f.kind].filter(([field]) => typeof f.entry[field] === "string" && String(f.entry[field]).startsWith("https:")).map(async ([field, kind]) => {
      const why = await checkMedia(String(f.entry[field]), kind, deps);
      return why ? `${field}: the link ${why}` : null;
    }),
  );
  return (await Promise.all(checks)).filter((x): x is string => Boolean(x));
}

async function readBody(req: Request) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return null;
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return null;
  return text;
}

function parseForm(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function unknownFields(kind: Kind, form: Record<string, unknown>) {
  const allowed = new Set(["kind", HONEYPOT, ...FORMS[kind].map((f) => f.name)]);
  return Object.keys(form).filter((k) => !allowed.has(k));
}

function wrongTypes(form: Record<string, unknown>) {
  return Object.entries(form).filter(([, v]) => !(typeof v === "string" || typeof v === "number" || (Array.isArray(v) && v.length <= 20 && v.every((x) => typeof x === "string")))).map(([k]) => k);
}

export async function handleSubmit(req: Request, env: SubmitEnv, deps: SubmitDeps): Promise<Response> {
  if (req.method !== "POST") return reply(405, { error: "Send the form with POST." }, { allow: "POST" });
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return reply(415, { error: "Send the form as JSON." });
  const now = (deps.now ?? (() => new Date()))();
  if (!deps.limiter.allow(clientIp(req), now.getTime())) return reply(429, { error: "Too many submissions from this address. Try again in an hour." }, { "retry-after": "3600" });

  const text = await readBody(req);
  if (text === null) return reply(413, { error: "The form is too large." });
  const form = parseForm(text);
  if (!form) return reply(400, { error: "The form is not valid JSON." });
  if (typeof form[HONEYPOT] === "string" && form[HONEYPOT].trim()) return reply(200, { ok: true });

  const kind = form.kind as Kind;
  if (!KINDS.includes(kind)) return reply(400, { error: `kind must be one of ${KINDS.join(", ")}.` });
  const extra = unknownFields(kind, form);
  if (extra.length) return reply(400, { error: `Unknown field: ${extra.join(", ")}.` });
  const bad = wrongTypes(form);
  if (bad.length) return reply(400, { error: `Wrong value type: ${bad.join(", ")}.` });

  const files = entriesFromForm(kind, form, isoDate(now)) as Planned[];
  const errors = files.flatMap((f) => (CHECKS[f.kind] as (e: unknown) => string[])(f.entry));
  if (errors.length) return reply(400, { error: "Some fields need a fix.", errors });

  if (!deps.store) return reply(503, { error: "Submissions are not open yet." });
  const taken = files.find((f) => f.kind === "listing" && deps.reservedIds?.includes(String(f.entry.id)));
  if (taken) return reply(409, { error: `The name ${taken.entry.id} belongs to a vawe template. Pick another title.` });

  const media = await mediaProblems(files, deps);
  if (media.length) return reply(400, { error: "A media link did not pass.", errors: media });

  try {
    const id = await deps.store(kind, files, ipHash(env.IP_HASH_KEY, clientIp(req)));
    return reply(201, { ok: true, id });
  } catch (e) {
    if (e instanceof Conflict) return reply(409, { error: `${e.message} Pick another.` });
    if (e instanceof Refused) return reply(429, { error: e.message });
    throw e;
  }
}
