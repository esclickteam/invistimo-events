import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
  softwareNode,
  videoNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import WhatsappRsvpMarketingPage from "./WhatsappRsvpMarketingPage";
import { WHATSAPP_RSVP_FAQS } from "./whatsappFaqs";

const PATH = "/rsvp/whatsapp";
const TITLE = "אישורי הגעה בוואטסאפ לאירועים | Invistimo";
const DESCRIPTION =
  "אישורי הגעה ב־WhatsApp עם קישור אישי לאורחים, סבבי הודעות ומעקב תשובות במקום אחד. גלו איך Invistimo עוזרת לנהל את רשימת המוזמנים.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
  { name: "אישורי הגעה ב־WhatsApp", path: PATH },
];

export default function WhatsappRsvpPage() {
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
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          serviceNode({
            name: "אישורי הגעה ב־WhatsApp",
            description: DESCRIPTION,
            path: PATH,
            serviceType: "אישורי הגעה בוואטסאפ",
          }),
          softwareNode(
            "Invistimo — אישורי הגעה ב־WhatsApp עם קישור אישי, שני סבבים בחבילת ההודעות ומעקב תשובות במערכת.",
            PATH
          ),
          videoNode({
            name: "מסע האורח — מאישור WhatsApp עד לרשימת המוזמנים",
            description:
              "הדגמה מתוך Invistimo: הודעת WhatsApp, קישור אישי להזמנה, אישור הגעה ומעקב תשובות בדשבורד.",
            contentUrl: "/videos/rsvp-steps-wa.mp4",
            posterUrl: "/images/rsvp/rsvp-steps-wa-poster.jpg",
            uploadDate: "2026-10-25",
            path: PATH,
          }),
          faqNode(WHATSAPP_RSVP_FAQS),
        ])}
      />
      <WhatsappRsvpMarketingPage />
    </>
  );
}
