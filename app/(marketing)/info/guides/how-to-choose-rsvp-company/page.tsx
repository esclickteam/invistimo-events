import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import ChooseRsvpCompanyGuide from "./ChooseRsvpCompanyGuide";
import { CHOOSE_RSVP_COMPANY_FAQS } from "./guideFaqs";

const PATH = "/info/guides/how-to-choose-rsvp-company";
const TITLE = "איך בוחרים חברת אישורי הגעה לחתונה? מדריך והשוואה | Invistimo";
const DESCRIPTION =
  "איך בוחרים חברת אישורי הגעה? השוואת WhatsApp, SMS, שיחות מוקלטות ומוקד אנושי, מחירים, סבבים וסידורי הושבה. מדריך מקצועי של Invistimo.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "איך בוחרים חברת אישורי הגעה", path: PATH },
];

const faqs = CHOOSE_RSVP_COMPANY_FAQS.map((item) => ({ q: item.q, a: item.a }));

export default function HowToChooseRsvpCompanyGuidePage() {
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
              title:
                "איך בוחרים חברת אישורי הגעה לחתונה? המדריך המלא להשוואת שירותים ומחירים",
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
      <ChooseRsvpCompanyGuide />
    </>
  );
}
