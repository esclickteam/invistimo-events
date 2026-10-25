import JsonLd from "@/components/seo/JsonLd";
import { clusterSiblings } from "@/lib/seo/clusters";
import { EVENT_TYPES, EVENT_TYPE_SECTION } from "@/lib/seo/eventTypes";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import Link from "next/link";
import { SEATING_FAQS } from "./seatingFaqs";
import { SEATING_META, SEATING_PATH, UPDATED_AT } from "./content";

export const metadata = {
  ...pageMetadata({
    title: SEATING_META.title,
    description: SEATING_META.description,
    path: SEATING_PATH,
  }),
  openGraph: {
    title: SEATING_META.title,
    description: SEATING_META.description,
    url: absoluteUrl(SEATING_PATH),
    siteName: "Invistimo",
    locale: "he_IL",
    type: "website",
  },
};

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "סידורי הושבה", path: SEATING_PATH },
];

const faqPairs = SEATING_FAQS.map((faq) => ({ q: faq.q, a: faq.a }));

export default function SeatingLayout({ children }: { children: React.ReactNode }) {
  const siblings = clusterSiblings(SEATING_PATH);

  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${SEATING_PATH}#webpage`,
            url: absoluteUrl(SEATING_PATH),
            name: SEATING_META.title,
            description: SEATING_META.description,
            inLanguage: "he-IL",
            dateModified: UPDATED_AT,
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#organization` },
          },
          breadcrumbNode(breadcrumbs),
          serviceNode({
            name: "סידורי הושבה דיגיטליים ו־LIVE",
            description: SEATING_META.description,
            path: SEATING_PATH,
            serviceType: "סידורי הושבה",
          }),
          faqNode(faqPairs),
        ])}
      />
      {children}
      <section dir="rtl" className="bg-[#FBF6EE] px-6 py-12 text-[#3F3025]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-[#35281F]">{EVENT_TYPE_SECTION.heading}</h2>
          <p className="mt-3 max-w-3xl leading-8 text-[#5C4A3A]">
            סידורי הושבה רלוונטיים בכל אירוע עם שולחנות — חתונה, חינה, בר מצווה או אירוע חברה —
            כשהתוספת וההרשאות המתאימות נרכשו.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TYPES.map((item) => (
              <li key={item.label} className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-4">
                <h3 className="font-black text-[#35281F]">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{item.blurb}</p>
                {item.label === "חינה" ? (
                  <Link
                    href="/rsvp/hina"
                    className="mt-3 inline-flex text-sm font-bold text-[#8A672E] underline-offset-2 hover:underline"
                  >
                    לעמוד אישורי הגעה והושבה לחינה
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
      {siblings.length ? (
        <section dir="rtl" className="bg-[#FFFDF8] px-6 pb-12 text-[#3F3025]">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-black text-[#35281F]">באותו נושא</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {siblings.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className="inline-flex min-h-11 items-center rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
