"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import CopyableMessage from "./CopyableMessage";
import SeatingMapDemo from "./SeatingMapDemo";
import SeatingPlanChecklist from "./SeatingPlanChecklist";
import { SEATING_PLAN_FAQS } from "./guideFaqs";

const PATH = "/info/guides/seating-plan";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "step-1", label: "רשימת מוזמנים" },
  { id: "step-2", label: "אישורי הגעה" },
  { id: "step-3", label: "סקיצת האולם" },
  { id: "step-4", label: "חלוקה לקבוצות" },
  { id: "step-5", label: "שיבוץ לשולחנות" },
  { id: "demo", label: "הדגמת מפה" },
  { id: "step-6", label: "רזרבות" },
  { id: "step-7", label: "בדיקת המפה" },
  { id: "step-8", label: "אישור האולם" },
  { id: "step-9", label: "הודעות שולחן" },
  { id: "step-10", label: "יום האירוע" },
  { id: "example-300", label: "דוגמה ל־300" },
  { id: "mistakes", label: "טעויות נפוצות" },
  { id: "checklist", label: "צ׳קליסט" },
  { id: "faq", label: "שאלות נפוצות" },
];

const GUEST_FIELDS = [
  "שם האורח או המשפחה",
  "מספר מוזמנים ברשומה",
  "סטטוס אישור הגעה",
  "שיוך משפחתי או חברתי",
  "ילדים",
  "בקשות נגישות",
  "העדפות ישיבה ידועות",
  "הערות תפעוליות רלוונטיות",
] as const;

const SAMPLE_ROWS = [
  { name: "משפחת כהן", qty: 4, group: "משפחת הכלה", note: "עם ילדים" },
  { name: "דנה ויוסי", qty: 2, group: "חברי החתן", note: "ליד חברים" },
  { name: "רונית לוי", qty: 1, group: "משפחת הכלה", note: "גישה נוחה" },
  { name: "משפחת ישראלי", qty: 5, group: "משפחת החתן", note: "שולחן משפחתי" },
] as const;

const VENUE_ASK = [
  "סקיצה עדכנית של חלל האירוע",
  "מספרי השולחנות",
  "מיקום כל שולחן",
  "קיבולת כל שולחן",
  "שולחנות אבירים / משפחה / רזרבה",
  "מיקום רחבת הריקודים והבמה",
  "אזור קבלת הפנים ומעברים",
  "נגישות ומיקום רמקולים",
  "מגבלות מיוחדות",
] as const;

const GROUPS = [
  "משפחת הכלה",
  "משפחת החתן",
  "חברי הכלה",
  "חברי החתן",
  "חברים משותפים",
  "עבודה",
  "שכנים",
  "אורחים מבוגרים",
  "משפחות עם ילדים",
] as const;

const ASSIGN_STEPS = [
  "מתחילים בקבוצות הגדולות",
  "משבצים משפחות קרובות",
  "מטפלים באורחים עם צרכים מיוחדים",
  "משבצים קבוצות חברים",
  "משלימים שולחנות עם מקומות פנויים",
  "בודקים שאין חריגה מקיבולת",
  "בודקים שאין כפילויות",
  "בודקים שלא נשארו אורחים ללא שיבוץ",
] as const;

const MAP_CHECKS = [
  "כל אורח שמגיע משובץ",
  "אין כפילויות",
  "אין שולחן מעל הקיבולת",
  "מספרי השולחנות תואמים לסקיצה",
  "בקשות נגישות נבדקו",
  "משפחות וקבוצות מתאימות",
  "ילדים נלקחו בחשבון",
  "רזרבות הוגדרו",
  "אין שיבוצים שגויים",
  "המפה המעודכנת נשמרה",
] as const;

