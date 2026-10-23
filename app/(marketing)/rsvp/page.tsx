import AnswerFirst from "@/components/seo/AnswerFirst";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import JsonLd from "@/components/seo/JsonLd";
import RsvpMarketingPage from "./RsvpMarketingPage";
import { clusterSiblings } from "@/lib/seo/clusters";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";
import Link from "next/link";

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

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "אישורי הגעה", path: "/rsvp" },
];

export default function RsvpPage() {
  const siblings = clusterSiblings("/rsvp");

  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode(breadcrumbs),
          serviceNode({
            name: "אישורי הגעה לאירועים",
            description: route.description,
            path: "/rsvp",
            serviceType: "אישורי הגעה",
          }),
          faqNode(faqs),
        ])}
      />
      <AnswerFirst path="/rsvp" />
      <RsvpMarketingPage />
      <section dir="rtl" className="bg-[#FBF6EE] px-6 pb-6 text-[#3F3025]">
        <div className="mx-auto max-w-3xl space-y-3 leading-8">
          <h2 className="text-2xl font-black text-[#35281F]">לפי סוג האירוע</h2>
          <p>
            לחתונה יש עמוד נפרד, וגם עמוד על שליחה בוואטסאפ. שניהם מתארים את מה שהמערכת באמת שולחת, בלי להחליף את העמוד הזה.
          </p>
          {siblings.length ? (
            <ul className="flex flex-wrap gap-3 pt-2">
              {siblings.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className="inline-flex min-h-11 items-center rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      <ServiceLinks current="/rsvp" />
    </>
  );
}
