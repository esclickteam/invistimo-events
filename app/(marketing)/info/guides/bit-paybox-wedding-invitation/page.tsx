import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import BitPayboxGuide from "./BitPayboxGuide";
import { BIT_PAYBOX_FAQS } from "./guideFaqs";

const PATH = "/info/guides/bit-paybox-wedding-invitation";
const TITLE = "איך מוסיפים bit ו־PayBox להזמנה דיגיטלית לחתונה? | Invistimo";
const DESCRIPTION =
  "מדריך מעשי להוספת bit ו־PayBox להזמנה דיגיטלית לחתונה: הגדרת מספר טלפון וקישור, בדיקת ההזמנה, חוויית האורחים, אבטחה ופתרון תקלות.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "bit ו־PayBox בהזמנה", path: PATH },
];

const faqs = BIT_PAYBOX_FAQS.map((item) => ({ q: item.q, a: item.a }));

export default function BitPayboxWeddingInvitationGuidePage() {
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
              title: "איך מוסיפים bit ו־PayBox להזמנה דיגיטלית לחתונה?",
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
      <BitPayboxGuide />
    </>
  );
}
