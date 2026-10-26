import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import EventManagementVsProductionGuide from "./EventManagementVsProductionGuide";
import { EVENT_MGMT_VS_PRODUCTION_FAQS } from "./guideFaqs";

const PATH = "/info/guides/event-management-vs-production";
const TITLE =
  "ניהול אירוע או הפקת אירוע? ההבדלים ומה צריך | Invistimo";
const DESCRIPTION =
  "מה ההבדל בין מנהל אירוע למפיק אירועים? השוואת תפקידים, אחריות, מחירים ומנהל מטעם האולם, עם שאלון שיעזור לכם לבחור מה מתאים לחתונה.";
const H1 =
  "ניהול אירוע או הפקת אירוע? ההבדלים, המחירים ואיך בוחרים מה באמת צריך";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "ניהול אירוע או הפקת אירוע", path: PATH },
];

export default function EventManagementVsProductionPage() {
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
              title: H1,
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(EVENT_MGMT_VS_PRODUCTION_FAQS),
        ])}
      />
      <EventManagementVsProductionGuide />
    </>
  );
}