const DAY_OF = [
  "אורח שלא מגיע — עדכון רשימה ושחרור מקום לפי נוהל",
  "אורח בלי אישור — בדיקה מול הרשימה והרזרבות",
  "משפחה עם אדם נוסף — תיאום לפני הוספת כיסא",
  "שולחן שמתמלא — לא לשלוח אורח לשולחן מלא",
  "שינוי שיבוץ — רק מי שמוסמך",
  "מספר שולחן ישן בהודעה — להסתמך על המפה המעודכנת",
  "עדכון צוות הקבלה ומנהל האולם",
] as const;

const MISTAKES: { title: string; detail: string }[] = [
  {
    title: "מתחילים הושבה לפני שיש רשימה מסודרת",
    detail:
      "בלי שמות ומספרי מגיעים מעודכנים השיבוץ מתפרק מהר. קודם רשימה — אחר כך מפה.",
  },
  {
    title: "מבלבלים בין רשומות לאנשים",
    detail:
      "250 רשומות יכולות להיות 400 אנשים. מחשבים את סכום המגיעים בכל רשומה.",
  },
  {
    title: "לא בודקים את קיבולת השולחנות",
    detail:
      "שיבוץ מעל הקיבולת שאישר האולם יוצר צפיפות או שולחן שלא ניתן לפתוח בשטח.",
  },
  {
    title: "משבצים משפחה גדולה לשולחן קטן מדי",
    detail:
      "משפחה של 4 לא נכנסת לשולחן עם מקום פנוי אחד. בודקים את מספר המגיעים לפני הלחיצה.",
  },
  {
    title: "מתעלמים מאורחים שלא השיבו",
    detail:
      "מי שלא ענה אינו בהכרח לא מגיע. משלימים בירור לפני סגירת המפה.",
  },
  {
    title: "לא בודקים בקשות נגישות",
    detail:
      "אורח שצריך קרבה לכניסה או הימנעות מרמקולים צריך שיבוץ מכוון — לא «מה שנשאר».",
  },
  {
    title: "לא מתכננים רזרבות",
    detail:
      "בלי הסכם רזרבות ברור, הגעה לא צפויה הופכת ללחץ ביום האירוע.",
  },
  {
    title: "עובדים על סקיצה לא מעודכנת",
    detail:
      "מספור ישן במפה ושילוט חדש באולם — האורחים מגיעים לשולחן הלא נכון.",
  },
  {
    title: "שולחים מספרי שולחנות מוקדם מדי",
    detail:
      "שליחה לפני אישור האולם והתייצבות השיבוץ מובילה לגל תיקונים.",
  },
  {
    title: "לא מעדכנים את צוות הקבלה בשינויים",
    detail:
      "הצוות חייב לעבוד מול הגרסה האחרונה — אחרת מנווטים לפי הודעה ישנה.",
  },
];

const CHECKLIST = [
  "רשימת המוזמנים מעודכנת",
  "אישורי ההגעה נבדקו",
  "מספר האנשים חושב",
  "התקבלה סקיצה מהאולם",
  "קיבולת השולחנות נבדקה",
  "האורחים חולקו לקבוצות",
  "כל המגיעים שובצו",
  "אין כפילויות",
  "אין חריגות קיבולת",
  "נבדקו בקשות מיוחדות",
  "רזרבות תואמו",
  "המפה אושרה מול האולם",
  "הודעות השולחן נבדקו",
  "צוות הקבלה קיבל גרסה מעודכנת",
];

const VENUE_MSG =
  "שלום, מצורפת מפת ההושבה המעודכנת שלנו. נשמח לוודא שמספרי השולחנות, המיקומים והקיבולת תואמים לסקיצה הסופית של האולם, ושאפשר להתקדם עם הודעות מספרי השולחנות לאורחים. תודה!";

const GROUP_300 = [
  { label: "משפחת הכלה", n: 90 },
  { label: "משפחת החתן", n: 80 },
  { label: "חברים", n: 60 },
  { label: "עבודה", n: 40 },
  { label: "מכרים וקבוצות נוספות", n: 30 },
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
      {children}
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6D2AA] bg-[#FFF8EA] text-sm font-black tabular-nums text-[#8A642E]">
      {n}
    </span>
  );
}

