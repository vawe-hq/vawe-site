import { cookies } from "next/headers";
import { COOKIE, adminEnabled, csrfFor, sessionValid } from "../../lib/admin-auth.mjs";
import { dbConfigured } from "../../lib/db.mjs";
import { countSubmissions, listSubmissions } from "../../lib/marketplace-store.mjs";
import "./admin.css";

export const dynamic = "force-dynamic";

type Search = { searchParams: Promise<{ done?: string; error?: string }> };
type Planned = { kind: string; entry: Record<string, unknown> };
type Submission = { id: string; kind: string; payload: Planned[]; created_at: string };

const safeLink = (v: unknown) => (typeof v === "string" && /^(https:\/\/|mailto:)/.test(v) ? v : null);

function show(v: unknown) {
  if (Array.isArray(v)) return v.join(", ");
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function Entry({ p }: { p: Planned }) {
  const poster = safeLink(p.entry.poster);
  return (
    <section className="ad-entry">
      <h3 className="ad-kind">{p.kind}</h3>
      {poster ? <img className="ad-poster" src={poster} alt="" referrerPolicy="no-referrer" loading="lazy" width={320} height={180} /> : null}
      <dl className="ad-fields">
        {Object.entries(p.entry).map(([k, v]) => {
          const href = safeLink(v);
          return (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{href ? <a href={href} rel="noopener noreferrer" target="_blank">{href}</a> : show(v)}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function Card({ s, csrf }: { s: Submission; csrf: string }) {
  return (
    <li className="ad-card panel">
      <header className="ad-head">
        <h2>{s.kind}</h2>
        <span className="meta">{s.created_at.slice(0, 16).replace("T", " ")} UTC · {s.id}</span>
      </header>
      {s.payload.map((p) => (
        <Entry key={`${p.kind}-${String(p.entry.id ?? p.entry.handle)}`} p={p} />
      ))}
      <form className="ad-actions" method="post" action="/admin/review">
        <input type="hidden" name="id" value={s.id} />
        <input type="hidden" name="csrf" value={csrf} />
        <label>
          Note (kept with the decision)
          <input name="note" type="text" maxLength={500} />
        </label>
        <button className="btn btn-primary" name="action" value="approve" type="submit">Approve</button>
        <button className="btn btn-ghost" name="action" value="reject" type="submit">Reject</button>
      </form>
    </li>
  );
}

function Login({ failed }: { failed: boolean }) {
  return (
    <main className="wrap ad-wrap" id="content">
      <h1>Review</h1>
      <form className="ad-login" method="post" action="/admin/login">
        <label>
          Admin token
          <input name="token" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn btn-primary" type="submit">Sign in</button>
        {failed ? <p className="ad-error" role="alert">That token did not work.</p> : null}
      </form>
    </main>
  );
}

function Note({ children }: { children: string }) {
  return (
    <main className="wrap ad-wrap" id="content">
      <h1>Review</h1>
      <p>{children}</p>
    </main>
  );
}

export default async function Admin({ searchParams }: Search) {
  const token = process.env.ADMIN_TOKEN;
  const { done, error } = await searchParams;
  if (!adminEnabled(token)) return <Note>The review page is off. Set ADMIN_TOKEN (16 characters or more) to turn it on.</Note>;
  const cookie = (await cookies()).get(COOKIE)?.value;
  if (!sessionValid(token, cookie)) return <Login failed={error === "login"} />;
  if (!dbConfigured()) return <Note>DATABASE_URL is not set, so there is nothing to review.</Note>;

  const [pending, counts] = await Promise.all([listSubmissions("pending") as Promise<Submission[]>, countSubmissions() as Promise<Record<string, number>>]);
  const csrf = csrfFor(token, cookie);
  return (
    <main className="wrap ad-wrap" id="content">
      <h1>Review</h1>
      <p className="meta">
        {pending.length} pending · {counts.approved ?? 0} approved · {counts.rejected ?? 0} rejected
      </p>
      {done === "approve" || done === "reject" ? <p className="ad-ok" role="status">Submission {done === "approve" ? "approved and published" : "rejected"}.</p> : null}
      {error && error !== "login" ? <p className="ad-error" role="alert">{error}</p> : null}
      {pending.length ? (
        <ul className="ad-list">
          {pending.map((s) => (
            <Card key={s.id} s={s} csrf={csrf} />
          ))}
        </ul>
      ) : (
        <p>Nothing waits for review.</p>
      )}
    </main>
  );
}
