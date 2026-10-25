import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import GuestsNoReplyGuide from "./GuestsNoReplyGuide";
import { GUESTS_NO_REPLY_FAQS } from "./guideFaqs";

const PATH = "/info/guides/guests-who-dont-reply";
const TITLE = "אורחים שלא עונים לאישורי הגעה — מה עושים? | Invistimo";
const DESCRIPTION =
  "מה עושים כשאורחים לא עונים לאישורי הגעה? איך מתבצע המעקב, מתי כדאי לשלב שיחות וכמה סבבים מומלץ לתכנן בלי להלחיץ את האורחים.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "אורחים שלא עונים לאישורי הגעה", path: PATH },
];

export default function GuestsWhoDontReplyPage() {
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
              title: "אורחים שלא עונים לאישורי הגעה — מה עושים?",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(GUESTS_NO_REPLY_FAQS),
        ])}
      />
      <GuestsNoReplyGuide />
    </>
  );
}
