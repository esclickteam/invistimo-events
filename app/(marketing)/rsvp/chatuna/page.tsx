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
import WeddingRsvpMarketingPage from "./WeddingRsvpMarketingPage";
import { WEDDING_RSVP_FAQS } from "./weddingFaqs";

const PATH = "/rsvp/chatuna";

const TITLE = "אישורי הגעה לחתונה ב־WhatsApp | Invistimo";
const DESCRIPTION =
  "מתחתנים? נהלו אישורי הגעה לחתונה עם הודעות WhatsApp, קישור אישי לכל אורח, מעקב תשובות ואפשרות לשיחות וסידורי הושבה. הכירו את Invistimo.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
  { name: "אישורי הגעה לחתונה", path: PATH },
];

export default function WeddingRsvpPage() {
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
              url: absoluteUrl("/marketing/invites/invite-wedding-mia-alon.webp"),
            },
            breadcrumb: { "@id": `${SITE_URL}${PATH}#breadcrumb` },
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          serviceNode({
            name: "אישורי הגעה לחתונה",
            description: DESCRIPTION,
            path: PATH,
            serviceType: "אישורי הגעה לחתונה",
          }),
          softwareNode(
            "Invistimo — מערכת לאישורי הגעה לחתונה: קישור אישי לכל אורח, סבבי WhatsApp, מעקב תשובות, אפשרות לשיחות וסידורי הושבה.",
            PATH
          ),
          faqNode(WEDDING_RSVP_FAQS),
        ])}
      />
      <WeddingRsvpMarketingPage />
    </>
  );
}
