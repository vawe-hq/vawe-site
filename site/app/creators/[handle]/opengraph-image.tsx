import { OG_SIZE, staticOgImage } from "../../components/ogCard";
import { getProfile } from "../../../lib/marketplace";

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await getProfile(handle);
  const what = p ? [p.listings.length ? `${p.listings.length} template${p.listings.length === 1 ? "" : "s"}` : "", p.designer ? "open to work" : ""].filter(Boolean).join(", ") : "";
  return staticOgImage({ tag: "motion designer", title: p?.name ?? "Motion designer", description: what ? `@${handle} · ${what}` : `@${handle}`, path: `/creators/${handle}` });
}
