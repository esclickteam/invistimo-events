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
import ReceptionSeatingGuide from "./ReceptionSeatingGuide";
import { SEATING_CARDS_VS_QR_FAQS } from "./guideFaqs";

const PATH = "/info/guides/seating-cards-vs-qr";
const TITLE =
  "פתקיות הושבה או QR דיגיטלי? המדריך לקבלת פנים והושבת אורחים | Invistimo";
const DESCRIPTION =
  "פתקיות הושבה לחתונה מול הושבה דיגיטלית עם צוות ומול QR אישי: איך אורחים יודעים איפה לשבת, איך מונעים תורים בכניסה, ומה Invistimo באמת מציעה — בלי חלוקת פתקיות.";
const H1 =
  "פתקיות הושבה או QR דיגיטלי? המדריך המלא לקבלת פנים והושבת אורחים באירוע";

const OG_SHARE = {
  url: absoluteUrl("/images/rsvp/guides/wedding-planning/hero-reception.jpg"),
  width: 1280,
  height: 720,
  alt: "קבלת פנים באולם אירועים — מדריך הושבה ו־QR של Invistimo",
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
  { name: "פתקיות הושבה או QR דיגיטלי", path: PATH },
];

export default function SeatingCardsVsQrGuidePage() {
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
            image: [OG_SHARE.url],
            keywords: [
              "פתקיות הושבה לחתונה",
              "פתקיות הושבה או ברקוד",
              "QR לחתונה",
              "ברקוד להושבה",
              "סידורי הושבה דיגיטליים",
              "איך אורחים יודעים איפה לשבת",
              "קבלת פנים לחתונה",
              "צוות הושבה",
              "מערכת הושבה לחתונה",
              "סריקת QR בכניסה לאירוע",
            ],
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          // FAQPage markup kept for machine readers / AEO consistency with other guides.
          // Google no longer shows FAQ rich results (as of May 2026) — no rich-result guarantee.
          faqNode(SEATING_CARDS_VS_QR_FAQS),
        ])}
      />
      <ReceptionSeatingGuide />
    </>
  );
}
