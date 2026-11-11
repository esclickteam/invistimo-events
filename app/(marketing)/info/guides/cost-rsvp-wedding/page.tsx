import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import CostRsvpGuide from "./CostRsvpGuide";
import { COST_RSVP_FAQS } from "./guideFaqs";

const PATH = "/info/guides/cost-rsvp-wedding";
const TITLE = "כמה עולה אישורי הגעה? מחיר לחתונה לפי רשומות | Invistimo";
const DESCRIPTION =
  "אישורי הגעה מחיר: כמה עולה לחתונה לפי 200, 350 ו־500 רשומות, בלי סכום אחד לכל אירוע. מה זו רשומה, מה לא נגרע מהמכסה, ומה מחושב בנפרד.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "בלוג", path: "/blog" },
  { name: "כמה עולה אישורי הגעה לחתונה", path: PATH },
];

export default function CostRsvpWeddingPage() {
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
              title: "כמה עולה אישורי הגעה לחתונה, ואיך מחשבים את המחיר?",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(COST_RSVP_FAQS),
        ])}
      />
      <CostRsvpGuide />
    </>
  );
}
