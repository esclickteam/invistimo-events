import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import SaveTheDateMarketingPage from "./SaveTheDateMarketingPage";
import { SAVE_THE_DATE_FAQS } from "./guideFaqs";

const PATH = "/rsvp/save-the-date";
const TITLE = "Save the Date לחתונה | מתי ולמה שולחים? | Invistimo";
const DESCRIPTION =
  "מתי שולחים Save the Date לחתונה, למה לא להסתפק בסטורי ואיך שולחים הודעה אישית ב־WhatsApp? מדריך מלא עם דוגמאות, תמונות וטיפים לתכנון.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
  { name: "Save the Date", path: PATH },
];

const faqs = SAVE_THE_DATE_FAQS.map((item) => ({ q: item.q, a: item.a }));

export default function SaveTheDatePage() {
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
          serviceNode({
            name: "Save the Date לחתונה",
            description: DESCRIPTION,
            path: PATH,
            serviceType: "Save the Date",
          }),
          {
            ...articleNode({
              title: "Save the Date לחתונה — כי יש תאריכים שפשוט חייבים לשמור",
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
      <SaveTheDateMarketingPage />
    </>
  );
}
