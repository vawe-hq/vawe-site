import data from "./motion-resources.json";

// The list behind /resources/motion-design, synced from vawe-hq/awesome-motion-design by
// scripts/site/motion-resources.mjs. The committed JSON is the fallback when the build is offline.

export type Resource = { name: string; url: string; section: string; description: string; pricing: string; licence: string | null; tags: string[] };
export type ResourceSection = { id: string; title: string; items: Resource[] };

export const RESOURCES_SOURCE = data.source;
export const RESOURCES_CHECKED = data.checked as string | null;
export const RESOURCE_LIST = data.resources as Resource[];

export const PRICING_OPTIONS = [
  { id: "free", label: "Free" },
  { id: "open-source", label: "Open source" },
  { id: "freemium", label: "Freemium" },
  { id: "paid", label: "Paid" },
];

export const pricingId = (label: string) => label.toLowerCase().replace(/\s+/g, "-");
export const sectionId = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function resourceSections(list: Resource[] = RESOURCE_LIST): ResourceSection[] {
  const sections = new Map<string, ResourceSection>();
  for (const r of list) {
    const id = sectionId(r.section);
    if (!sections.has(id)) sections.set(id, { id, title: r.section, items: [] });
    sections.get(id)!.items.push(r);
  }
  return [...sections.values()];
}

export const RESOURCES_TITLE = `${RESOURCE_LIST.length} motion design tools and resources | vawe`;
export const RESOURCES_DESCRIPTION = `A curated directory of ${RESOURCE_LIST.length} motion design tools, libraries, plugins, courses and references in ${resourceSections().length} sections. Search it, or filter by section and price.`;
export const RESOURCES_INTRO =
  "Tools, libraries, plugins, stock, type, sound, courses and communities that motion designers use, each with one line on what it is, what it costs and its licence. It is an open list: anyone can fix or add an entry on GitHub.";
