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
import GuestListGuide from "./GuestListGuide";
import { GUEST_LIST_FAQS } from "./guideFaqs";

const PATH = "/info/guides/guest-list";
const TITLE = "איך מנהלים רשימת מוזמנים לחתונה? מדריך מלא | Invistimo";
const DESCRIPTION =
  "איך מכינים רשימת מוזמנים לחתונה בלי כפילויות? מדריך לניהול זוגות ומשפחות, בדיקת מספרי טלפון, העלאת Excel, אישורי הגעה וסידורי הושבה.";

const OG_SHARE = {
  url: absoluteUrl("/images/guides/guest-list/dashboard-guests.jpg"),
  width: 2560,
  height: 1600,
  alt: "רשימת מוזמנים ב־Invistimo — ניהול רשומות, סטטוסים ומספר מוזמנים",
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
  { name: "רשימת מוזמנים לחתונה", path: PATH },
];

export default function GuestListGuidePage() {
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
              title: "איך מנהלים רשימת מוזמנים לחתונה בצורה נכונה?",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
            image: [OG_SHARE.url],
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(GUEST_LIST_FAQS),
        ])}
      />
      <GuestListGuide />
    </>
  );
}
