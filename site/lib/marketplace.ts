import {
  CATEGORIES, SOFTWARE, TOOLS, availabilityLabel, categoryLabel, employmentLabel, isoDate, jobValidThrough, softwareLabel, unitLabel, workplaceLabel,
} from "./marketplace-schema.mjs";
import * as store from "./marketplace-store.mjs";
import { TEMPLATES, templateFiles } from "./templates";

// The rows come from Postgres (marketplace-store.mjs); with no database every list is empty. Our own
// vawe templates join the gallery from lib/templates.ts and link to their /templates page.

export type Money = { amount: number; currency: string };
export type Creator = { handle: string; name: string; link: string; avatar?: string; bio?: string };
export type Listing = {
  id: string;
  title: string;
  summary: string;
  creator: string;
  software: string;
  version?: string;
  category: string;
  preview: string;
  poster: string;
  price: Money;
  url: string;
  tags?: string[];
  length?: number;
  resolution?: string;
  plugins?: string;
  added: string;
};
export type Pay = { min: number; max?: number; currency: string; unit: string };
export type Job = {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  workplace: string;
  city?: string;
  countries: string[];
  employment: string[];
  pay?: Pay;
  software: string[];
  description: string;
  apply: string;
  posted: string;
};
export type Designer = {
  handle: string;
  name: string;
  link?: string;
  avatar?: string;
  reel: string;
  rate?: { amount: number; currency: string; unit: string };
  software: string[];
  availability: string;
  availableFrom?: string;
  location?: string;
  bio?: string;
  updated: string;
};

export type MarketItem = {
  key: string;
  title: string;
  summary: string;
  software: string;
  category: string;
  href: string;
  poster: string;
  preview: string;
  free: boolean;
  price: string;
  badge?: "vawe" | "vawe Pro";
  by: string;
};

export { CATEGORIES, SOFTWARE, TOOLS, availabilityLabel, categoryLabel, employmentLabel, jobValidThrough, softwareLabel, unitLabel, workplaceLabel };

export const today = () => isoDate(new Date());

export const getCreators = (): Promise<Creator[]> => store.listCreators();
export const getListings = (): Promise<Listing[]> => store.listListings();
export const getDesigners = (): Promise<Designer[]> => store.listDesigners();
export const getLiveJobs = (on = today()): Promise<Job[]> => store.listLiveJobs(on);
export const getJob = (id: string, on = today()): Promise<Job | null> => store.getLiveJob(id, on);
export const getListing = (id: string): Promise<Listing | null> => store.getListing(id);
export const getCreator = (handle: string): Promise<Creator | null> => store.getCreator(handle);
export const listingsBy = (handle: string): Promise<Listing[]> => store.listingsBy(handle);
export const profileHandles = (): Promise<string[]> => store.profileHandles();
export const profileNames = (): Promise<{ handle: string; name: string }[]> => store.listProfileNames();

export type Profile = { handle: string; name: string; link?: string; avatar?: string; bio?: string; designer: Designer | null; listings: Listing[] };

export async function getProfile(handle: string): Promise<Profile | null> {
  const [creator, designer, listings] = await Promise.all([store.getCreator(handle), store.getDesigner(handle), store.listingsBy(handle)]);
  if (!creator && !designer) return null;
  const base = (creator ?? designer) as Creator | Designer;
  return { handle, name: base.name, link: base.link ?? designer?.link, avatar: base.avatar ?? designer?.avatar, bio: base.bio ?? designer?.bio, designer, listings };
}

export const money = ({ amount, currency }: Money) =>
  new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

export const priceLabel = (p: Money) => (p.amount === 0 ? "Free" : money(p));

export function payLabel(p: Pay) {
  const range = p.max && p.max !== p.min ? `${money({ amount: p.min, currency: p.currency })} to ${money({ amount: p.max, currency: p.currency })}` : money({ amount: p.min, currency: p.currency });
  return `${range} ${unitLabel(p.unit)}`;
}

export const rateLabel = (r: NonNullable<Designer["rate"]>) => `${money(r)} ${unitLabel(r.unit)}`;

export function placeLabel(j: Job) {
  if (j.workplace === "remote") return `Remote, ${j.countries.join(", ")}`;
  return `${j.city}, ${j.countries[0]}${j.workplace === "hybrid" ? " (hybrid)" : ""}`;
}

export function availabilityText(d: Designer) {
  return d.availability === "soon" && d.availableFrom ? `Available from ${d.availableFrom}` : availabilityLabel(d.availability);
}

const STORES: [RegExp, string][] = [
  [/(^|\.)polar\.sh$/, "Polar"],
  [/(^|\.)gumroad\.com$/, "Gumroad"],
  [/(^|\.)lemonsqueezy\.com$/, "Lemon Squeezy"],
];

export function storeName(url: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return STORES.find(([re]) => re.test(host))?.[1] ?? host;
}

export const applyLabel = (apply: string) => (apply.startsWith("mailto:") ? `Apply by email` : `Apply on ${new URL(apply).hostname.replace(/^www\./, "")}`);

function vaweItems(): MarketItem[] {
  return TEMPLATES.map((t) => {
    const files = templateFiles(t);
    const pro = t.tier === "pro";
    return {
      key: `vawe-${t.id}`,
      title: t.title,
      summary: t.summary,
      software: "vawe",
      category: t.category,
      href: `/templates/${t.id}`,
      poster: files.poster,
      preview: files.mp4,
      free: !pro,
      price: pro ? "vawe Pro" : "Free",
      badge: pro ? "vawe Pro" : "vawe",
      by: "vawe",
    };
  });
}

async function creatorItems(): Promise<MarketItem[]> {
  const [listings, creators] = await Promise.all([getListings(), getCreators()]);
  const names = new Map(creators.map((c) => [c.handle, c.name]));
  return listings.map((l) => ({
    key: l.id,
    title: l.title,
    summary: l.summary,
    software: l.software,
    category: l.category,
    href: `/marketplace/${l.id}`,
    poster: l.poster,
    preview: l.preview,
    free: l.price.amount === 0,
    price: priceLabel(l.price),
    by: names.get(l.creator) ?? l.creator,
  }));
}

export const marketItems = async (): Promise<MarketItem[]> => [...vaweItems(), ...(await creatorItems())];

export const MARKETPLACE_TITLE = "After Effects and Premiere Pro templates by creators | vawe";
export const MARKETPLACE_DESCRIPTION =
  "Templates made by motion designers, for After Effects, Premiere Pro, Final Cut Pro, DaVinci Resolve, Motion and vawe. Each one links to its maker’s own store.";
export const MARKETPLACE_INTRO =
  "Motion designers list their own templates here: After Effects, Premiere Pro, Final Cut Pro, DaVinci Resolve, Motion and vawe. You buy or download each one from its maker’s own store. vawe takes no cut and holds no money, so the maker keeps all of it.";

export const JOBS_TITLE = "Motion design jobs: remote, freelance and full time | vawe";
export const JOBS_DESCRIPTION = "Motion design jobs from the companies that hire. Each job says where the work happens, the pay when the company gives it, and how to apply.";
export const JOBS_INTRO =
  "Companies post motion design jobs here, free. Each job stays up for 60 days and then closes. You apply on the company’s own page or by email; vawe never sees your application.";

export const HIRE_TITLE = "Hire a motion designer | vawe";
export const HIRE_DESCRIPTION = "Motion designers who are open to work, with their reel, rate, software and when they are free. Contact each one directly.";
export const HIRE_INTRO =
  "These motion designers are open to work. Each one shows a reel, the software they use and when they are free. You contact them directly; vawe takes no fee from either side.";
