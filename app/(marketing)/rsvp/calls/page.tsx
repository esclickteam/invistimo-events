import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
  softwareNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import CallsMarketingPage from "./CallsMarketingPage";
import { CALLS_FAQS } from "./callsFaqs";
import { CALLS_META, CALLS_PATH } from "./content";

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
  { name: "אישורי הגעה בשיחות טלפון", path: CALLS_PATH },
];

export const metadata: Metadata = {
  ...pageMetadata({
    title: CALLS_META.title,
    description: CALLS_META.description,
    path: CALLS_PATH,
  }),
};

export default function RsvpCallsPage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${CALLS_PATH}#webpage`,
            url: absoluteUrl(CALLS_PATH),
            name: CALLS_META.title,
            description: CALLS_META.description,
            inLanguage: "he-IL",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#organization` },
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${CALLS_PATH}#breadcrumb`,
          },
          serviceNode({
            name: "אישורי הגעה בשיחות טלפון",
            description: CALLS_META.description,
            path: CALLS_PATH,
            serviceType: "אישורי הגעה בשיחות טלפון",
          }),
          softwareNode(
            "Invistimo — אישורי הגעה בשיחות מוקלטות עם קריינות AI, מוקד אנושי ומעקב אחרי תוצאות השיחה, לצד WhatsApp ו־SMS.",
            CALLS_PATH
          ),
          faqNode(CALLS_FAQS.map(({ q, a }) => ({ q, a }))),
        ])}
      />
      <CallsMarketingPage />
    </>
  );
}
