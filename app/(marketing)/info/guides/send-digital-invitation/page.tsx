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
import SendDigitalInvitationGuide from "./SendDigitalInvitationGuide";
import { SEND_INVITE_FAQS } from "./guideFaqs";

const PATH = "/info/guides/send-digital-invitation";
const TITLE = "איך שולחים הזמנה דיגיטלית לחתונה? מדריך מלא | Invistimo";
const DESCRIPTION =
  "למדו איך לשלוח הזמנה דיגיטלית לחתונה ב־WhatsApp או SMS, להכין רשימת מוזמנים, לבדוק קישורים, לעקוב אחרי אישורי הגעה ולהימנע מטעויות. מדריך מעשי עם דוגמאות.";
const H1 = "איך שולחים הזמנה דיגיטלית לחתונה? מדריך מעשי צעד אחר צעד";

const OG_SHARE = {
  url: absoluteUrl("/marketing/invites/invite-wedding-mia-alon.webp"),
  width: 1200,
  height: 1600,
  alt: "הזמנה דיגיטלית לחתונה — דוגמה ממסכי Invistimo",
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
  { name: "איך שולחים הזמנה דיגיטלית לחתונה", path: PATH },
];

export default function SendDigitalInvitationGuidePage() {
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
              "איך שולחים הזמנה דיגיטלית",
              "איך שולחים הזמנה לחתונה בוואטסאפ",
              "שליחת הזמנה דיגיטלית לחתונה",
              "הזמנה לחתונה עם קישור",
              "איך שולחים הזמנה ב־SMS",
              "הזמנה דיגיטלית עם אישור הגעה",
              "נוסח הודעה לשליחת הזמנה",
              "מתי שולחים הזמנות לחתונה",
              "איך שולחים הזמנה לכל האורחים",
              "שליחת הזמנה אישית לחתונה",
            ],
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(SEND_INVITE_FAQS),
        ])}
      />
      <SendDigitalInvitationGuide />
    </>
  );
}
