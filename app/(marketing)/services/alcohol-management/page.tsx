import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
  serviceNode,
} from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/site";
import AlcoholManagementService from "./AlcoholManagementService";
import { ALCOHOL_SERVICE_FAQS } from "./guideFaqs";

const PATH = "/services/alcohol-management";

export const metadata: Metadata = pageMetadata({
  title: "ניהול אלכוהול לאירועים | אנשי צוות ומערכת ממוחשבת | Invistimo",
  description:
    "ניהול אלכוהול לחתונות ולאירועים עם אנשי צוות ומערכת ממוחשבת: ספירת מלאי, הקצאת בקבוקים לברים ולשולחנות, תיעוד פתיחה ודוח סיום. הצעת מחיר מותאמת.",
  path: PATH,
});

export default function AlcoholManagementPage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `https://www.invistimo.com${PATH}#webpage`,
            url: `https://www.invistimo.com${PATH}`,
            name: "אתם חוגגים. אנחנו דואגים שהבר יעבוד כמו שצריך.",
            description:
              "ניהול אלכוהול מקצועי לאירועים עם צוות ייעודי, מעקב אחר בקבוקים ושליטה במה שנפתח, הוגש ונשאר.",
            inLanguage: "he-IL",
            isPartOf: { "@id": "https://www.invistimo.com/#website" },
          },
          serviceNode({
            name: "ניהול אלכוהול לאירועים",
            description:
              "שירות תפעולי עם אנשי צוות ומערכת ממוחשבת לניהול מלאי אלכוהול ביום האירוע.",
            path: PATH,
            serviceType: "ניהול אלכוהול לאירועים",
          }),
          breadcrumbNode([
            { name: "ראשי", path: "/" },
            { name: "שירותים", path: "/event-management" },
            { name: "ניהול אלכוהול", path: PATH },
          ]),
          faqNode(ALCOHOL_SERVICE_FAQS),
        ])}
      />
      <AlcoholManagementService />
    </>
  );
}
