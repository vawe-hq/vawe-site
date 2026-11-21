import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE, adminEnabled, csrfValid } from "../../../lib/admin-auth.mjs";
import { Conflict, Refused, approveSubmission, rejectSubmission } from "../../../lib/marketplace-store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (query: string) => new Response(null, { status: 303, headers: { location: `/admin?${query}`, "cache-control": "no-store", "x-robots-tag": "noindex" } });

type Published = { kind: string; key: string }[];

function refresh(published: Published) {
  for (const path of ["/marketplace", "/jobs", "/hire", "/sitemap.xml"]) revalidatePath(path);
  for (const { kind, key } of published) {
    if (kind === "listing") revalidatePath(`/marketplace/${key}`);
    if (kind === "job") revalidatePath(`/jobs/${key}`);
    if (kind === "creator" || kind === "designer") revalidatePath(`/creators/${key}`);
  }
}

export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!adminEnabled(token)) return new Response("The review page is off: ADMIN_TOKEN is not set.", { status: 503 });
  const form = await req.formData().catch(() => null);
  const cookie = (await cookies()).get(COOKIE)?.value;
  if (!form || !csrfValid(token, cookie, form.get("csrf"))) return new Response("Sign in again.", { status: 403, headers: { "cache-control": "no-store" } });

  const id = String(form.get("id") ?? "");
  const action = String(form.get("action") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  try {
    if (action === "approve") refresh(await approveSubmission(id, { note }));
    else if (action === "reject") await rejectSubmission(id, { note });
    else return back("error=action");
  } catch (e) {
    if (e instanceof Conflict || e instanceof Refused) return back(`error=${encodeURIComponent(e.message.slice(0, 300))}`);
    throw e;
  }
  return back(`done=${action}`);
}
