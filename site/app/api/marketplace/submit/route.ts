import { lookup } from "node:dns/promises";
import { RateLimiter, handleSubmit } from "../../../../lib/marketplace-submit";
import { dbConfigured } from "../../../../lib/db.mjs";
import { createSubmission } from "../../../../lib/marketplace-store.mjs";
import { TEMPLATES } from "../../../../lib/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = new RateLimiter(5, 60 * 60 * 1000);
const resolve = async (host: string) => (await lookup(host, { all: true })).map((a) => a.address);

export async function POST(req: Request) {
  return handleSubmit(
    req,
    { IP_HASH_KEY: process.env.ADMIN_TOKEN },
    { fetch, lookup: resolve, limiter, store: dbConfigured() ? createSubmission : null, reservedIds: TEMPLATES.map((t) => t.id) },
  );
}
