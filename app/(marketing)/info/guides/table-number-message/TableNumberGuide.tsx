"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import InteractiveChecklist from "@/components/marketing/guides/InteractiveChecklist";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import TableChangeDemo from "./TableChangeDemo";
import { TABLE_NUMBER_FAQS } from "./guideFaqs";

const PATH = "/info/guides/table-number-message";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "when-to-send-answer", label: "מתי שולחים מספר שולחן" },
  { id: "venue-sketch", label: "אישור סקיצת האולם" },
  { id: "checklist", label: "צ'קליסט לפני שליחה" },
  { id: "timing", label: "מתי שולחים" },
  { id: "how-to-send", label: "איך שולחים ב־Invistimo" },
  { id: "message-examples", label: "דוגמאות להודעות" },
  { id: "after-change", label: "שינוי אחרי שליחה" },
  { id: "second-round", label: "סבב עדכון נוסף" },
  { id: "mistakes", label: "טעויות נפוצות" },
  { id: "reception", label: "הושבה וצוות קבלה" },
  { id: "vs-reminder", label: "שולחן מול תזכורת" },
  { id: "quick-answers", label: "תשובות לשאלות נפוצות" },
  { id: "faq", label: "שאלות נפוצות" },
];

const SKETCH_CHECKS = [
  "מספר השולחנות באולם",
  "המספר שמופיע על כל שולחן",
  "המיקום הפיזי של כל שולחן",
  "הקיבולת של כל שולחן",
  "שולחנות אבירים ושולחנות מיוחדים",
  "שולחנות רזרבה",
  "שולחנות משפחה",
  "מעברים ויציאות",
  "נגישות",
  "מיקום רחבת הריקודים",
  "מיקום החופה או הבמה",
  "מיקום הרמקולים",
  "התאמה בין המפה הדיגיטלית לסקיצה שאושרה",
  "מועד השינוי האחרון בסקיצה",
  "זהות הגורם באולם שאישר את הגרסה",
] as const;

const CHECKLIST_ITEMS = [
  "התקבלה סקיצה מעודכנת מהאולם",
  "מספור השולחנות אושר",
  "הקיבולת של כל שולחן נבדקה",
  "כל השולחנות קיימים גם במפה הדיגיטלית",
  "אין שולחנות שמספרם שונה בין המערכות",
  "אישורי ההגעה מעודכנים",
  "אורחים שלא מגיעים אינם משובצים בטעות",
  "מספר המגיעים בכל רשומה נבדק",
  "אין אורחים משובצים פעמיים",
  "נבדקו אורחים שטרם שובצו",
  "נבדקו בקשות מיוחדות",
  "הוגדר טיפול ברזרבות",
  "נבדקה רשימת מספרי הטלפון",
  "נבדק נוסח הודעת השולחן",
  "התקבל אישור הגורם האחראי לשליחה",
];

const TIMING_ROWS = [
  { when: "שבוע לפני", what: "להשלים אישורי הגעה ולהכין סקיצה מול האולם" },
  { when: "3–4 ימים לפני", what: "לבדוק שיבוצים, קיבולת ומספרי שולחנות במפה" },
  {
    when: "1–2 ימים לפני",
    what: "לקבל אישור סופי מהאולם ולשלוח הודעת מספר שולחן, אם הכול יציב",
  },
  {
    when: "יום לפני / ביום האירוע",
    what: "לשלוח תזכורת SMS — עם מספר שולחן למי שמשובץ, ובלי מספר למי שלא משובץ; ולטפל בשינויים נקודתיים מול צוות הקבלה",
  },
] as const;

const SEND_STEPS = [
  "נכנסים לאירוע בלוח הבקרה של Invistimo",
  "פותחים את מפת ההושבה ובודקים שהסקיצה והמספור תואמים לאולם",
  "בודקים את השיבוצים ואת האורחים שטרם שובצו",
  "מאמתים את מספרי/שמות השולחנות על המפה",
  "עוברים למסך ההודעות ובוחרים את סוג «מספר שולחן»",
  "בוחרים ערוץ (SMS ו/או WhatsApp) ומסננים לאורחים עם שולחן",
  "בודקים את תצוגת הנוסח לפי התבנית במערכת",
  "מאשרים את השליחה לקהל שנבחר",
  "בודקים את סטטוס השליחה בדוחות הזמינים במערכת",
] as const;

const TEMPLATE_WITH_TABLE =
  "תזכורת לאירוע {{invitationTitle}}.\n\nמספר השולחן שלך:\n{{tableName}}\n\nלכל פרטי האירוע והניווט:\n{{navigationLink}}\n\nנשמח לראותכם ❤️";

const TEMPLATE_WITHOUT_TABLE =
  "תזכורת לאירוע {{invitationTitle}}.\n\nלכל פרטי האירוע והניווט:\n{{navigationLink}}\n\nנשמח לראותכם ❤️";

