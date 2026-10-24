import Link from "next/link";
import AnswerFirst from "@/components/seo/AnswerFirst";
import FactTableView from "@/components/seo/FactTableView";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { tableFor } from "@/lib/seo/answers";
import { EVENT_TYPES, EVENT_TYPE_SECTION } from "@/lib/seo/eventTypes";

const ctaClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#0B0E13] via-[#1A222D] to-[#0B0E13] px-8 py-3 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const secondaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#D5DBE3] bg-white/85 px-8 py-3 text-base font-black text-[#1A222D] backdrop-blur transition hover:bg-white";

const BENEFITS = [
  {
    title: "הסכום רק אחרי בחירה",
    text: "בוחרים מספר רשומות, חבילה ותוספות — והמחיר מתעדכן במחשבון. אין מחיר אחיד לכל אירוע.",
  },
  {
    title: "ארבע חבילות ברורות",
    text: "הודעות, שיחות מוקלטות, שיחות אנושיות או משולבות. כולן כוללות את בסיס ההודעות.",
  },
  {
    title: "תוספות לפי צורך",
    text: "הושבה, ניהול אירוע, מתנות באשראי ועיצוב הזמנה — רק אם מסמנים במחשבון.",
  },
  {
    title: "בקשה בוואטסאפ עם הפרטים",
    text: "לחיצה על «אני רוצה את החבילה» פותחת וואטסאפ עם הכמות והחבילה שנבחרו — לא סל מומצא.",
  },
  {
    title: "מתאים לכל סוגי האירועים",
    text: "אותו מחשבון משרת חתונה, בר מצווה, ברית, חינה, יום הולדת ואירוע חברה.",
  },
  {
    title: "מדריך שמסביר את החישוב",
    text: "אם רוצים להבין מה נספר כרשומה לפני שבוחרים — יש מדריך ייעודי בלי להחליף את המחשבון.",
  },
];

const STEPS = [
  { title: "בוחרים כמות רשומות", text: "לפי גודל הרשימה שתשלחו אליה הודעות." },
  { title: "מסמנים תוספות", text: "רק מה שצריך לאירוע שלכם." },
  { title: "משווים חבילות", text: "הסכום מתעדכן בכל כרטיס חבילה." },
  { title: "שולחים בקשה", text: "וואטסאפ נפתח עם הפרטים שנבחרו." },
];

export const PRICING_PAGE_FAQS = [
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
  {
    q: "מה נספר כרשומה?",
    a: "רשומה היא שורת שליחה ברשימה. אישור אחד יכול לכסות כמה מגיעים, ולכן מספר הרשומות אינו תמיד שווה למספר האורחים באולם.",
  },
  {
    q: "האם המחיר משתנה לפי סוג האירוע?",
    a: "לא. החישוב הוא לפי רשומות, חבילה ותוספות — אותו מחשבון לחתונה, בר מצווה, ברית או אירוע חברה.",
  },
  {
    q: "האם Save the Date כלול במחיר הבסיס?",
    a: "הוא לא מופיע כשורה קבועה בחבילת ההודעות במחשבון. הוא זמין כשהאפשרות פתוחה בחשבון.",
  },
  {
    q: "איפה מסבירים את החישוב בפירוט?",
    a: "במדריך «כמה עולים אישורי הגעה לחתונה» — בלי להחליף את הסכומים שמופיעים במחשבון הזה.",
  },
];

