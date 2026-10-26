import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import WeddingPlanningGuide from "./WeddingPlanningGuide";
import { WEDDING_PLANNING_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-planning";
const TITLE = "איך מתכננים חתונה? המדריך המלא לתכנון חתונה בישראל | Invistimo";
const DESCRIPTION =
  "מתכננים חתונה? מדריך מקיף לבניית תקציב, בחירת אולם, רשימת מוזמנים, סגירת ספקים, אישורי הגעה, הושבה ולוח זמנים עד יום החתונה.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "תכנון חתונה", path: PATH },
];

export default function WeddingPlanningPage() {
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
              title: "איך מתכננים חתונה? המדריך המלא מהאירוסין ועד החופה",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(WEDDING_PLANNING_FAQS),
        ])}
      />
      <WeddingPlanningGuide />
    </>
  );
}
