import AnswerFirst from "@/components/seo/AnswerFirst";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode, softwareNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/pricing")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

const faqs = [
  {
    q: "למה אין מחיר אחד לכל חתונה?",
    a: "הסכום תלוי במספר הרשומות, בסוג החבילה ובתוספות. המחשבון מציג את הסכום אחרי שבוחרים אותם.",
  },
  {
    q: "מה כלול בחבילת ההודעות?",
    a: "הזמנה דיגיטלית, שני סבבי וואטסאפ לאישור הגעה, תזכורת SMS עם מספר שולחן, והודעת תודה ב־SMS.",
  },
  {
    q: "האם שיחות כלולות בחבילת ההודעות?",
    a: "לא. שיחות מוקלטות, אנושיות או משולבות הן חבילות נפרדות שכוללות גם את בסיס ההודעות.",
  },
];

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "חבילות ומחירים", path: "/pricing" },
];

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode(breadcrumbs),
          serviceNode({
            name: "חבילות אישורי הגעה",
            description: route.description,
            path: route.path,
            serviceType: "אישורי הגעה",
          }),
          softwareNode(route.description, "/pricing"),
          faqNode(faqs),
        ])}
      />
      <AnswerFirst path="/pricing" />
      {children}
    </>
  );
}
