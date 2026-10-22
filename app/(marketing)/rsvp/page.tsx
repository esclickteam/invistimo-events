import ServiceLinks from "@/components/marketing/ServiceLinks";
import JsonLd from "@/components/seo/JsonLd";
import RsvpMarketingPage from "./RsvpMarketingPage";
import { faqNode, graph, organizationNode, serviceNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/rsvp")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

const faqs = [
  {
    q: "האם האורח צריך להירשם?",
    a: "לא. הוא פותח קישור אישי ומאשר הגעה, מספר מגיעים והערה.",
  },
  {
    q: "מה נשלח בחבילת ההודעות?",
    a: "הזמנה דיגיטלית, שני סבבי וואטסאפ לאישור הגעה, תזכורת SMS עם מספר שולחן, והודעת תודה ב־SMS.",
  },
];

export default function RsvpPage() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          serviceNode({
            name: "אישורי הגעה לאירועים",
            description: route.description,
            path: "/rsvp",
            serviceType: "אישורי הגעה",
          }),
          faqNode(faqs),
        ])}
      />
      <RsvpMarketingPage />
      <section dir="rtl" className="bg-[#FBF6EE] px-6 pb-6 text-[#3F3025]">
        <div className="mx-auto max-w-3xl space-y-3 leading-8">
          <h2 className="text-2xl font-black text-[#35281F]">לפי סוג האירוע</h2>
          <p>
            לחתונה יש עמוד נפרד, וגם עמוד על שליחה בוואטסאפ. שניהם מתארים את מה שהמערכת באמת שולחת, בלי להחליף את העמוד הזה.
          </p>
        </div>
      </section>
      <ServiceLinks current="/rsvp" />
    </>
  );
}
