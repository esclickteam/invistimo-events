import AnswerFirst from "@/components/seo/AnswerFirst";
import EventManagementPage from "@/app/components/event/EventManagementPage";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import JsonLd from "@/components/seo/JsonLd";
import { clusterSiblings } from "@/lib/seo/clusters";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode, softwareNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";
import Link from "next/link";

const route = findCoreRoute("/event-management");
if (!route) throw new Error("Missing SEO route /event-management");

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

const faqs = [
  {
    q: "האם ניהול האירוע מחליף את אישורי ההגעה?",
    a: "לא. אישורי ההגעה וההושבה הם מסכים נפרדים. ניהול האירוע מרכז משימות, ספקים, תקציב ולוח זמנים לצידם.",
  },
  {
    q: "האם כלול ליווי באולם?",
    a: "אפשר להשתמש במערכת עצמאית. ליווי וניהול באולם הם שירות נפרד, רק אם סוכם.",
  },
];

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "ניהול אירועים", path: "/event-management" },
];

export default function Page() {
  const siblings = clusterSiblings("/event-management");

  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode(breadcrumbs),
          softwareNode(route.description, "/event-management"),
          serviceNode({
            name: "מערכת ניהול אירועים",
            description: route.description,
            path: "/event-management",
            serviceType: "ניהול אירועים",
          }),
          faqNode(faqs),
        ])}
      />
      <AnswerFirst path="/event-management" />
      <EventManagementPage />
      {siblings.length ? (
        <section dir="rtl" className="bg-[#FBF6EE] px-6 pb-6 text-[#3F3025]">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-black text-[#35281F]">באותו נושא</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
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
          </div>
        </section>
      ) : null}
      <ServiceLinks current="/event-management" />
    </>
  );
}
