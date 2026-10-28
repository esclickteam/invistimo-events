import EventManagementPage from "@/app/components/event/EventManagementPage";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import JsonLd from "@/components/seo/JsonLd";
import { clusterSiblings } from "@/lib/seo/clusters";
import { EVENT_TYPES, EVENT_TYPE_SECTION } from "@/lib/seo/eventTypes";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode, softwareNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata, absoluteUrl, SITE_URL } from "@/lib/seo/site";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";

const route = findCoreRoute("/event-management");
if (!route) throw new Error("Missing SEO route /event-management");

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
  image: "/images/event-management/product/hero-dashboard.webp",
});

const faqs = [
  {
    q: "מהי פלטפורמה לניהול אירועים?",
    a: "מערכת דיגיטלית שמרכזת משימות, ספקים, תקציב, תשלומים ולוח זמנים סביב האירוע. ב־Invistimo אפשר לנהל את אלה במקום אחד, ולהוסיף ליווי או ניהול באולם רק אם סוכמו.",
  },
  {
    q: "האם אפשר לנהל את האירוע באופן עצמאי?",
    a: "כן. מסלול הניהול העצמאי מיועד למי שרוצה להשתמש במערכת בעצמו — בלי ליווי מפיקה ובלי ניהול באולם, אלא אם מוסיפים אותם בנפרד.",
  },
  {
    q: "אילו משימות אפשר לנהל במערכת?",
    a: "אפשר להוסיף משימות, לקבוע תאריך יעד, לעדכן סטטוס ולסמן השלמה. רשימת המשימות מופיעה בדשבורד לצד תמונת המצב של האירוע.",
  },
  {
    q: "איך מנהלים ספקים?",
    a: "במסך הספקים מרכזים ספקים לפי תחומים, שומרים פרטי קשר והערות, ומעדכנים מחיר, מקדמה ויתרה. אפשר גם לצרף קבצים לפי מה שפתוח במערכת.",
  },
  {
    q: "איך מנהלים תקציב לחתונה במערכת?",
    a: "מגדירים תקציב מתוכנן ועוקבים אחרי התחייבויות, שולם בפועל ויתרה. התצוגות בעמוד מבוססות על מסכי המערכת האמיתיים — לא על גרפים חיצוניים.",
  },
  {
    q: "מה ההבדל בין ניהול עצמאי לליווי מפיקה?",
    a: "בניהול עצמאי אתם עובדים במערכת. בליווי מקצועי מתווספת הכוונה של מפיקה לפי ההסכם. הליווי אינו כלול אוטומטית במנוי העצמאי.",
  },
  {
    q: "האם צריך מפיקה כדי להשתמש במערכת?",
    a: "לא. אפשר להשתמש במערכת לבד. מפיקה או מנהל באולם הם אפשרויות נוספות לפי צורך וזמינות.",
  },
  {
    q: "האם אישורי הגעה והושבה כלולים במערכת הניהול?",
    a: "הם משתלבים באותה סביבה, אך נמכרים כשירותים נפרדים לפי החבילה. אין להניח שהם כלולים אוטומטית ברכישת מערכת הניהול.",
  },
  {
    q: "האם אפשר לגשת מהמובייל?",
    a: "כן. המערכת מיועדת לעבודה גם ממסכים קטנים. לחוויית עריכה מלאה מומלץ גם מחשב, במיוחד למסכי תקציב והושבה.",
  },
  {
    q: "מה כולל ניהול ביום האירוע?",
    a: "שירות ניהול באולם הוא מסלול נפרד, בכפוף לזמינות ולתנאי השירות. התכולה המדויקת נקבעת בהסכם — והוא לא מחליף אוטומטית את מנהל האולם.",
  },
  {
    q: "כמה עולה מערכת הניהול?",
    a: "ליווי וניהול באולם מתומחרים בהצעה אחרי פנייה לצוות. אין מחיר אחיד בעמוד זה. מחשבון החבילות מחשב אישורי הגעה, ומערכת הניהול העצמאית מופיעה שם כתוספת לחבילה — לא כמחיר של ליווי או ניהול באולם.",
  },
  {
    q: "האם אפשר להתנסות לפני רכישה?",
    a: "כן. יש דמו אינטראקטיבי למערכת ניהול האירוע, וגם דמו לאישורי הגעה והושבה.",
  },
  {
    q: "מה קורה כשמשנים את התכנון באמצע?",
    a: "מעדכנים משימות, ספקים, תקציב או לו״ז במערכת. אם יש ליווי או מנהל באולם — מעדכנים גם אותם לפי חלוקת האחריות שסוכמה.",
  },
  {
    q: "למי מתאים השירות?",
    a: "לחתונות ולאירועים משפחתיים או עסקיים שצריכים סדר במשימות, ספקים ותקציב. אפשר להתחיל עצמאית ולהוסיף ליווי בהמשך.",
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
            name: "פלטפורמה לניהול אירועים",
            description: route.description,
            path: "/event-management",
            serviceType: "ניהול אירועים",
          }),
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}/event-management#webpage`,
            url: absoluteUrl("/event-management"),
            name: route.title,
            description: route.description,
            inLanguage: "he-IL",
          },
          faqNode(faqs),
        ])}
      />
      <EventManagementPage />
      <section dir="rtl" className="bg-[#FBF6EE] px-6 py-14 text-[#3F3025]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-[#35281F]">{EVENT_TYPE_SECTION.heading}</h2>
          <p className="mt-3 max-w-3xl leading-8 text-[#5C4A3A]">
            אותם מסכי משימות, ספקים ותקציב רלוונטיים גם לחתונה וגם לאירועים משפחתיים ועסקיים.
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
      <section dir="rtl" className="bg-[#FFFDF8] px-6 py-14 text-[#3F3025]">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black tracking-wide text-[#A67C3D]">שאלות נפוצות</p>
          <h2 className="mt-2 text-3xl font-black text-[#35281F]">שאלות על ניהול האירוע</h2>
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-4">
                <summary className="cursor-pointer list-none">
                  <h3 className="text-lg font-black text-[#35281F]">{faq.q}</h3>
                </summary>
                <p className="mt-3 leading-8 text-[#5C4A3A]">{faq.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink
              href="#contact"
              location="footer_cta:/event-management"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3 text-base font-black text-white"
            >
              לבדיקת התאמה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/try/event-management"
              location="footer_cta:/event-management"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-8 py-3 text-base font-black text-[#5E4735]"
            >
              התנסו במערכת
            </TrackedCtaLink>
          </div>
        </div>
      </section>
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
