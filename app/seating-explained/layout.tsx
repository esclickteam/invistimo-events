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
    q: "איך מתחילים להכין סידורי הושבה?",
    a: "מעלים סקיצת אולם, ממקמים שולחנות, ואז משבצים אורחים ידנית או לפי קבוצות. עדיף אחרי שיש מספיק אישורי הגעה כדי לא לתפוס כיסאות למי שלא מגיע.",
  },
  {
    q: "מתי כדאי לסיים את ההושבה?",
    a: "כשיש מספיק תשובות יציבות ומול דד־ליין האולם. רשומות פתוחות משאירים עד שמחליטים — אין «יום קסם» במערכת.",
  },
  {
    q: "האם אפשר לשנות שיבוץ אחרי שכבר הושיבו אורחים?",
    a: "כן. מעבירים אורח משולחן לשולחן או מעדכנים מהרשימה. השינוי מתעדכן במפה. אם כבר נשלח מספר שולחן — שולחים שוב רק למי שהשתנה.",
  },
  {
    q: "איך יודעים כמה מקומות פנויים נשארו?",
    a: "במפת ההושבה ובסיכומי השולחנות רואים תפוסה מול קיבולת. אורחים שלא שובצו נשארים ברשימה בצד עד שמציבים אותם.",
  },
  {
    q: "מה עושים עם אורחים שמגיעים ללא אישור?",
    a: "מוסיפים או מעדכנים ברשימה ומשבצים לשולחן עם מקום פנוי. המערכת לא «מנחשת» הגעה — אתם מחליטים לפי מה שקורה באולם.",
  },
  {
    q: "האם אפשר לנהל את ההושבה ביום האירוע?",
    a: "אפשר לעדכן שיבוצים במערכת כל עוד יש גישה לחשבון. כלי כניסה/תפעול ביום האירוע תלויים בחבילה ובתוספות שנרכשו — לא בכל חבילה אוטומטית.",
  },
  {
    q: "האם המערכת מתאימה גם לאירועי חברה?",
    a: "כן, כשיש שולחנות ורשימת מוזמנים. אותו כלי משמש גם לחינה, בר מצווה ואירועים פרטיים — כשהתוספת נרכשה.",
  },
  {
    q: "האם סידורי ההושבה כלולים בחבילה?",
    a: "לא. הושבה דיגיטלית היא תוספת במחשבון החבילות. בלי התוספת אין להניח שהמפה פתוחה.",
  },
  {
    q: "איך האורח מקבל את מספר השולחן?",
    a: "אחרי השיבוץ אפשר לשלוח הודעה אישית עם מספר השולחן. גם בתזכורת ה־SMS מופיע מספר שולחן כשיש הושבה.",
  },
  {
    q: "האם השיבוץ לפי קבוצות סוגר את ההושבה?",
    a: "לא. חלוקה לפי קבוצות נותנת נקודת התחלה. אחר כך מתקנים ידנית לפי משפחות והעדפות.",
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
