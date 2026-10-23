import AnswerFirst from "@/components/seo/AnswerFirst";
import JsonLd from "@/components/seo/JsonLd";
import { clusterSiblings } from "@/lib/seo/clusters";
import { EVENT_TYPES, EVENT_TYPE_SECTION } from "@/lib/seo/eventTypes";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";
import Link from "next/link";

const route = findCoreRoute("/seating-explained")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

const faqs = [
  {
    q: "האם ההושבה כלולה בכל חבילה?",
    a: "לא. הושבה דיגיטלית היא תוספת במחשבון החבילות.",
  },
  {
    q: "איך האורח מקבל את מספר השולחן?",
    a: "אחרי השיבוץ אפשר לשלוח הודעה אישית עם מספר השולחן. גם בתזכורת ה־SMS מופיע מספר שולחן כשיש הושבה.",
  },
  {
    q: "האם השיבוץ האוטומטי סוגר את ההושבה?",
    a: "לא. חלוקה לפי קבוצות נותנת נקודת התחלה. אחר כך מתקנים ידנית לפי משפחות והעדפות.",
  },
  {
    q: "מתי כדאי להתחיל לשבץ?",
    a: "אחרי שיש מספיק תשובות הגעה. מי שלא מגיע לא צריך לתפוס כיסא. רשומות פתוחות משאירים עד שמחליטים.",
  },
  {
    q: "האם זה רק לחתונות?",
    a: "לא. אותו כלי רלוונטי לחינה, בר מצווה, אירוע חברה או כל אירוע עם שולחנות — כשהתוספת נרכשה.",
  },
];

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "סידורי הושבה", path: "/seating-explained" },
];

export default function SeatingLayout({ children }: { children: React.ReactNode }) {
  const siblings = clusterSiblings("/seating-explained");

  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode(breadcrumbs),
          serviceNode({
            name: "סידורי הושבה",
            description: route.description,
            path: route.path,
            serviceType: "סידורי הושבה",
          }),
          faqNode(faqs),
        ])}
      />
      <AnswerFirst path="/seating-explained" />
      {children}
      <section dir="rtl" className="bg-[#FFFDF8] px-6 py-14 text-[#3F3025]">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black tracking-wide text-[#A67C3D]">שאלות נפוצות</p>
          <h2 className="mt-2 text-3xl font-black text-[#35281F]">סידורי הושבה — מה חשוב לדעת</h2>
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} open className="rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-4">
                <summary className="cursor-pointer list-none">
                  <h3 className="text-lg font-black text-[#35281F]">{faq.q}</h3>
                </summary>
                <p className="mt-3 leading-8 text-[#5C4A3A]">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section dir="rtl" className="bg-[#FBF6EE] px-6 py-12 text-[#3F3025]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-[#35281F]">{EVENT_TYPE_SECTION.heading}</h2>
          <p className="mt-3 max-w-3xl leading-8 text-[#5C4A3A]">
            סידורי הושבה רלוונטיים בכל אירוע עם שולחנות — חתונה, חינה, בר מצווה או אירוע חברה — כשהתוספת נרכשה במחשבון.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TYPES.map((item) => (
              <li key={item.label} className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-4">
                <h3 className="font-black text-[#35281F]">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{item.blurb}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      {siblings.length ? (
        <section dir="rtl" className="bg-[#FBF6EE] px-6 pb-10 text-[#3F3025]">
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
    </>
  );
}
