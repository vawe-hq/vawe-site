import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { Next, PageTop, Toc } from "../../components/Xp";
import { pageMetadata } from "../../components/seo";
import { jsonLdScript, breadcrumbSchema } from "../../../lib/schema";
import { SITE_URL } from "../../../lib/site";
import { PRICING_OPTIONS, RESOURCES_CHECKED, RESOURCES_DESCRIPTION, RESOURCES_INTRO, RESOURCES_SOURCE, RESOURCES_TITLE, RESOURCE_LIST, resourceSections } from "../../../lib/motion-resources";
import { Directory } from "./Directory";
import "../../components/study.css";
import "../../video-components/moves.css";
import "../../templates/templates.css";
import "../../marketplace/marketplace.css";
import "./directory.css";

const PATH = "/resources/motion-design";

export const metadata = pageMetadata({ title: RESOURCES_TITLE, description: RESOURCES_DESCRIPTION, path: PATH });

const itemList = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Motion design tools and resources",
  url: `${SITE_URL}${PATH}`,
  description: RESOURCES_DESCRIPTION,
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: RESOURCE_LIST.length,
    itemListElement: RESOURCE_LIST.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.name, url: r.url, description: r.description })),
  },
};

export default function MotionDesignResources() {
  const sections = resourceSections();
  const facets = [
    { key: "section", label: "Section", options: sections.map((s) => ({ id: s.id, label: s.title })) },
    { key: "pricing", label: "Price", options: PRICING_OPTIONS },
  ];
  return (
    <div className="shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(itemList)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "Resources", url: "/resources" }, { name: "Motion design", url: PATH }]))}
      />
      <Header active="resources" />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop parent={{ href: "/resources", label: "Resources" }} current="Motion design" />
            <h1>Motion design resources.</h1>
            <p>{RESOURCES_INTRO}</p>
            <p className="bnote">
              {RESOURCE_LIST.length} entries in {sections.length} sections{RESOURCES_CHECKED ? `, links checked ${RESOURCES_CHECKED}` : ""}. The list lives in <a href={RESOURCES_SOURCE}>vawe-hq/awesome-motion-design</a>.
            </p>
            <Toc items={sections.map((s) => ({ href: `#${s.id}`, label: s.title }))} label="Sections" />
          </section>
          <Directory sections={sections} facets={facets} />
          <Next
            title="Know one we missed?"
            lead="Send it as a pull request on the open list, with one line on what it is and what it costs."
            primary={{ href: RESOURCES_SOURCE, label: "Add a resource" }}
            secondary={{ href: "/resources", label: "Everything vawe publishes" }}
            related={[
              { href: "/video-components", label: "Video components for vawe films" },
              { href: "/marketplace", label: "Templates by motion designers" },
              { href: "/inspiration", label: "Motion design inspiration" },
            ]}
          />
        </main>
      </div>
      <Footer active="/resources" />
    </div>
  );
}
