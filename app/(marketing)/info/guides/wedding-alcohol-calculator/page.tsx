import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import WeddingAlcoholGuide from "./WeddingAlcoholGuide";
import { ALCOHOL_GUIDE_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-alcohol-calculator";
const TITLE = "כמה אלכוהול לקנות לחתונה? מחשבון כמויות ועלויות | Invistimo";
const DESCRIPTION =
  "כמה אלכוהול צריך לחתונה? מחשבון לתכנון משקאות, השוואת רכישה עצמאית מול חבילת האולם, דמי מזיגה והחזרת בקבוקים סגורים.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "מחשבון אלכוהול לחתונה", path: PATH },
];

export default function WeddingAlcoholCalculatorPage() {
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
            dateModified: "2026-10-25",
          },
          {
            ...articleNode({
              title: "כמה אלכוהול צריך לקנות לחתונה? מחשבון כמויות ועלויות",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
            dateModified: "2026-10-25",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(ALCOHOL_GUIDE_FAQS),
        ])}
      />
      <WeddingAlcoholGuide />
    </>
  );
}
