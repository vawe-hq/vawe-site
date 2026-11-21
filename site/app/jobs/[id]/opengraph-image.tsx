import { OG_SIZE, staticOgImage } from "../../components/ogCard";
import { getJob, placeLabel } from "../../../lib/marketplace";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const j = await getJob(id);
  return staticOgImage({ tag: j ? `job · ${j.company}` : "jobs", title: j?.title ?? "Motion design jobs", description: j ? placeLabel(j) : "", path: `/jobs/${id}` });
}
