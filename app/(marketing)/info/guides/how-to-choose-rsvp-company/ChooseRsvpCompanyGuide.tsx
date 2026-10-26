"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import InteractiveChecklist from "@/components/marketing/guides/InteractiveChecklist";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import { CHOOSE_RSVP_COMPANY_FAQS } from "./guideFaqs";

const PATH = "/info/guides/how-to-choose-rsvp-company";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "how-to-choose", label: "איך בוחרים" },
  { id: "why-company", label: "למה חברה מקצועית" },
  { id: "service-types", label: "סוגי שירותים" },
  { id: "comparison", label: "טבלת השוואה" },
  { id: "rounds", label: "סבבי פנייה" },
  { id: "no-reply", label: "מי שלא עונה" },
  { id: "pricing", label: "מחיר אמיתי" },
  { id: "seating", label: "הושבה באותה מערכת" },
  { id: "dashboard", label: "ממשק ניהול" },
  { id: "guest-ux", label: "חוויית האורח" },
  { id: "kosher", label: "טלפון כשר" },
  { id: "broader", label: "שירותים נוספים" },
  { id: "why-invistimo", label: "למה Invistimo" },
  { id: "checklist", label: "15 שאלות לבדוק" },
  { id: "mistakes", label: "8 טעויות נפוצות" },
  { id: "faq", label: "שאלות נפוצות" },
];

const CHECKLIST_ITEMS = [
  "איך האורחים מקבלים את ההזמנה?",
  "איך הם מאשרים הגעה?",
  "כמה סבבים כלולים?",
  "מה קורה עם מי שלא עונה?",
  "האם השירות כולל שיחות מוקלטות?",
  "האם קיים מוקד אנושי?",
  "האם אפשר לבחור בין סוגי השירות?",
  "האם יש פתרון לטלפונים כשרים?",
  "האם אפשר לעדכן מספר משתתפים?",
  "האם אפשר לשנות תשובה?",
  "האם קיים דשבורד מעקב?",
  "האם ניתן לנהל סידורי הושבה?",
  "מהי רשומה לצורכי תשלום?",
  "אילו תוספות אינן כלולות במחיר?",
  "האם אפשר לראות הדגמה לפני הרכישה?",
];

const MISTAKES = [
  {
    title: "לבחור רק לפי המחיר הראשוני",
    text: "חשוב לבדוק את היקף השירות — סבבים, שיחות, מעקב והושבה — ולא רק את הסכום שמופיע בהצעה הראשונה.",
  },
  {
    title: "לא להבין מהי רשומה",
    text: "מספר הרשומות ומספר האנשים אינם בהכרח זהים. משפחה יכולה להיות רשומת קשר אחת עם כמה משתתפים.",
  },
  {
    title: "לא לבדוק מה קורה למי שלא עונה",
    text: "תהליך המעקב הוא קריטריון מרכזי. בלי סבבים וטיפול בממתינים קשה להגיע למספר אמין לאולם.",
  },
  {
    title: "לא לבדוק את חוויית האורח",
    text: "תהליך אישור מסורבל עלול ליצור קושי ולצמצם את שיעור התשובות, גם אם ממשק הניהול נראה מוצלח.",
  },
  {
    title: "לא לבדוק את מסך הניהול",
    text: "כדאי להכיר את הדשבורד, החיפוש והסטטוסים לפני הרכישה — לא רק את הצעת המחיר.",
  },
  {
    title: "להתעלם מצרכים של אורחים שונים",
    text: "יש להתחשב גם במוזמנים שאינם משתמשים ב־WhatsApp או שמעדיפים שיחה קולית.",
  },
  {
    title: "לא לבדוק מה כלול בחבילה",
    text: "שירותי שיחות, הושבה ותזכורות עשויים להימכר בנפרד. השוו היקף שירות דומה בין הצעות.",
  },
  {
    title: "להניח שאישור הגעה מבטיח הגעה בפועל",
    text: "אישור הגעה הוא כלי לתכנון, לא התחייבות ודאית מצד האורח. תמיד כדאי להשאיר מרווח סביר.",
  },
];

const CHANNELS = [
  {
    id: "whatsapp",
    title: "אישורי הגעה ב־WhatsApp",
    lead: "הזוג או החברה שולחים הודעה לאורחים עם אפשרות להשיב באמצעות קישור או ממשק ייעודי.",
    pros: [
      "מוכר ונוח לאורחים רבים",
      "מאפשר לשלוח מידע וקישורים",
      "מתאים לתהליך דיגיטלי",
      "יכול להשתלב בתזכורות",
    ],
    checks: [
      "כיצד האורח מאשר הגעה",
      "האם ניתן לציין מספר משתתפים",
      "האם התשובה נשמרת אוטומטית",
      "מה קורה כשהודעה לא נמסרת",
      "האם נדרש WhatsApp אצל האורח",
    ],
  },
  {
    id: "sms",
    title: "אישורי הגעה ב־SMS",
    lead: "הודעת טקסט עם קישור לאישור הגעה — מתאימה גם לאורחים שאינם משתמשים ב־WhatsApp, בתנאי שיש להם אפשרות לקבל SMS ולפתוח את הקישור.",
    pros: [
      "לא דורש חשבון WhatsApp",
      "מגיע לאפליקציית ההודעות",
      "יכול לשמש כערוץ חלופי",
    ],
    checks: [
      "התאמה לטלפונים מוגבלים",
      "אורחים שאינם גולשים באינטרנט",
      "עלות SMS בחבילה",
      "אותו קישור אישי כמו ב־WhatsApp",
    ],
  },
  {
    id: "ivr",
    title: "שיחות טלפון מוקלטות",
    lead: "האורח מקבל שיחה אוטומטית עם הודעה קולית ואפשרויות מענה מובנות.",
    pros: [
      "פנייה קולית בלי נציג לכל שיחה",
      "מתאימות לאורחים שמעדיפים שיחה",
      "מענה פשוט ומובנה",
    ],
    checks: [
      "האם השיחה ברורה ונשמעת טבעית",
      "האם קל לבחור תשובה",
      "כיצד מעדכנים מספר משתתפים",
      "מה קורה כשהאורח אינו עונה",
      "התאמה לטלפונים כשרים",
    ],
  },
  {
    id: "human",
    title: "שיחות טלפון אנושיות",
    lead: "נציג או נציגה מתקשרים לאורחים ומבררים את סטטוס ההגעה.",
    pros: [
      "שיחה אישית",
      "טיפול בתשובות מורכבות",
      "יכולת לברר אי־ודאות",
      "התאמה למי שמעדיף קשר אנושי",
    ],
    checks: [
      "כמה ניסיונות חיוג כלולים",
      "באילו שעות מתקשרים",
      "כיצד מתעדים תשובות",
      "טיפול בשינויים",
      "מה קורה אם האורח לא זמין",
    ],
  },
] as const;

