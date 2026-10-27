"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import GuideDemoVideo from "./GuideDemoVideo";
import ReceptionMethodsDemo from "./ReceptionMethodsDemo";
import { SEATING_CARDS_VS_QR_FAQS } from "./guideFaqs";

const PATH = "/info/guides/seating-cards-vs-qr";
const H1 = "פתקיות הושבה או QR דיגיטלי? המדריך המלא לקבלת פנים והושבת אורחים באירוע";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "intro", label: "למה זה חשוב" },
  { id: "printed-cards", label: "פתקיות הושבה" },
  { id: "digital-team", label: "הושבה עם צוות" },
  { id: "personal-qr", label: "QR אישי" },
  { id: "demo", label: "הדגמה אינטראקטיבית" },
  { id: "compare", label: "טבלת השוואה" },
  { id: "videos", label: "סרטוני הדגמה" },
  { id: "which-method", label: "איזו שיטה מתאימה" },
  { id: "prepare", label: "הכנה לקבלת פנים" },
  { id: "mistakes", label: "טעויות נפוצות" },
  { id: "faq", label: "שאלות נפוצות" },
  { id: "summary", label: "לסיכום" },
];

const COMPARE_ROWS = [
  ["איתור מוזמנים", "ידני בין פתקיות", "חיפוש במערכת", "סריקת קוד + גיבוי חיפוש"],
  ["מספר שולחן", "פתק מודפס", "נמסר בעל פה על ידי נציג", "מוצג בטלפון אחרי אישור הגעה"],
  ["עדכוני הושבה", "תיקון ידני", "דרך המערכת", "דרך המערכת"],
  ["מעקב הגעה", "דורש רישום נפרד", "אפשרי במערכת", "אפשרי בסריקה / אישור"],
  ["צורך בהדפסה", "כן", "לא", "לא"],
  ["תלות בטלפון האורח", "לא", "לא", "כן, להצגת הקוד"],
  ["טיפול באורח ללא קישור", "ידני", "חיפוש במערכת", "נדרש מסלול חלופי"],
] as const;

const PREPARE_STEPS = [
  {
    title: "מסיימים להכין את רשימת המוזמנים",
    text: "בודקים שאין כפילויות, שמספרי הטלפון מעודכנים ושכל משפחה או קבוצה מופיעה בצורה מסודרת.",
  },
  {
    title: "אוספים אישורי הגעה",
    text: "משתמשים בנתוני אישורי ההגעה כדי להבין כמה אורחים צפויים להגיע ולתכנן את ההושבה בהתאם — בלי לבלבל בין אישור מראש להגעה בפועל.",
  },
  {
    title: "מכינים מפת שולחנות",
    text: "מגדירים את השולחנות, הקיבולת של כל שולחן ואת המוזמנים המשויכים אליו.",
  },
  {
    title: "בודקים אורחים שלא שובצו",
    text: "לפני האירוע עוברים על רשימת האורחים שעדיין לא שובצו ומוודאים שלכל מוזמן רלוונטי יש פתרון הושבה.",
  },
  {
    title: "מתאמים עם האולם",
    text: "מוודאים שמפת השולחנות במערכת תואמת את סידור האולם בפועל ואת מספור השולחנות.",
  },
  {
    title: "מכינים את צוות קבלת הפנים",
    text: "הצוות צריך לדעת כיצד לחפש אורחים, לסמן הגעה, לטפל בשינויים ולהפנות מקרים חריגים לאחראי.",
  },
  {
    title: "נערכים לשינויים ברגע האחרון",
    text: "מגדירים מראש מי מוסמך לאשר שינויי שולחנות, כיצד מטפלים באורח שלא מופיע ברשימה ומה עושים במקרה של תקלת תקשורת.",
  },
] as const;