const MISTAKES = [
  {
    title: "שליחה לפני אישור הסקיצה",
    happen: "אורחים מקבלים מספרים שאינם תואמים את המספור שיוצב באולם.",
    detect: "השוואה בין המפה הדיגיטלית לסקיצה האחרונה מהאולם מגלה אי־התאמה במספרים או במיקומים.",
    prevent: "לבקש אישור ברור לסקיצה ולמספור לפני השליחה.",
    fix: "לעדכן את המפה ולשלוח הודעת תיקון לאורחים שהושפעו.",
  },
  {
    title: "שליחה כשיש הרבה אורחים שלא ענו",
    happen: "כיסאות נשמרים למי שלא מגיע, ואז נדרשים שינויי שיבוץ אחרי השליחה.",
    detect: "אחוז גבוה של רשומות פתוחות לפני סגירת ההושבה.",
    prevent: "להשלים סבבי אישור והשלמות טלפוניות לפני שליחת מספרי שולחנות.",
    fix: "לעדכן שיבוצים ולשלוח עדכון למי שהמספר שלו השתנה.",
  },
  {
    title: "מספור שאינו תואם לאולם",
    happen: "אורח מגיע לשולחן 12 ומוצא שם שולחן אחר לפי השילוט בשטח.",
    detect: "סקיצה מעודכנת מהאולם עם מספור שונה ממפת המערכת.",
    prevent: "סנכרון מספור לפני כל שליחה.",
    fix: "התאמה מלאה בין סקיצה, מפה והודעות — ולעיתים סבב עדכון רחב.",
  },
  {
    title: "שולחנות שעברו שינוי בקיבולת",
    happen: "שולחן מלא או מקומות חסרים ביום האירוע.",
    detect: "מספר המגיעים המשובצים גבוה מהקיבולת המאושרת.",
    prevent: "בדיקת קיבולת לכל שולחן מול האולם לפני השליחה.",
    fix: "פיזור מחדש, עדכון אורחים וצוות קבלה.",
  },
  {
    title: "אורחים שלא שובצו",
    happen: "אורחים מגיעים בלי מספר שולחן, או מקבלים הודעה חלקית.",
    detect: "רשימת «טרם שובץ» במפת ההושבה.",
    prevent: "לסיים שיבוץ לפני השליחה, או להחריג במודע מי שעדיין פתוח.",
    fix: "לשבץ ולשלוח / לעדכן ידנית לפני הכניסה.",
  },
  {
    title: "שליחה בלי לבדוק את נוסח ההודעה",
    happen: "נוסח לא ברור, או ציפייה שגויה שהתבנית ניתנת לעריכה חופשית.",
    detect: "תצוגה מקדימה של התבנית במערכת לפני אישור השליחה.",
    prevent: "לבדוק את תבנית SMS/WhatsApp בפועל במסך ההודעות.",
    fix: "לתקן הבנה מול האורחים בעדכון ידני אם נדרש.",
  },
  {
    title: "שינוי בהושבה בלי לעדכן את האורחים",
    happen: "אורחים מגיעים עם מספר ישן ונוצר עומס על צוות הקבלה.",
    detect: "שיבוץ במערכת שונה מההודעה האחרונה שנשלחה.",
    prevent: "לכל שינוי אחרי שליחה — תוכנית עדכון לאורחים ולקבלה.",
    fix: "הודעת תיקון + רשימה עדכנית לצוות הקבלה.",
  },
] as const;

const SKETCH_TYPES = [
  {
    title: "סקיצה ראשונית",
    text: "טיוטה ראשונה של מיקומי שולחנות — עדיין עשויה להשתנות משמעותית.",
  },
  {
    title: "סקיצה לאחר בחירת סידור",
    text: "גרסה אחרי שהוחלט על סידור השולחנות, אבל לפני אישור סופי של האולם.",
  },
  {
    title: "סקיצה מאושרת של האולם",
    text: "הגרסה שהאולם מאשר למספור, מיקום וקיבולת בשטח — הבסיס לשליחת הודעות.",
  },
  {
    title: "תוכנית ההושבה במערכת",
    text: "מפת השיבוץ ב־Invistimo. חייבת לשקף את הסקיצה המאושרת לפני שליחה.",
  },
] as const;

const CAPABILITY_FACTS = [
  {
    title: "הודעת מספר שולחן ייעודית",
    text: "זמינה במסך ההודעות לאורחים עם שולחן — ב־SMS וגם ב־WhatsApp (תבנית מערכת).",
  },
  {
    title: "תזכורת לפי שיבוץ",
    text: "אורח משובץ לשולחן מקבל תזכורת SMS עם מספר השולחן. אורח שלא משובץ מקבל תזכורת בלי מספר שולחן.",
  },
  {
    title: "מתי שולחים תזכורת",
    text: "תזכורת עם מספר שולחן נשלחת בדרך כלל ביום שלפני האירוע או ביום האירוע.",
  },
  {
    title: "שליחה חוזרת",
    text: "להודעת השולחן הייעודית אין נעילת סבב כמו לתזכורת. תזכורת SMS ננעלת אחרי שליחה; שליחה חוזרת דורשת פתיחת נעילה.",
  },
  {
    title: "סינון «רק מי שהשתנה»",
    text: "אין מסנן אוטומטי ייעודי לאורחים שמספר השולחן שלהם השתנה — מזהים ידנית ושולחים בהתאם.",
  },
  {
    title: "עדכון אוטומטי להודעה שכבר התקבלה",
    text: "לא קיים. שינוי במפה משפיע על הנתונים במערכת ועל שליחות עתידיות בלבד.",
  },
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>;
}

function AnswerCard({
  question,
  short,
  detail,
  example,
  tip,
  href,
  hrefLabel,
}: {
  question: string;
  short: string;
  detail: string;
  example: string;
  tip: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <article className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
      <h3 className="text-lg font-black text-[#2C241C] md:text-xl">{question}</h3>
      <p className="mt-3 rounded-2xl border border-[#EADDC8] bg-[#FBF6EE] px-4 py-3 text-sm font-black leading-7 text-[#3A2B22] md:text-base">
        {short}
      </p>
      <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">{detail}</p>
      <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">
        <span className="font-black text-[#2C241C]">דוגמה: </span>
        {example}
      </p>
      <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">
        <span className="font-black text-[#2C241C]">המלצה: </span>
        {tip}
      </p>
      <Link href={href} className="mt-4 inline-flex text-sm font-black text-[#8A642E] underline-offset-4 hover:underline">
        {hrefLabel}
      </Link>
    </article>
  );
}