const COMPARE_ROWS = [
  ["אופן הפנייה", "הודעה דיגיטלית", "שיחה אוטומטית", "שיחה עם נציג"],
  ["מענה מורכב", "תלוי בממשק", "מוגבל לאפשרויות שהוגדרו", "גמיש יותר"],
  ["מתאים ללא WhatsApp", "SMS עשוי להתאים", "כן, אם ניתן לקבל שיחות", "כן, אם ניתן לקבל שיחות"],
  ["התאמה לקהל מבוגר", "תלויה בהרגלי האורחים", "תלויה בנוחות המענה", "עשויה להתאים"],
  ["תיעוד תשובות", "תלוי במערכת", "תלוי במערכת", "תלוי בתהליך העבודה"],
  ["מחיר", "תלוי בחבילה", "תלוי בחבילה", "תלוי בהיקף השירות"],
] as const;

const ROUND_QUESTIONS = [
  "כמה סבבי אישורי הגעה כלולים?",
  "האם הפניות הנוספות מיועדות רק למי שלא השיב?",
  "האם אפשר לשנות תשובה?",
  "האם ניתן לעקוב אחר ממתינים?",
  "מה קורה אם האורח לא עונה גם בסבב האחרון?",
  "האם ניתן ליצור קשר ידני עם אורח מסוים?",
];

const PRICE_QUESTIONS = [
  "האם המחיר לפי רשומה או לפי מספר אנשים?",
  "כמה סבבים כלולים?",
  "האם שיחות מוקלטות כלולות?",
  "האם מוקד אנושי כלול?",
  "האם קיימת תוספת עבור SMS?",
  "האם תזכורת ביום האירוע כלולה?",
  "האם סידורי הושבה כלולים או בתוספת?",
  "האם יש עלות לשינוי חבילה?",
  "האם המחיר כולל מע״מ, ככל שרלוונטי?",
  "האם יש חיובים נוספים עבור שירותים משלימים?",
];

const SEATING_CHECKS = [
  "האם אפשר לראות מי אישר הגעה?",
  "האם ניתן לשבץ אורחים לשולחנות?",
  "האם מוצגת קיבולת כל שולחן?",
  "האם ניתן לראות כמה משובצים בכל שולחן?",
  "האם יש רשימת אורחים שלא שובצו?",
  "האם אפשר לבצע שינויים?",
  "האם קיימים כלים לצוות ההושבה ביום האירוע?",
];

const DASHBOARD_CHECKS = [
  "מספר מוזמנים",
  "מספר אנשים שאישרו הגעה",
  "מספר אנשים שלא מגיעים",
  "מספר ממתינים לתשובה",
  "אפשרות לחיפוש אורח",
  "עדכון תשובה",
  "שינוי מספר משתתפים",
  "רשימת מוזמנים מסודרת",
  "אפשרויות ייצוא, אם קיימות",
  "התאמה למובייל",
];

const GUEST_UX_CHECKS = [
  "האם ההודעה ברורה?",
  "האם האורח מבין למי האירוע שייך?",
  "האם הקישור נפתח בקלות?",
  "האם ברור איך מאשרים או מסרבים?",
  "האם אפשר לעדכן את מספר המשתתפים?",
  "האם מתקבל אישור ברור שהתשובה נשמרה?",
  "האם ניתן לשנות תשובה במקרה הצורך?",
  "האם החוויה מותאמת לטלפון נייד?",
];

const INVISTIMO_BENEFITS = [
  {
    title: "כמה אפשרויות לאישורי הגעה",
    text: "בחירה בין מסלולי הודעות, שיחות מוקלטות, מוקד אנושי ומסלול משולב — בהתאם לאופי המוזמנים ולחבילה.",
  },
  {
    title: "מעקב מסודר אחר התשובות",
    text: "רשימת מוזמנים ודשבורד שמרכזים מי אישר, מי לא מגיע ומי עדיין ממתין לתשובה.",
  },
  {
    title: "התאמה לאורחים שונים",
    text: "אפשרויות תקשורת דיגיטלית וקולית, לרבות מענה לאורחים בעלי טלפון כשר בהתאם להגדרות השירות.",
  },
  {
    title: "חיבור לסידורי ההושבה",
    text: "ניהול שיבוץ האורחים ומפת השולחנות כחלק מסביבת האירוע — כשנרכשת תוספת ההושבה.",
  },
  {
    title: "פתרונות משלימים",
    text: "הזמנות דיגיטליות, Save the Date, תזכורות וכלים נוספים בהתאם לחבילות — לא הכול כלול בכל מסלול.",
  },
  {
    title: "אפשרות להכיר את המערכת לפני בחירה",
    text: "אפשר להתנסות בדמו הפעיל ולהתרשם ממסכי הניהול לפני רכישה.",
  },
];

