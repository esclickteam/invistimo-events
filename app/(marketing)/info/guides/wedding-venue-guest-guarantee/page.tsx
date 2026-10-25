import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import VenueGuaranteeGuide from "./VenueGuaranteeGuide";
import { VENUE_GUARANTEE_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-venue-guest-guarantee";
const TITLE = "כמה אורחים להתחייב לאולם? מדריך ומחשבון | Invistimo";
const DESCRIPTION =
  "כמה מנות כדאי להתחייב לאולם חתונה? מדריך להערכת כמות האורחים, התחייבות מינימלית, רזרבות, שינוי התחייבות ואישורי הגעה, כולל מחשבון.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "כמה אורחים להתחייב לאולם", path: PATH },
];

export default function WeddingVenueGuestGuaranteePage() {
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
              title: "כמה אורחים כדאי להתחייב לאולם לחתונה?",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(VENUE_GUARANTEE_FAQS),
        ])}
      />
      <VenueGuaranteeGuide />
    </>
  );
}
