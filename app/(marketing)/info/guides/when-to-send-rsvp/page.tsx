import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import WhenToSendGuide from "./WhenToSendGuide";
import { WHEN_TO_SEND_FAQS } from "./guideFaqs";

const PATH = "/info/guides/when-to-send-rsvp";
const TITLE = "מתי שולחים אישורי הגעה לחתונה? המדריך | Invistimo";
const DESCRIPTION =
  "מתי שולחים Save the Date, הזמנה ואישורי הגעה? מדריך לתכנון נכון לפי חגים, קיץ, חורף, אורחים מחו״ל ומועד סגירת המנות מול האולם.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "מתי שולחים אישורי הגעה", path: PATH },
];

export default function WhenToSendRsvpPage() {
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
              title: "מתי שולחים אישורי הגעה לחתונה ולאירועים? המדריך לתזמון נכון",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(WHEN_TO_SEND_FAQS),
        ])}
      />
      <WhenToSendGuide />
    </>
  );
}
