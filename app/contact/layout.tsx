import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  ORGANIZATION_ID,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, findCoreRoute, pageMetadata, SITE_URL } from "@/lib/seo/site";
import { CONTACT_BREADCRUMBS, CONTACT_EMAIL, CONTACT_FAQS } from "./contactContent";

const route = findCoreRoute("/contact")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

function contactPageNode() {
  return {
    "@type": "ContactPage",
    "@id": `${absoluteUrl("/contact")}#webpage`,
    url: absoluteUrl("/contact"),
    name: route.title,
    description: route.description,
    inLanguage: "he-IL",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": ORGANIZATION_ID },
    mainEntity: { "@id": ORGANIZATION_ID },
  };
}

function organizationWithHours() {
  const org = organizationNode();
  return {
    ...org,
    email: CONTACT_EMAIL,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Friday",
        opens: "09:00",
        closes: "12:00",
      },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT_EMAIL,
        telephone: "+972555039072",
        availableLanguage: ["Hebrew", "he"],
        areaServed: "IL",
        hoursAvailable: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
            opens: "09:00",
            closes: "18:00",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Friday",
            opens: "09:00",
            closes: "12:00",
          },
        ],
      },
    ],
  };
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  const data = graph([
    organizationWithHours(),
    breadcrumbNode([...CONTACT_BREADCRUMBS]),
    contactPageNode(),
    faqNode(CONTACT_FAQS),
  ]);

  return (
    <>
      <JsonLd data={data} />
      {children}
    </>
  );
}
