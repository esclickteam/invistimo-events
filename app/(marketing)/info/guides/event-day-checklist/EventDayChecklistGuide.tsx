"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CloudRain,
  Handshake,
  ListChecks,
  MapPinned,
  Package,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import CopyableMessage from "./CopyableMessage";
import EventDayFullChecklist from "./EventDayFullChecklist";
import SimpleMarkChecklist from "./SimpleMarkChecklist";
import TimelineAccordion from "./TimelineAccordion";
import {
  DAY_OF_ITEMS,
  DAY_OF_STORAGE_KEY,
  EQUIPMENT_EVENT,
  EQUIPMENT_PERSONAL,
  EQUIPMENT_STORAGE_KEY,
  LAST24_STORAGE_KEY,
  LAST_24_ITEMS,
  VENDOR_MESSAGE,
} from "./checklistData";
import { EVENT_DAY_FAQS } from "./guideFaqs";

const PATH = "/info/guides/event-day-checklist";
const UPDATED = "26 באוקטובר 2026";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "short-answer", label: "מבוא" },
  { id: "checklist", label: "הצ׳קליסט" },
  { id: "timeline", label: "לוח זמנים" },
  { id: "venue", label: "בדיקת האולם" },
  { id: "vendors", label: "בדיקת ספקים" },
  { id: "payments", label: "תקציב ותשלומים" },
  { id: "guests-rsvp", label: "מוזמנים ואישורים" },
  { id: "seating", label: "סידורי הושבה" },
  { id: "day-schedule", label: "לו״ז ליום האירוע" },
  { id: "roles", label: "חלוקת אחריות" },
  { id: "equipment", label: "ציוד לאריזה" },
  { id: "incidents", label: "תקלות ותרחישים" },
  { id: "last-24", label: "24 השעות האחרונות" },
  { id: "morning", label: "בוקר האירוע" },
  { id: "after", label: "אחרי האירוע" },
  { id: "event-types", label: "סוגי אירועים" },
  { id: "invistimo", label: "איך Invistimo עוזרת" },
  { id: "faq", label: "שאלות נפוצות" },
];

const ANCHOR_LINKS = [
  { href: "#checklist", label: "הצ׳קליסט" },
  { href: "#timeline", label: "לוח הזמנים" },
  { href: "#venue", label: "האולם" },
  { href: "#vendors", label: "ספקים" },
  { href: "#guests-rsvp", label: "אישורי הגעה" },
  { href: "#seating", label: "הושבה" },
  { href: "#incidents", label: "תקלות" },
  { href: "#last-24", label: "יום לפני" },
];

const VENUE_CHECKS = [
  "שעת כניסת ספקים",
  "שעת תחילת קבלת הפנים",
  "שעת החופה",
  "מספר אורחים שהתחייבתם עליו",
  "מועד סגירת מספר המנות",
  "רזרבות ואופן פתיחתן",
  "סידור שולחנות",
  "שולחנות נגישים",
  "מנות מיוחדות ואלרגיות",
  "חניה והסעות",
  "שירותים ונגישות",
  "אזור התארגנות",
  "תוכנית גיבוי לגשם או חום",
  "חשמל וציוד",
  "הגבלות רעש ושעות סיום",
  "תהליך הכנסת ספקים",
  "מי מנהל את האירוע מטעם האולם",
];

const VENDOR_CHECKS = [
  "שם איש קשר",
  "טלפון",
  "שעת הגעה",
  "כתובת מדויקת",
  "נקודת פריקה",
  "ציוד נדרש",
  "מה כלול בהסכם",
  "יתרת תשלום",
  "תנאי ביטול ושינויים",
  "מי איש הקשר ביום האירוע",
];

const GUEST_STEPS = [
  "לבדוק כפילויות",
  "לוודא מספרי טלפון",
  "לבדוק מי אישר הגעה",
  "לבדוק מי לא מגיע",
  "לזהות מי עדיין לא ענה",
  "לבדוק מספר מגיעים לכל רשומה",
  "לתעד תשובות שהתקבלו בטלפון",
  "לוודא שאין סתירות בין הרשימה להושבה",
  "להכין סיכום לאולם",
  "להגדיר אחראי לעדכונים אחרונים",
];

const SEATING_CHECKS = [
  "מספר המקומות בכל שולחן",
  "מספר המשובצים",
  "אורחים שלא שובצו",
  "כפילויות",
  "משפחות וקבוצות",
  "ילדים וכיסאות מיוחדים",
  "נגישות",
  "קרבה לרמקולים",
  "אורחים עם בקשות מיוחדות",
  "רזרבות",
  "שינויים ברגע האחרון",
  "העברת תוכנית מעודכנת לאולם",
];

const SCHEDULE_PRINCIPLES = [
  "להשאיר מרווחי ביטחון",
  "לא לקבוע פעילויות צפופות מדי",
  "לוודא זמני נסיעה",
  "לתאם בין האולם לספקים",
  "למנות אחראי לשינויים",
  "להפיץ רק גרסה עדכנית אחת של הלו״ז",
];

