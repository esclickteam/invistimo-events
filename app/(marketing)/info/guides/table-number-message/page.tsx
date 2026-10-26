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
import TableNumberGuide from "./TableNumberGuide";
import { TABLE_NUMBER_FAQS } from "./guideFaqs";

const PATH = "/info/guides/table-number-message";
const TITLE = "הודעת מספר שולחן לאורחים: מתי שולחים ומה אם משתנה? | Invistimo";
const DESCRIPTION =
  "מתי שולחים מספר שולחן לאורחים? מדריך מלא לאישור סקיצת האולם, בדיקת ההושבה, שליחת הודעות, טיפול בשינויים וסבב עדכון נוסף.";
const H1 = "הודעת מספר שולחן לאורחים: מתי שולחים, מה בודקים ומה עושים כשיש שינויים?";

const OG_SHARE = {
  url: absoluteUrl("/images/rsvp/guides/wedding-planning/hall-tables.jpg"),
  width: 1280,
  height: 720,
  alt: "שולחנות ערוכים באולם אירועים — מדריך הודעת מספר שולחן של Invistimo",
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
  { name: "הודעת מספר שולחן לאורחים", path: PATH },
];

export default function TableNumberMessageGuidePage() {
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
              "הודעת מספר שולחן לאורחים",
              "שליחת מספר שולחן לאורחים",
              "הודעת הושבה לחתונה",
              "מתי שולחים מספרי שולחנות",
              "מספר שולחן ב־SMS",
              "הודעת שולחן בוואטסאפ",
              "שינוי מספר שולחן אחרי שליחה",
              "סקיצת הושבה לחתונה",
              "אישור סקיצה מול אולם",
            ],
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(TABLE_NUMBER_FAQS),
        ])}
      />
      <TableNumberGuide />
    </>
  );
}
