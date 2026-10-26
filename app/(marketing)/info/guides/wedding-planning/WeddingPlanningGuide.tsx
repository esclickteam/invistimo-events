"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import BudgetPlanner from "@/components/marketing/guides/BudgetPlanner";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import InteractiveChecklist from "@/components/marketing/guides/InteractiveChecklist";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import { WEDDING_PLANNING_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-planning";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "start", label: "מאיפה מתחילים" },
  { id: "budget", label: "תקציב חתונה" },
  { id: "guests", label: "רשימת מוזמנים" },
  { id: "venue", label: "תאריך ואולם" },
  { id: "vendor-timeline", label: "סדר סגירת ספקים" },
  { id: "choosing-vendors", label: "איך בוחרים ספקים" },
  { id: "attire", label: "שמלה וחליפה" },
  { id: "atmosphere", label: "עיצוב ואווירה" },
  { id: "invites-rsvp", label: "הזמנות ואישורי הגעה" },
  { id: "seating", label: "סידורי הושבה" },
  { id: "event-day-mgmt", label: "ניהול יום האירוע" },
  { id: "month-before", label: "חודש לפני" },
  { id: "week-before", label: "שבוע לפני" },
  { id: "wedding-day", label: "ביום החתונה" },
  { id: "after", label: "אחרי החתונה" },
  { id: "faq", label: "שאלות נפוצות" },
];

const START_QUESTIONS = [
  "מה התקציב הכולל שאנחנו יכולים להרשות לעצמנו?",
  "האם יש עזרה כספית מהמשפחה, והאם היא ודאית?",
  "כמה אנשים נרצה להזמין?",
  "באיזו עונה נרצה להתחתן?",
  "האם אנחנו מעדיפים אירוע ערב או צהריים?",
  "האם חשוב לנו אולם, גן אירועים או מקום אינטימי?",
  "באיזה אזור גיאוגרפי יהיה נוח למרבית האורחים?",
  "אילו דברים הכי חשובים לנו בחתונה?",
];

const VENUE_QUESTIONS = [
  "מהי הקיבולת האמיתית של האולם לאורחים יושבים?",
  "האם יש חניה מספקת ונגישות לתחבורה?",
  "מהי חלופת הגשם / החום / הרוח?",
  "האם יש רישיון עסק ואישורי בטיחות בתוקף?",
  "מה כלול במחיר המנה ומה נחשב תוספת?",
  "מהי ההתחייבות המינימלית למנות ועד מתי אפשר לשנות?",
  "מהם תנאי הביטול ודחיית התאריך?",
  "האם מותרים ספקים חיצוניים ומהם דמי הספק?",
  "מה שעת הסיום והאם יש הגבלות רעש?",
  "מי מנהל את האירוע מטעם האולם ומה כלול בשירות?",
];

type VendorOrderPart = { text: string; emphasize?: boolean };

const VENDOR_ORDER: { stage: string; parts: VendorOrderPart[] }[] = [
  {
    stage: "בתחילת הדרך",
    parts: [{ text: "תקציב, רשימת מוזמנים ראשונית, בחירת תאריך ואולם" }],
  },
  {
    stage: "מיד לאחר קביעת התאריך",
    parts: [
      { text: "צילום, DJ, " },
      { text: "אישורי הגעה וסידורי הושבה", emphasize: true },
      { text: ", ומנהל אירוע חיצוני אם מעוניינים" },
    ],
  },
  {
    stage: "בחודשים הבאים",
    parts: [{ text: "שמלת כלה, חליפת חתן, איפור, שיער, עיצוב וספקים נוספים" }],
  },
  {
    stage: "מספר חודשים לפני האירוע",
    parts: [{ text: "השלמת רשימת המוזמנים, הכנת הזמנות ותיאום תהליך אישורי ההגעה" }],
  },
  {
    stage: "לקראת האירוע",
    parts: [
      {
        text: "שליחת הזמנות, ביצוע סבבי אישורי הגעה, מעקב אחר תשובות והכנת סידורי הושבה",
      },
    ],
  },
  {
    stage: "בשבועות האחרונים",
    parts: [{ text: "סגירת מספר המגיעים, עדכון ההושבה, תשלומים ותיאומים סופיים" }],
  },
  {
    stage: "בימים האחרונים",
    parts: [{ text: "אישור לוח זמנים, אנשי קשר, ספקים, ציוד ומסמכים" }],
  },
];

