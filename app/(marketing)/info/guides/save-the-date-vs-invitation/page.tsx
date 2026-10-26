import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import SaveTheDateVsInvitationGuide from "./SaveTheDateVsInvitationGuide";
import { STD_VS_INVITE_FAQS } from "./guideFaqs";

const PATH = "/info/guides/save-the-date-vs-invitation";
const TITLE = "Save the Date או הזמנה לחתונה? ההבדלים ומתי שולחים | Invistimo";
const DESCRIPTION =
  "מה ההבדל בין Save the Date להזמנה לחתונה? מתי שולחים כל אחת, מה כותבים, האם צריך את שתיהן ואיך משלבים אישורי הגעה. מדריך עם דוגמאות ולוח זמנים.";
const H1 =
  "מה ההבדל בין Save the Date להזמנה לחתונה? ומתי שולחים כל אחת?";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "Save the Date מול הזמנה", path: PATH },
];

const faqs = STD_VS_INVITE_FAQS.map((item) => ({ q: item.q, a: item.a }));

export default function SaveTheDateVsInvitationPage() {
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
          faqNode(faqs),
        ])}
      />
      <SaveTheDateVsInvitationGuide />
    </>
  );
}