export default function PricingMarketingExtras() {
  const table = tableFor("/pricing");

  return (
    <div dir="rtl" className="bg-[#F2F4F7] text-[#1A222D]">
      <AnswerFirst path="/pricing" hideTable />

      <section className="px-5 py-14 md:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-black text-[#0B0E13] md:text-4xl">למה המחשבון בנוי כך</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center leading-8 text-[#3D4754]">
            שקיפות לפני רכישה: רואים מה כלול ומה עולה לפי הבחירות שלכם — בלי מספר שיווקי כללי.
          </p>
          <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.title}
                className="rounded-[28px] border border-[#D5DBE3] bg-gradient-to-l from-[#F2F4F7] via-[#FFFDF7] to-[#F7E8CA] p-6 shadow-[0_16px_40px_rgba(151,108,49,0.08)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F766E] text-sm font-black text-white">
                  ✓
                </div>
                <h3 className="mt-4 text-xl font-black text-[#0B0E13]">{benefit.title}</h3>
                <p className="mt-3 leading-7 text-[#3D4754]">{benefit.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#FFFFFF]/70 px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-[#0B0E13] md:text-4xl">איך בוחרים חבילה</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-[28px] border border-[#D5DBE3] bg-white p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1A222D] text-sm font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-black text-[#0B0E13]">{step.title}</h3>
                <p className="mt-3 leading-7 text-[#3D4754]">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {table ? (
        <section className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-2xl font-black text-[#0B0E13] md:text-3xl">מה כלול בכל חבילה</h2>
            <FactTableView table={table} />
            <p className="mt-4 text-sm leading-7 text-[#6B7583]">
              הסכום עצמו מופיע רק במחשבון למעלה, אחרי בחירת כמות ותוספות. הטבלה מסבירה מה כלול — לא מחליפה מחיר.
            </p>
          </div>
        </section>
      ) : null}

      <section className="px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-[#0B0E13] md:text-4xl">{EVENT_TYPE_SECTION.heading}</h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#3D4754]">
            אותו מחשבון משרת אירועים מסוגים שונים. ההבדל הוא בגודל הרשימה ובתוספות שתבחרו — לא בקטגוריית מחיר נפרדת לפי סוג אירוע.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TYPES.map((item) => (
              <li key={item.label} className="rounded-[24px] border border-[#D5DBE3] bg-white/90 p-5">
                <h3 className="text-lg font-black text-[#0B0E13]">{item.label}</h3>
                <p className="mt-2 leading-7 text-[#3D4754]">{item.blurb}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 py-12 md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black text-[#0B0E13]">שאלות נפוצות על מחירים וחבילות</h2>
          <div className="mt-6 space-y-4">
            {PRICING_PAGE_FAQS.map((faq) => (
              <details key={faq.q} open className="rounded-[24px] border border-[#D5DBE3] bg-white px-5 py-4">
                <summary className="cursor-pointer list-none">
                  <h3 className="text-lg font-black text-[#0B0E13]">{faq.q}</h3>
                </summary>
                <p className="mt-3 leading-8 text-[#3D4754]">{faq.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 leading-8 text-[#3D4754]">
            לפירוט נוסף על מה נספר כרשומה:{" "}
            <Link href="/info/guides/cost-rsvp-wedding" className="font-bold text-[#0F766E] underline-offset-4 hover:underline">
              מדריך חישוב המחיר
            </Link>
            . לשאלות כלליות על המערכת:{" "}
            <Link href="/faq" className="font-bold text-[#0F766E] underline-offset-4 hover:underline">
              מרכז השאלות
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="px-5 pb-16 md:px-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-[#7DD3C8] bg-gradient-to-l from-[#F2F4F7] via-white to-[#F7E8CA] p-7 shadow-[0_24px_60px_rgba(95,68,34,0.1)] md:p-10">
          <p className="text-sm font-black tracking-wide text-[#0F766E]">הצטרפות</p>
          <h2 className="mt-2 text-3xl font-black text-[#0B0E13]">מוכנים לבחור חבילה?</h2>
          <p className="mt-3 max-w-2xl leading-8 text-[#3D4754]">
            חזרו למחשבון למעלה, בחרו כמות ותוספות, ושלחו בקשה בוואטסאפ. אם צריך התאמה לפני בחירה — דברו איתנו.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink href="#pricing-calculator" className={ctaClass} location="footer_cta:/pricing">
              חזרה למחשבון
            </TrackedCtaLink>
            <TrackedCtaLink href="/contact" className={secondaryClass} location="footer_cta:/pricing">
              יצירת קשר
            </TrackedCtaLink>
            <TrackedCtaLink href="/rsvp" className={secondaryClass} location="footer_cta:/pricing">
              לעמוד אישורי הגעה
            </TrackedCtaLink>
          </div>
        </div>
      </section>
    </div>
  );
}