const MONTH_ITEMS = [
  "אישור פרטים מול כל ספק",
  "בדיקת יתרות תשלום",
  "סבבי אישורי הגעה ומעקב תשובות",
  "התאמת מספר מוזמנים מול האולם",
  "התחלת סידורי הושבה",
  "תיאום עם האולם לגבי לוח זמנים",
  "בדיקת מסמכים וחוזים",
  "וידוא טבעות",
  "בדיקת ביגוד ואביזרים",
  "תוכנית גיבוי למזג אוויר",
  "רשימת אנשי קשר לחירום",
  "תיאום הסעות אם נדרש",
  "לוח זמנים סופי ליום האירוע",
];

const WEEK_ITEMS = [
  "יום א׳–ב׳: אישור הגעה סופי ועדכון מספר מגיעים",
  "יום ב׳–ג׳: מסירת הושבה לאולם / למנהל האירוע",
  "יום ג׳: אימות שעות הגעה של כל ספק",
  "יום ד׳: בדיקת ציוד אישי, תיק חתונה ומסמכים",
  "יום ה׳: הסדרת יתרות תשלום לפי החוזים",
  "יום ו׳: מסירת הנחיות כתובות למנהל האירוע",
  "לפני האירוע: תיאום מי אחראי על מתנות, מעטפות וספקים",
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>;
}

function SectionImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className="my-10 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_20px_50px_rgba(58,39,20,0.08)]">
      <Image
        src={src}
        alt={alt}
        width={1400}
        height={800}
        className="h-auto w-full object-cover"
        sizes="(max-width:1024px) 100vw, 720px"
      />
      {caption ? (
        <figcaption className="border-t border-[#EADDC8] px-4 py-3 text-sm text-[#7A6042]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default function WeddingPlanningGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(232,214,180,0.55),transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 md:px-8 md:pt-8">
          <p className="text-sm font-semibold text-[#7A6042]">
            <Link href="/" className="hover:text-[#8A642E]">
              ראשי
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            <Link href="/info/guides" className="hover:text-[#8A642E]">
              מדריכים
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            תכנון חתונה
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">המדריך שלכם לחתונה</p>
            <GuideToolbar title="המדריך המלא לתכנון חתונה | Invistimo" path={PATH} readingMinutes={35} />
          </div>
          <h1 className="mt-4 max-w-4xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.65rem]">
            איך מתכננים חתונה? המדריך המלא מהאירוסין ועד החופה
          </h1>
          <p className="mt-4 max-w-3xl text-xl font-bold leading-9 text-[#5E4735]">
            החתונה שלכם מתחילה בתכנון נכון
          </p>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              הרגע שבו מחליטים להתחתן הוא אחד הרגעים המרגשים בחיים. אחריו מגיעות לא מעט החלטות: איפה
              מתחתנים, כמה אורחים מזמינים, כמה כסף נכון להוציא, איזה ספקים בוחרים ומתי צריך לסגור כל
              דבר.
            </p>
            <p>
              תכנון חתונה לא חייב להיות מסובך. כשמתקדמים לפי סדר נכון, שומרים על תקציב מסודר ומבינים
              אילו החלטות משפיעות על האחרות, אפשר ליהנות מהדרך ולא רק מהאירוע עצמו.
            </p>
            <p>
              במדריך הזה נעבור על כל שלבי תכנון החתונה בישראל, מההחלטות הראשונות ועד הרגע שבו אתם
              נכנסים לחופה.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="#budget-planner" className={ctaPrimary} location={`hero_budget:${PATH}`}>
              לטבלת התקציב
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/info/guides/wedding-vendors-contracts"
              className={ctaSecondary}
              location={`hero_vendors:${PATH}`}
            >
              למדריך ספקים וחוזים
            </TrackedCtaLink>
          </div>
        </div>
        <div className="relative mt-4 w-full">
          {!reduce ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="overflow-hidden border-y border-[#E6D2AA]"
            >
              <Image
                src="/images/rsvp/guides/wedding-planning/hero-reception.jpg"
                alt="שולחנות חתונה ערוכים באולם עם מפות שמנת, נרות ומרכזי פרחים באווירה חגיגית"
                width={1920}
                height={900}
                priority
                className="h-[42vw] max-h-[520px] min-h-[220px] w-full object-cover"
                sizes="100vw"
              />
            </motion.div>
          ) : (
            <div className="overflow-hidden border-y border-[#E6D2AA]">
              <Image
                src="/images/rsvp/guides/wedding-planning/hero-reception.jpg"
                alt="שולחנות חתונה ערוכים באולם עם מפות שמנת, נרות ומרכזי פרחים באווירה חגיגית"
                width={1920}
                height={900}
                priority
                className="h-[42vw] max-h-[520px] min-h-[220px] w-full object-cover"
                sizes="100vw"
              />
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-16">
        <StickyToc items={TOC} />
        <div className="min-w-0 space-y-16 md:space-y-20">
          <section id="start" className="scroll-mt-24" aria-labelledby="start-h">
            <Eyebrow>פרק 1</Eyebrow>
            <h2 id="start-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה עושים קודם — סוגרים אולם, בונים רשימת מוזמנים או קובעים תקציב?
            </h2>
            <Prose>
              <p>
                מתחילים משלושה דברים שמשפיעים זה על זה — מסגרת תקציב, הערכת מספר מוזמנים והעדפות לגבי
                אופי האירוע.
              </p>
              <p>
                אין סדר קשיח שמתאים לכל זוג. אבל לא כדאי לחתום על אולם לפני שמבינים את סדר הגודל של
                האירוע ואת העלות הכוללת. אולם שמתאים ל־450 אורחים לא בהכרח מתאים לתקציב שנבנה ל־220.
              </p>
              <p>לפני שמתחילים לראות אולמות, כדאי לענות בכנות על השאלות הבאות:</p>
            </Prose>
            <ul className="mt-6 grid gap-2">
              {START_QUESTIONS.map((q) => (
                <li
                  key={q}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold leading-7 text-[#3F3025] md:text-base"
                >
                  {q}
                </li>
              ))}
            </ul>
          </section>

          <section id="budget" className="scroll-mt-24" aria-labelledby="budget-h">
            <Eyebrow>פרק 2</Eyebrow>
            <h2 id="budget-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך בונים תקציב חתונה בלי לגלות הוצאות מפתיעות בהמשך?
            </h2>
            <Prose>
              <p>
                התקציב אינו רק מחיר המנה. מחיר המנה הוא רכיב מרכזי, אבל חתונה כוללת שורה ארוכה של
                קטגוריות שעשויות לזוז לאורך הדרך.
              </p>
              <p>בין השאר כדאי לכלול: אולם וקייטרינג, בר ואלכוהול, צילום סטילס ווידאו, תקליטן
              ומוזיקה, שמלת כלה וחליפת חתן, איפור ושיער, עיצוב ופרחים, טבעות, חופה ורב או עורך טקס,
              הזמנות ואישורי הגעה, סידורי הושבה, ניהול אירוע חיצוני אם נבחר, הסעות ולינה אם נדרשות,
              וכן טיפים, תוספות, שעות נוספות והוצאות בלתי צפויות.</p>
              <p>
                מומלץ לשמור רזרבה כספית — למשל טווח תכנון של כ־5%–10% — ככלי תכנון אפשרי ולא כחובה.
                חשוב גם להבהיר: מתנות האורחים אינן הכנסה מובטחת. לא כדאי להתחייב להוצאות שאפשר לממן
                רק אם המתנות יכסו אותן.
              </p>
            </Prose>
            <div className="mt-8">
              <BudgetPlanner />
            </div>
          </section>

          <section id="guests" className="scroll-mt-24" aria-labelledby="guests-h">
            <Eyebrow>פרק 3</Eyebrow>
            <h2 id="guests-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              כמה מוזמנים להזמין ואיך מארגנים את הרשימה?
            </h2>
            <Prose>
              <p>
                מתחילים ברשימות נפרדות של בני הזוג ושל המשפחות, ואז מאחדים ומסירים כפילויות. חשוב
                להפריד בין מספר רשומות לבין מספר אנשים: זוג או משפחה יכולים להיות רשומה אחת עם כמה
                מגיעים.
              </p>
              <p>
                מנהלים זוגות ומשפחות ברשומה משותפת כאשר הם מוזמנים יחד, בודקים מספרי טלפון תקינים,
                ומתכננים בהתאם לקיבולת האולם ולתקציב — לא רק לפי הרצון להזמין את כולם.
              </p>
              <p>
                לפירוט מעשי על ניהול רשימה אחת עם סטטוסים ומספר מגיעים ראו את{" "}
                <Link href="/info/guides/guest-list" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  מדריך רשימת המוזמנים
                </Link>
                .
              </p>
            </Prose>
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/couple.jpg"
              alt="זוג בחתונה ברגעי שמחה בין האורחים"
            />
          </section>

          <section id="venue" className="scroll-mt-24" aria-labelledby="venue-h">
            <Eyebrow>פרק 4</Eyebrow>
            <h2 id="venue-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך בוחרים אולם חתונה שמתאים לכם באמת?
            </h2>
            <Prose>
              <p>
                בחירת אולם אינה רק «המקום הכי יפה בתקציב». מיקום ונגישות, חניה, קיבולת אמיתית,
                נגישות לאנשים עם מוגבלות, חלופה לגשם או לחום, רישיון עסק ואישורי בטיחות, רמת האוכל
                והבר, אקוסטיקה, שעת סיום והגבלות רעש — כל אלה משפיעים על חוויית האורחים ועל העלות
                הכוללת.
              </p>
              <p>
                בדקו גם התחייבות מינימלית למנות, עלות מנה ותוספות, תנאי ביטול ודחייה, רזרבות, ספקים
                חיצוניים ודמי ספק, והגבלות על עיצוב והקמה. המחיר הנמוך ביותר למנה אינו בהכרח העסקה
                המשתלמת ביותר אם התוספות, הרזרבות או תנאי הביטול יקרים יותר.
              </p>
              <p>
                להערכת מספר המנות מול האולם ראו גם את{" "}
                <Link
                  href="/info/guides/wedding-venue-guest-guarantee"
                  className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                >
                  מדריך ההתחייבות לאולם
                </Link>
                .
              </p>
            </Prose>
            <div className="mt-8 rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 md:p-7">
              <h3 className="text-xl font-black text-[#2C241C]">עשר שאלות שחייבים לשאול לפני שסוגרים אולם</h3>
              <ol className="mt-4 space-y-2.5">
                {VENUE_QUESTIONS.map((q, i) => (
                  <li key={q} className="flex gap-3 text-sm leading-7 text-[#3F3025] md:text-base">
                    <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </div>
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/venue.jpg"
              alt="אולם אירועים מעוצב עם תאורה חמה לקראת קבלת פנים"
            />
          </section>

          <section id="vendor-timeline" className="scroll-mt-24" aria-labelledby="vendor-timeline-h">
            <Eyebrow>פרק 5</Eyebrow>
            <h2 id="vendor-timeline-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              באיזה סדר כדאי לסגור ספקים ושירותים לחתונה?
            </h2>
            <Prose>
              <p>
                הסדר שבו סוגרים ספקים ושירותים לחתונה תלוי בתאריך האירוע, בזמינות ובתקציב. עם זאת, ככל
                שמקדימים לתכנן ולשריין את השירותים החשובים, כך אפשר להגיע לחודשים האחרונים עם פחות
                משימות פתוחות ויותר שקט נפשי.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">
                  ההמלצה שלנו היא לסגור את הספקים והשירותים המרכזיים מוקדם ככל האפשר, ולא להמתין לרגע
                  האחרון.
                </strong>{" "}
                גם שירותים שמתבצעים בפועל סמוך לחתונה, כמו אישורי הגעה וסידורי הושבה, כדאי לבחור ולסגור
                מראש. חשוב להבחין בין מועד רכישת השירות לבין מועד הביצוע בפועל.
              </p>
            </Prose>
            <div className="mt-6 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white">
              <table className="min-w-[520px] w-full border-collapse text-sm md:text-base">
                <caption className="sr-only">סדר מומלץ לסגירת ספקים ושירותים לחתונה</caption>
                <thead>
                  <tr className="border-b border-[#E6D2AA] bg-[#FFF8EA] text-right text-[#7A5530]">
                    <th scope="col" className="px-4 py-3 font-black">
                      שלב
                    </th>
                    <th scope="col" className="px-4 py-3 font-black">
                      מה מומלץ לסגור או לתכנן
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {VENDOR_ORDER.map((row) => (
                    <tr key={row.stage} className="border-b border-[#F0E4D0]">
                      <th scope="row" className="px-4 py-3 text-right font-bold text-[#2C241C]">
                        {row.stage}
                      </th>
                      <td className="px-4 py-3 text-[#5C4A3A]">
                        {row.parts.map((part) =>
                          part.emphasize ? (
                            <strong key={part.text} className="font-black text-[#2C241C]">
                              {part.text}
                            </strong>
                          ) : (
                            <span key={part.text}>{part.text}</span>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 space-y-8">
              <div>
                <h3 className="text-xl font-black text-[#2C241C] md:text-2xl">
                  למה כדאי לסגור אישורי הגעה וסידורי הושבה כבר בתחילת הדרך?
                </h3>
                <Prose>
                  <p>
                    אישורי הגעה וסידורי הושבה הם חלק חשוב מתכנון החתונה, ולכן כדאי לדאוג להם מראש.
                  </p>
                  <p>
                    כאשר בוחרים את השירותים מוקדם, אפשר להכין את רשימת המוזמנים בנחת, לבדוק מספרי
                    טלפון, לטפל בכפילויות ולארגן את הרשימה בצורה מסודרת.
                  </p>
                  <p>
                    כך, כשהמועד לשליחת ההזמנות ואישורי ההגעה מתקרב, התשתית כבר מוכנה ואפשר להתמקד
                    בביצוע במקום להתחיל לחפש פתרונות.
                  </p>
                  <p>
                    גם את שירות סידורי ההושבה כדאי לסגור מראש, אף שהשיבוץ הסופי מתבצע בדרך כלל לאחר
                    קבלת תשובות האורחים.
                  </p>
                  <p>
                    לעמודים הרלוונטיים ב־Invistimo:{" "}
                    <Link
                      href="/rsvp/chatuna"
                      className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                    >
                      אישורי הגעה לחתונה
                    </Link>
                    {" · "}
                    <Link
                      href="/seating-explained"
                      className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                    >
                      סידורי הושבה
                    </Link>
                    {" · "}
                    <Link
                      href="/info/guides/when-to-send-rsvp"
                      className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                    >
                      מתי שולחים אישורי הגעה
                    </Link>
                    .
                  </p>
                </Prose>
              </div>

              <div>
                <h3 className="text-xl font-black text-[#2C241C] md:text-2xl">
                  פחות לחץ בחודשים האחרונים, יותר זמן ליהנות מההכנות
                </h3>
                <Prose>
                  <p>
                    אחת ההמלצות החשובות בתכנון חתונה היא לא לדחות משימות שאפשר לסגור מראש.
                  </p>
                  <p>
                    בחירת ספקים מוקדמת מאפשרת לבדוק הצעות מחיר בנחת, לקרוא חוזים, להשוות שירותים ולבחור
                    את אנשי המקצוע המתאימים לכם.
                  </p>
                  <p>
                    ככל שמתקרבים לחתונה, מתווספים אישורים, מדידות, תשלומים, שינויים ברשימת המוזמנים
                    ותיאומים אחרונים.
                  </p>
                  <p>
                    לכן כדאי להשאיר את התקופה האחרונה בעיקר לביצוע, לבדיקות ולעדכונים — ולא לחיפוש
                    ספקים ולסגירת שירותים מרכזיים.
                  </p>
                  <p>
                    <strong className="font-black text-[#2C241C]">
                      חתונה שמתוכננת מראש מאפשרת להגיע ליום האירוע עם יותר סדר, ביטחון ושקט נפשי.
                    </strong>
                  </p>
                </Prose>
              </div>
            </div>

            <p className="mt-8 text-base leading-8 text-[#5C4A3A] md:text-lg">
              לפירוט על הצעות מחיר, חוזים, מקדמות וביטולים ראו את{" "}
              <Link
                href="/info/guides/wedding-vendors-contracts"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                המדריך המלא לספקים וחוזים
              </Link>
              .
            </p>
          </section>

          <section id="choosing-vendors" className="scroll-mt-24" aria-labelledby="choosing-vendors-h">
            <Eyebrow>פרק 6</Eyebrow>
            <h2 id="choosing-vendors-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך בוחרים ספקים מקצועיים שאפשר לסמוך עליהם?
            </h2>
            <Prose>
              <p>בדקו תיק עבודות אמיתי מאירועים מלאים — לא רק סרטוני Highlights. קראו ביקורות ממקורות
              שונים, שוחחו עם הספק, וודאו מי מגיע בפועל ביום האירוע, ובקשו הצעה מפורטת בכתב.</p>
              <p>
                בדקו ציוד גיבוי, הבינו תנאי ביטול, וודאו התאמה אישית לסגנון שלכם, והשוו מה כלול במחיר
                — לא רק את המספר הסופי. כימיה חשובה, אבל גם בהירות חוזית.
              </p>
            </Prose>
          </section>

          <section id="attire" className="scroll-mt-24" aria-labelledby="attire-h">
            <Eyebrow>פרק 7</Eyebrow>
            <h2 id="attire-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מתי מתחילים לבחור שמלת כלה, חליפה, איפור ושיער?
            </h2>
            <Prose>
              <p>
                שמלות והתאמות דורשות זמן הזמנה ומדידות. בדקו עלויות נלוות (תיקונים, אביזרים, הנעלה),
                מדיניות ביטול, שעות התארגנות ביום האירוע וזמן נסיעה לצילומים. הגדירו מי מלווה את
                הכלה ומה כדאי להכין מראש בתיק האישי.
              </p>
              <p>
                גם לחליפה ולאיפור/שיער חשוב לתאם ניסיונות, לוודא מי נותן את השירות בפועל, ולהשאיר
                מרווח לתיקונים.
              </p>
            </Prose>
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/bridal.jpg"
              alt="כלה בשמלה לבנה ברגעי התארגנות לפני החופה"
            />
          </section>

          <section id="atmosphere" className="scroll-mt-24" aria-labelledby="atmosphere-h">
            <Eyebrow>פרק 8</Eyebrow>
            <h2 id="atmosphere-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך יוצרים חתונה שמרגישה אישית ולא כמו העתק של אירוע אחר?
            </h2>
            <Prose>
              <p>
                סגנון עיצובי, תאורה, פרחים, בחירת מוזיקה, שירי כניסה וחופה, טקס אישי, מיתוג ושילוט,
                חוויית קבלת פנים, אוכל ובר — כולם בונים אווירה. ההתאמה לתקציב חשובה לא פחות מהרצון
                «להיות מיוחדים».
              </p>
              <p>
                פרטים קטנים שנבחרים נכון — שיר משמעותי, משפט בטקס, פינת קבלת פנים חמה — יכולים להיות
                משמעותיים יותר מתוספות יקרות שלא קשורות אליכם.
              </p>
              <p>
                אם יש בר עצמאי או אלכוהול מחוץ לחבילת האולם, תכננו כמויות לפי מספר המאשרים וסגנון
                הקהל. אפשר להיעזר ב־
                <Link
                  href="/info/guides/wedding-alcohol-calculator"
                  className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                >
                  מחשבון האלכוהול לחתונה
                </Link>
                .
              </p>
            </Prose>
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/flowers.jpg"
              alt="סידור פרחי חתונה בגוונים רכים על שולחן קבלת פנים"
            />
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/bar.jpg"
              alt="עמדת בר בחתונה עם בקבוקים, כוסות ותאורה חמה"
            />
          </section>

          <section id="invites-rsvp" className="scroll-mt-24" aria-labelledby="invites-rsvp-h">
            <Eyebrow>פרק 9</Eyebrow>
            <h2 id="invites-rsvp-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מתי שולחים הזמנות ומתי מתחילים אישורי הגעה?
            </h2>
            <Prose>
              <p>
                חשוב להבחין בין Save the Date, הזמנה דיגיטלית, קישור אישי לאישור הגעה, הודעות
                WhatsApp או SMS, שיחות מוקלטות, מוקד אנושי ותזכורות. כל מסלול יכול להתאים לאירוע
                אחר — אין מסלול «נחות» מטבעו.
              </p>
              <p>
                רשימה מסודרת, מעקב אחר תשובות ועדכון מספר המגיעים הם הבסיס לסגירת מנות מול האולם.
                ב־Invistimo אפשר לרכז רשימת מוזמנים, לשלוח הזמנה וקישור אישי לאישור הגעה, ולשלב
                WhatsApp, SMS ושיחות בהתאם לחבילה — בלי להניח שכל אורח יענה בכל סבב.
              </p>
              <p>
                לקריאה נוספת:{" "}
                <Link href="/info/guides/when-to-send-rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  מתי שולחים אישורי הגעה
                </Link>
                {" · "}
                <Link href="/info/guides/whatsapp-vs-sms-rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  WhatsApp או SMS
                </Link>
                {" · "}
                <Link href="/rsvp/chatuna" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  אישורי הגעה לחתונה
                </Link>
                .
              </p>
            </Prose>
          </section>

          <section id="seating" className="scroll-mt-24" aria-labelledby="seating-h">
            <Eyebrow>פרק 10</Eyebrow>
            <h2 id="seating-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מתכננים סידורי הושבה בלי להסתבך?
            </h2>
            <Prose>
              <p>
                מתחילים כשיש מספיק אישורים יציבים. מחלקים לקבוצות — משפחות וחברים — ומתייחסים
                לקיבולת שולחנות, ילדים, נגישות ואורחים שעדיין לא אישרו. משאירים מרווח לשינויים של
                הרגע האחרון.
              </p>
              <p>
                חשוב להבחין בין שיבוץ אורח לשולחן לבין סימון הגעה בפועל ביום האירוע. אלה שני שלבים
                שונים.
              </p>
              <p>
                <Link href="/info/guides/wedding-seating-arrangements" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  מדריך סידורי הושבה לחתונה
                </Link>
                {" · "}
                <Link href="/seating-explained" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  סידורי הושבה ב־Invistimo
                </Link>
                {" · "}
                <Link href="/info/guides/seating-plan" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  איך מכינים הושבה במערכת
                </Link>
                .
              </p>
            </Prose>
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/hall-tables.jpg"
              alt="אולם חתונה עם שולחנות עגולים ערוכים ומפות שמנת"
            />
          </section>

          <section id="event-day-mgmt" className="scroll-mt-24" aria-labelledby="event-day-mgmt-h">
            <Eyebrow>פרק 11</Eyebrow>
            <h2 id="event-day-mgmt-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מי דואג שכל מה שתכננתם באמת יקרה?
            </h2>
            <Prose>
              <p>
                מנהל האירוע מטעם האולם דואג לרוב להפעלת המקום והצוות במקום. מנהל אירוע חיצוני מייצג
                אתכם ומרכז ספקים מול האולם. מפיק חתונות עשוי להיות מעורב גם בתכנון ובעיצוב לאורך
                הדרך. התפקידים חופפים לעיתים — חשוב להגדיר מי אחראי על מה.
              </p>
              <p>
                לוח זמנים טוב כולל התארגנות, צילומים, הגעת ספקים, קבלת פנים, חופה, ארוחה, ריקודים,
                סיום ופינוי ציוד. לגבי מתנות, מעטפות וכספים: הגדירו מראש אדם אחראי, תיעוד ומסירה
                בטוחה — אל תשאירו אחריות עמומה.
              </p>
              <p>
                לריכוז משימות, ספקים ותקציב במקום אחד ראו את{" "}
                <Link href="/event-management" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  ניהול האירוע ב־Invistimo
                </Link>
                .
              </p>
            </Prose>
          </section>

          <section id="month-before" className="scroll-mt-24" aria-labelledby="month-before-h">
            <Eyebrow>פרק 12</Eyebrow>
            <h2 id="month-before-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה חשוב לסגור בחודש האחרון?
            </h2>
            <Prose>
              <p>
                החודש האחרון הוא זמן לסגור קצוות — לא לפתוח פרויקטים חדשים. אשרו פרטים מול ספקים,
                עדכנו אישורי הגעה והושבה, ובדקו תשלומים ומסמכים. סמנו מה הושלם כדי לראות מה נשאר
                פתוח.
              </p>
            </Prose>
            <div className="mt-6">
              <InteractiveChecklist
                storageKey="invistimo-wedding-month-checklist"
                title="צ׳קליסט — חודש לפני החתונה"
                items={MONTH_ITEMS}
              />
            </div>
          </section>

          <section id="week-before" className="scroll-mt-24" aria-labelledby="week-before-h">
            <Eyebrow>פרק 13</Eyebrow>
            <h2 id="week-before-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה עושים בשבוע האחרון?
            </h2>
            <Prose>
              <p>רשימת משימות לפי ימים — סמנו מה הושלם. התאימו את הימים ללוח שלכם:</p>
            </Prose>
            <div className="mt-6">
              <InteractiveChecklist
                storageKey="invistimo-wedding-week-checklist"
                title="צ׳קליסט — שבוע לפני החתונה"
                items={WEEK_ITEMS}
              />
            </div>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              ראו גם את{" "}
              <Link href="/info/guides/event-day-checklist" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                בדיקה לפני יום האירוע
              </Link>
              .
            </p>
          </section>

          <section id="wedding-day" className="scroll-mt-24" aria-labelledby="wedding-day-h">
            <Eyebrow>פרק 14</Eyebrow>
            <h2 id="wedding-day-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מגיעים ליום החתונה מוכנים ורגועים יותר?
            </h2>
            <Prose>
              <p>
                השאירו מרווחי זמן. אל תרכזו את כל הטלפונים אצל בני הזוג — מנו אנשי קשר אחראים. הימנעו
                משינויים לא הכרחיים ביום עצמו. ודאו שמישהו מרכז את הספקים, דאגו לאוכל, שתייה ומנוחה,
                והתמקדו בחוויה עצמה.
              </p>
            </Prose>
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/toast.jpg"
              alt="כוסות שמפניה בברכת לחיים בחתונה"
            />
          </section>

          <section id="after" className="scroll-mt-24" aria-labelledby="after-h">
            <Eyebrow>פרק 15</Eyebrow>
            <h2 id="after-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה נשאר לעשות אחרי שהאירוע נגמר?
            </h2>
            <ul className="mt-6 grid gap-2">
              {[
                "בדיקת יתרות ותשלומים",
                "קבלת תמונות וסרטונים לפי ההסכם",
                "החזרת ציוד וביגוד מושכר",
                "טיפול במתנות ותודות",
                "בדיקת חיובים בחשבון",
                "שמירת חוזים וקבלות",
                "הודעות תודה לאורחים",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#3F3025] md:text-base"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section id="faq" className="scroll-mt-24" aria-labelledby="faq-h">
            <Eyebrow>שאלות נפוצות</Eyebrow>
            <h2 id="faq-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שאלות שזוגות שואלים בתכנון חתונה
            </h2>
            <div className="mt-8 space-y-3">
              {WEDDING_PLANNING_FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] px-5 py-4 open:bg-white"
                >
                  <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-3">
                      {faq.q}
                      <span className="text-[#C7A56B] transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-base leading-8 text-[#5C4A3A]">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-[#E6D2AA] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF7] to-[#F7E8CA] p-6 md:p-10">
            <h2 className="text-2xl font-black text-[#2C241C] md:text-3xl">המשך הדרך</h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-[#5C4A3A]">
              אחרי שיש מסגרת תכנון — השוו ספקים בזהירות, ארגנו אישורי הגעה והושבה, ורכזו את המשימות
              במקום אחד.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink
                href="/info/guides/wedding-vendors-contracts"
                className={ctaPrimary}
                location={`footer_vendors:${PATH}`}
              >
                מדריך ספקים וחוזים
              </TrackedCtaLink>
              <TrackedCtaLink href="/pricing" className={ctaSecondary} location={`footer_pricing:${PATH}`}>
                חבילות ומחירים
              </TrackedCtaLink>
              <TrackedCtaLink href="/rsvp" className={ctaSecondary} location={`footer_rsvp:${PATH}`}>
                אישורי הגעה
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/event-management"
                className={ctaSecondary}
                location={`footer_events:${PATH}`}
              >
                ניהול אירוע
              </TrackedCtaLink>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