const ROLE_DIFFS = [
  {
    title: "בני הזוג",
    text: "מחליטים החלטות מרכזיות מראש, ומעבירים את ניהול השינויים ביום האירוע לאחראי מוגדר ככל האפשר.",
  },
  {
    title: "מנהל האירוע של האולם",
    text: "מפעיל את המקום, הצוות והלוגיסטיקה בשטח לפי חוזה האולם.",
  },
  {
    title: "מנהל אירוע חיצוני",
    text: "מייצג אתכם, מתאם ספקים מול האולם ושומר על לוח הזמנים מנקודת המבט שלכם.",
  },
  {
    title: "מפיק אירועים",
    text: "עשוי להיות מעורב גם בתכנון, בעיצוב ובתיאום לאורך הדרך — לא רק ביום עצמו.",
  },
  {
    title: "בן משפחה אחראי",
    text: "גיבוי מעשי כשאין מנהל חיצוני: קשר עם ספק, ציוד, או עדכוני הושבה.",
  },
  {
    title: "צוות הושבה וספקים",
    text: "מבצעים לפי הגרסה שקיבלו. בלי גרסה אחת ברורה — נוצרות טעויות.",
  },
];

const INCIDENTS = [
  {
    title: "ספק מאחר",
    steps: [
      "יוצרים קשר",
      "בודקים זמן הגעה",
      "מעדכנים את האחראי",
      "בוחנים שינוי לו״ז",
      "מפעילים חלופה רק אם נדרש",
    ],
  },
  {
    title: "מגיעים יותר אורחים מהצפוי",
    steps: [
      "בודקים רשימת מוזמנים",
      "מתאמים עם האולם",
      "בודקים רזרבות",
      "מעדכנים את אחראי ההושבה",
      "מתעדים שינוי בעלויות אם יש",
    ],
  },
  {
    title: "אורחים מבטלים ברגע האחרון",
    steps: [
      "מעדכנים סטטוס",
      "בודקים השלכות על ההושבה",
      "מעדכנים את האולם אם עדיין אפשר",
      "לא מניחים אוטומטית שמספר המנות יופחת",
    ],
  },
  {
    title: "גשם בחתונה בחוץ",
    steps: [
      "בודקים תחזית",
      "מפעילים תוכנית חלופית שסוכמה מראש",
      "מתאמים ספקים",
      "מעדכנים אורחים רק אם נדרש",
    ],
  },
  {
    title: "תקלה במערכת או באינטרנט",
    steps: [
      "שומרים מראש עותק זמין של מידע חיוני לפי הרשאות",
      "מגדירים איש קשר",
      "משתמשים ברשימת גיבוי מאובטחת",
      "מתעדים שינויים להשלמה מאוחרת",
    ],
  },
];

const MORE_INCIDENTS = [
  { title: "תקלה בחשמל", text: "פונים מיד לאחראי האולם, בודקים גיבוי שסוכם עם DJ/תאורה, ומתעדים השפעה על לו״ז." },
  { title: "שינוי מקום חופה", text: "רק לפי תוכנית גיבוי מוסכמת; מעדכנים צלם, רב/מנחה ואורחים קרובים אם נדרש." },
  { title: "בעיה בהסעות", text: "יוצרים קשר עם נהג/חברה, מעדכנים נקודת איסוף חלופית וממנים אחראי אחד לעדכונים." },
  { title: "אורח עם צורך נגישות", text: "מתאמים מקום ישיבה ונתיב הגעה מראש; ביום האירוע — עדכון קצר לצוות הקבלה." },
  { title: "בעיית ציוד", text: "בודקים מה חסר, מי אחראי להביא, ומה החלופה המיידית בלי לעצור את כל הלו״ז." },
  { title: "אי־הבנה בין ספקים", text: "האחראי המוסמך מכריע לפי הגרסה הכתובה של הלו״ז — לא דיון מול בני הזוג באמצע קבלת פנים." },
];

const INVISTIMO_CAPS = [
  { title: "רשימת מוזמנים", text: "רשומות, מספרי מגיעים ומעקב במקום אחד." },
  { title: "אישורי הגעה", text: "סבבי WhatsApp לפי חבילה; שיחות בחבילות שיחה." },
  { title: "מעקב תשובות ועדכון ידני", text: "כולל תשובות שהגיעו בטלפון — כדי שהמספר לאולם יהיה אחד." },
  { title: "סידורי הושבה", text: "מפה ושיבוץ אם נרכשה תוספת הושבה." },
  { title: "תזכורות והודעות", text: "תזכורת SMS והודעת תודה לפי חבילת ההודעות." },
  { title: "משימות, ספקים ותקציב", text: "במסך ניהול האירוע — לרוב כתוספת «מערכת עצמאית» במחשבון." },
  { title: "שירותי LIVE", text: "כמו הושבה חיה — לפי חבילה והרשאות שסוכמו, לא אוטומטית בכל רכישה." },
  { title: "ליווי מקצועי", text: "ניהול/ליווי באולם הוא שירות נפרד — רק אם סוכם. המערכת לא מחליפה מנהל בשטח." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>;
}

function Mistakes({ items }: { items: string[] }) {
  return (
    <aside className="mt-6 rounded-[24px] border border-[#E6D2AA] bg-[#FFF8EA] px-5 py-4">
      <p className="text-sm font-black text-[#2C241C]">טעויות נפוצות</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-7 text-[#5C4A3A]">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7A56B]" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function SectionImage({ src, alt }: { src: string; alt: string }) {
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
    </figure>
  );
}

function ScrollTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white shadow-[0_10px_28px_rgba(58,39,20,0.05)]">
      {children}
    </div>
  );
}