const MISTAKES = [
  {
    title: "הסתמכות על רשימה לא מעודכנת",
    detail:
      "רשימה שאינה כוללת שינויים אחרונים עלולה לגרום לכך שאורח יופיע עם מספר שולחן שגוי.",
  },
  {
    title: "אי־הבחנה בין אישור הגעה לנוכחות בפועל",
    detail:
      "אורח שאישר הגעה לא בהכרח הגיע לאולם. חשוב להפריד בין שני הנתונים.",
  },
  {
    title: "שיבוץ שולחנות מעבר לקיבולת",
    detail:
      "לפני סיום ההושבה יש לבדוק את מספר המקומות בכל שולחן ואת כמות המוזמנים ששובצו אליו.",
  },
  {
    title: "היעדר תהליך למקרים חריגים",
    detail:
      "חשוב להיערך מראש לאורחים שלא מוצאים את הקישור, מגיעים עם אדם נוסף או מבקשים לשנות שולחן.",
  },
  {
    title: "הסתמכות על QR בלבד",
    detail:
      "גם כאשר משתמשים בסריקה, כדאי להחזיק דרך חלופית לאיתור אורחים במערכת.",
  },
] as const;

const RELATED = [
  { href: "/seating-explained", label: "סידורי הושבה" },
  { href: "/seating-explained#staff", label: "צוות הושבה באולם" },
  { href: "/seating-explained#live", label: "הושבה LIVE" },
  { href: "/rsvp", label: "אישורי הגעה" },
  { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
  { href: "/info/guides/seating-plan", label: "איך מכינים סידורי הושבה" },
  { href: "/info/guides/wedding-seating-arrangements", label: "מדריך סידורי הושבה" },
  { href: "/info/guides/table-number-message", label: "הודעת מספר שולחן" },
  { href: "/info/guides/event-day-checklist", label: "צ׳קליסט לפני יום האירוע" },
  { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
  { href: "/pricing", label: "מחירון ומחשבון" },
  { href: "/try/dashboard/check-in", label: "דמו קבלת פנים" },
  { href: "/try/dashboard/seating", label: "דמו מפת הושבה" },
  { href: "/info/guides", label: "מרכז המדריכים" },
];

const DEMO_VIDEOS = [
  {
    src: "/marketing/videos/guides/reception-guest-search.webm",
    poster: "/marketing/videos/guides/reception-guest-search-poster.jpg",
    title: "איתור אורח בקבלת פנים — הדגמה עם נתונים פיקטיביים",
    caption: "חיפוש אורח במסך קבלת הפנים · נתוני דמו בלבד",
  },
  {
    src: "/marketing/videos/guides/reception-mark-arrival.webm",
    poster: "/marketing/videos/guides/reception-mark-arrival-poster.jpg",
    title: "סימון הגעה בפועל ומספר שולחן לנציג",
    caption: "סימון הגעה והצגת מספר שולחן לנציג · נתוני דמו בלבד",
  },
  {
    src: "/marketing/videos/guides/seating-reassign.webm",
    poster: "/marketing/videos/guides/seating-reassign-poster.jpg",
    title: "שינוי שיבוץ במפת ההושבה",
    caption: "העברת אורח בין שולחנות במפת ההושבה · נתוני דמו בלבד",
  },
  {
    src: "/marketing/videos/guides/qr-checkin-table.webm",
    poster: "/marketing/videos/guides/qr-checkin-table-poster.jpg",
    title: "QR אישי, אישור הגעה והצגת מספר שולחן בטלפון",
    caption: "מסך QR → אישור צוות → מספר שולחן בטלפון · נתוני דמו בלבד",
  },
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>;
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="mt-6 rounded-[24px] border border-[#E6D2AA] bg-[#FFF8EA] px-5 py-4 text-sm leading-7 text-[#5C4A3A] md:text-base">
      <p className="font-black text-[#2C241C]">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </aside>
  );
}

export default function ReceptionSeatingGuide() {
  const reduce = useReducedMotion();

  return (
    <article
      className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#FFF8EA_0%,#F4EBD9_42%,#EFE2CF_100%)] text-[#2C241C]"
      dir="rtl"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A962' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <header className="relative border-b border-[#E6D2AA]/80">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:px-8 lg:pb-16 lg:pt-14">
          <div>
            <p className="text-sm font-black tracking-[0.18em] text-[#8A642E]">INVISTIMO · מדריך</p>
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="mt-4 max-w-3xl text-[2rem] font-black leading-[1.15] text-[#2C241C] md:text-5xl"
            >
              {H1}
            </motion.h1>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mt-5 max-w-2xl text-base leading-8 text-[#5C4A3A] md:text-lg"
            >
              איך מכניסים מאות אורחים לאולם בצורה מסודרת, מונעים תורים בכניסה ודואגים שכל אורח
              יידע בדיוק היכן הוא יושב — עם צוות דיגיטלי או עם QR אישי, בלי פתקיות הושבה של
              Invistimo.
            </motion.p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink href="#demo" className={ctaPrimary} location={`hero_demo:${PATH}`}>
                לצפייה בהדגמה
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/seating-explained"
                className={ctaSecondary}
                location={`hero_seating:${PATH}`}
              >
                לסידורי הושבה
              </TrackedCtaLink>
            </div>
            <div className="mt-8">
              <GuideToolbar title={H1} path={PATH} readingMinutes={18} />
            </div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative min-h-[280px] overflow-hidden rounded-[32px] border border-[#E6D2AA] shadow-[0_28px_60px_rgba(58,39,20,0.16)] md:min-h-[360px]"
          >
            <Image
              src="/images/rsvp/guides/wedding-planning/hero-reception.jpg"
              alt="קבלת פנים באולם אירועים — אורחים מגיעים לערב חגיגי"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 48vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2C241C]/55 via-transparent to-transparent" />
          </motion.div>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 lg:py-14">
        <StickyToc items={TOC} />

        <div className="min-w-0 space-y-16 md:space-y-20">
          <section id="intro" className="scroll-mt-24">
            <Eyebrow>פתיחה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              למה קבלת הפנים קובעת את חוויית הכניסה
            </h2>
            <Prose>
              <p>
                קבלת הפנים היא אחד הרגעים החשובים באירוע. האורחים מגיעים, מחפשים את השולחן שלהם,
                פוגשים חברים ובני משפחה ורוצים להתחיל ליהנות מהערב.
              </p>
              <p>
                כאשר סידורי ההושבה אינם מאורגנים היטב, עלולים להיווצר תורים, בלבול במספרי שולחנות
                ועומס על צוות קבלת הפנים.
              </p>
              <p>
                בעבר נהגו להשתמש בפתקיות מודפסות עם מספרי שולחנות. כיום קיימות שיטות דיגיטליות
                המאפשרות לאתר מוזמנים, לעדכן הגעה בזמן אמת ולהציג את מספר השולחן באמצעות מערכת
                ממוחשבת או QR אישי.
              </p>
              <p>
                במדריך הזה נסביר איך כל שיטה עובדת, מהם היתרונות והחסרונות שלה, ואיך לבחור את
                הפתרון המתאים לאירוע שלכם — לפי מה ש־Invistimo באמת מציעה.
              </p>
            </Prose>
          </section>

          <section id="printed-cards" className="scroll-mt-24">
            <Eyebrow>שיטה מסורתית</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מהן פתקיות הושבה לחתונה?
            </h2>
            <Prose>
              <p>
                פתקיות הושבה הן כרטיסים מודפסים שעליהם מופיעים שמות המוזמנים ומספרי השולחנות
                שלהם. בשיטה המסורתית, צוות קבלת הפנים מאתר את שם האורח ברשימה או בין הפתקיות
                ומוסר לו כרטיס עם מספר השולחן.
              </p>
            </Prose>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                <h3 className="text-lg font-black text-[#2C241C]">היתרונות</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                  <li>• פתרון מוכר ופשוט להבנה</li>
                  <li>• אינו מחייב שימוש בטלפון של האורח</li>
                  <li>• האורח מקבל מספר שולחן כתוב שאפשר לשמור</li>
                </ul>
              </div>
              <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                <h3 className="text-lg font-black text-[#2C241C]">החסרונות</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                  <li>• יש צורך להכין ולהדפיס את הפתקיות</li>
                  <li>• שינויים של הרגע האחרון מחייבים תיקונים ידניים</li>
                  <li>• פתקיות עלולות ללכת לאיבוד</li>
                  <li>• חיפוש ידני עלול להאט את הכניסה</li>
                  <li>• קשה יותר לקבל תמונת מצב מדויקת של מי כבר הגיע</li>
                  <li>• טעויות בהדפסה עלולות לגרום לבלבול</li>
                </ul>
              </div>
            </div>
            <Tip title="חשוב לדעת">
              <p>
                Invistimo אינה מפעילה שיטת חלוקת פתקיות. היא מציעה פתרונות הושבה דיגיטליים —
                תכנון במפה, קבלת פנים עם צוות במערכת, ובהתאם לשירות גם מסלול QR אישי.
              </p>
            </Tip>
          </section>

          <section id="digital-team" className="scroll-mt-24">
            <Eyebrow>מסלול Invistimo</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך עובדת הושבה דיגיטלית עם צוות קבלת פנים?
            </h2>
            <Prose>
              <p>
                בשיטה זו צוות קבלת הפנים משתמש במערכת דיגיטלית במקום ברשימות מודפסות ובפתקיות.
                הנציג מאתר את האורח, מסמן הגעה בפועל ומוסר את מספר השולחן בעל פה.
              </p>
            </Prose>
            <ol className="mt-8 space-y-3">
              {[
                "האורח מגיע לעמדת קבלת הפנים",
                "הנציג שואל לשמו",
                "הנציג מאתר את האורח במערכת",
                "הנציג מסמן שהאורח הגיע",
                "מספר השולחן מופיע במערכת לנציג",
                "הנציג מוסר לאורח את מספר השולחן ומכוון אותו",
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm md:text-base"
                >
                  <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                  <span className="font-semibold text-[#2C241C]">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  t: "איתור מהיר",
                  d: "ניתן לחפש אורחים בלי לדפדף ברשימות ארוכות.",
                },
                {
                  t: "עדכונים בזמן אמת",
                  d: "שינויי הושבה שנשמרו במערכת זמינים לצוות בהתאם להרשאותיו.",
                },
                {
                  t: "מעקב הגעה",
                  d: "אפשר להבחין בין אורחים שאישרו מראש לבין אורחים שהגיעו בפועל.",
                },
                {
                  t: "פחות ניירת",
                  d: "אין צורך להדפיס פתקית אישית לכל אורח.",
                },
                {
                  t: "טיפול בשינויים",
                  d: "ניתן לטפל בשינויים באמצעות המערכת ולתאם אותם עם האולם.",
                },
              ].map((item) => (
                <div key={item.t} className="rounded-[22px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                  <h3 className="text-base font-black text-[#2C241C]">{item.t}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">{item.d}</p>
                </div>
              ))}
            </div>
            <Tip title="למי השיטה מתאימה?">
              <p>
                לחתונות, בר ובת מצווה, אירועים משפחתיים, אירועים עסקיים ואירועים שבהם רוצים צוות
                קבלת פנים מסודר ללא פתקיות. זמינות צוות פיזי ו־LIVE תלויה בחבילה ובהצעה — ראו{" "}
                <Link href="/seating-explained#staff" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  צוות הושבה
                </Link>
                .
              </p>
            </Tip>
          </section>

          <section id="personal-qr" className="scroll-mt-24">
            <Eyebrow>מסלול Check-in</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מהו QR אישי להושבה באירוע?
            </h2>
            <Prose>
              <p>
                QR אישי הוא קוד דיגיטלי המשויך לאורח או לרשומת מוזמנים. האורח מקבל קישור או קוד
                אישי, ובכניסה לאירוע מציג אותו לצוות.
              </p>
              <p>
                במסלול QR של Invistimo, הצוות סורק או מאשר את הקוד, ההגעה נרשמת במערכת, ורק אז —
                במסך התודה בטלפון — יכול להופיע מספר השולחן אם האורח שובץ. פתיחת הקישור לבד אינה
                מסמנת הגעה ואינה מציגה את השולחן מראש.
              </p>
            </Prose>
            <ol className="mt-8 space-y-3">
              {[
                "האורח מקבל קישור אישי לקראת האירוע",
                "בכניסה הוא פותח את הקישור ומציג את ה־QR",
                "הנציג סורק או מאשר את הקוד",
                "המערכת מזהה את הרשומה המתאימה",
                "ההגעה מתעדכנת",
                "מספר השולחן מוצג בטלפון האורח במסך התודה, אם קיים שיבוץ",
                "האורח ממשיך לשולחן שלו",
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm md:text-base"
                >
                  <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                  <span className="font-semibold text-[#2C241C]">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                <h3 className="text-lg font-black text-[#2C241C]">היתרונות</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                  <li>• חוויה דיגיטלית עם קישור אישי במקום פתקית</li>
                  <li>• סריקה תקינה עשויה לקצר את זמן האיתור</li>
                  <li>• מספר השולחן יכול להופיע ישירות בטלפון אחרי האישור</li>
                  <li>• מעקב מסודר אחר רישום ההגעה</li>
                  <li>• פחות הדפסות</li>
                </ul>
              </div>
              <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                <h3 className="text-lg font-black text-[#2C241C]">מה חשוב להביא בחשבון?</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                  <li>• חלק מהאורחים עלולים להגיע ללא טלפון זמין</li>
                  <li>• לא כל אורח ימצא את הקישור בזמן</li>
                  <li>• נדרשת היערכות לתקלות תקשורת או סריקה</li>
                  <li>• חשוב שיהיה תהליך חלופי לאיתור ידני</li>
                  <li>• ברשומות משפחתיות צריך להגדיר טיפול בהגעה חלקית</li>
                </ul>
              </div>
            </div>
            <Tip title="גיבוי תמיד">
              <p>
                גם כאשר משתמשים ב־QR, מומלץ להיערך לאפשרות של איתור אורחים באמצעות צוות קבלת
                הפנים. שירות ה־QR הוא תוספת/מודול לפי מה שנפתח לאירוע — לא חלק אוטומטי מכל חבילת
                הושבה.
              </p>
            </Tip>
          </section>

          <section id="demo" className="scroll-mt-24">
            <Eyebrow>השוו בעצמכם</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שלוש שיטות — הדגמה אינטראקטיבית
            </h2>
            <Prose>
              <p>
                עברו בין הלשוניות: פתקיות להשוואה בלבד, הושבה עם צוות לפי מסך קבלת הפנים, ו־QR
                אישי עם הצגת שולחן רק אחרי אישור הגעה.
              </p>
            </Prose>
            <div className="mt-8">
              <ReceptionMethodsDemo />
            </div>
          </section>

          <section id="compare" className="scroll-mt-24">
            <Eyebrow>השוואה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              פתקיות, צוות דיגיטלי ו־QR
            </h2>
            <Prose>
              <p>טבלה להשוואה מהירה. במובייל אפשר לגלול אופקית.</p>
            </Prose>
            <div className="-mx-1 mt-6 overflow-x-auto pb-2">
              <table className="min-w-[720px] w-full border-collapse text-right text-sm md:text-base">
                <thead>
                  <tr className="border-b border-[#E6D2AA] bg-[#FFF8EA]">
                    <th className="px-3 py-3 font-black text-[#2C241C]">מאפיין</th>
                    <th className="px-3 py-3 font-black text-[#2C241C]">פתקיות</th>
                    <th className="px-3 py-3 font-black text-[#2C241C]">צוות דיגיטלי</th>
                    <th className="px-3 py-3 font-black text-[#2C241C]">QR אישי</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row[0]} className="border-b border-[#EADDC8] bg-[#FFFDF8]/80">
                      {row.map((cell, idx) => (
                        <td
                          key={`${row[0]}-${idx}`}
                          className={`px-3 py-3 leading-7 text-[#5C4A3A] ${
                            idx === 0 ? "font-black text-[#2C241C]" : "font-semibold"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile stacked cards — extra clarity beyond horizontal scroll */}
            <div className="mt-6 grid gap-3 md:hidden">
              {COMPARE_ROWS.map((row) => (
                <div key={`m-${row[0]}`} className="rounded-[20px] border border-[#E6D2AA] bg-[#FFFDF8] p-4">
                  <p className="font-black text-[#2C241C]">{row[0]}</p>
                  <dl className="mt-3 space-y-2 text-sm leading-6 text-[#5C4A3A]">
                    <div>
                      <dt className="font-bold text-[#8A642E]">פתקיות</dt>
                      <dd>{row[1]}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-[#8A642E]">צוות דיגיטלי</dt>
                      <dd>{row[2]}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-[#8A642E]">QR אישי</dt>
                      <dd>{row[3]}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          <section id="videos" className="scroll-mt-24">
            <Eyebrow>הדגמות אמיתיות</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              סרטונים מסביבת בדיקה עם נתונים פיקטיביים
            </h2>
            <Prose>
              <p>
                ההקלטות צולמו מסביבת הדמו המבודדת — לא מאירועי לקוחות. בכל סרטון: ניגון אוטומטי
                מושתק, לולאה, שמירה על יחס הממדים ופקדי ניגון להשהיה.
              </p>
            </Prose>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {DEMO_VIDEOS.map((video) => (
                <GuideDemoVideo
                  key={video.src}
                  src={video.src}
                  poster={video.poster}
                  title={video.title}
                  caption={video.caption}
                />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <TrackedCtaLink
                href="/try/dashboard/check-in"
                className={ctaSecondary}
                location={`videos_checkin:${PATH}`}
              >
                נסו בעצמכם בדמו קבלת פנים
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/try/dashboard/seating"
                className={ctaSecondary}
                location={`videos_seating:${PATH}`}
              >
                לדמו מפת הושבה
              </TrackedCtaLink>
            </div>
          </section>

          <section id="which-method" className="scroll-mt-24">
            <Eyebrow>בחירה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איזו שיטה מתאימה לאירוע שלכם?
            </h2>
            <Prose>
              <p>אין שיטה אחת שמתאימה לכל אירוע.</p>
              <p>
                אם אתם מעדיפים קבלת פנים שבה נציג אנושי מאתר את האורחים ומכוון אותם, הושבה
                דיגיטלית עם צוות היא אפשרות מתאימה.
              </p>
              <p>
                אם אתם רוצים לשלב קוד אישי וחוויית כניסה דיגיטלית, אפשר לשקול מסלול QR — כשהוא
                זמין לאירוע — עם גיבוי של חיפוש ידני.
              </p>
              <p>
                באירועים עם קהל מגוון, כדאי להיערך גם למקרים שבהם אורח אינו משתמש בטלפון חכם או
                מתקשה לפתוח את הקישור.
              </p>
            </Prose>
          </section>

          <section id="prepare" className="scroll-mt-24">
            <Eyebrow>הכנה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מתכוננים לקבלת הפנים?
            </h2>
            <div className="mt-8 space-y-4">
              {PREPARE_STEPS.map((step, i) => (
                <div key={step.title} className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                  <p className="text-sm font-black text-[#8A642E]">שלב {i + 1}</p>
                  <h3 className="mt-1 text-lg font-black text-[#2C241C]">{step.title}</h3>
                  <p className="mt-2 text-base leading-7 text-[#5C4A3A]">{step.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 overflow-hidden rounded-[28px] border border-[#E6D2AA]">
              <Image
                src="/images/seating/seating-map.webp"
                alt="מפת הושבה דיגיטלית — צילום מסך מסביבת הדגמה"
                width={1200}
                height={720}
                className="h-auto w-full object-cover"
              />
              <p className="bg-[#FFF8EA] px-4 py-3 text-sm font-semibold text-[#5C4A3A]">
                צילום מסך ממפת הושבה · נתוני הדגמה בלבד
              </p>
            </div>
          </section>

          <section id="mistakes" className="scroll-mt-24">
            <Eyebrow>למידה מניסיון</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              טעויות נפוצות בקבלת פנים
            </h2>
            <div className="mt-8 grid gap-4">
              {MISTAKES.map((item, i) => (
                <div key={item.title} className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                  <p className="text-sm font-black text-[#8A642E]">טעות {i + 1}</p>
                  <h3 className="mt-1 text-lg font-black text-[#2C241C]">{item.title}</h3>
                  <p className="mt-2 text-base leading-7 text-[#5C4A3A]">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="faq" className="scroll-mt-24">
            <Eyebrow>שאלות ותשובות</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שאלות נפוצות על פתקיות, צוות ו־QR
            </h2>
            <div className="mt-8 space-y-3">
              {SEATING_CARDS_VS_QR_FAQS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] px-5 py-4 open:shadow-[0_14px_36px_rgba(58,39,20,0.06)]"
                >
                  <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-3">
                      <span>{item.q}</span>
                      <span className="mt-0.5 text-[#C7A56B] transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-base leading-8 text-[#5C4A3A]">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="summary" className="scroll-mt-24">
            <Eyebrow>סיכום</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              לסיכום — איך בוחרים נכון?
            </h2>
            <Prose>
              <p>
                פתקיות הושבה הן פתרון מסורתי, אך הן דורשות הדפסה וטיפול ידני בשינויים. Invistimo
                אינה מחלקת אותן.
              </p>
              <p>
                הושבה דיגיטלית עם צוות מאפשרת לאתר אורחים במערכת ולכוון אותם ללא פתקיות — עם מסירת
                מספר שולחן בעל פה.
              </p>
              <p>
                QR אישי מוסיף אפשרות לזיהוי באמצעות סריקה ולהצגת מספר שולחן בטלפון אחרי אישור
                ההגעה, בהתאם למסלול ולשיבוץ.
              </p>
              <p>
                הבחירה הנכונה תלויה בגודל האירוע, באופי הקהל, בשירותים שהוזמנו ובדרך שבה רוצים
                לנהל את קבלת הפנים.
              </p>
            </Prose>
            <div className="mt-8 rounded-[28px] border border-[#E6D2AA] bg-[#2C241C] px-6 py-8 text-[#FFF8EF]">
              <h3 className="text-2xl font-black">מתכננים אירוע ורוצים קבלת פנים מסודרת?</h3>
              <p className="mt-3 text-base leading-8 text-[#EADBC4]">
                גלו את פתרונות אישורי ההגעה וסידורי ההושבה של INVISTIMO ובחרו את השירות המתאים
                לאירוע שלכם.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink
                  href="/seating-explained"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#E8C57A] px-8 py-3.5 text-base font-black text-[#2C241C] transition hover:-translate-y-0.5"
                  location={`summary_seating:${PATH}`}
                >
                  לסידורי הושבה
                </TrackedCtaLink>
                <TrackedCtaLink
                  href="/rsvp"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E8C57A]/50 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/5"
                  location={`summary_rsvp:${PATH}`}
                >
                  לאישורי הגעה
                </TrackedCtaLink>
                <TrackedCtaLink
                  href="/pricing"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E8C57A]/50 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/5"
                  location={`summary_pricing:${PATH}`}
                >
                  למחירון
                </TrackedCtaLink>
              </div>
            </div>
          </section>

          <section className="scroll-mt-24 border-t border-[#E6D2AA] pt-12">
            <h2 className="text-2xl font-black text-[#2C241C]">המשך קריאה</h2>
            <nav className="mt-6 flex flex-wrap gap-3" aria-label="קישורים קשורים">
              {RELATED.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-11 items-center rounded-full border border-[#E3C990] bg-white/70 px-4 py-2 text-sm font-bold text-[#5E4735] transition hover:border-[#C7A56B] hover:bg-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </section>
        </div>
      </div>
    </article>
  );
}
