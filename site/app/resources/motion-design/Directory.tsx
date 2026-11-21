"use client";

import { useEffect, useState } from "react";
import { FacetBar, applyFacets, useFacets, type Facet } from "../../marketplace/Facets";
import { pricingId, sectionId, type Resource, type ResourceSection } from "../../../lib/motion-resources";

type Row = Resource & { sectionId: string; pricingId: string };

const has = (r: Row, key: string, id: string) => (key === "section" ? r.sectionId === id : r.pricingId === id);

const matches = (r: Row, terms: string[]) => {
  const hay = `${r.name} ${r.description} ${r.section} ${r.licence ?? ""} ${r.tags.join(" ")}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
};

// The server sends every entry as text; the filters only hide what does not match. A search and the facets live in the query string.
export function Directory({ sections, facets }: { sections: ResourceSection[]; facets: Facet[] }) {
  const { values, pick } = useFacets(facets);
  const [query, setQuery] = useState("");
  useEffect(() => setQuery(new URLSearchParams(window.location.search).get("q") ?? ""), []);

  const rows: Row[] = sections.flatMap((s) => s.items.map((r) => ({ ...r, sectionId: sectionId(r.section), pricingId: pricingId(r.pricing) })));
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searched = rows.filter((r) => matches(r, terms));
  const shown = applyFacets(searched, values, has);
  const shownSet = new Set(shown);

  const search = (value: string) => {
    setQuery(value);
    const q = new URLSearchParams(window.location.search);
    if (value) q.set("q", value);
    else q.delete("q");
    const s = q.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  };

  return (
    <>
      <div className="rd-search">
        <label htmlFor="rd-q" className="meta">Search</label>
        <input id="rd-q" type="search" value={query} onChange={(e) => search(e.target.value)} placeholder="Name, tag or licence: lottie, ofl, shader" autoComplete="off" spellCheck={false} />
      </div>
      <FacetBar facets={facets} items={searched} values={values} pick={pick} has={has} shown={shown.length} noun={["resource", "resources"]} />
      {shown.length === 0 ? (
        <p className="rd-none" role="status">
          Nothing matches.{" "}
          <button type="button" className="rd-clear" onClick={() => window.location.assign(window.location.pathname)}>Clear the filters</button>
        </p>
      ) : null}
      {sections.map((s) => {
        const items = rows.filter((r) => r.sectionId === s.id && shownSet.has(r));
        if (!items.length) return null;
        return (
          <section className="rd-sec" id={s.id} key={s.id} aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`}>{s.title}</h2>
            <ul className="rd-list">
              {items.map((r) => (
                <li key={r.url} className="rd-row">
                  <a className="rd-name" href={r.url} rel="noopener">{r.name}</a>
                  <p className="rd-desc">{r.description}</p>
                  <p className="meta rd-meta">
                    <span>{r.pricing}</span>
                    {r.licence ? <span>{r.licence}</span> : null}
                    {r.tags.length ? <span>{r.tags.join(", ")}</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
