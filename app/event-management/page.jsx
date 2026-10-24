import AnswerFirst from "@/components/seo/AnswerFirst";
import EventManagementPage from "@/app/components/event/EventManagementPage";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import JsonLd from "@/components/seo/JsonLd";
import { clusterSiblings } from "@/lib/seo/clusters";
import { EVENT_TYPES, EVENT_TYPE_SECTION } from "@/lib/seo/eventTypes";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode, softwareNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";

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
  {
    q: "לאילו אירועים זה מתאים?",
    a: "חתונות, בר/בת מצווה, אירועים משפחתיים ואירועי חברה — בכל מקום שיש משימות, ספקים ותקציב לנהל לצד רשימת אורחים.",
  },
  {
    q: "איך זה קשור למחשבון החבילות?",
    a: "ניהול האירוע מופיע כתוספת במחשבון. הסכום מוצג שם לפי מה שמסמנים — בלי מחיר אחיד בעמוד הזה.",
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
      <EventManagementPage />
      <AnswerFirst path="/event-management" />
      <section dir="rtl" className="bg-[#F2F4F7] px-6 py-14 text-[#1A222D]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-[#0B0E13]">{EVENT_TYPE_SECTION.heading}</h2>
          <p className="mt-3 max-w-3xl leading-8 text-[#3D4754]">
            ניהול אירוע ב־Invistimo לא מוגבל לחתונה — אותם מסכי משימות, ספקים ותקציב רלוונטיים גם לאירועים משפחתיים ועסקיים.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TYPES.map((item) => (
              <li key={item.label} className="rounded-2xl border border-[#D5DBE3] bg-white px-4 py-4">
                <h3 className="font-black text-[#0B0E13]">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#3D4754]">{item.blurb}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section dir="rtl" className="bg-[#FFFFFF] px-6 py-14 text-[#1A222D]">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black tracking-wide text-[#0F766E]">שאלות נפוצות</p>
          <h2 className="mt-2 text-3xl font-black text-[#0B0E13]">ניהול אירוע — שאלות חשובות</h2>
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} open className="rounded-[24px] border border-[#D5DBE3] bg-white px-5 py-4">
                <summary className="cursor-pointer list-none">
                  <h3 className="text-lg font-black text-[#0B0E13]">{faq.q}</h3>
                </summary>
                <p className="mt-3 leading-8 text-[#3D4754]">{faq.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink
              href="/pricing"
              location="footer_cta:/event-management"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#0B0E13] via-[#1A222D] to-[#0B0E13] px-8 py-3 text-base font-black text-white"
            >
              לצפייה בחבילות
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/contact"
              location="footer_cta:/event-management"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D5DBE3] bg-white px-8 py-3 text-base font-black text-[#1A222D]"
            >
              יצירת קשר
            </TrackedCtaLink>
          </div>
        </div>
      </section>
      {siblings.length ? (
        <section dir="rtl" className="bg-[#F2F4F7] px-6 pb-6 text-[#1A222D]">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-black text-[#0B0E13]">באותו נושא</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {siblings.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className="inline-flex min-h-11 items-center rounded-full border border-[#D5DBE3] bg-white px-4 py-2 text-sm font-bold text-[#1A222D]"
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
