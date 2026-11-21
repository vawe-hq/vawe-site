import { cookies } from "next/headers";
import { COOKIE, SESSION_SECONDS, checkLogin, issueSession } from "../../../lib/admin-auth.mjs";
import { RateLimiter, clientIp, ipHash } from "../../../lib/marketplace-submit";
import { dbConfigured } from "../../../lib/db.mjs";
import { logAudit } from "../../../lib/marketplace-store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = new RateLimiter(10, 15 * 60 * 1000);

const back = (to: string) => new Response(null, { status: 303, headers: { location: to, "cache-control": "no-store", "x-robots-tag": "noindex" } });

export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  const ip = clientIp(req);
  if (!limiter.allow(ip, Date.now())) return new Response("Too many attempts. Try again in 15 minutes.", { status: 429, headers: { "retry-after": "900" } });
  const given = (await req.formData().catch(() => null))?.get("token");
  const ok = checkLogin(token, given);
  if (dbConfigured()) await logAudit(ok ? "admin" : "unknown", ok ? "admin.login" : "admin.login_failed", null, null, { ip: ipHash(token, ip).slice(0, 12) }).catch(() => {});
  if (!ok || !token) return back("/admin?error=login");
  (await cookies()).set(COOKIE, issueSession(token), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/admin", maxAge: SESSION_SECONDS });
  return back("/admin");
}