export default function TableNumberGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(232,214,180,0.5),transparent_38%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_52%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 md:px-8 md:pb-10 md:pt-8">
          <p className="text-sm font-semibold text-[#7A6042]">
            <Link href="/" className="hover:text-[#8A642E]">
              ראשי
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            <Link href="/info/guides" className="hover:text-[#8A642E]">
              מדריכים
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            הודעת מספר שולחן
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">Invistimo · מדריך הושבה</p>
            <GuideToolbar title="הודעת מספר שולחן לאורחים" path={PATH} readingMinutes={18} />
          </div>

          <h1 className="mt-4 max-w-4xl text-[1.75rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
            הודעת מספר שולחן לאורחים: מתי שולחים, מה בודקים ומה עושים כשיש שינויים?
          </h1>
          <p className="mt-5 max-w-3xl text-xl font-bold leading-9 text-[#5E4735]">
            המדריך המלא לשליחת מספרי שולחנות לחתונה — כולל אישור סקיצת האולם, בדיקת הושבה, הודעות
            אישיות ועדכון אורחים במקרה של שינוי.
          </p>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              הודעת מספר שולחן יכולה לעזור לאורחים למצוא את מקומם באירוע, אבל שליחה מוקדמת מדי עלולה
              לגרום לבלבול.
            </p>
            <p>
              לפני שמודיעים לאורחים באיזה שולחן הם יושבים, חשוב לוודא שהאולם אישר את סקיצת ההושבה,
              שמספרי השולחנות תואמים למפה בפועל ושלא צפויים שינויים משמעותיים.
            </p>
            <p>
              במדריך הזה נסביר מתי כדאי לשלוח את ההודעות, איך בודקים את הנתונים, מה עושים אם אורח
              הועבר לשולחן אחר, ומתי כדאי לשלוח סבב עדכון נוסף.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="/seating-explained" className={ctaPrimary} location={`hero_seating:${PATH}`}>
              למערכת ההושבה של Invistimo
            </TrackedCtaLink>
            <TrackedCtaLink href="#checklist" className={ctaSecondary} location={`hero_checklist:${PATH}`}>
              לצ&apos;קליסט לפני שליחה
            </TrackedCtaLink>
          </div>
        </div>

        {reduce ? (
          <div className="overflow-hidden border-y border-[#E6D2AA]">
            <Image
              src="/images/rsvp/guides/wedding-planning/hall-tables.jpg"
              alt="שולחנות ערוכים באולם אירועים — אווירת הושבה לחתונה"
              width={1280}
              height={720}
              priority
              className="h-[42vw] max-h-[520px] min-h-[220px] w-full object-cover"
              sizes="100vw"
            />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="overflow-hidden border-y border-[#E6D2AA]"
          >
            <Image
              src="/images/rsvp/guides/wedding-planning/hall-tables.jpg"
              alt="שולחנות ערוכים באולם אירועים — אווירת הושבה לחתונה"
              width={1280}
              height={720}
              priority
              className="h-[42vw] max-h-[520px] min-h-[220px] w-full object-cover"
              sizes="100vw"
            />
          </motion.div>
        )}
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-16">
        <StickyToc items={TOC} />

        <div className="min-w-0 space-y-16 md:space-y-20">
          <section id="when-to-send-answer" className="scroll-mt-24" aria-labelledby="when-to-send-answer-h">
            <FadeIn>
              <Eyebrow>לפני הכול</Eyebrow>
              <h2 id="when-to-send-answer-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מתי כדאי לשלוח מספרי שולחנות לאורחים?
              </h2>
              <Prose>
                <p>
                  מומלץ לשלוח הודעות מספר שולחן רק לאחר שסידורי ההושבה יציבים, האולם אישר את הסקיצה ואת
                  מספור השולחנות, ונבדק שכל אורח משובץ לשולחן הנכון.
                </p>
                <p>
                  אם מתבצעים שינויים לאחר השליחה, יש לעדכן את האורחים שהושפעו. כאשר השינוי משמעותי,
                  כדאי לשקול סבב הודעות נוסף, לאחר בדיקה חוזרת מול האולם. עדכון שיבוץ במפה אינו מעדכן
                  אוטומטית הודעה שכבר התקבלה בטלפון של האורח.
                </p>
              </Prose>
            </FadeIn>
          </section>

          {/* Venue sketch */}
          <section id="venue-sketch" className="scroll-mt-24" aria-labelledby="venue-sketch-h">
            <FadeIn>
              <Eyebrow>לפני הכול</Eyebrow>
              <h2 id="venue-sketch-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                למה חייבים לבדוק את סקיצת האולם לפני שליחת מספרי שולחנות?
              </h2>
              <Prose>
                <p>
                  הודעת מספר שולחן נשענת על הנחה פשוטה: המספר שהאורח מקבל הוא אותו מספר שיופיע על
                  השולחן באולם. אם הסקיצה עדיין זזה — ההודעה עלולה להפוך למקור בלבול במקום לעזרה.
                </p>
                <p>
                  חשוב להבחין בין שלבי הסקיצה. לא כל קובץ PDF מהאולם הוא «סקיצה סופית», ולא כל מפה
                  דיגיטלית במערכת כבר מסונכרנת עם מה שיוצב בפועל.
                </p>
              </Prose>
            </FadeIn>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {SKETCH_TYPES.map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.05}>
                  <div className="h-full rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5">
                    <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">שלב {i + 1}</p>
                    <h3 className="mt-2 text-xl font-black text-[#2C241C]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">{item.text}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn className="mt-10">
              <h3 className="text-2xl font-black text-[#2C241C]">מה בודקים מול האולם?</h3>
              <ol className="mt-5 grid gap-2 sm:grid-cols-2">
                {SKETCH_CHECKS.map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-white/90 px-4 py-3 text-sm font-semibold leading-7 text-[#3F3025]"
                  >
                    <span className="tabular-nums text-[#C7A56B]">{index + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </FadeIn>

            <FadeIn className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
                <Image
                  src="/images/seating/seating-map.webp"
                  alt="מפת הושבה דיגיטלית ב־Invistimo עם שולחנות על סקיצת אולם"
                  width={1600}
                  height={1000}
                  className="h-auto w-full object-cover"
                  sizes="(max-width:1024px) 100vw, 40vw"
                />
                <p className="px-4 py-3 text-sm text-[#7A6042]">
                  מפת הושבה במערכת — חייבת להתאים לסקיצה שאושרה באולם
                </p>
              </div>
              <div className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                <h3 className="text-xl font-black text-[#2C241C]">דוגמה</h3>
                <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
                  במפת ההושבה שלכם שולחן 12 נמצא ליד רחבת הריקודים, אבל בסקיצה המעודכנת של האולם אותו
                  מיקום קיבל את המספר 15.
                </p>
                <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
                  אם תשלחו את ההודעות לפני התיאום, אורחים יקבלו מספרים שאינם תואמים את המספור שיוצב
                  בפועל.
                </p>
                <p className="mt-5 rounded-2xl border border-[#EADDC8] bg-[#FBF6EE] px-4 py-3 text-sm font-black leading-7 text-[#3A2B22]">
                  המלצה מקצועית: לבקש מהאולם אישור ברור לסקיצה ולמספור לפני שליחת ההודעות. זו המלצה
                  תפעולית — לא טענה לאישור חתום כחובה חוקית.
                </p>
              </div>
            </FadeIn>
          </section>

          {/* Checklist */}
          <section id="checklist" className="scroll-mt-24" aria-labelledby="checklist-h">
            <FadeIn>
              <Eyebrow>לפני שליחה</Eyebrow>
              <h2 id="checklist-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                15 בדיקות שחייבים לבצע לפני שליחת מספרי שולחנות
              </h2>
              <Prose>
                <p>
                  הצ&apos;קליסט נשמר במכשיר שלכם בלבד ומשמש ככלי עבודה אישי. הוא לא משנה נתונים אמיתיים
                  באירוע ב־Invistimo.
                </p>
              </Prose>
            </FadeIn>
            <FadeIn className="mt-8">
              <InteractiveChecklist
                id="checklist-widget"
                storageKey="invistimo-table-number-checklist-v1"
                title="צ'קליסט שליחת מספרי שולחנות"
                items={CHECKLIST_ITEMS}
              />
            </FadeIn>
          </section>

          {/* Timing */}
          <section id="timing" className="scroll-mt-24" aria-labelledby="timing-h">
            <FadeIn>
              <Eyebrow>תזמון</Eyebrow>
              <h2 id="timing-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                כמה זמן לפני האירוע שולחים הודעת מספר שולחן?
              </h2>
              <Prose>
                <p>
                  המועדים בטבלה הם דוגמאות נפוצות לתכנון — לא כללים מחייבים. יש להתאים אותם למועדי
                  סגירת ההושבה מול האולם, לקצב אישורי ההגעה ולמדיניות האולם.
                </p>
                <p>
                  חשוב להבחין: הודעת מספר שולחן ייעודית נשלחת כשההושבה יציבה. תזכורת SMS נשלחת בדרך כלל
                  ביום שלפני האירוע או ביום האירוע — ואז אורח משובץ מקבל גם את מספר השולחן, ואורח שלא
                  משובץ מקבל תזכורת בלי מספר.
                </p>
              </Prose>
            </FadeIn>

            <FadeIn className="mt-8 overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <table className="min-w-full text-right text-sm md:text-base">
                <caption className="sr-only">טבלת זמנים מומלצת לשליחת מספרי שולחנות</caption>
                <thead className="bg-[#F7EDDF] text-xs font-black tracking-[0.08em] text-[#7A5530] md:text-sm">
                  <tr>
                    <th scope="col" className="px-4 py-4">
                      מועד
                    </th>
                    <th scope="col" className="px-4 py-4">
                      מה כדאי לעשות
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TIMING_ROWS.map((row) => (
                    <tr key={row.when} className="border-t border-[#EADDC8]">
                      <th scope="row" className="px-4 py-4 font-black text-[#2C241C]">
                        {row.when}
                      </th>
                      <td className="px-4 py-4 leading-7 text-[#5C4A3A]">{row.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FadeIn>

            <FadeIn className="mt-8">
              <div className="relative overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 md:p-6">
                <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">ציר זמן מומלץ</p>
                <ol className="mt-5 grid gap-3 md:grid-cols-4">
                  {TIMING_ROWS.map((row, i) => (
                    <li key={row.when} className="relative rounded-2xl border border-[#EADDC8] bg-[#FBF6EE] px-4 py-4">
                      <span className="text-xs font-black text-[#C7A56B]">0{i + 1}</span>
                      <p className="mt-2 font-black text-[#2C241C]">{row.when}</p>
                      <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{row.what}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </FadeIn>
          </section>

          {/* How to send */}
          <section id="how-to-send" className="scroll-mt-24" aria-labelledby="how-to-send-h">
            <FadeIn>
              <Eyebrow>במערכת</Eyebrow>
              <h2 id="how-to-send-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                שליחת הודעת מספר שולחן מתוך מערכת ההושבה
              </h2>
              <Prose>
                <p>
                  השלבים הבאים מבוססים על הממשק הקיים ב־Invistimo. מפת ההושבה ושיוך שולחנות דורשים את
                  תוספת ההושבה הדיגיטלית במחשבון — בלי התוספת אין להניח שהמפה פתוחה.
                </p>
              </Prose>
            </FadeIn>

            <ol className="mt-8 space-y-3">
              {SEND_STEPS.map((step, index) => (
                <FadeIn key={step} delay={index * 0.03}>
                  <li className="flex gap-4 rounded-[22px] border border-[#EADDC8] bg-[#FFFDF8] px-4 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7EDDF] text-sm font-black text-[#8A642E]">
                      {index + 1}
                    </span>
                    <span className="text-base font-semibold leading-7 text-[#3F3025]">{step}</span>
                  </li>
                </FadeIn>
              ))}
            </ol>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <FadeIn>
                <figure className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
                  <Image
                    src="/images/seating/seating-assign.webp"
                    alt="צילום ממשק שיבוץ אורחים לשולחנות במפת ההושבה של Invistimo"
                    width={1600}
                    height={1000}
                    className="h-auto w-full object-cover object-top"
                    sizes="(max-width:1024px) 100vw, 40vw"
                  />
                  <figcaption className="px-4 py-3 text-sm text-[#7A6042]">
                    שיבוץ במפת ההושבה — לפני בחירת הודעת מספר שולחן
                  </figcaption>
                </figure>
              </FadeIn>
              <FadeIn delay={0.06}>
                <figure className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
                  <Image
                    src="/marketing/product/webp/desktop-try-seating.webp"
                    alt="תצוגת דמו של מפת הושבה במחשב ב־Invistimo"
                    width={1200}
                    height={800}
                    className="h-auto w-full object-cover object-top"
                    sizes="(max-width:1024px) 100vw, 40vw"
                  />
                  <figcaption className="px-4 py-3 text-sm text-[#7A6042]">
                    תצוגת דמו של מפת הושבה — נתוני הדגמה בלבד
                  </figcaption>
                </figure>
              </FadeIn>
            </div>

            <FadeIn className="mt-8 rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
              <h3 className="text-xl font-black text-[#2C241C]">מה אומת במערכת</h3>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {CAPABILITY_FACTS.map((fact) => (
                  <li key={fact.title} className="rounded-2xl border border-[#EADDC8] bg-[#FBF6EE] px-4 py-3">
                    <p className="font-black text-[#2C241C]">{fact.title}</p>
                    <p className="mt-1 text-sm leading-7 text-[#5C4A3A]">{fact.text}</p>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </section>

          {/* Message templates */}
          <section id="message-examples" className="scroll-mt-24" aria-labelledby="message-examples-h">
            <FadeIn>
              <Eyebrow>תבניות במערכת</Eyebrow>
              <h2 id="message-examples-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מה נשלח בפועל בהודעת שולחן ובתזכורת?
              </h2>
              <Prose>
                <p>
                  ב־Invistimo נשלחות תבניות מערכת — לא נוסחים חופשיים לעריכה מלאה. בתזכורת SMS המערכת
                  בוחרת לפי מצב האורח בזמן השליחה: משובץ לשולחן → עם מספר שולחן; לא משובץ → תזכורת בלי
                  מספר.
                </p>
              </Prose>
            </FadeIn>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <FadeIn>
                <div className="h-full rounded-[24px] border border-[#C9A45C]/50 bg-[#FFF8EA] p-5 md:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-[#2C241C]">עם מספר שולחן</h3>
                    <span className="rounded-full border border-[#E6D2AA] bg-white px-3 py-1 text-xs font-bold text-[#8A642E]">
                      אורח משובץ
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#7A6042]">
                    להודעת מספר שולחן ייעודית, ולתזכורת SMS כשהאורח משובץ לשולחן.
                  </p>
                  <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-[#EADDC8] bg-white px-4 py-4 text-sm leading-7 text-[#3F3025]">
                    {TEMPLATE_WITH_TABLE}
                  </pre>
                </div>
              </FadeIn>
              <FadeIn delay={0.05}>
                <div className="h-full rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-[#2C241C]">תזכורת בלי מספר שולחן</h3>
                    <span className="rounded-full border border-[#EADDC8] bg-white px-3 py-1 text-xs font-bold text-[#7A6042]">
                      אורח לא משובץ
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#7A6042]">
                    לתזכורת SMS כשאין שיבוץ לשולחן בזמן השליחה.
                  </p>
                  <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-[#EADDC8] bg-[#FBF6EE] px-4 py-4 text-sm leading-7 text-[#3F3025]">
                    {TEMPLATE_WITHOUT_TABLE}
                  </pre>
                </div>
              </FadeIn>
            </div>

            <FadeIn className="mt-6 rounded-[24px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-4 text-sm leading-7 text-[#5C4A3A] md:text-base">
              ב־WhatsApp של הודעת מספר שולחן נשלחת תבנית מאושרת נפרדת (שם האורח, מספר/שם השולחן, סוג
              האירוע וקישור לפרטים) — גם היא תבנית מערכת, לא נוסח חופשי.
            </FadeIn>
          </section>

          {/* After change scenarios */}
          <section id="after-change" className="scroll-mt-24" aria-labelledby="after-change-h">
            <FadeIn>
              <Eyebrow>פרק מרכזי</Eyebrow>
              <h2 id="after-change-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                שלחנו מספר שולחן — ואז ההושבה השתנתה. מה עושים?
              </h2>
              <Prose>
                <p>
                  זה אחד הרגעים שבהם זוגות נתקעים: המפה במערכת כבר מעודכנת, אבל האורח עדיין מחזיק
                  הודעה ישנה בטלפון. הטיפול הנכון משלב עדכון במערכת, תיאום מול האולם, הודעה לאורחים
                  שהושפעו ועדכון צוות הקבלה.
                </p>
              </Prose>
            </FadeIn>

            <FadeIn className="mt-8">
              <TableChangeDemo />
            </FadeIn>

            <div className="mt-10 space-y-6">
              <FadeIn>
                <article className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                  <h3 className="text-xl font-black text-[#2C241C]">תרחיש א׳ — אורח אחד עבר שולחן</h3>
                  <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
                    אורח קיבל הודעה שהוא יושב בשולחן 8, ולאחר מכן הועבר לשולחן 11.
                  </p>
                  <ol className="mt-4 list-decimal space-y-2 pr-5 text-base leading-8 text-[#5C4A3A]">
                    <li>מעדכנים את השיבוץ במערכת.</li>
                    <li>בודקים שהמקום החדש תקין מבחינת קיבולת וקבוצה.</li>
                    <li>מוודאים עם האולם שהמספור נכון.</li>
                    <li>שולחים הודעת תיקון לאורח, אם אפשר (ב־WhatsApp אפשר לבחור אורח ספציפי).</li>
                    <li>מעדכנים את צוות הקבלה וההושבה.</li>
                  </ol>
                </article>
              </FadeIn>

              <FadeIn>
                <article className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                  <h3 className="text-xl font-black text-[#2C241C]">תרחיש ב׳ — משפחה הועברה לשולחן אחר</h3>
                  <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
                    יש לוודא שכל אנשי הקשר הרלוונטיים במשפחה קיבלו את המידע הנכון. לא להניח שהודעה
                    לאיש קשר אחד בהכרח הגיעה לכל בני המשפחה — במיוחד אם יש כמה רשומות או כמה מספרים.
                  </p>
                </article>
              </FadeIn>

              <FadeIn>
                <article className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                  <h3 className="text-xl font-black text-[#2C241C]">תרחיש ג׳ — האולם שינה את מספור השולחנות</h3>
                  <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
                    לדוגמה: שולחן 10 הפך לשולחן 14 ושולחן 14 הפך לשולחן 10. זה שינוי רחב יותר מ«אורח
                    אחד עבר». יש לבצע התאמה מלאה בין הסקיצה, מפת ההושבה והודעות האורחים, ולשקול סבב
                    הודעות נוסף לכל מי שמספר השולחן שלו השתנה.
                  </p>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#EADDC8]">
                    <table className="min-w-full text-right text-sm">
                      <thead className="bg-[#F7EDDF] text-xs font-black text-[#7A5530]">
                        <tr>
                          <th className="px-3 py-3">לפני</th>
                          <th className="px-3 py-3">אחרי</th>
                          <th className="px-3 py-3">פעולה</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white text-[#5C4A3A]">
                        <tr className="border-t border-[#EADDC8]">
                          <td className="px-3 py-3">שולחן 10</td>
                          <td className="px-3 py-3 font-black text-[#8A642E]">שולחן 14</td>
                          <td className="px-3 py-3">עדכון מפה + הודעת תיקון</td>
                        </tr>
                        <tr className="border-t border-[#EADDC8]">
                          <td className="px-3 py-3">שולחן 14</td>
                          <td className="px-3 py-3 font-black text-[#8A642E]">שולחן 10</td>
                          <td className="px-3 py-3">עדכון מפה + הודעת תיקון</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              </FadeIn>

              <FadeIn>
                <article className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                  <h3 className="text-xl font-black text-[#2C241C]">תרחיש ד׳ — שינוי של מספר שולחנות</h3>
                  <ul className="mt-4 space-y-2 text-base leading-8 text-[#5C4A3A]">
                    <li>לעצור שליחות שטרם בוצעו, אם ניתן.</li>
                    <li>לקבל סקיצה סופית מהאולם.</li>
                    <li>לעדכן את המפה במערכת.</li>
                    <li>לזהות אורחים שהושפעו.</li>
                    <li>לשלוח עדכון נוסף בהתאם ליכולות המערכת.</li>
                    <li>למסור לצוות הקבלה את הגרסה המעודכנת.</li>
                  </ul>
                </article>
              </FadeIn>
            </div>
          </section>

          {/* Second round */}
          <section id="second-round" className="scroll-mt-24" aria-labelledby="second-round-h">
            <FadeIn>
              <Eyebrow>סבב נוסף</Eyebrow>
              <h2 id="second-round-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מתי כדאי לשלוח סבב נוסף של הודעות שולחן?
              </h2>
              <Prose>
                <p>
                  אם לאחר השליחה הראשונית השתנו מספרי השולחנות, מומלץ לשלוח עדכון נוסף לאורחים
                  שהושפעו, כדי שלא יסתמכו על ההודעה הישנה.
                </p>
              </Prose>
            </FadeIn>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "שינוי נקודתי",
                  text: "הודעה ממוקדת לאורחים שהושפעו — למשל אורח אחד או משפחה אחת.",
                },
                {
                  title: "שינוי רחב",
                  text: "בדיקת סבב עדכון נוסף אחרי אישור סקיצה סופית והתאמת המפה.",
                },
                {
                  title: "שינוי ביום האירוע",
                  text: "עדכון ישיר ותיאום עם צוות הקבלה, בנוסף להודעה אם אפשר.",
                },
              ].map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.05}>
                  <div className="h-full rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5">
                    <h3 className="text-lg font-black text-[#2C241C]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">{item.text}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn className="mt-8 rounded-[24px] border border-[#E7D3B0] bg-[#FBF6EE] p-5 md:p-6">
              <h3 className="text-xl font-black text-[#2C241C]">מה חשוב לדעת לפני סבב עדכון</h3>
              <ul className="mt-4 space-y-2 text-base leading-8 text-[#5C4A3A]">
                <li>אפשר לשלוח הודעת מספר שולחן שוב ממסך ההודעות (אין נעילת סבב ייעודית כמו לתזכורת).</li>
                <li>אין מסנן אוטומטי «רק למי שהמספר השתנה» — מזהים את האורחים שהושפעו ידנית.</li>
                <li>ב־WhatsApp אפשר לבחור אורח ספציפי מתוך קהל עם שולחן.</li>
                <li>תזכורת SMS ננעלת אחרי שליחה; שליחה חוזרת דורשת פתיחת נעילה.</li>
                <li>אם אין מסלול מתאים במערכת לרגע מסוים — מעדכנים ידנית ומתאמים עם צוות הקבלה.</li>
              </ul>
            </FadeIn>
          </section>

          {/* Mistakes */}
          <section id="mistakes" className="scroll-mt-24" aria-labelledby="mistakes-h">
            <FadeIn>
              <Eyebrow>מניעה</Eyebrow>
              <h2 id="mistakes-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                שבע טעויות נפוצות בשליחת הודעות שולחן
              </h2>
            </FadeIn>
            <div className="mt-8 space-y-4">
              {MISTAKES.map((item, index) => (
                <FadeIn key={item.title} delay={index * 0.03}>
                  <article className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                    <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">טעות {index + 1}</p>
                    <h3 className="mt-2 text-xl font-black text-[#2C241C]">{item.title}</h3>
                    <dl className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <dt className="text-sm font-black text-[#2C241C]">מה עלול לקרות</dt>
                        <dd className="mt-1 text-sm leading-7 text-[#5C4A3A]">{item.happen}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-black text-[#2C241C]">איך מזהים</dt>
                        <dd className="mt-1 text-sm leading-7 text-[#5C4A3A]">{item.detect}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-black text-[#2C241C]">איך מונעים</dt>
                        <dd className="mt-1 text-sm leading-7 text-[#5C4A3A]">{item.prevent}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-black text-[#2C241C]">מה עושים אם כבר קרה</dt>
                        <dd className="mt-1 text-sm leading-7 text-[#5C4A3A]">{item.fix}</dd>
                      </div>
                    </dl>
                  </article>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Reception coordination */}
          <section id="reception" className="scroll-mt-24" aria-labelledby="reception-h">
            <FadeIn>
              <Eyebrow>יום האירוע</Eyebrow>
              <h2 id="reception-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                איך מתאמים בין הודעות השולחן לבין ההושבה באולם?
              </h2>
              <Prose>
                <p>
                  הודעה בטלפון היא כלי עזר — לא מקור האמת היחיד בכניסה. מקור האמת ביום האירוע הוא
                  רשימת ההושבה העדכנית שבידי צוות הקבלה, בהתאם לסקיצה המאושרת.
                </p>
              </Prose>
            </FadeIn>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "מי מקבל את הסקיצה המעודכנת?",
                  text: "הזוג / מנהל האירוע, נציג האולם, וצוות הקבלה שמכוון אורחים בכניסה.",
                },
                {
                  title: "מי אחראי על שינויים?",
                  text: "עדכון במערכת — בעל האירוע או מי שהורשה. מספור בשטח — בתיאום האולם.",
                },
                {
                  title: "אורח עם מספר ישן",
                  text: "בודקים את הרשימה העדכנית ומכוונים לפיה — לא רק לפי צילום ההודעה.",
                },
                {
                  title: "שולחן מלא / רזרבות",
                  text: "מגדירים מראש מי מחליט על רזרבות ואיך מטפלים באורחים בלי אישור.",
                },
              ].map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.04}>
                  <div className="h-full rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5">
                    <h3 className="text-lg font-black text-[#2C241C]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">{item.text}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn className="mt-8 rounded-[24px] border border-[#E7D3B0] bg-[#FFF8EA] p-5 md:p-6">
              <h3 className="text-xl font-black text-[#2C241C]">דוגמה מהשטח</h3>
              <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
                אורח מגיע ומציג הודעה עם שולחן 7, אבל ברשימת ההושבה המעודכנת הוא נמצא בשולחן 12.
                הצוות צריך לבדוק את הרשימה העדכנית ולא להסתמך רק על צילום המסך שהאורח מציג.
              </p>
            </FadeIn>
          </section>

          {/* vs reminder */}
          <section id="vs-reminder" className="scroll-mt-24" aria-labelledby="vs-reminder-h">
            <FadeIn>
              <Eyebrow>השוואה</Eyebrow>
              <h2 id="vs-reminder-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מה ההבדל בין הודעת מספר שולחן לתזכורת SMS?
              </h2>
            </FadeIn>

            <FadeIn className="mt-8 overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <table className="min-w-full text-right text-sm md:text-base">
                <thead className="bg-[#F7EDDF] text-xs font-black text-[#7A5530] md:text-sm">
                  <tr>
                    <th className="px-4 py-4">נושא</th>
                    <th className="px-4 py-4">הודעת מספר שולחן</th>
                    <th className="px-4 py-4">תזכורת SMS</th>
                  </tr>
                </thead>
                <tbody className="text-[#5C4A3A]">
                  <tr className="border-t border-[#EADDC8]">
                    <th scope="row" className="px-4 py-4 font-black text-[#2C241C]">
                      מטרה
                    </th>
                    <td className="px-4 py-4 leading-7">להודיע על השיבוץ לשולחן</td>
                    <td className="px-4 py-4 leading-7">להזכיר את מועד האירוע והפרטים</td>
                  </tr>
                  <tr className="border-t border-[#EADDC8]">
                    <th scope="row" className="px-4 py-4 font-black text-[#2C241C]">
                      מספר שולחן
                    </th>
                    <td className="px-4 py-4 leading-7">חלק מרכזי מההודעה — רק לאורחים עם שולחן</td>
                    <td className="px-4 py-4 leading-7">
                      נכלל אוטומטית אם האורח משובץ; אם לא משובץ — נשלחת תזכורת בלי מספר שולחן
                    </td>
                  </tr>
                  <tr className="border-t border-[#EADDC8]">
                    <th scope="row" className="px-4 py-4 font-black text-[#2C241C]">
                      מתי בדרך כלל שולחים
                    </th>
                    <td className="px-4 py-4 leading-7">כשההושבה יציבה והסקיצה אושרה</td>
                    <td className="px-4 py-4 leading-7">יום לפני האירוע או ביום האירוע</td>
                  </tr>
                  <tr className="border-t border-[#EADDC8]">
                    <th scope="row" className="px-4 py-4 font-black text-[#2C241C]">
                      ערוץ
                    </th>
                    <td className="px-4 py-4 leading-7">SMS ו/או WhatsApp</td>
                    <td className="px-4 py-4 leading-7">SMS (מסך התזכורת)</td>
                  </tr>
                  <tr className="border-t border-[#EADDC8]">
                    <th scope="row" className="px-4 py-4 font-black text-[#2C241C]">
                      מול אישורי הגעה
                    </th>
                    <td className="px-4 py-4 leading-7" colSpan={2}>
                      אף אחת מהן אינה מחליפה את סבבי אישורי ההגעה. לא כל חבילה כוללת את שתי ההודעות
                      באותו אופן.
                    </td>
                  </tr>
                </tbody>
              </table>
            </FadeIn>

            <FadeIn className="mt-6">
              <p className="text-base leading-8 text-[#5C4A3A]">
                אם השיבוץ משתנה בין הודעת השולחן לתזכורת — האורח עלול לראות שני מספרים שונים. לכן
                חשוב שההושבה תהיה יציבה לפני שליחת תזכורת שכוללת מספר שולחן, או לעדכן את האורחים
                שהושפעו אחרי שינוי.
              </p>
            </FadeIn>
          </section>

          <section id="quick-answers" className="scroll-mt-24" aria-labelledby="quick-answers-h">
            <FadeIn>
              <Eyebrow>סיכום מעשי</Eyebrow>
              <h2 id="quick-answers-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                תשובות לשאלות נפוצות על מספר שולחן
              </h2>
              <Prose>
                <p>
                  ריכזנו כאן את השאלות שחוזרות הכי הרבה — עם תשובה קצרה, הסבר, דוגמה וטיפ מעשי לכל אחת.
                </p>
              </Prose>
            </FadeIn>
            <div className="mt-8 grid gap-4">
              <AnswerCard
                question="מה עושים אם מספר השולחן השתנה אחרי השליחה?"
                short="מעדכנים במערכת, מוודאים מול האולם, ושולחים תיקון לאורחים שהושפעו."
                detail="הודעה שכבר התקבלה לא מתעדכנת לבד. צוות הקבלה צריך לקבל את הרשימה העדכנית."
                example="אורח עבר משולחן 8 ל־11 — שולחים הודעת תיקון ומעדכנים את הקבלה."
                tip="בשינוי רחב מחכים לסקיצה סופית לפני סבב עדכון גדול."
                href="#after-change"
                hrefLabel="להעמקה: שינוי אחרי שליחה"
              />
              <AnswerCard
                question="מתי מומלץ לשלוח הודעת מספר שולחן?"
                short="כשההושבה יציבה והאולם אישר סקיצה ומספור — לעיתים יום–יומיים לפני."
                detail="תזכורת SMS עם מספר שולחן נשלחת בדרך כלל ביום שלפני האירוע או ביום האירוע, ורק למי שמשובץ."
                example="1–2 ימים לפני: הודעת שולחן ייעודית אם הכול יציב. יום לפני / ביום האירוע: תזכורת."
                tip="עדיף לא לשלוח כשיש עדיין שינויי מספור צפויים."
                href="#timing"
                hrefLabel="להעמקה: טבלת זמנים"
              />
              <AnswerCard
                question="האם צריך לאשר את סקיצת האולם לפני השליחה?"
                short="מומלץ מאוד תפעולית — גם אם אין חובה חוקית לאישור חתום."
                detail="אי־התאמה בין מפה לסקיצה היא מקור נפוץ לבלבול בכניסה."
                example="שולחן 12 במפה הוא 15 בסקיצה המעודכנת של האולם."
                tip="בקשו אישור ברור למספור ולקיבולת לפני השליחה."
                href="#venue-sketch"
                hrefLabel="להעמקה: אישור סקיצה"
              />
              <AnswerCard
                question="האם מומלץ לשלוח סבב נוסף?"
                short="כן, כשמספרים השתנו ואורחים עלולים להסתמך על הודעה ישנה."
                detail="נקודתי מול רחב: היקף העדכון תלוי בכמה אורחים הושפעו. מזהים ידנית את מי שהושפע."
                example="החלפת מספור בין שולחן 10 ל־14 דורשת עדכון רחב יותר."
                tip="מעדכנים גם את צוות הקבלה — לא רק את האורחים."
                href="#second-round"
                hrefLabel="להעמקה: סבב עדכון"
              />
              <AnswerCard
                question="איך מעדכנים אורח שעבר שולחן?"
                short="מעדכנים שיבוץ, בודקים קיבולת, ושולחים תיקון לאורח."
                detail="ב־WhatsApp אפשר לבחור אורח ספציפי; תמיד אפשר גם לעדכן ידנית."
                example="העברה לשולחן 11 + הודעת «הסתמכו על מספר זה»."
                tip="עדכנו גם את צוות הקבלה — לא רק את האורח."
                href="#after-change"
                hrefLabel="להעמקה: תרחיש אורח בודד"
              />
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="scroll-mt-24" aria-labelledby="faq-h">
            <FadeIn>
              <Eyebrow>FAQ</Eyebrow>
              <h2 id="faq-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                שאלות נפוצות על הודעת מספר שולחן
              </h2>
            </FadeIn>
            <div className="mt-8 space-y-3">
              {TABLE_NUMBER_FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-[22px] border border-[#EADDC8] bg-[#FFFDF8] px-5 py-4 open:border-[#C9A45C] open:bg-[#FFF8EA]"
                >
                  <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none">
                    <span className="flex items-start justify-between gap-3">
                      <span>{faq.q}</span>
                      <span className="mt-0.5 text-[#C7A56B] transition group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base md:leading-8">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related links */}
          <section aria-labelledby="related-h" className="scroll-mt-24">
            <FadeIn>
              <Eyebrow>המשך קריאה</Eyebrow>
              <h2 id="related-h" className="mt-3 text-3xl font-black text-[#2C241C]">
                מדריכים ועמודים משלימים
              </h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { href: "/seating-explained", label: "סידורי הושבה" },
                  { href: "/info/guides/seating-plan", label: "מדריך בניית מפת הושבה" },
                  { href: "/info/guides/event-day-checklist", label: "הכנות לפני יום האירוע" },
                  { href: "/rsvp", label: "אישורי הגעה" },
                  { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
                  { href: "/pricing", label: "חבילות ומחירים" },
                  { href: "/event-management", label: "ניהול אירוע" },
                  { href: "/info/guides", label: "מרכז המדריכים" },
                  { href: "/try", label: "דמו" },
                  { href: "/try/dashboard/seating", label: "דמו מפת הושבה" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex min-h-12 items-center rounded-2xl border border-[#EADDC8] bg-white/90 px-4 py-3 text-sm font-black text-[#5E4735] transition hover:border-[#C7A56B] hover:bg-[#FFF8EA]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </section>
        </div>
      </div>

      {/* CTA */}
      <section className="bg-[#1C1612] px-5 py-16 text-[#FFF8EF] md:px-8 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black tracking-[0.14em] text-[#C9A45C]">Invistimo</p>
          <h2 className="mt-3 text-3xl font-black md:text-4xl">מוכנים לסדר הושבה ולשלוח מספרי שולחנות?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#E8D6B0] md:text-lg">
            בנו מפת הושבה על סקיצת האולם, שבצו אורחים, ושלחו הודעת מספר שולחן כשהכול יציב. מפת
            ההושבה דורשת את תוספת ההושבה הדיגיטלית במחשבון.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink
              href="/seating-explained"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#FFF8EF] px-8 py-3.5 text-base font-black text-[#2C241C]"
              location={`footer_seating:${PATH}`}
            >
              לסידורי הושבה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#C9A45C]/60 px-8 py-3.5 text-base font-black text-[#FFF8EF]"
              location={`footer_pricing:${PATH}`}
            >
              חבילות ומחירים
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/try/dashboard/seating"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#C9A45C]/60 px-8 py-3.5 text-base font-black text-[#FFF8EF]"
              location={`footer_demo:${PATH}`}
            >
              נסו דמו הושבה
            </TrackedCtaLink>
          </div>
        </div>
      </section>
    </article>
  );
}
