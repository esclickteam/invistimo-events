import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import WeddingVendorsGuide from "./WeddingVendorsGuide";
import { VENDOR_CONTRACT_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-vendors-contracts";
const TITLE = "איך בוחרים ספקים לחתונה? חוזים, מקדמות וביטולים | Invistimo";
const DESCRIPTION =
  "מדריך לבחירת ספקים לחתונה: איך משווים הצעות מחיר, מה לבדוק בחוזה, מה ההבדל בין מקדמה לדמי שריון, תנאי ביטול והחזר כספי.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "ספקים וחוזים", path: PATH },
];

export default function WeddingVendorsContractsPage() {
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
              title: "איך בוחרים ספקים לחתונה ומה חייבים לבדוק לפני שסוגרים?",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(VENDOR_CONTRACT_FAQS),
        ])}
      />
      <WeddingVendorsGuide />
    </>
  );
}