export default function EventDayChecklistGuide() {
  const reduce = useReducedMotion();
  const fade = reduce
    ? undefined
    : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.45 } };

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
            צ׳קליסט לפני יום האירוע
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">Invistimo · מדריך עבודה</p>
            <GuideToolbar title="מה בודקים לפני יום האירוע? | Invistimo" path={PATH} readingMinutes={42} />
          </div>
          <h1 className="mt-4 max-w-4xl text-[1.75rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.45rem]">
            מה בודקים לפני יום האירוע? הצ׳קליסט המלא לחתונה בלי הפתעות
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-[#5C4A3A] md:text-xl">
            כל מה שצריך לסגור לפני האירוע — מספקים ותשלומים ועד אישורי הגעה, הושבה ולוח הזמנים.
          </p>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              השבועות האחרונים לפני החתונה מלאים בפרטים קטנים שעלולים להישכח: האם כל הספקים אישרו
              הגעה? האם מספר האורחים מעודכן? מי אחראי על ההושבה? האם נותרו תשלומים פתוחים? ומי מטפל
              בבעיה אם משהו משתבש?
            </p>
            <p>
              כדי להגיע ליום האירוע מוכנים, חשוב לעבוד לפי רשימת בדיקה מסודרת, לקבוע מועדים לסגירת
              משימות ולמנות אחראי לכל נושא.
            </p>
            <p>
              במדריך הזה נעבור על ההכנות לפי זמנים, נציג דוגמאות מעשיות ונספק צ׳קליסט שתוכלו להשתמש
              בו בעצמכם.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#checklist" className={ctaPrimary}>
              פתחו את הצ׳קליסט
            </a>
            <a href="#timeline" className={ctaSecondary}>
              עברו ללוח הזמנים
            </a>
            <a href="#guests-rsvp" className={ctaSecondary}>
              איך מנהלים אורחים והושבה?
            </a>
            <TrackedCtaLink href="/try" className={ctaSecondary} location={`hero_try:${PATH}`}>
              גלו את Invistimo
            </TrackedCtaLink>
          </div>
          <p className="mt-4 text-xs font-semibold text-[#8A642E]">עודכן לאחרונה: {UPDATED} (Asia/Jerusalem)</p>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-10 md:px-8">
          <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] shadow-[0_24px_60px_rgba(58,39,20,0.12)]">
            <Image
              src="/images/rsvp/guides/wedding-planning/hero-reception.jpg"
              alt="קבלת פנים באולם חתונה עם שולחנות ערוכים ואווירת ערב חמה"
              width={1600}
              height={900}
              priority
              className="h-auto max-h-[420px] w-full object-cover"
              sizes="100vw"
            />
          </figure>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <StickyToc items={TOC} />
        <div className="min-w-0 space-y-20">
          <motion.section id="short-answer" className="scroll-mt-24" aria-labelledby="short-answer-h" {...fade}>
            <Eyebrow>מבוא</Eyebrow>
            <h2 id="short-answer-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה חובה לבדוק לפני יום החתונה?
            </h2>
            <Prose>
              <p>
                לפני יום החתונה חשוב לוודא שכל הספקים אישרו את פרטי ההגעה וההסכמים, שהתשלומים
                והמקדמות מעודכנים, שלוח הזמנים סופי, שרשימת המוזמנים ואישורי ההגעה מעודכנים, שמפת
                ההושבה מוכנה ושהאולם קיבל את מספר האורחים לפי המועד שסוכם. בנוסף, יש להכין אנשי קשר,
                ציוד אישי, פתרונות למקרים בלתי צפויים וחלוקת אחריות ברורה ליום האירוע.
              </p>
            </Prose>
            <ul className="mt-5 flex flex-wrap gap-2">
              {ANCHOR_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="inline-flex rounded-full border border-[#EADDC8] bg-white px-3.5 py-1.5 text-xs font-bold text-[#5E4735] transition hover:border-[#C7A56B]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section id="checklist" className="scroll-mt-24" aria-labelledby="checklist-h" {...fade}>
            <Eyebrow>כלי עבודה</Eyebrow>
            <h2 id="checklist-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              הצ׳קליסט שלכם ליום האירוע
            </h2>
            <Prose>
              <p>
                זהו כלי עבודה בתוך המדריך: סמנו משימות, סננו לפי סטטוס, פתחו הסבר לכל פריט, והדפיסו
                או שמרו כ־PDF דרך דיאלוג ההדפסה של הדפדפן. ההתקדמות נשמרת מקומית במכשיר זה בלבד —
                בלי התחברות ובלי סנכרון בין מכשירים.
              </p>
            </Prose>
            <div className="mt-8">
              <EventDayFullChecklist />
            </div>
          </motion.section>

          <motion.section id="timeline" className="scroll-mt-24" aria-labelledby="timeline-h" {...fade}>
            <div className="mb-2 flex items-center gap-2 text-[#8A642E]">
              <CalendarClock className="h-5 w-5" aria-hidden />
              <Eyebrow>ציר זמן</Eyebrow>
            </div>
            <h2 id="timeline-h" className="mt-1 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מתי צריך לסגור כל דבר לפני האירוע?
            </h2>
            <Prose>
              <p>
                עבדו אחורה ממועד סגירת המנות מול האולם. אם האולם מבקש מספר שלושה ימים לפני — אל
                תתכננו לסיים אישורים באותו בוקר.
              </p>
            </Prose>
            <div className="mt-8">
              <TimelineAccordion />
            </div>
            <Mistakes
              items={[
                "להתייחס ללוח הזמנים המומלץ כאילו הוא חוזה מחייב",
                "לפתוח שינויי עיצוב גדולים בשבוע האחרון",
                "לשכוח למנות אחראי לפני שמגיעים ל־48 השעות האחרונות",
              ]}
            />
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              להעמקה בתכנון הכולל ראו את{" "}
              <Link href="/info/guides/wedding-planning" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                המדריך המלא לתכנון חתונה
              </Link>
              .
            </p>
          </motion.section>

          <motion.section id="venue" className="scroll-mt-24" aria-labelledby="venue-h" {...fade}>
            <div className="mb-2 flex items-center gap-2 text-[#8A642E]">
              <Building2 className="h-5 w-5" aria-hidden />
              <Eyebrow>אולם</Eyebrow>
            </div>
            <h2 id="venue-h" className="mt-1 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה חייבים לבדוק מול האולם לפני החתונה?
            </h2>
            <Prose>
              <p>
                האולם הוא עוגן הלוגיסטיקה. לפני שסוגרים מספרים עם ספקים ועם אורחים — ודאו מה כתוב
                אצלכם בהסכם ומה נדרש בפועל בימים שלפני האירוע.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> אם האולם מבקש מספר סופי
                של מנות שלושה ימים לפני החתונה, צריך להיערך בהתאם ולא להניח שאפשר לשנות את הכמות ללא
                הגבלה בבוקר האירוע. המועד משתנה בין אולמות.
              </p>
            </Prose>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {VENUE_CHECKS.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 rounded-2xl border border-[#EADDC8] bg-white/90 px-4 py-3 text-sm font-semibold text-[#3F3025]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C7A56B]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <Mistakes
              items={[
                "לסמוך על זיכרון במקום על סעיף בחוזה",
                "לשכוח מנות ילדים / ספקים בספירה",
                "לא לדעת מי מנהל בשטח מטעם האולם",
              ]}
            />
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              להערכת התחייבות מנות ראו{" "}
              <Link href="/info/guides/wedding-venue-guest-guarantee" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                כמה אורחים להתחייב לאולם
              </Link>
              .
            </p>
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/venue.jpg"
              alt="חזית אולם אירועים מוכן לקבלת אורחים"
            />
          </motion.section>

          <motion.section id="vendors" className="scroll-mt-24" aria-labelledby="vendors-h" {...fade}>
            <div className="mb-2 flex items-center gap-2 text-[#8A642E]">
              <Handshake className="h-5 w-5" aria-hidden />
              <Eyebrow>ספקים</Eyebrow>
            </div>
            <h2 id="vendors-h" className="mt-1 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מוודאים שכל הספקים מוכנים ליום האירוע?
            </h2>
            <Prose>
              <p>
                לכל ספק יש לוודא את אותם פרטי בסיס — גם אם כבר דיברתם בחודשים האחרונים. שיחה קצרה
                בשבוע שלפני מונעת חלק גדול מההפתעות.
              </p>
            </Prose>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {VENDOR_CHECKS.map((item) => (
                <li key={item} className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3025]">
                  {item}
                </li>
              ))}
            </ul>
            <ScrollTable>
              <table className="min-w-[560px] w-full text-sm">
                <caption className="sr-only">בדיקות ספקים לדוגמה</caption>
                <thead className="bg-[#FFF8EA] text-right">
                  <tr>
                    <th className="px-4 py-3 font-black text-[#2C241C]">ספק</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">מה בודקים</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">מתי</th>
                  </tr>
                </thead>
                <tbody className="text-[#5C4A3A]">
                  {[
                    ["צלם", "שעת הגעה, מיקום, לוח צילומים", "שבוע לפני"],
                    ["DJ", "שעת הקמה, ציוד, שירי כניסה", "שבוע לפני"],
                    ["עיצוב", "מועד הקמה, פריטים, פירוק", "שבוע לפני"],
                    ["איפור ושיער", "מקום ושעת תחילת עבודה", "שבוע לפני"],
                    ["הסעות", "מסלול, נקודות איסוף, איש קשר", "48–72 שעות לפני"],
                    ["אטרקציות", "זמני הגעה והפעלה", "שבוע לפני"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-[#EADDC8]">
                      {row.map((cell) => (
                        <td key={cell} className="px-4 py-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTable>
            <div className="mt-6">
              <CopyableMessage text={VENDOR_MESSAGE} />
            </div>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              לבחירת ספקים וחוזים ראו{" "}
              <Link href="/info/guides/wedding-vendors-contracts" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מדריך ספקים וחוזים
              </Link>
              .
            </p>
          </motion.section>

          <motion.section id="payments" className="scroll-mt-24" aria-labelledby="payments-h" {...fade}>
            <div className="mb-2 flex items-center gap-2 text-[#8A642E]">
              <Wallet className="h-5 w-5" aria-hidden />
              <Eyebrow>כסף</Eyebrow>
            </div>
            <h2 id="payments-h" className="mt-1 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              אילו תשלומים צריך לבדוק לפני האירוע?
            </h2>
            <Prose>
              <p>
                בודקים מקדמות ששולמו, יתרות פתוחות, מועדי תשלום, אמצעי תשלום, תשלומים ביום האירוע,
                טיפים אם מתוכננים, רזרבה להוצאות בלתי צפויות ותיעוד קבלות.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה חשובה:</strong> לא להעביר תשלום
                נוסף רק על סמך הודעת WhatsApp על שינוי פרטי בנק. יש לאמת שינוי כזה בשיחה למספר מוכר
                של הספק.
              </p>
            </Prose>
            <ScrollTable>
              <table className="min-w-[520px] w-full text-sm">
                <caption className="px-4 py-3 text-right text-xs font-semibold text-[#7A6042]">
                  הסכומים הם דוגמה בלבד ואינם מחירי שוק
                </caption>
                <thead className="bg-[#FFF8EA] text-right">
                  <tr>
                    <th className="px-4 py-3 font-black text-[#2C241C]">ספק</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">מחיר מוסכם</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">שולם</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">יתרה</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["צילום", "8,000 ₪", "3,000 ₪", "5,000 ₪"],
                    ["מוזיקה", "6,000 ₪", "2,000 ₪", "4,000 ₪"],
                    ["עיצוב", "4,000 ₪", "1,500 ₪", "2,500 ₪"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-[#EADDC8] text-[#5C4A3A]">
                      {row.map((cell, i) => (
                        <td key={cell} className={`px-4 py-3 ${i > 0 ? "tabular-nums" : ""}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTable>
          </motion.section>

          <motion.section id="guests-rsvp" className="scroll-mt-24" aria-labelledby="guests-h" {...fade}>
            <div className="mb-2 flex items-center gap-2 text-[#8A642E]">
              <Users className="h-5 w-5" aria-hidden />
              <Eyebrow>אורחים</Eyebrow>
            </div>
            <h2 id="guests-h" className="mt-1 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך סוגרים רשימת מוזמנים לפני האירוע?
            </h2>
            <Prose>
              <p>עשרה צעדים מעשיים לסגירה נקייה לפני מסירת מספר לאולם:</p>
            </Prose>
            <ol className="mt-6 space-y-2">
              {GUEST_STEPS.map((step, i) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3025] md:text-base"
                >
                  <span className="tabular-nums text-[#C7A56B]">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 md:p-6">
              <p className="font-black text-[#2C241C]">דוגמה מספרית</p>
              <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">
                נניח שהוזמנו 400 אנשים: 310 אישרו הגעה, 45 הודיעו שלא יגיעו, ו־45 עדיין לא ענו. אין
                להניח שכל ה־45 שלא ענו יגיעו, וגם לא להניח שאף אחד מהם לא יגיע. מטפלים בהם לפי הזמן
                שנותר, מועדי הסגירה מול האולם ומדיניות הרזרבות.
              </p>
            </div>
            <Prose>
              <p>
                ב־Invistimo אפשר לעקוב אחר סטטוסי אורחים, לעדכן תשובות ידניות (למשל אחרי שיחה) ולהשתמש
                בסבבי אישורי הגעה בהתאם לחבילה.{" "}
                <strong className="font-black text-[#2C241C]">
                  המערכת לא מעבירה אוטומטית מספר סופי לאולם
                </strong>{" "}
                — מייצאים או מוסרים את המספר לפי המועד שהאולם קבע.
              </p>
              <p>
                <Link href="/info/guides/guests-who-dont-reply" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  אורחים שלא עונים
                </Link>
                {" · "}
                <Link href="/info/guides/guest-list" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  ניהול רשימת מוזמנים
                </Link>
                {" · "}
                <Link href="/rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  אישורי הגעה
                </Link>
                {" · "}
                <Link href="/info/guides/when-to-send-rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  מתי שולחים אישורים
                </Link>
              </p>
            </Prose>
            <SectionImage
              src="/images/guides/guest-list/dashboard-guests.jpg"
              alt="מסך רשימת מוזמנים במערכת Invistimo עם סטטוסי הגעה"
            />
          </motion.section>

          <motion.section id="seating" className="scroll-mt-24" aria-labelledby="seating-h" {...fade}>
            <div className="mb-2 flex items-center gap-2 text-[#8A642E]">
              <MapPinned className="h-5 w-5" aria-hidden />
              <Eyebrow>הושבה</Eyebrow>
            </div>
            <h2 id="seating-h" className="mt-1 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה בודקים במפת ההושבה לפני האירוע?
            </h2>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> שולחן של 12 מקומות עם 9
                אורחים משובצים אינו שולחן מלא. מציגים אותו כ־9 מתוך 12, לא כ«מלא».
              </p>
            </Prose>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {SEATING_CHECKS.map((item) => (
                <li key={item} className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3025]">
                  {item}
                </li>
              ))}
            </ul>
            <Prose>
              <p>
                אם נרכשה תוספת הושבה ב־Invistimo, אפשר לראות במפה שולחנות, שיבוצים ואורחים שטרם
                שובצו, ולעדכן לפני שמעבירים תוכנית לאולם. הושבה חיה (LIVE) תלויה בחבילה ובהרשאות —
                אינה זהה אוטומטית להושבה הדיגיטלית במחשבון.
              </p>
              <p>
                <Link href="/info/guides/wedding-seating-arrangements" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  איך מכינים סידורי הושבה
                </Link>
                {" · "}
                <Link href="/seating-explained" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  הושבה ב־Invistimo
                </Link>
              </p>
            </Prose>
            <SectionImage
              src="/images/seating/seating-map.png"
              alt="צילום מסך של מפת הושבה דיגיטלית ב־Invistimo עם שולחנות ושיבוץ אורחים"
            />
          </motion.section>

          <motion.section id="day-schedule" className="scroll-mt-24" aria-labelledby="day-schedule-h" {...fade}>
            <Eyebrow>לו״ז לדוגמה</Eyebrow>
            <h2 id="day-schedule-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך בונים לוח זמנים לחתונה?
            </h2>
            <Prose>
              <p>הטבלה הבאה היא דוגמה בלבד — התאימו לשעות האולם, לצילומים ולמשפחה שלכם.</p>
            </Prose>
            <ScrollTable>
              <table className="min-w-[520px] w-full text-sm">
                <thead className="bg-[#FFF8EA] text-right">
                  <tr>
                    <th className="px-4 py-3 font-black text-[#2C241C]">שעה</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">פעילות</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">אחראי</th>
                  </tr>
                </thead>
                <tbody className="text-[#5C4A3A]">
                  {[
                    ["09:00", "תחילת התארגנות", "בני הזוג"],
                    ["12:00", "צילום התארגנות", "צלם"],
                    ["15:00", "צילומי זוגיות", "זוג וצלם"],
                    ["18:30", "קבלת פנים", "אולם"],
                    ["19:30", "חופה", "גורמים רלוונטיים"],
                    ["20:15", "ארוחה", "אולם"],
                    ["21:15", "ריקודים", "DJ"],
                    ["23:00", "פעילות מיוחדת", "ספק רלוונטי"],
                  ].map((row) => (
                    <tr key={row[0] + row[1]} className="border-t border-[#EADDC8]">
                      {row.map((cell) => (
                        <td key={cell} className="px-4 py-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTable>
            <ul className="mt-6 space-y-2">
              {SCHEDULE_PRINCIPLES.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                  <ListChecks className="mt-1 h-4 w-4 shrink-0 text-[#C7A56B]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section id="roles" className="scroll-mt-24" aria-labelledby="roles-h" {...fade}>
            <Eyebrow>אחריות</Eyebrow>
            <h2 id="roles-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מי אחראי על מה ביום החתונה?
            </h2>
            <Prose>
              <p>
                חלוקת האחריות נקבעת מראש. אין תפקיד אחיד בכל האירועים — חשוב להבין את ההבדלים ולרשום
                שמות.
              </p>
            </Prose>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {ROLE_DIFFS.map((role) => (
                <div key={role.title} className="rounded-[24px] border border-[#E6D2AA] bg-white p-5">
                  <p className="font-black text-[#2C241C]">{role.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{role.text}</p>
                </div>
              ))}
            </div>
            <ScrollTable>
              <table className="min-w-[560px] w-full text-sm">
                <thead className="bg-[#FFF8EA] text-right">
                  <tr>
                    <th className="px-4 py-3 font-black text-[#2C241C]">משימה</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">אחראי ראשי</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">גיבוי</th>
                  </tr>
                </thead>
                <tbody className="text-[#5C4A3A]">
                  {[
                    ["קשר עם הצלם", "מנהל אירוע / איש קשר", "בן משפחה"],
                    ["שינוי לו״ז", "גורם שהוסמך", "מנהל אולם"],
                    ["פרטי הושבה", "אחראי הושבה", "מנהל אירוע"],
                    ["ציוד אישי", "בן משפחה", "חבר קרוב"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-[#EADDC8]">
                      {row.map((cell) => (
                        <td key={cell} className="px-4 py-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTable>
            <Prose>
              <p>
                להרחבה על ניהול מול הפקה ראו את פרק ניהול יום האירוע ב־
                <Link href="/info/guides/wedding-planning#event-day-mgmt" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  מדריך תכנון החתונה
                </Link>
                , ואת{" "}
                <Link href="/event-management" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  עמוד ניהול האירוע
                </Link>
                . אפשר גם לבדוק זמינות לליווי מקצועי מול הצוות — בהתאם למה שסוכם, לא כתחליף אוטומטי
                למנהל בשטח.
              </p>
            </Prose>
          </motion.section>

          <motion.section id="equipment" className="scroll-mt-24" aria-labelledby="equipment-h" {...fade}>
            <div className="mb-2 flex items-center gap-2 text-[#8A642E]">
              <Package className="h-5 w-5" aria-hidden />
              <Eyebrow>אריזה</Eyebrow>
            </div>
            <h2 id="equipment-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              רשימת ציוד שכדאי להכין מראש
            </h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-black text-[#2C241C]">תיק אישי</h3>
                <ul className="mt-3 space-y-2">
                  {EQUIPMENT_PERSONAL.map((item) => (
                    <li key={item} className="text-sm leading-7 text-[#5C4A3A]">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-black text-[#2C241C]">תיק אירוע</h3>
                <ul className="mt-3 space-y-2">
                  {EQUIPMENT_EVENT.map((item) => (
                    <li key={item} className="text-sm leading-7 text-[#5C4A3A]">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-8">
              <SimpleMarkChecklist
                id="equipment-checklist"
                storageKey={EQUIPMENT_STORAGE_KEY}
                title="צ׳קליסט ציוד — סמנו מה נארז"
                items={[...EQUIPMENT_PERSONAL, ...EQUIPMENT_EVENT]}
              />
            </div>
          </motion.section>

          <motion.section id="incidents" className="scroll-mt-24" aria-labelledby="incidents-h" {...fade}>
            <div className="mb-2 flex items-center gap-2 text-[#8A642E]">
              <ShieldAlert className="h-5 w-5" aria-hidden />
              <Eyebrow>תרחישים</Eyebrow>
            </div>
            <h2 id="incidents-h" className="mt-1 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה עושים אם משהו משתבש ביום האירוע?
            </h2>
            <Prose>
              <p>
                תוכנית גיבוי לא מונעת תקלות — היא מונעת פאניקה. להלן תרחישים נפוצים וסדר פעולות קצר.
              </p>
            </Prose>
            <div className="mt-8 space-y-4">
              {INCIDENTS.map((incident, index) => (
                <details
                  key={incident.title}
                  className="group rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 open:bg-white"
                >
                  <summary className="cursor-pointer list-none font-black text-[#2C241C]">
                    <span className="text-[#C7A56B]">תרחיש {index + 1} — </span>
                    {incident.title}
                  </summary>
                  <ol className="mt-4 space-y-2">
                    {incident.steps.map((step, i) => (
                      <li key={step} className="flex gap-2 text-sm leading-7 text-[#5C4A3A]">
                        <span className="font-bold text-[#8A642E]">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {MORE_INCIDENTS.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-[#EADDC8] bg-white p-5">
                  <p className="flex items-center gap-2 font-black text-[#2C241C]">
                    <CloudRain className="h-4 w-4 text-[#C7A56B]" aria-hidden />
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section id="last-24" className="scroll-mt-24" aria-labelledby="last-24-h" {...fade}>
            <Eyebrow>יום לפני</Eyebrow>
            <h2 id="last-24-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה עושים יום לפני החתונה?
            </h2>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">מה חייבים לעשות יום לפני החתונה?</strong>{" "}
                לוודא שספקים אישרו, שמספר האורחים נמסר לאולם, שההושבה והלו״ז מעודכנים, שאנשי הקשר
                והציוד מוכנים — ואז לנוח. זה לא הזמן לפתוח שינויים גדולים.
              </p>
            </Prose>
            <div className="mt-8">
              <SimpleMarkChecklist
                id="last-24-checklist"
                storageKey={LAST24_STORAGE_KEY}
                title="רשימת 24 השעות האחרונות"
                items={LAST_24_ITEMS}
                showPrint
              />
            </div>
          </motion.section>

          <motion.section id="morning" className="scroll-mt-24" aria-labelledby="morning-h" {...fade}>
            <Eyebrow>בוקר האירוע</Eyebrow>
            <h2 id="morning-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה צריך לבדוק בבוקר האירוע?
            </h2>
            <Prose>
              <p>
                צ׳קליסט קצר לטלפון. המטרה היא שבני הזוג לא יצטרכו לנהל בעצמם כל תקלה בזמן האירוע, אם
                הוגדר גורם אחראי לכך.
              </p>
            </Prose>
            <div className="mt-8">
              <SimpleMarkChecklist
                id="morning-checklist"
                storageKey={DAY_OF_STORAGE_KEY}
                title="צ׳קליסט בוקר האירוע"
                items={DAY_OF_ITEMS}
              />
            </div>
          </motion.section>

          <motion.section id="after" className="scroll-mt-24" aria-labelledby="after-h" {...fade}>
            <Eyebrow>אחרי</Eyebrow>
            <h2 id="after-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה חשוב לבדוק גם אחרי שהאירוע נגמר?
            </h2>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                "החזרת ציוד מושכר",
                "תשלומים אחרונים",
                "איסוף חפצים אישיים",
                "בדיקת חיובים",
                "קבלת תמונות וסרטונים לפי ההסכם",
                "הודעות תודה",
                "סגירת משימות מול ספקים",
                "שמירת מסמכים ואסמכתאות",
              ].map((item) => (
                <li key={item} className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3025]">
                  {item}
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section id="event-types" className="scroll-mt-24" aria-labelledby="event-types-h" {...fade}>
            <Eyebrow>התאמה</Eyebrow>
            <h2 id="event-types-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם הצ׳קליסט מתאים גם לחינה, בר מצווה וברית?
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[#E6D2AA] bg-white p-5">
                <h3 className="font-black text-[#2C241C]">חתונה</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                  חופה, ספקים רבים, אישורי הגעה בהיקף גדול והושבה מורכבת. כאן לוח הזמנים המלא והצ׳קליסט
                  הארוך הכי רלוונטיים.
                </p>
              </div>
              <div className="rounded-[24px] border border-[#E6D2AA] bg-white p-5">
                <h3 className="font-black text-[#2C241C]">חינה</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                  דגש על טקס, לבוש וציוד מיוחד, ותיאום משפחתי צפוף. פחות «מנות לאולם גדול», יותר רגעי
                  במה ולוגיסטיקת פריטים.
                </p>
              </div>
              <div className="rounded-[24px] border border-[#E6D2AA] bg-white p-5">
                <h3 className="font-black text-[#2C241C]">בר / בת מצווה</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                  תוכנית טקס, אורחים צעירים, הסעות ואישורי הורים כשנדרש. חשובים פיקוח, זמני הגעה־חזרה
                  ומספר מגיעים מדויק מול המקום.
                </p>
              </div>
              <div className="rounded-[24px] border border-[#E6D2AA] bg-white p-5">
                <h3 className="font-black text-[#2C241C]">ברית / בריתה</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                  לוחות זמנים קצרים יותר וגמישות מול נסיבות משפחתיות. עדיין סוגרים מיקום, הגעה
                  ותיאומים מהירים — בלי להעתיק את כל תהליך החתונה.
                </p>
              </div>
            </div>
          </motion.section>

          <motion.section id="invistimo" className="scroll-mt-24" aria-labelledby="invistimo-h" {...fade}>
            <div className="mb-2 flex items-center gap-2 text-[#8A642E]">
              <ClipboardList className="h-5 w-5" aria-hidden />
              <Eyebrow>Invistimo</Eyebrow>
            </div>
            <h2 id="invistimo-h" className="mt-1 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              כל פרטי האירוע החשובים במקום אחד
            </h2>
            <Prose>
              <p>
                המדריך הוא תוכנית עבודה כללית. המערכת עוזרת ליישם את החלקים הדיגיטליים — בלי להחליף
                מנהל אירוע בשטח אלא אם סוכם ליווי.
              </p>
            </Prose>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {INVISTIMO_CAPS.map((cap) => (
                <div key={cap.title} className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                  <p className="font-black text-[#2C241C]">{cap.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{cap.text}</p>
                </div>
              ))}
            </div>
            <SectionImage
              src="/images/guides/guest-list/seating-map.png"
              alt="תצוגת הושבה ושיבוץ אורחים בממשק Invistimo"
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedCtaLink href="/pricing" className={ctaPrimary} location={`invistimo_pricing:${PATH}`}>
                חבילות ומחירים
              </TrackedCtaLink>
              <TrackedCtaLink href="/try" className={ctaSecondary} location={`invistimo_try:${PATH}`}>
                נסו את המערכת
              </TrackedCtaLink>
              <TrackedCtaLink href="/event-management" className={ctaSecondary} location={`invistimo_em:${PATH}`}>
                ניהול אירוע
              </TrackedCtaLink>
              <TrackedCtaLink href="/invitations/chatuna" className={ctaSecondary} location={`invistimo_inv:${PATH}`}>
                הזמנות דיגיטליות
              </TrackedCtaLink>
            </div>
          </motion.section>

          <motion.section id="faq" className="scroll-mt-24" aria-labelledby="faq-h" {...fade}>
            <Eyebrow>FAQ</Eyebrow>
            <h2 id="faq-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שאלות נפוצות לפני יום האירוע
            </h2>
            <div className="mt-8 space-y-3">
              {EVENT_DAY_FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-4 open:bg-[#FFFDF8]"
                >
                  <summary className="cursor-pointer list-none text-base font-black text-[#2C241C]">
                    {faq.q}
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">{faq.a}</p>
                </details>
              ))}
            </div>
          </motion.section>

          <section className="rounded-[32px] border border-[#E6D2AA] bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-6 py-10 text-white md:px-10">
            <h2 className="text-2xl font-black md:text-3xl">מוכנים לסגור את הפרטים במקום אחד?</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/85">
              רשימת מוזמנים, אישורי הגעה, הושבה לפי תוספת, ותזכורות לפי חבילה — בלי להחליף מפיק באולם
              אלא אם סוכם ליווי.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedCtaLink
                href="/pricing"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-black text-[#3A2B22]"
                location={`footer_pricing:${PATH}`}
              >
                למחשבון החבילות
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/info/guides"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-8 py-3.5 text-base font-black text-white"
                location={`footer_guides:${PATH}`}
              >
                מרכז המדריכים
              </TrackedCtaLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/75">
              <li>
                <Link href="/info/guides/wedding-planning" className="hover:text-white">
                  תכנון חתונה
                </Link>
              </li>
              <li>
                <Link href="/info/guides/wedding-seating-arrangements" className="hover:text-white">
                  סידורי הושבה
                </Link>
              </li>
              <li>
                <Link href="/info/guides/guests-who-dont-reply" className="hover:text-white">
                  אורחים שלא עונים
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  יצירת קשר
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <a
        href="#checklist"
        className="fixed bottom-5 left-5 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#E6D2AA] bg-white/95 text-[#8A642E] shadow-lg backdrop-blur print:hidden md:bottom-8 md:left-8"
        aria-label="חזרה לצ׳קליסט"
      >
        <ListChecks className="h-5 w-5" aria-hidden />
      </a>
    </article>
  );
}