const RELATED = [
  { href: "/rsvp", label: "אישורי הגעה" },
  { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
  { href: "/rsvp/whatsapp", label: "אישורי הגעה ב־WhatsApp" },
  { href: "/rsvp/calls", label: "שיחות מוקלטות ומוקד אנושי" },
  { href: "/rsvp/save-the-date", label: "Save the Date" },
  { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
  { href: "/seating-explained", label: "סידורי הושבה" },
  { href: "/pricing", label: "חבילות ומחירים" },
  { href: "/try", label: "דמו" },
  { href: "/info/guides/guest-list", label: "מדריך רשימת מוזמנים" },
  { href: "/info/guides/seating-plan", label: "מדריך סידורי הושבה" },
  { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
  { href: "/info/guides/cost-rsvp-wedding", label: "מחיר לפי רשומות" },
  { href: "/info/guides/whatsapp-vs-sms-rsvp", label: "WhatsApp או SMS" },
  { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>;
}

function SoftNote({ children }: { children: React.ReactNode }) {
  return (
    <aside className="mt-6 rounded-[24px] border border-[#E6D2AA] bg-[#FFF8EA] px-5 py-4 text-sm leading-7 text-[#5C4A3A] md:text-base">
      {children}
    </aside>
  );
}

function ProductShot({
  src,
  alt,
  caption,
  priority,
}: {
  src: string;
  alt: string;
  caption: string;
  priority?: boolean;
}) {
  return (
    <figure className="my-8 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_20px_50px_rgba(58,39,20,0.08)]">
      <Image
        src={src}
        alt={alt}
        width={1400}
        height={900}
        priority={priority}
        className="h-auto w-full object-cover object-top"
        sizes="(max-width:1024px) 100vw, 720px"
      />
      <figcaption className="border-t border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-center text-sm text-[#7A6042]">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function ChooseRsvpCompanyGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(232,214,180,0.55),transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 md:px-8 md:pt-8">
          <nav aria-label="מיקום בעמוד" className="text-sm font-semibold text-[#7A6042]">
            <Link href="/" className="hover:text-[#8A642E]">
              ראשי
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            <Link href="/info/guides" className="hover:text-[#8A642E]">
              מדריכים
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            <span>בחירת חברת אישורי הגעה</span>
          </nav>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך · Invistimo</p>
            <GuideToolbar
              title="איך בוחרים חברת אישורי הגעה לחתונה? | Invistimo"
              path={PATH}
              readingMinutes={22}
            />
          </div>
          <h1 className="mt-4 max-w-4xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
            איך בוחרים חברת אישורי הגעה לחתונה? המדריך המלא להשוואת שירותים ומחירים
          </h1>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              בחירת חברת אישורי הגעה לחתונה היא אחת ההחלטות החשובות בניהול רשימת המוזמנים. לכאורה,
              מדובר בפעולה פשוטה: שולחים הודעה לאורחים ושואלים אם הם מגיעים. בפועל, שירות מקצועי צריך
              לעזור לכם להבין כמה אנשים מתכננים להגיע, מי עדיין לא השיב, כיצד מתקבלות התשובות ומה עושים
              עם המידע לקראת האירוע.
            </p>
            <p>
              כיום קיימים שירותים המבוססים על WhatsApp, הודעות SMS, שיחות טלפון מוקלטות, מוקדים אנושיים
              ושילובים שונים ביניהם. חלק מהחברות מספקות אישורי הגעה בלבד, ואחרות מציעות גם הזמנות
              דיגיטליות, ניהול מוזמנים, סידורי הושבה וכלים ליום האירוע.
            </p>
            <p>
              אז איך יודעים איזה שירות מתאים לחתונה שלכם? האם שיחות אנושיות עדיפות על שיחות מוקלטות?
              כמה סבבי אישורי הגעה צריך? איך מחשבים מחיר לפי רשומות? ומה כדאי לבדוק לפני שמשלמים?
            </p>
            <p>
              במדריך הזה נעשה סדר בכל האפשרויות, נציג שאלות שכדאי לשאול כל חברה ונסביר איך לבחור פתרון
              שמתאים לגודל האירוע, לאופי האורחים ולתקציב שלכם.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="#comparison" className={ctaPrimary} location={`hero_compare:${PATH}`}>
              לטבלת ההשוואה
            </TrackedCtaLink>
            <TrackedCtaLink href="#checklist" className={ctaSecondary} location={`hero_checklist:${PATH}`}>
              לצ׳קליסט 15 השאלות
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
                alt="אורחים בחתונה באולם מואר — המחשה לבחירת שירות אישורי הגעה לאירוע"
                width={1920}
                height={900}
                priority
                className="h-[38vw] max-h-[480px] min-h-[200px] w-full object-cover"
                sizes="100vw"
              />
            </motion.div>
          ) : (
            <div className="overflow-hidden border-y border-[#E6D2AA]">
              <Image
                src="/images/rsvp/guides/wedding-planning/hero-reception.jpg"
                alt="אורחים בחתונה באולם מואר — המחשה לבחירת שירות אישורי הגעה לאירוע"
                width={1920}
                height={900}
                priority
                className="h-[38vw] max-h-[480px] min-h-[200px] w-full object-cover"
                sizes="100vw"
              />
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-16">
        <StickyToc items={TOC} />
        <div className="min-w-0 space-y-16 md:space-y-20">
          <section id="how-to-choose" className="scroll-mt-24">
            <Eyebrow>לפני הכול</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך בוחרים חברת אישורי הגעה לחתונה?
            </h2>
            <Prose>
              <p>
                כדי לבחור חברת אישורי הגעה לחתונה, כדאי לבדוק איך מתבצעת יצירת הקשר עם האורחים, אילו
                ערוצי מענה זמינים, איך מתעדכנות התשובות במערכת, האם ניתן לטפל באורחים שלא השיבו ומה
                כלול במחיר. חשוב גם לבדוק את נוחות השימוש, התמיכה והשירותים הנלווים.
              </p>
              <p>
                מומלץ להתנסות במערכת לפני הרכישה ולהשוות בין חבילות בעלות היקף שירות דומה — לא רק לפי
                הסכום הראשוני בהצעה.
              </p>
            </Prose>
          </section>

          <section id="why-company" className="scroll-mt-24">
            <Eyebrow>פרק 1</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              למה לא לעשות אישורי הגעה לבד?
            </h2>
            <Prose>
              <p>
                אפשר לשלוח הודעות אישיות ולנהל את התשובות בגיליון Excel, במיוחד באירוע קטן. אבל ככל
                שרשימת המוזמנים גדלה, ניהול ידני עלול להפוך למורכב.
              </p>
              <p>
                צריך לזכור מי קיבל הודעה, מי השיב, מי שינה תשובה, כמה אנשים מגיעים מכל משפחה ומי עדיין
                ממתין למענה.
              </p>
              <p>
                לדוגמה: זוג שהזמין 450 אנשים עשוי לנהל הרבה פחות מ־450 רשומות קשר, משום שחלק מהרשומות
                מייצגות זוג או משפחה. עם זאת, לכל רשומה יכולים להיות מספר משתתפים, תשובות שונות ושינויים
                לאורך הדרך. מערכת ייעודית מסייעת לארגן את המידע במקום אחד, לצמצם עבודה ידנית ולתת תמונת
                מצב עדכנית יותר.
              </p>
            </Prose>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                <h3 className="text-lg font-black text-[#2C241C]">מתי אפשר להסתפק בניהול עצמי?</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                  <li>באירוע קטן יחסית</li>
                  <li>כשיש מעט רשומות קשר</li>
                  <li>כשיש זמן לפנות אישית לכל אורח</li>
                  <li>כשאין צורך בשירותי מעקב מורכבים</li>
                </ul>
              </div>
              <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                <h3 className="text-lg font-black text-[#2C241C]">מתי כדאי לשקול שירות מקצועי?</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                  <li>כשיש מספר גדול של מוזמנים</li>
                  <li>כשיש אורחים ממעגלים שונים</li>
                  <li>כשצריך לבצע כמה סבבי פנייה</li>
                  <li>כשחשוב לעקוב אחר מי שלא ענה</li>
                  <li>כשמעוניינים לחבר את התשובות לסידורי ההושבה</li>
                  <li>כשרוצים לצמצם התעסקות סמוך לחתונה</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="service-types" className="scroll-mt-24">
            <Eyebrow>פרק 2</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              אילו סוגים של אישורי הגעה קיימים?
            </h2>
            <Prose>
              <p>
                אין שיטה אחת שנכונה לכל חתונה. שירות הודעות בלבד, שיחות מוקלטות בלבד, מוקד אנושי בלבד
                או שילוב ביניהם יכולים להיות בחירות מתאימות — בהתאם לקהל המוזמנים ולצרכים.
              </p>
            </Prose>
            <div className="mt-8 grid gap-5">
              {CHANNELS.map((channel, index) => (
                <div
                  key={channel.id}
                  className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 md:p-6"
                >
                  <p className="text-sm font-black text-[#8A642E]">מסלול {index + 1}</p>
                  <h3 className="mt-1 text-xl font-black text-[#2C241C] md:text-2xl">{channel.title}</h3>
                  <p className="mt-3 text-base leading-7 text-[#5C4A3A]">{channel.lead}</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-black text-[#2C241C]">יתרונות</p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-7 text-[#5C4A3A]">
                        {channel.pros.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#2C241C]">מה לבדוק</p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-7 text-[#5C4A3A]">
                        {channel.checks.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <SoftNote>
              <p>
                <strong className="font-black text-[#2C241C]">שילוב בין שיטות:</strong> חלק מהשירותים
                משלבים הודעות, שיחות מוקלטות ושיחות אנושיות. שילוב עשוי להתאים לחלק מהאירועים, אבל אינו
                חובה. אין להציג בחירה בשיטה אחת כטעות.
              </p>
            </SoftNote>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              להעמקה בערוצי ההודעות ראו את{" "}
              <Link
                href="/info/guides/whatsapp-vs-sms-rsvp"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                מדריך WhatsApp מול SMS
              </Link>
              , ולשיחות — את{" "}
              <Link href="/rsvp/calls" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                עמוד השיחות המוקלטות והמוקד האנושי
              </Link>
              .
            </p>
          </section>

          <section id="comparison" className="scroll-mt-24">
            <Eyebrow>פרק 3</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              WhatsApp, שיחות מוקלטות או מוקד אנושי — מה כדאי לבחור?
            </h2>
            <Prose>
              <p>
                הטבלה מסייעת להשוות קריטריונים נפוצים. אין שיטה אחת שמתאימה לכל חתונה — הבחירה תלויה
                בהרכב האורחים, באופי האירוע, ברמת השירות הרצויה ובתקציב.
              </p>
            </Prose>
            <div className="mt-8 overflow-x-auto rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_14px_36px_rgba(58,39,20,0.06)]">
              <table className="min-w-[640px] w-full border-collapse text-right text-sm md:text-base">
                <caption className="sr-only">
                  השוואה בין WhatsApp או SMS, שיחות מוקלטות ומוקד אנושי
                </caption>
                <thead>
                  <tr className="border-b border-[#E6D2AA] bg-[#FFF8EA]">
                    <th scope="col" className="px-4 py-3 font-black text-[#2C241C]">
                      קריטריון
                    </th>
                    <th scope="col" className="px-4 py-3 font-black text-[#2C241C]">
                      WhatsApp / SMS
                    </th>
                    <th scope="col" className="px-4 py-3 font-black text-[#2C241C]">
                      שיחות מוקלטות
                    </th>
                    <th scope="col" className="px-4 py-3 font-black text-[#2C241C]">
                      מוקד אנושי
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row[0]} className="border-b border-[#EADDC8] last:border-b-0">
                      {row.map((cell, i) => (
                        <td
                          key={`${row[0]}-${i}`}
                          className={`px-4 py-3 leading-7 text-[#5C4A3A] ${
                            i === 0 ? "font-bold text-[#2C241C]" : ""
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
            <p className="mt-4 text-sm leading-7 text-[#7A6042] md:text-base">
              אין שיטה אחת שמתאימה לכל חתונה. הבחירה הנכונה תלויה בהרכב האורחים, באופי האירוע, ברמת
              השירות הרצויה ובתקציב.
            </p>
          </section>

          <section id="rounds" className="scroll-mt-24">
            <Eyebrow>פרק 4</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              למה חשוב לבדוק כמה פעמים החברה פונה לאורחים?
            </h2>
            <Prose>
              <p>
                לא כל אורח עונה לפנייה הראשונה. חלק מהאנשים מפספסים הודעות, חלק ממתינים לדעת אם יוכלו
                להגיע וחלק מעדיפים להשיב מאוחר יותר. לכן חשוב לבדוק מה כולל תהליך המעקב.
              </p>
            </Prose>
            <ul className="mt-6 space-y-2">
              {ROUND_QUESTIONS.map((q) => (
                <li
                  key={q}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#3F3025] md:text-base"
                >
                  {q}
                </li>
              ))}
            </ul>
            <SoftNote>
              <p className="font-black text-[#2C241C]">איך זה עובד ב־Invistimo</p>
              <p className="mt-2">
                בחבילת ההודעות כלולים שני סבבי WhatsApp לאישור הגעה, בנוסף לתזכורת ולהודעת תודה ב־SMS.
                בחבילות השיחות קיימים עד שלושה סבבי שיחה — מוקלטות, אנושיות או שילוב — בהתאם למסלול
                שנבחר. המערכת מרכזת את התשובות ברשימת המוזמנים ומאפשרת מעקב אחר סטטוסים. יש לבדוק את
                פירוט החבילה במחשבון לפני הרכישה.
              </p>
            </SoftNote>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              לתזמון הסבבים ראו את{" "}
              <Link
                href="/info/guides/when-to-send-rsvp"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                מדריך מתי שולחים אישורי הגעה
              </Link>
              .
            </p>
          </section>

          <section id="no-reply" className="scroll-mt-24">
            <Eyebrow>פרק 5</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך חברה מקצועית מטפלת במוזמנים שלא השיבו?
            </h2>
            <Prose>
              <p>
                זהו אחד הקריטריונים החשובים בבחירת שירות. אורח שלא ענה אינו בהכרח אורח שלא מגיע. חשוב
                שהחברה תאפשר לזהות מי עדיין ממתין לתשובה ולבצע מעקב בהתאם לשירות שנבחר.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> נניח שיש 300 רשומות קשר —
                220 השיבו, 50 עדיין לא השיבו, ו־30 השיבו אך בהמשך שינו את מספר המשתתפים. המערכת צריכה
                להציג את המידע העדכני, ולאפשר להבחין בין מספר הרשומות לבין מספר האנשים המתוכננים להגיע.
              </p>
            </Prose>
            <ProductShot
              src="/images/guides/guest-list/dashboard-guests.jpg"
              alt="דשבורד Invistimo עם סטטוסי אישורי הגעה: אישרו, לא מגיעים וממתינים לתשובה — נתוני הדגמה"
              caption="צילום מסך אמיתי מהמערכת · נתוני דמו בלבד · אין פרטי לקוחות אמיתיים"
            />
            <SoftNote>
              <p className="font-black text-[#2C241C]">Invistimo</p>
              <p className="mt-2">
                אפשר לנהל את רשימת המוזמנים, לראות את סטטוס אישורי ההגעה ולהשתמש בשירותי ההודעות
                והשיחות הזמינים בחבילה. קיימים מסלולים הכוללים שיחות מוקלטות או שירות אנושי, בהתאם
                להצעה שנבחרה. אין הבטחה שכל אורח יענה או שכל מספר טלפון יהיה זמין.
              </p>
            </SoftNote>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              הרחבה מעשית ב־
              <Link
                href="/info/guides/guests-who-dont-reply"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                מדריך אורחים שלא עונים
              </Link>
              .
            </p>
          </section>

          <section id="pricing" className="scroll-mt-24">
            <Eyebrow>פרק 6</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              כמה עולה חברת אישורי הגעה לחתונה?
            </h2>
            <Prose>
              <p>
                מחיר השירות תלוי בחברה, במסלול, במספר הרשומות ובשירותים הנוספים. יש חברות שמתמחרות לפי
                רשומה, אחרות לפי חבילה, ויש שירותים שמתמחרים לפי היקף פעילות או תשובות שהתקבלו.
              </p>
            </Prose>
            <div className="mt-8 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-gradient-to-br from-[#FFFDF8] via-[#FFF8EA] to-[#F4E8D2] p-5 md:p-7">
              <h3 className="text-xl font-black text-[#2C241C]">מה ההבדל בין מוזמנים לרשומות?</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#EADDC8] bg-white/80 p-4">
                  <p className="text-sm font-black text-[#8A642E]">רשומה</p>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                    יחידת קשר ברשימת המוזמנים — למשל מספר טלפון שאליו נשלחת פנייה.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#EADDC8] bg-white/80 p-4">
                  <p className="text-sm font-black text-[#8A642E]">מספר מוזמנים</p>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                    מספר האנשים הכולל שמוזמנים לאירוע — לא בהכרח מספר הרשומות בתשלום.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[#5C4A3A] md:text-base">
                דוגמה: משפחה עם שני הורים ושלושה ילדים — חמישה מוזמנים — עשויה להיות רשומת קשר אחת
                בלבד. לכן 400 מוזמנים אינם בהכרח 400 רשומות בתשלום.
              </p>
            </div>
            <h3 className="mt-8 text-xl font-black text-[#2C241C]">שאלות שחייבים לשאול לפני רכישה</h3>
            <ol className="mt-4 space-y-2">
              {PRICE_QUESTIONS.map((q, i) => (
                <li
                  key={q}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm md:text-base"
                >
                  <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                  <span className="font-semibold text-[#3F3025]">{q}</span>
                </li>
              ))}
            </ol>
            <SoftNote>
              <p className="font-black text-[#2C241C]">דוגמה להשוואת הצעות (להמחשה בלבד)</p>
              <p className="mt-2">
                הצעה א׳: 500 ₪ עבור הודעות בלבד. הצעה ב׳: 750 ₪ עבור הודעות ושיחות. לא נכון להסיק
                שהצעה א׳ משתלמת יותר בלי לבדוק את מספר הרשומות, הסבבים, אופן הטיפול בממתינים והשירותים
                הנלווים. המחירים בדוגמה להמחשה בלבד ואינם מחירי שוק מאומתים.
              </p>
            </SoftNote>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              ב־Invistimo בוחרים שירותים וחבילות לפי צורכי האירוע, כולל שירותים משלימים כמו הזמנות
              דיגיטליות וסידורי הושבה. המחירים האמיתיים מופיעים ב־
              <Link href="/pricing" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מחשבון החבילות
              </Link>{" "}
              וב־
              <Link
                href="/info/guides/cost-rsvp-wedding"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                מדריך תמחור הרשומות
              </Link>
              .
            </p>
          </section>

          <section id="seating" className="scroll-mt-24">
            <Eyebrow>פרק 7</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה היתרון של אישורי הגעה וסידורי הושבה באותה מערכת?
            </h2>
            <Prose>
              <p>
                לאחר קבלת אישורי ההגעה, הזוג צריך להשתמש בנתונים כדי להכין את מפת ההושבה. כאשר רשימת
                המוזמנים ואישורי ההגעה נמצאים במערכת אחת, קל יותר לעבוד עם מידע מעודכן ולצמצם העתקות
                ידניות.
              </p>
            </Prose>
            <ul className="mt-6 space-y-2">
              {SEATING_CHECKS.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold md:text-base"
                >
                  {item}
                </li>
              ))}
            </ul>
            <ProductShot
              src="/images/guides/guest-list/seating-map.png"
              alt="מפת סידורי הושבה דיגיטלית ב־Invistimo עם שולחנות וקיבולת"
              caption="צילום מסך אמיתי של מפת ההושבה במערכת · הושבה דיגיטלית היא תוספת במחשבון"
            />
            <SoftNote>
              <p className="font-black text-[#2C241C]">למה לבחור ב־Invistimo?</p>
              <p className="mt-2">
                קיימת מערכת סידורי הושבה דיגיטלית עם מפת שולחנות, מעקב אחר מספר המשובצים והקיבולת,
                ורשימת אורחים שלא שובצו. השילוב בין רשימת המוזמנים, אישורי ההגעה ומפת ההושבה מאפשר
                לנהל שלבים שונים של ההכנות בסביבה אחת. הושבה דיגיטלית אינה כלולה אוטומטית בכל חבילה —
                היא תוספת במחשבון.
              </p>
            </SoftNote>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              פירוט ב־
              <Link
                href="/seating-explained"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                עמוד סידורי ההושבה
              </Link>{" "}
              וב־
              <Link
                href="/info/guides/seating-plan"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                מדריך הכנת הושבה
              </Link>
              .
            </p>
          </section>

          <section id="dashboard" className="scroll-mt-24">
            <Eyebrow>פרק 8</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך יודעים אם מערכת אישורי הגעה נוחה לשימוש?
            </h2>
            <Prose>
              <p>
                לפני שבוחרים חברה, כדאי לבדוק כיצד נראה מסך הניהול. מערכת טובה צריכה להציג נתונים
                בצורה ברורה, ולא לחייב את הזוג לחפש מידע בין מסכים רבים.
              </p>
            </Prose>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {DASHBOARD_CHECKS.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold md:text-base"
                >
                  {item}
                </div>
              ))}
            </div>
            <ProductShot
              src="/images/guides/guest-list/guest-list-table.png"
              alt="טבלת רשימת מוזמנים ב־Invistimo עם חיפוש ועדכון תשובות — נתוני דמו"
              caption="צילום מסך אמיתי של רשימת המוזמנים · נתוני דמו בלבד"
            />
            <p className="mt-4 text-base leading-8 text-[#5C4A3A]">
              ב־Invistimo קיים דשבורד לניהול האירוע ורשימת המוזמנים, לצד שירותי אישורי הגעה וסידורי
              הושבה. אפשר להתרשם גם ב־
              <Link href="/try" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                הדמו הפעיל
              </Link>
              .
            </p>
          </section>

          <section id="guest-ux" className="scroll-mt-24">
            <Eyebrow>פרק 9</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם אישור ההגעה פשוט גם לאורחים?
            </h2>
            <Prose>
              <p>
                מערכת יכולה להיראות מצוין לזוג, אבל אם לאורחים קשה לאשר הגעה, התהליך פחות יעיל.
              </p>
            </Prose>
            <ul className="mt-6 space-y-2">
              {GUEST_UX_CHECKS.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold md:text-base"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 grid items-end gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <figure className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[32px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
                <Image
                  src="/images/rsvp/chatuna/phone-rsvp-form.jpg"
                  alt="מסך אישור הגעה למובייל ב־Invistimo — בחירת הגעה ומספר משתתפים"
                  width={640}
                  height={1280}
                  className="h-auto w-full object-cover"
                  sizes="280px"
                />
                <figcaption className="border-t border-[#EADDC8] px-3 py-2 text-center text-xs text-[#7A6042]">
                  מסך אישור הגעה במובייל · צילום מערכת אמיתי
                </figcaption>
              </figure>
              <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 md:p-6">
                <h3 className="text-lg font-black text-[#2C241C]">Invistimo</h3>
                <p className="mt-3 text-base leading-7 text-[#5C4A3A]">
                  Invistimo מציעה קישורים אישיים לאורחים, שבהם ניתן להשיב להזמנה בהתאם לאפשרויות
                  שהוגדרו באירוע. הדגש הוא על תהליך ברור ונוח, עם עדכון התשובות במערכת — בלי להתקין
                  אפליקציה.
                </p>
                <TrackedCtaLink
                  href="/rsvp/whatsapp"
                  className={`${ctaSecondary} mt-5`}
                  location={`guest_ux_wa:${PATH}`}
                >
                  לאישורי הגעה ב־WhatsApp
                </TrackedCtaLink>
              </div>
            </div>
          </section>

          <section id="kosher" className="scroll-mt-24">
            <Eyebrow>פרק 10</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך עושים אישורי הגעה לאורחים שאין להם WhatsApp?
            </h2>
            <Prose>
              <p>
                בחתונות מסוימות יש מוזמנים שאינם משתמשים ב־WhatsApp או באינטרנט בטלפון. במקרים כאלה
                חשוב לבחור שירות שמאפשר דרך תקשורת מתאימה — SMS, שיחה מוקלטת או מוקד אנושי.
              </p>
            </Prose>
            <SoftNote>
              <p className="font-black text-[#2C241C]">יתרון Invistimo</p>
              <p className="mt-2">
                כשמופעלת האפשרות הרלוונטית בחשבון, מספרי קידומת כשרה יכולים לקבל שיחה מוקלטת (IVR)
                במקום הודעת WhatsApp או SMS בסבבי ההודעות. כך ניתן לשלב בתהליך גם אורחים שאינם
                משתמשים בקישורים דיגיטליים רגילים. יש לבדוק את התנאים וההגדרות לפני ההפעלה.
              </p>
            </SoftNote>
          </section>

          <section id="broader" className="scroll-mt-24">
            <Eyebrow>פרק 11</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם עדיף לבחור חברה שמספקת רק אישורי הגעה או מערכת רחבה יותר?
            </h2>
            <Prose>
              <p>
                התשובה תלויה בצורכי הזוג. יש זוגות שמחפשים שירות ממוקד לאישורי הגעה בלבד, ויש זוגות
                שמעדיפים לרכז כמה שירותים במקום אחד.
              </p>
              <p>
                Invistimo מציעה סביבת שירותים לאירועים, הכוללת בין היתר: הזמנות דיגיטליות, Save the
                Date, אישורי הגעה, סבבי פנייה לאורחים, שיחות מוקלטות, אפשרויות לשירות אנושי, ניהול
                רשימת מוזמנים, סידורי הושבה, מפת שולחנות, שירותי LIVE לניהול הגעה ביום האירוע בהתאם
                לחבילה, תזכורות והודעות לאורחים — ושירותים נוספים בהתאם להצעה הפעילה.
              </p>
              <p>
                היתרון אינו רק מספר השירותים, אלא האפשרות לנהל שלבים שונים של האירוע באופן מסודר
                ובסביבה משותפת. לא כל השירותים כלולים בכל חבילה.
              </p>
            </Prose>
          </section>

          <section id="why-invistimo" className="scroll-mt-24">
            <Eyebrow>מותג</Eyebrow>
            <div className="overflow-hidden rounded-[32px] border border-[#E3C990] bg-gradient-to-br from-[#2C211B] via-[#3A2B22] to-[#5A4333] px-6 py-10 text-[#FFF8EA] shadow-[0_28px_80px_rgba(58,39,20,0.28)] md:px-10 md:py-12">
              {!reduce ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-sm font-black tracking-[0.14em] text-[#E8C988]">Invistimo</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
                    לא רק לדעת מי מגיע. לדעת שאתם ערוכים לאירוע.
                  </h2>
                  <p className="mt-5 max-w-3xl text-base leading-8 text-[#F0E2C8] md:text-lg">
                    בחירת שירות אישורי הגעה היא לא רק החלטה על אופן שליחת ההודעות. זו החלטה על הדרך
                    שבה תנהלו את המידע החשוב ביותר לקראת האירוע: מי הוזמן, מי אישר, כמה אנשים מתכננים
                    להגיע ואיך נערכים לקראתם.
                  </p>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-[#F0E2C8] md:text-lg">
                    Invistimo נבנתה כדי לאפשר ניהול מסודר של התהליך — מרשימת המוזמנים וההזמנות
                    הדיגיטליות, דרך אישורי ההגעה וסבבי הפנייה, ועד סידורי ההושבה וההיערכות ליום
                    האירוע.
                  </p>
                </motion.div>
              ) : (
                <>
                  <p className="text-sm font-black tracking-[0.14em] text-[#E8C988]">Invistimo</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
                    לא רק לדעת מי מגיע. לדעת שאתם ערוכים לאירוע.
                  </h2>
                  <p className="mt-5 max-w-3xl text-base leading-8 text-[#F0E2C8] md:text-lg">
                    בחירת שירות אישורי הגעה היא לא רק החלטה על אופן שליחת ההודעות. זו החלטה על הדרך
                    שבה תנהלו את המידע החשוב ביותר לקראת האירוע.
                  </p>
                </>
              )}
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {INVISTIMO_BENEFITS.map((item, i) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                  >
                    <p className="text-sm font-black text-[#E8C988]">{i + 1}.</p>
                    <h3 className="mt-1 text-lg font-black text-[#FFFDF8]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#E8D8BA]">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 border-t border-white/10 pt-8">
                <h3 className="text-2xl font-black text-[#FFFDF8]">
                  רוצים לראות איך זה עובד בחתונה שלכם?
                </h3>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#E8D8BA]">
                  הכירו את שירותי אישורי ההגעה של Invistimo, בדקו את אפשרויות השירות ובחרו את הפתרון
                  שמתאים לאירוע שלכם.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <TrackedCtaLink
                    href="/try"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#E8C988] px-8 py-3.5 text-base font-black text-[#2C211B] transition hover:-translate-y-0.5"
                    location={`brand_demo:${PATH}`}
                  >
                    נסו את הדמו
                  </TrackedCtaLink>
                  <TrackedCtaLink
                    href="/pricing"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E8C988]/50 bg-transparent px-8 py-3.5 text-base font-black text-[#FFF8EA] transition hover:bg-white/10"
                    location={`brand_pricing:${PATH}`}
                  >
                    לצפייה בחבילות ובמחירים
                  </TrackedCtaLink>
                  <TrackedCtaLink
                    href="/rsvp"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E8C988]/50 bg-transparent px-8 py-3.5 text-base font-black text-[#FFF8EA] transition hover:bg-white/10"
                    location={`brand_rsvp:${PATH}`}
                  >
                    הכירו את אישורי ההגעה
                  </TrackedCtaLink>
                </div>
              </div>
            </div>
          </section>

          <section id="checklist" className="scroll-mt-24">
            <Eyebrow>פרק 12</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה לשאול לפני שסוגרים חברת אישורי הגעה?
            </h2>
            <Prose>
              <p>
                סמנו את השאלות שכבר בדקתם. הסימון נשמר במכשיר זה בלבד — ואפשר גם להדפיס את העמוד.
              </p>
            </Prose>
            <div className="mt-6">
              <InteractiveChecklist
                id="choose-rsvp-checklist"
                storageKey="invistimo-choose-rsvp-company-checklist"
                title="צ׳קליסט 15 שאלות לבחירת חברה"
                items={CHECKLIST_ITEMS}
              />
            </div>
          </section>

          <section id="mistakes" className="scroll-mt-24">
            <Eyebrow>פרק 13</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              8 טעויות שכדאי להימנע מהן
            </h2>
            <div className="mt-8 grid gap-4">
              {MISTAKES.map((item, i) => (
                <div key={item.title} className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                  <p className="text-sm font-black text-[#8A642E]">טעות {i + 1}</p>
                  <h3 className="mt-1 text-lg font-black text-[#2C241C]">{item.title}</h3>
                  <p className="mt-2 text-base leading-7 text-[#5C4A3A]">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="faq" className="scroll-mt-24">
            <Eyebrow>שאלות ותשובות</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שאלות נפוצות על בחירת חברת אישורי הגעה
            </h2>
            <div className="mt-8 space-y-3">
              {CHOOSE_RSVP_COMPANY_FAQS.map((item) => (
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

          <section aria-labelledby="related-guides" className="scroll-mt-24 border-t border-[#E6D2AA] pt-12">
            <h2 id="related-guides" className="text-2xl font-black text-[#2C241C]">
              המשך קריאה ושירותים קשורים
            </h2>
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
