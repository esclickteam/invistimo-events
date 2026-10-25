import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import WhatsappVsSmsGuide from "./WhatsappVsSmsGuide";
import { WHATSAPP_VS_SMS_FAQS } from "./guideFaqs";

const PATH = "/info/guides/whatsapp-vs-sms-rsvp";
const TITLE = "אישורי הגעה ב־WhatsApp או SMS — מה עדיף? | Invistimo";
const DESCRIPTION =
  "WhatsApp או SMS לאישורי הגעה לחתונה? הכירו את היתרונות, המגבלות, מנגנון הגיבוי האוטומטי של Invistimo ודוחות המסירה לפי מספר טלפון.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "WhatsApp או SMS לאישורי הגעה", path: PATH },
];

const faqs = WHATSAPP_VS_SMS_FAQS.map((item) => ({ q: item.q, a: item.a }));

export default function WhatsappVsSmsRsvpGuidePage() {
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
            ...articleNode({
              title: "אישורי הגעה ב־WhatsApp או SMS — מה באמת עדיף?",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(faqs),
        ])}
      />
      <WhatsappVsSmsGuide />
    </>
  );
}
