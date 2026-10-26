import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import SeatingPlanGuide from "./SeatingPlanGuide";
import { SEATING_PLAN_FAQS } from "./guideFaqs";

const PATH = "/info/guides/seating-plan";
const TITLE = "איך מכינים סידורי הושבה לחתונה? מדריך צעד אחר צעד | Invistimo";
const DESCRIPTION =
  "איך מכינים סידורי הושבה לחתונה? מדריך מעשי להכנת רשימת מוזמנים, חלוקה לשולחנות, עבודה עם סקיצת האולם, רזרבות, בדיקות ודוגמאות להושבה של 300 אורחים.";
const H1 = "איך מכינים סידורי הושבה לחתונה? מדריך מעשי צעד אחר צעד";

const OG_SHARE = {
  url: absoluteUrl("/images/rsvp/guides/wedding-planning/hall-tables.jpg"),
  width: 1280,
  height: 720,
  alt: "שולחנות חתונה ערוכים באולם — מדריך מעשי להכנת סידורי הושבה",
} as const;

export const metadata: Metadata = {
  ...pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
  }),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    siteName: "Invistimo",
    locale: "he_IL",
    type: "article",
    images: [OG_SHARE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_SHARE.url],
  },
};

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "איך מכינים סידורי הושבה", path: PATH },
];

export default function SeatingPlanGuidePage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}${PATH}#webpage`,
            url: absoluteUrl(PATH),
            name: TITLE,
            description: DESCRIPTION,
            inLanguage: "he-IL",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#organization` },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: OG_SHARE.url,
            },
          },
          {
            ...articleNode({
              title: H1,
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(SEATING_PLAN_FAQS),
        ])}
      />
      <SeatingPlanGuide />
    </>
  );
}
