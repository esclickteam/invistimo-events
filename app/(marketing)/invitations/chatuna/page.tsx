import ChatunaInvitationsPage from "@/components/marketing/invitations/ChatunaInvitationsPage";
import JsonLd from "@/components/seo/JsonLd";
import { INVITATION_FAQS } from "@/components/marketing/invitations/designs";
import { addonPrice } from "@/lib/pricing/packageQuote";
import {
  breadcrumbNode,
  faqNode,
  graph,
  ORGANIZATION_ID,
  organizationNode,
  serviceNode,
  videoNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import type { Metadata } from "next";

const PATH = "/invitations/chatuna";
const TITLE = "הזמנות דיגיטליות לחתונה | עיצובים ואנימציות | Invistimo";
const DESCRIPTION =
  "הזמנות דיגיטליות לחתונה בעיצובים יוקרתיים, תבניות מוכנות ואפשרויות התאמה אישית. צפו בדוגמאות, הכירו הזמנות מונפשות ושלבו אישורי הגעה.";

const OG_INVITE = {
  url: absoluteUrl("/marketing/invites/invite-wedding-mia-alon.webp"),
  width: 1024,
  height: 1536,
  alt: "הזמנה דיגיטלית יוקרתית לחתונה — דוגמה מ־Invistimo",
} as const;

const baseMeta = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

export const metadata: Metadata = {
  ...baseMeta,
  openGraph: {
    ...baseMeta.openGraph,
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    siteName: SITE_NAME,
    locale: "he_IL",
    type: "website",
    images: [OG_INVITE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_INVITE.url],
  },
};

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "הזמנות דיגיטליות לחתונה", path: PATH },
];

const faqs = INVITATION_FAQS.map((item) => ({ q: item.q, a: item.a }));

const designMessages = addonPrice("messages", "design");
const designCalls = addonPrice("voice", "design");

export default function DigitalInvitationPage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode(breadcrumbs),
          {
            "@type": "WebPage",
            "@id": `${absoluteUrl(PATH)}#webpage`,
            url: absoluteUrl(PATH),
            name: TITLE,
            description: DESCRIPTION,
            inLanguage: "he-IL",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": ORGANIZATION_ID },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: OG_INVITE.url,
              width: OG_INVITE.width,
              height: OG_INVITE.height,
            },
          },
          serviceNode({
            name: "הזמנות דיגיטליות לחתונה",
            description: DESCRIPTION,
            path: PATH,
            serviceType: "הזמנות דיגיטליות לחתונה",
          }),
          {
            "@type": "Service",
            name: "עיצוב הזמנה בהתאמה אישית",
            description:
              "תוספת עיצוב הזמנה בהתאמה אישית לחתונה, לפי המחירון הפעיל במחשבון החבילות של Invistimo.",
            url: absoluteUrl("/pricing"),
            provider: { "@id": ORGANIZATION_ID },
            areaServed: { "@type": "Country", name: "IL" },
            offers: [
              {
                "@type": "Offer",
                name: "עיצוב הזמנה — חבילת הודעות",
                price: designMessages,
                priceCurrency: "ILS",
                url: absoluteUrl("/pricing"),
              },
              {
                "@type": "Offer",
                name: "עיצוב הזמנה — חבילות שיחות",
                price: designCalls,
                priceCurrency: "ILS",
                url: absoluteUrl("/pricing"),
              },
            ],
          },
          {
            "@type": "ImageObject",
            contentUrl: OG_INVITE.url,
            url: OG_INVITE.url,
            width: OG_INVITE.width,
            height: OG_INVITE.height,
            caption: OG_INVITE.alt,
            inLanguage: "he-IL",
          },
          videoNode({
            name: "מסע האורח מהזמנה דיגיטלית לאישור הגעה",
            description:
              "סרטון אמיתי של מסע האורח ב־Invistimo: פתיחת קישור אישי, צפייה בהזמנה דיגיטלית והמשך לאישור הגעה.",
            contentUrl: "/marketing/videos/hero-guest-journey.webm",
            posterUrl: "/marketing/videos/hero-guest-journey-poster.jpg",
            uploadDate: "2026-10-01",
            path: PATH,
          }),
          faqNode(faqs),
        ])}
      />
      <ChatunaInvitationsPage />
    </>
  );
}
