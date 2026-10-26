import JsonLd from "@/components/seo/JsonLd";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  graph,
  organizationNode,
} from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";
import EventDayChecklistGuide from "./EventDayChecklistGuide";
import { EVENT_DAY_FAQS } from "./guideFaqs";

const PATH = "/info/guides/event-day-checklist";
const TITLE = "מה בודקים לפני החתונה? צ'קליסט מלא ליום האירוע | Invistimo";
const DESCRIPTION =
  "מה צריך לסגור לפני החתונה? צ'קליסט מלא לחודש, לשבוע וליום שלפני האירוע: ספקים, תשלומים, אישורי הגעה, הושבה, לו\"ז, ציוד וטיפים מעשיים.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const breadcrumbs = [
  { name: "ראשי", path: "/" },
  { name: "מדריכים", path: "/info/guides" },
  { name: "צ'קליסט לפני יום האירוע", path: PATH },
];

export default function EventDayChecklistPage() {
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
              title: "מה בודקים לפני יום האירוע? הצ'קליסט המלא לחתונה בלי הפתעות",
              description: DESCRIPTION,
              path: PATH,
            }),
            "@type": "Article",
          },
          {
            ...breadcrumbNode(breadcrumbs),
            "@id": `${SITE_URL}${PATH}#breadcrumb`,
          },
          faqNode(EVENT_DAY_FAQS),
        ])}
      />
      <EventDayChecklistGuide />
    </>
  );
}