export default function SeatingPlanGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <header className="relative isolate">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.2),transparent_42%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_55%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-5 pb-6 pt-6 md:px-8 md:pt-8">
          <p className="text-sm font-semibold text-[#7A6042]">
            <Link href="/" className="hover:text-[#8A642E]">
              ראשי
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            <Link href="/info/guides" className="hover:text-[#8A642E]">
              מדריכים
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            הכנת סידורי הושבה
          </p>
          <p className="mt-4 text-sm font-black tracking-[0.12em] text-[#7A5530]">
            מדריך מעשי · Invistimo
          </p>
          <h1 className="mt-3 max-w-4xl text-[1.7rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.45rem]">
            איך מכינים סידורי הושבה לחתונה? מדריך מעשי צעד אחר צעד
          </h1>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              סידורי הושבה מתחילים ברשימת אורחים מעודכנת ובסקיצה של האולם. לאחר מכן מחלקים את
              המוזמנים לקבוצות, מגדירים את השולחנות והקיבולת שלהם, משבצים את האורחים ובודקים שאין
              כפילויות, מקומות חסרים או בקשות מיוחדות שלא טופלו.
            </p>
            <p>
              במדריך הזה נבנה יחד מפת הושבה לדוגמה, נלמד איך לחלק משפחות וחברים לשולחנות, איך לעבוד
              עם רזרבות ואיך לבצע בדיקה סופית לפני האירוע.
            </p>
            <p>
              אם אתם עדיין מתלבטים איך לתכנן את ההושבה בכלל —{" "}
              <Link
                href="/info/guides/wedding-seating-arrangements"
                className="font-black text-[#8A642E] underline-offset-4 hover:underline"
              >
                המדריך המלא לסידורי הושבה לחתונה
              </Link>{" "}
              מסביר את העקרונות. כאן נעבור לעבודה בפועל.
            </p>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="#demo" className={ctaPrimary} location={`hero_demo:${PATH}`}>
              להדגמת מפת הושבה
            </TrackedCtaLink>
            <TrackedCtaLink href="#step-1" className={ctaSecondary} location={`hero_start:${PATH}`}>
              להתחיל משלב 1
            </TrackedCtaLink>
          </div>
        </div>
        <div className="relative">
          {!reduce ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden border-y border-[#E6D2AA]"
            >
              <Image
                src="/images/rsvp/guides/unique-atmosphere/seating-plan-hall.jpg"
                alt="שולחנות חתונה ערוכים באולם עם מפות שמנת — הכנת סידורי הושבה"
                width={1920}
                height={800}
                priority
                className="h-[32vw] max-h-[380px] min-h-[180px] w-full object-cover"
                sizes="100vw"
              />
            </motion.div>
          ) : (
            <div className="overflow-hidden border-y border-[#E6D2AA]">
              <Image
                src="/images/rsvp/guides/unique-atmosphere/seating-plan-hall.jpg"
                alt="שולחנות חתונה ערוכים באולם עם מפות שמנת — הכנת סידורי הושבה"
                width={1920}
                height={800}
                priority
                className="h-[32vw] max-h-[380px] min-h-[180px] w-full object-cover"
                sizes="100vw"
              />
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-16">
        <StickyToc items={TOC} />

        <div className="min-w-0 space-y-16 md:space-y-20">
          {/* Step 1 */}
          <section id="step-1" className="scroll-mt-24" aria-labelledby="s1-h">
            <div className="flex items-center gap-3">
              <StepBadge n={1} />
              <Eyebrow>רשימת מוזמנים</Eyebrow>
            </div>
            <h2 id="s1-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 1: מכינים רשימת מוזמנים מעודכנת
            </h2>
            <Prose>
              <p>
                בלי רשימה מדויקת אין מפת הושבה יציבה. כל רשומה מייצגת יחידת הזמנה — יחיד, זוג או
                משפחה — וכוללת מספר אנשים שעבורם צריך מקום.
              </p>
              <p className="font-bold text-[#2C241C]">נתונים שכדאי לכלול:</p>
            </Prose>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {GUEST_FIELDS.map((f) => (
                <li
                  key={f}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#3F3025]"
                >
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <table className="w-full min-w-[520px] text-right text-sm">
                <caption className="sr-only">דוגמת רשומות מוזמנים להושבה</caption>
                <thead className="bg-[#FFF8EA] text-[#8A642E]">
                  <tr>
                    <th className="px-4 py-3 font-black" scope="col">
                      רשומה
                    </th>
                    <th className="px-4 py-3 font-black" scope="col">
                      מספר מגיעים
                    </th>
                    <th className="px-4 py-3 font-black" scope="col">
                      קבוצה
                    </th>
                    <th className="px-4 py-3 font-black" scope="col">
                      הערה
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ROWS.map((r) => (
                    <tr key={r.name} className="border-t border-[#EFE2CC] text-[#5C4A3A]">
                      <td className="px-4 py-3 font-black text-[#2C241C]">{r.name}</td>
                      <td className="px-4 py-3 tabular-nums font-bold">{r.qty}</td>
                      <td className="px-4 py-3">{r.group}</td>
                      <td className="px-4 py-3">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">טעות נפוצה:</strong> להתייחס ל־250
                רשומות כאילו מדובר ב־250 אורחים. יש לחשב את סכום האנשים שמגיעים — לא רק את מספר
                השורות ברשימה.{" "}
                <Link
                  href="/info/guides/guest-list"
                  className="font-black text-[#8A642E] underline-offset-4 hover:underline"
                >
                  מדריך רשימת מוזמנים
                </Link>
              </p>
            </Prose>
          </section>

          {/* Step 2 */}
          <section id="step-2" className="scroll-mt-24" aria-labelledby="s2-h">
            <div className="flex items-center gap-3">
              <StepBadge n={2} />
              <Eyebrow>אישורי הגעה</Eyebrow>
            </div>
            <h2 id="s2-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 2: בודקים מי באמת מגיע
            </h2>
            <Prose>
              <p>
                הושבה סופית על בסיס רשימת מוזמנים בלבד — בלי תשובות — מובילה לכיסאות ריקים וללחץ
                מיותר. מתחילים לשבץ את מי שאישר, מבררים מי לא ענה, ומעדכנים ביטולים ושינויי כמות.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> הוזמנו 350 אנשים —
                290 אישרו הגעה, 35 הודיעו שלא יגיעו, ו־25 עדיין לא השיבו. אפשר להתחיל לשבץ את 290
                המאשרים, אבל אין להניח אוטומטית מה תהיה ההחלטה של מי שלא ענו.
              </p>
              <p>
                הושבה ראשונית אפשרית אחרי שיש מספיק תשובות; הושבה סופית — אחרי בירור ומול מועד סגירת
                הכמות מול האולם.{" "}
                <Link href="/rsvp/chatuna" className="font-black text-[#8A642E] underline-offset-4 hover:underline">
                  אישורי הגעה לחתונה
                </Link>
                {" · "}
                <Link
                  href="/info/guides/guests-who-dont-reply"
                  className="font-black text-[#8A642E] underline-offset-4 hover:underline"
                >
                  אורחים שלא עונים
                </Link>
              </p>
            </Prose>
          </section>

          {/* Step 3 */}
          <section id="step-3" className="scroll-mt-24" aria-labelledby="s3-h">
            <div className="flex items-center gap-3">
              <StepBadge n={3} />
              <Eyebrow>סקיצת האולם</Eyebrow>
            </div>
            <h2 id="s3-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 3: מבקשים סקיצת שולחנות מהאולם
            </h2>
            <Prose>
              <p>
                הסקיצה היא הבסיס למספור ולקיבולת. סקיצה ראשונית אינה בהכרח סקיצה סופית — לפני שליחת
                הודעות מספרי שולחנות מאשרים מול האולם שהמפה מעודכנת.
              </p>
              <p className="font-bold text-[#2C241C]">מה לבקש מהאולם?</p>
            </Prose>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {VENUE_ASK.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3025]"
                >
                  {item}
                </li>
              ))}
            </ul>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> האולם מציע 15
                שולחנות של 12, 10 שולחנות של 10, ו־2 שולחנות של 8.
              </p>
              <p className="font-black tabular-nums text-[#2C241C]">
                15×12 + 10×10 + 2×8 = 296 מקומות
              </p>
              <p>
                אם צפויים 300 אורחים — חסרים לפחות ארבעה מקומות בתכנון הזה, עוד לפני רזרבות. מתאמים
                פתרון עם האולם ולא חורגים מקיבולת שולחן בלי אישור.
              </p>
            </Prose>
          </section>

          {/* Step 4 */}
          <section id="step-4" className="scroll-mt-24" aria-labelledby="s4-h">
            <div className="flex items-center gap-3">
              <StepBadge n={4} />
              <Eyebrow>קבוצות</Eyebrow>
            </div>
            <h2 id="s4-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 4: מחלקים את האורחים לקבוצות
            </h2>
            <Prose>
              <p>
                החלוקה לקבוצות מסייעת בתכנון, אבל לא כל אורח מאותה קטגוריה חייב לשבת באותו שולחן.
                מתחשבים בקשרים אישיים, בהעדפות ובבקשות מיוחדות.
              </p>
            </Prose>
            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
              {GROUPS.map((g) => (
                <li
                  key={g}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-bold text-[#3F3025]"
                >
                  {g}
                </li>
              ))}
            </ul>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> 26 חברים מהצבא
                ושולחנות של 10 — אפשר שולחן 7 עם 10, שולחן 8 עם 10, ושולחן 9 עם 6 חברים ועוד 4
                אורחים שמתאימים חברתית. לא מניחים שכל שילוב מתאים בלי להכיר את הקשרים.
              </p>
            </Prose>
          </section>

          {/* Step 5 */}
          <section id="step-5" className="scroll-mt-24" aria-labelledby="s5-h">
            <div className="flex items-center gap-3">
              <StepBadge n={5} />
              <Eyebrow>שיבוץ</Eyebrow>
            </div>
            <h2 id="s5-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 5: מתחילים לשבץ אורחים במפת ההושבה
            </h2>
            <ol className="mt-6 space-y-2">
              {ASSIGN_STEPS.map((s, i) => (
                <li
                  key={s}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3025]"
                >
                  <span className="font-black tabular-nums text-[#C7A56B]">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> שולחן 12 עם 12
                מקומות — משפחת כהן (4) + משפחת לוי (3) + דנה ויוסי (2) = 9 מתוך 12. נותרו שלושה
                מקומות; השולחן אינו מלא.
              </p>
              <p>
                שולחן של 10 עם 9 כבר משובצים — אי אפשר לשבץ אליו משפחה של 4 בלי פתרון אחר. מתייחסים
                למספר המגיעים בכל רשומה.
              </p>
              <p>
                ב־Invistimo אפשר לשבץ ידנית או לפי קבוצות, כולל גרירה בין שולחנות, ולראות בכל רגע
                כמה משובצים מתוך הקיבולת ורשימת מי שטרם שובץ. הושבה דיגיטלית היא תוספת במחשבון
                החבילות.
              </p>
            </Prose>
            <div className="mt-8 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white shadow-[0_16px_36px_rgba(58,39,20,0.08)]">
              <Image
                src="/images/marketing-captures/unique/module-seating-full.webp"
                alt="צילום מסך של מפת סידורי הושבה ב־Invistimo עם שולחנות וקיבולת"
                width={1400}
                height={900}
                className="h-auto w-full object-contain object-top"
                sizes="(max-width:1024px) 100vw, 720px"
              />
              <p className="border-t border-[#EFE2CC] px-5 py-3 text-sm font-semibold text-[#7A6042]">
                מפת הושבה ב־Invistimo — המחשה מהמוצר (דמו מבודד)
              </p>
            </div>
            <div className="mt-6 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#1E1814]">
              <PublicAutoplayVideo
                src="/videos/marketing-captures/product-seating-map.webm"
                poster="/videos/marketing-captures/product-seating-map-poster.jpg"
                title="סרטון הדגמה — מפת הושבה עם שולחנות משובצים"
                shellClassName="w-full"
                className="aspect-[8/5] w-full"
                expandable
                frameBg="#1E1814"
              />
            </div>
          </section>

          {/* Demo */}
          <section id="demo" className="scroll-mt-24" aria-labelledby="demo-h">
            <Eyebrow>התנסות</Eyebrow>
            <h2 id="demo-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              בואו נבנה מפת הושבה לדוגמה
            </h2>
            <Prose>
              <p>
                ההדגמה הבאה מאפשרת לתרגל שיבוץ, חסימת חריגת קיבולת והעברה בין שולחנות — בלי הרשמה
                ובלי נתוני לקוחות. זו הדגמה קלה, לא העתק מלא של מערכת ההושבה.
              </p>
            </Prose>
            <div className="mt-8">
              <SeatingMapDemo />
            </div>
          </section>

          {/* Step 6 */}
          <section id="step-6" className="scroll-mt-24" aria-labelledby="s6-h">
            <div className="flex items-center gap-3">
              <StepBadge n={6} />
              <Eyebrow>רזרבות</Eyebrow>
            </div>
            <h2 id="s6-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 6: מתכננים מקומות רזרבה
            </h2>
            <Prose>
              <p>
                רזרבות הן מקומות או שולחנות שהאולם מאשר להפעלה לפי הצורך. יש להבדיל בין מקום פנוי
                בשולחן שכבר נפתח, לבין שולחן רזרבה שלם, לבין מנה רזרבה בהסכם המסחרי.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> האולם מאשר שני
                שולחנות רזרבה. אין להניח שמותר לפתוח אותם בלי תיאום או בלי עלות — בודקים את ההסכם
                ואת נוהל האולם: מי מאשר, מתי מחייבים, ואיך נמנעים מצפיפות.
              </p>
            </Prose>
          </section>

          {/* Step 7 */}
          <section id="step-7" className="scroll-mt-24" aria-labelledby="s7-h">
            <div className="flex items-center gap-3">
              <StepBadge n={7} />
              <Eyebrow>בדיקה</Eyebrow>
            </div>
            <h2 id="s7-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 7: בודקים שאין טעויות בהושבה
            </h2>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {MAP_CHECKS.map((c) => (
                <li
                  key={c}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#3F3025]"
                >
                  {c}
                </li>
              ))}
            </ul>
            <Prose>
              <p>
                אם יש 300 מאשרים אבל סך המשובצים הוא 294 — בודקים מי ששת האורחים שעדיין לא שובצו
                לפני שסוגרים.
              </p>
            </Prose>
          </section>

          {/* Step 8 */}
          <section id="step-8" className="scroll-mt-24" aria-labelledby="s8-h">
            <div className="flex items-center gap-3">
              <StepBadge n={8} />
              <Eyebrow>תיאום</Eyebrow>
            </div>
            <h2 id="s8-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 8: מאשרים את מפת ההושבה מול האולם
            </h2>
            <Prose>
              <p>
                שולחים את המפה כשהשיבוץ יציב מספיק — לפני הודעות מספרי שולחנות. מבקשים אישור
                למספור, למיקומים ולקיבולת. אם האולם משנה סקיצה — מעדכנים גרסה אחת ברורה כדי שלא
                יעבדו על שני מסמכים שונים.
              </p>
            </Prose>
            <div className="mt-6">
              <CopyableMessage text={VENUE_MSG} title="דוגמה להודעה לאולם" />
            </div>
          </section>

          {/* Step 9 */}
          <section id="step-9" className="scroll-mt-24" aria-labelledby="s9-h">
            <div className="flex items-center gap-3">
              <StepBadge n={9} />
              <Eyebrow>הודעות</Eyebrow>
            </div>
            <h2 id="s9-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 9: שולחים לאורחים את מספרי השולחנות
            </h2>
            <Prose>
              <p>
                שולחים רק אחרי אישור הסקיצה והמספור. מוודאים שהמספר במפה תואם לשילוט באולם. אם
                מספר השתנה אחרי שליחה — מעדכנים את האורחים שהושפעו; בשינוי רחב שוקלים סבב נוסף לפי
                אפשרויות המערכת.
              </p>
              <p>
                ב־Invistimo אפשר לשלוח הודעת מספר שולחן אחרי השיבוץ, ובתזכורת ה־SMS של חבילת
                ההודעות מופיע מספר שולחן כשיש הושבה — למי שמשובץ.{" "}
                <Link
                  href="/info/guides/table-number-message"
                  className="font-black text-[#8A642E] underline-offset-4 hover:underline"
                >
                  הודעת מספר שולחן לאורחים — מתי שולחים ומה עושים אם יש שינויים?
                </Link>
              </p>
            </Prose>
          </section>

          {/* Step 10 */}
          <section id="step-10" className="scroll-mt-24" aria-labelledby="s10-h">
            <div className="flex items-center gap-3">
              <StepBadge n={10} />
              <Eyebrow>יום האירוע</Eyebrow>
            </div>
            <h2 id="s10-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלב 10: מנהלים שינויים בהושבה ביום האירוע
            </h2>
            <ul className="mt-6 space-y-2">
              {DAY_OF.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold leading-7 text-[#3F3025]"
                >
                  {item}
                </li>
              ))}
            </ul>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> אורח קיבל הודעה עם
                שולחן 8, ואחרי שינוי הוא משובץ בשולחן 11. צוות הקבלה מסתמך על המפה המעודכנת ומסייע
                להגיע למקום הנכון.{" "}
                <Link
                  href="/info/guides/event-day-checklist"
                  className="font-black text-[#8A642E] underline-offset-4 hover:underline"
                >
                  צ׳קליסט לפני יום האירוע
                </Link>
              </p>
            </Prose>
          </section>

          {/* Example 300 */}
          <section id="example-300" className="scroll-mt-24" aria-labelledby="ex-h">
            <Eyebrow>דוגמה מעשית</Eyebrow>
            <h2 id="ex-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              דוגמה מעשית: איך מסדרים הושבה ל־300 אורחים?
            </h2>
            <Prose>
              <p>300 מאשרי הגעה. חלוקה לדוגמה:</p>
            </Prose>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {GROUP_300.map((g) => (
                <li
                  key={g.label}
                  className="flex items-center justify-between rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm"
                >
                  <span className="font-bold text-[#3F3025]">{g.label}</span>
                  <span className="font-black tabular-nums text-[#2C241C]">{g.n}</span>
                </li>
              ))}
            </ul>
            <Prose>
              <p className="font-bold text-[#2C241C]">תכנון קיבולת לדוגמה:</p>
              <p className="tabular-nums">
                20 שולחנות × 10 = 200 · 10 שולחנות × 12 = 120 · סה״כ 320 מקומות
              </p>
              <p>
                נותרים 20 מקומות לא משובצים בתכנון. מקומות פנויים אינם בהכרח רזרבות שהאולם אישר,
                ואין חובה למלא כל שולחן עד אפס. קבוצות שלא מתחלקות בדיוק (למשל 26 חברים על שולחנות
                של 10) מפוצלות עם שיקול חברתי, בודקים התאמה, משאירים גמישות מתוכננת, וסוגרים רק
                כשסכום המשובצים תואם למאשרים.
              </p>
            </Prose>
          </section>

          {/* Mistakes */}
          <section id="mistakes" className="scroll-mt-24" aria-labelledby="mistakes-h">
            <Eyebrow>טעויות נפוצות</Eyebrow>
            <h2
              id="mistakes-h"
              className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
            >
              10 טעויות שכדאי להימנע מהן
            </h2>
            <ul className="mt-8 space-y-3">
              {MISTAKES.map((m, i) => (
                <li
                  key={m.title}
                  className="rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5"
                >
                  <p className="text-base font-black text-[#2C241C]">
                    <span className="ml-2 text-[#8A642E]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {m.title}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{m.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Checklist */}
          <section id="checklist" className="scroll-mt-24" aria-labelledby="check-h">
            <Eyebrow>לפני שסוגרים</Eyebrow>
            <h2 id="check-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              רשימת בדיקה לפני שסוגרים את ההושבה
            </h2>
            <div className="mt-8">
              <SeatingPlanChecklist id="seating-plan-checklist" />
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="scroll-mt-24" aria-labelledby="faq-h">
            <Eyebrow>שאלות נפוצות</Eyebrow>
            <h2 id="faq-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שאלות על הכנת סידורי הושבה
            </h2>
            <div className="mt-8 space-y-3">
              {SEATING_PLAN_FAQS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-4 open:bg-white"
                >
                  <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none">
                    <span className="flex items-start justify-between gap-4">
                      {item.q}
                      <span className="text-[#C9A45C] transition group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section
            id="cta"
            className="scroll-mt-24 overflow-hidden rounded-[32px] border border-[#E3C990] bg-gradient-to-l from-[#FFF8EA] via-white to-[#F7E8CA] p-7 md:p-10"
            aria-labelledby="cta-h"
          >
            <h2 id="cta-h" className="text-3xl font-black text-[#2C241C] md:text-4xl">
              רוצים להכין את מפת ההושבה בצורה נוחה יותר?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              הכירו את אפשרויות סידורי ההושבה של Invistimo וגלו כיצד ניתן לנהל את השולחנות
              והאורחים במקום אחד — לצד רשימת המוזמנים ואישורי ההגעה.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink
                href="/seating-explained"
                className={ctaPrimary}
                location={`footer_seating:${PATH}`}
              >
                למערכת סידורי ההושבה
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/pricing"
                className={ctaSecondary}
                location={`footer_pricing:${PATH}`}
              >
                לצפייה בחבילות
              </TrackedCtaLink>
            </div>
            <nav aria-label="קישורים קשורים" className="mt-8 flex flex-wrap gap-3 text-sm">
              {[
                {
                  href: "/info/guides/wedding-seating-arrangements",
                  label: "המדריך המלא לסידורי הושבה",
                },
                { href: "/info/guides/seating-cards-vs-qr", label: "פתקיות הושבה או QR דיגיטלי" },
                { href: "/info/guides/table-number-message", label: "הודעת מספר שולחן" },
                { href: "/info/guides/event-day-checklist", label: "לפני יום האירוע" },
                { href: "/try/dashboard/seating", label: "דמו הושבה" },
                { href: "/event-management", label: "ניהול אירוע" },
                { href: "/info/guides", label: "כל המדריכים" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full border border-[#DCC7A6] bg-white/80 px-4 py-2 font-bold text-[#5E4735] underline-offset-4 hover:underline"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </section>
        </div>
      </div>
    </article>
  );
}
