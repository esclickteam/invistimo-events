import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import WeddingSeatingGuide from "./WeddingSeatingGuide";
import { WEDDING_SEATING_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-seating-arrangements";
const TITLE = "סידורי הושבה לחתונה: שולחנות, מאשרים ורזרבות | Invistimo";
const DESCRIPTION =
  "איך מתכננים סידורי הושבה לחתונה? האם למלא שולחנות, איך משבצים את כל מאשרי ההגעה ומה עושים עם רזרבות וביטולים? מדריך מקצועי ומחשבון.";
const H1 =
  "סידורי הושבה לחתונה: המדריך המלא לחלוקת שולחנות, מאשרי הגעה ורזרבות";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "סידורי הושבה לחתונה", path: PATH },
];

export default function WeddingSeatingArrangementsPage() {
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
          faqNode(WEDDING_SEATING_FAQS),
        ])}
      />
      <WeddingSeatingGuide />
    </>
  );
}
