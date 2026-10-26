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
    q: "מה זה ניהול אירוע?",
    a: "ניהול אירוע הוא ריכוז המשימות, הספקים, התקציב, התשלומים ולוח הזמנים סביב האירוע — ולעיתים גם תיאום ביום עצמו. ב־Invistimo אפשר לנהל זאת במערכת דיגיטלית, ולהוסיף ליווי או מנהל בשטח לפי מה שסוכם.",
  },
  {
    q: "מה עושה מנהל אירוע?",
    a: "מנהל אירוע עשוי לתאם ספקים, לעקוב אחר לו״ז, לעבוד מול האולם ולטפל בשינויים — בהתאם לתכולת השירות. התפקיד המדויק נקבע בהסכם, ולא בכל חבילה נכללות אותן פעולות.",
  },
  {
    q: "האם צריך מנהל אירוע חיצוני?",
    a: "לא בהכרח. אם מנהל האולם והתכנון העצמי מכסים את התחומים החשובים לכם, ייתכן שאין צורך. כדאי לבדוק מי מתאם ספקים חיצוניים, ציוד אישי ובקשות משפחה. יש מדריך שמשווה בין ניהול להפקה.",
  },
  {
    q: "מה ההבדל בין מנהל אירוע למפיק?",
    a: "מפיק עשוי ללוות תכנון רחב מההתחלה; מנהל אירוע מתמקד לרוב בתיאום וביום האירוע. בשוק המונחים אינם אחידים — בודקים אחריות בהסכם. פירוט במדריך ניהול מול הפקה.",
  },
  {
    q: "האם מנהל האולם מספיק?",
    a: "לעיתים כן. מנהל האולם אחראי בדרך כלל לתפעול שירותי המקום. אם יש ספקים חיצוניים רבים או משימות מטעם הזוג שאינן באחריות האולם — שוקלים השלמה.",
  },
  {
    q: "כמה עולה מנהל אירוע?",
    a: "המחיר תלוי בהיקף, באזור, בתאריך ובמודל השירות. בעמוד זה אין מחיר אחיד. הצעה מתקבלת אחרי בדיקת התאמה; מחיר המערכת והתוספות מוצג במחשבון החבילות לפי מה שמסמנים.",
  },
  {
    q: "מתי מזמינים מנהל אירוע?",
    a: "אם בוחרים ניהול ליום האירוע — לרוב אחרי שיש אולם וספקים מרכזיים, עם מספיק זמן להיערכות. ליווי רחב יותר עשוי להתחיל מוקדם יותר. הזמינות תלויה בתאריך ובאזור.",
  },
  {
    q: "האם יש מנהלי אירועים בכל הארץ?",
    a: "Invistimo עובדת עם מנהלי אירועים מקצועיים בישראל, אך אין הבטחת זמינות בכל אזור או בכל תאריך בלי בדיקה. השאירו פרטים בטופס לבדיקת התאמה.",
  },
  {
    q: "איך בודקים זמינות?",
    a: "דרך טופס בדיקת ההתאמה בעמוד זה — עם סוג אירוע, תאריך, אזור והיקף שירות מבוקש. לאחר מכן בודקים התאמה מול הזמינות בפועל.",
  },
  {
    q: "האם אפשר להזמין מנהל דרך Invistimo?",
    a: "אפשר לבקש בדיקת התאמה לשירות ניהול בשטח באמצעות מנהל שעובד עם Invistimo. ההזמנה והתנאים נקבעים רק אחרי אימות זמינות והצעה.",
  },
  {
    q: "האם יש מערכת לניהול עצמאי?",
    a: "כן. אפשר לנהל משימות, ספקים, תקציב, תשלומים ולוח זמנים במערכת. אפשר להתנסות בדמו ניהול האירוע לפני הבחירה.",
  },
  {
    q: "האם ניתן להוסיף ליווי?",
    a: "כן, ליווי מקצועי הוא מסלול אפשרי בהתאם להצעה הפעילה — נפרד משימוש עצמאי במערכת בלבד.",
  },
  {
    q: "האם המנהל מטפל בספקים?",
    a: "אם זה נכלל בהסכם. לא כל מסלול כולל תיאום כל הספקים. חשוב להגדיר מראש מי אחראי על ספקים חיצוניים מול צוות האולם.",
  },
  {
    q: "האם הוא אחראי על רזרבות?",
    a: "רק אם הוסמך לכך. רזרבות מול האולם תלויות בהסכם האולם ובהחלטות הזוג; מנהל חיצוני עשוי לתאם הפעלה אם זה נכלל בשירות.",
  },
  {
    q: "האם הוא מטפל בסידורי הושבה?",
    a: "רק אם סוכם. הושבה דיגיטלית ב־Invistimo היא שירות נפרד שניתן לשלב; בניית השיבוץ אינה אוטומטית חלק מכל חבילת ניהול.",
  },
  {
    q: "האם הוא מנהל תשלומים?",
    a: "מעקב אחר מקדמות ויתרות במערכת אפשרי בניהול העצמאי. ביצוע תשלומים בפועל או אישור הוצאות על ידי מנהל — רק אם הוגדר בהסכם.",
  },
  {
    q: "האם השירות מתאים לחינה?",
    a: "כן, אפשר לבחון את מסלולי הניהול גם לחינה — לפי מורכבות האירוע, האזור והזמינות.",
  },
  {
    q: "האם הוא מתאים לבר מצווה?",
    a: "כן. אותם עקרונות של משימות, ספקים ולו״ז רלוונטיים גם לבר או בת מצווה, עם התאמת היקף השירות.",
  },
  {
    q: "האם השירות מתאים לאירוע קטן?",
    a: "כן, אם אתם רוצים סדר דיגיטלי או תיאום ביום האירוע. ההיקף והעלות צריכים להתאים לגודל האירוע — בודקים בהצעה.",
  },
  {
    q: "מה קורה כשספק מאחר?",
    a: "כשיש חלוקת אחריות ברורה, הגורם שהוסמך (מנהל חיצוני, מנהל אולם או בני המשפחה) מתקשר, מעדכן לו״ז ומתאם עם שאר הגורמים. בלי הסכמה מראש עלול להיווצר בלבול.",
  },
  {
    q: "האם אפשר להשתמש רק במערכת?",
    a: "כן. אפשר לנהל עצמאית בלי ליווי ובלי מנהל בשטח. ליווי וניהול באולם הם תוספת רק אם סוכמו.",
  },
  {
    q: "מה כולל השירות ביום האירוע?",
    a: "התכולה נקבעת בהסכם אחרי בדיקת התאמה. עשויה לכלול היערכות, תיאום ספקים, עבודה מול האולם ומעקב לו״ז — אך אין להניח שכל פעולה כלולה בכל חבילה.",
  },
  {
    q: "האם מנהל האירוע מחליף את מנהל האולם?",
    a: "לא. מנהל האולם אחראי לתפעול שירותי המקום. מנהל חיצוני עשוי להשלים תיאומים מטעם הזוג. כשהאחריות ברורה — הם עובדים בתיאום.",
  },
  {
    q: "האם קיימת נוכחות לאורך כל האירוע?",
    a: "תלוי בהסכם: שעות העבודה, מספר אנשי צוות והיקף הנוכחות נקבעים בהצעה. אין להניח נוכחות מלאה בלי אימות.",
  },
  {
    q: "איך מקבלים הצעת מחיר?",
    a: "למערכת ולתוספות — במחשבון החבילות לפי מה שמסמנים. לליווי ולמנהל בשטח — דרך טופס בדיקת ההתאמה בעמוד, ולאחר אימות זמינות.",
  },
  {
    q: "האם ניהול האירוע מחליף את אישורי ההגעה?",
    a: "לא. אישורי ההגעה וההושבה הם מסכים ושירותים נפרדים. ניהול האירוע מרכז משימות, ספקים, תקציב ולוח זמנים לצידם.",
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
            name: "ניהול אירועים מקצועי",
            description: route.description,
            path: "/event-management",
            serviceType: "ניהול אירועים",
          }),
          faqNode(faqs),
        ])}
      />
      <AnswerFirst path="/event-management" />
      <EventManagementPage />
      <section dir="rtl" className="bg-[#FBF6EE] px-6 py-14 text-[#3F3025]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-[#35281F]">{EVENT_TYPE_SECTION.heading}</h2>
          <p className="mt-3 max-w-3xl leading-8 text-[#5C4A3A]">
            ניהול אירוע ב־Invistimo לא מוגבל לחתונה — אותם מסכי משימות, ספקים ותקציב רלוונטיים גם
            לאירועים משפחתיים ועסקיים.
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
          <h2 className="mt-2 text-3xl font-black text-[#35281F]">ניהול אירוע — שאלות חשובות</h2>
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
          <p className="mt-8 text-base leading-8 text-[#5C4A3A]">
            רוצים להבין את ההבדל בין מפיק למנהל?{" "}
            <Link
              href="/info/guides/event-management-vs-production"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              ניהול אירוע או הפקת אירוע — מה ההבדל ומה באמת צריך?
            </Link>
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink
              href="/pricing"
              location="footer_cta:/event-management"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3 text-base font-black text-white"
            >
              לצפייה בחבילות
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/info/guides/event-management-vs-production"
              location="footer_cta:/event-management"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-8 py-3 text-base font-black text-[#5E4735]"
            >
              למדריך ניהול מול הפקה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="#contact"
              location="footer_cta:/event-management"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white px-8 py-3 text-base font-black text-[#5E4735]"
            >
              בדיקת התאמה
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
