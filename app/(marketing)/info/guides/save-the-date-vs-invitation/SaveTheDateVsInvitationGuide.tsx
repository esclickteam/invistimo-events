"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import CopyExamples from "./CopyExamples";
import JourneyDemo from "./JourneyDemo";
import PlanningCalculator from "./PlanningCalculator";
import SendChecklist from "./SendChecklist";
import { STD_VS_INVITE_FAQS } from "./guideFaqs";

const PATH = "/info/guides/save-the-date-vs-invitation";
const UPDATED_LABEL = "עודכן ב־26 באוקטובר 2026";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

function Eyebrow({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p className={`text-sm font-black tracking-[0.14em] ${onDark ? "text-[#E8C988]" : "text-[#7A5530]"}`}>
      {children}
    </p>
  );
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
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const COMPARE_ROWS = [
  ["מטרה", "שמירת התאריך", "מסירת פרטי האירוע"],
  ["שלב", "מוקדם בתכנון", "כשהפרטים המרכזיים סגורים"],
  ["תאריך", "מרכזי", "חובה"],
  ["אולם ושעות", "לא תמיד מופיעים", "בדרך כלל מופיעים"],
  ["אישורי הגעה", "לא בהכרח", "אפשר לשלב"],
  ["אורך ההודעה", "קצר", "מפורט יותר"],
  ["עיצוב", "פשוט או חגיגי", "הזמנה מלאה"],
  ["חובה לשלוח?", "לא", "מומלץ להזמין באופן ברור"],
] as const;

const ORDER_STEPS = [
  "קובעים תאריך",
  "בודקים שהמועד סגור",
  "שולחים Save the Date, אם בוחרים בכך",
  "משלימים פרטי אולם ושעות",
  "מכינים הזמנה מלאה",
  "שולחים את ההזמנה",
  "מנהלים אישורי הגעה",
  "ממשיכים לתזכורות ולהושבה בהתאם לצורך",
] as const;

const MISTAKES = [
  ["שליחת תאריך לא סופי", "ממתינים עד שהתאריך מאושר, ורק אז מבשרים לאורחים."],
  ["שליחת Save the Date מאוחר מדי", "אם נשארו שבועות בודדים — שוקלים הזמנה מלאה במקום הודעה מוקדמת."],
  ["שליחת הזמנה בלי פרטי אולם", "משלימים שם, כתובת ושעות לפני שליחה רשמית."],
  ["חוסר התאמה בין התאריכים", "מוודאים שאותו תאריך מופיע בכל ההודעות ובעמוד ההזמנה."],
  ["טעות ביום בשבוע", "בודקים את היום מול לוח שנה לפני השליחה."],
  ["קישור הזמנה לא תקין", "פותחים את הקישור האישי ממכשיר אחר ומוודאים שהוא עובד."],
  ["רשימת מוזמנים לא מעודכנת", "מנקים כפילויות ומספרים ישנים לפני כל סבב שליחה."],
  ["שליחה כפולה", "מתעדים למי כבר נשלח Save the Date לפני ההזמנה."],
  ["הנחה ש־Save the Date הוא אישור הגעה", "מפרידים בין שמירת תאריך לבין סבבי RSVP."],
  ["הזמנה עם טקסט לא קריא", "בוחרים ניגודיות גבוהה וגופן קריא במסכים קטנים."],
  ["אי־עדכון אורחים לאחר שינוי", "שולחים הודעה יזומה וברורה על התאריך או הפרטים החדשים."],
  ["אי־מעקב אחר אישורי הגעה", "מתכננים סבבים ומועד בדיקה לפני סגירת כמויות עם האולם."],
  ["בלבול בין מספר רשומות למספר אנשים", "רשומה היא יחידת קשר; מספר המוזמנים הוא מספר האנשים."],
  ["הודעות רבות מדי בפרק זמן קצר", "משאירים מרווח סביר בין Save the Date, הזמנה וסבבי אישור."],
] as const;

const TIMELINE = [
  {
    when: "6–12 חודשים לפני",
    title: "Save the Date",
    text: "במיוחד אם האורחים צריכים להיערך מוקדם, לנסוע או לקחת חופש.",
  },
  {
    when: "6–10 שבועות לפני",
    title: "הזמנה מלאה",
    text: "כשהאולם, הכתובת והשעות סגורים — שולחים הזמנה ברורה.",
  },
  {
    when: "בשבועות שלפני האירוע",
    title: "אישורי הגעה",
    text: "מתחילים לאסוף תשובות ולעקוב אחרי מי שעדיין לא השיב.",
  },
  {
    when: "סמוך לסגירת כמויות",
    title: "השלמת תשובות",
    text: "סוגרים פערים לפני שמעבירים מספרים לאולם.",
  },
  {
    when: "לפני האירוע",
    title: "תזכורות ועדכונים",
    text: "תזכורת, מספר שולחן או עדכון רלוונטי — בהתאם לשירות שנבחר.",
  },
] as const;

const SCENARIO_STEPS = [
  { when: "חודש 0", title: "סוגרים תאריך", text: "מיה ואלון מאשרים את ה־24.06.2027." },
  { when: "שבוע אחרי", title: "בודקים פרטים", text: "מוודאים שהמועד יציב ומתחילים רשימת מוזמנים." },
  { when: "~8 חודשים לפני", title: "שולחים Save the Date", text: "הודעה מוקדמת, כולל לאורחים מחו״ל." },
  { when: "חודשים 2–5", title: "ממשיכים בתכנון", text: "סוגרים אולם, שעות ועיצוב הזמנה." },
  { when: "~8 שבועות לפני", title: "מכינים הזמנה מלאה", text: "בודקים כתובת, ניווט וקישורים." },
  { when: "לפני השליחה", title: "מעדכנים רשימה", text: "מוסיפים אורחים חדשים ובודקים כפילויות." },
  { when: "~7 שבועות לפני", title: "שולחים הזמנות", text: "קישור אישי עם פרטי האירוע." },
  { when: "~16 ימים לפני", title: "מנהלים אישורים", text: "סבבי WhatsApp בהתאם לחבילה." },
  { when: "לפני סגירת כמויות", title: "מי שלא השיב", text: "מעקב והשלמת תשובות." },
  { when: "אחרי האישורים", title: "סוגרים כמויות", text: "מעדכנים את האולם במספרים." },
  { when: "לקראת האירוע", title: "סידורי הושבה", text: "אם נרכשה תוספת הושבה — משבצים שולחנות." },
] as const;

function MiniInvite({
  kind,
}: {
  kind: "std" | "invite";
}) {
  if (kind === "std") {
    return (
      <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-gradient-to-b from-[#FFF8EA] via-[#F7EBD9] to-[#EFD9B0] shadow-[0_22px_50px_rgba(58,39,20,0.1)]">
        <div className="flex aspect-[3/4] flex-col items-center justify-center px-5 text-center">
          <p className="text-[10px] font-black tracking-[0.28em] text-[#A77A38]">SAVE THE DATE</p>
          <div className="my-5 h-px w-16 bg-[#C9A45C]/70" aria-hidden />
          <p className="text-2xl font-black leading-tight text-[#2C241C]">מיה ואלון</p>
          <p className="mt-2 text-sm font-semibold text-[#5E4735]">מתחתנים!</p>
          <p className="mt-6 text-3xl font-black text-[#8A642E]">24.06.2027</p>
          <p className="mt-6 text-xs leading-5 text-[#7A6042]">נשמח שתשמרו את התאריך ❤️</p>
          <p className="mt-1 text-[11px] text-[#A77A38]">פרטים נוספים בקרוב</p>
        </div>
        <figcaption className="border-t border-[#E6D2AA]/80 bg-[#FFFDF8]/70 px-4 py-3 text-center text-xs font-semibold text-[#7A6042]">
          Save the Date · דוגמה מעוצבת
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_22px_50px_rgba(58,39,20,0.1)]">
      <div className="relative aspect-[3/4] w-full bg-[#F7EBD9]">
        <Image
          src="/marketing/invites/invite-wedding-mia-alon.webp"
          alt="דוגמת הזמנה לחתונה מעוצבת — מיה ואלון עם פרטי אולם ושעות"
          fill
          className="object-cover"
          sizes="(max-width:768px) 80vw, 280px"
          priority
        />
      </div>
      <figcaption className="space-y-1 px-4 py-4 text-center">
        <p className="text-[10px] font-black tracking-[0.22em] text-[#A77A38]">הזמנה לחתונה</p>
        <p className="text-lg font-black text-[#2C241C]">מיה ואלון</p>
        <p className="text-xs leading-5 text-[#5C4A3A]">יום חמישי, 24 ביוני 2027 · 19:00 / 20:00</p>
        <p className="text-xs font-semibold text-[#7A6042]">אולם לדוגמה · נשמח לראותכם</p>
      </figcaption>
    </figure>
  );
}

export default function SaveTheDateVsInvitationGuide() {
  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* HERO */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_8%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_92%_0%,rgba(58,43,34,0.07),transparent_36%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 pb-12 pt-6 md:gap-12 md:px-8 md:pb-14 md:pt-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <nav aria-label="מיקום בעמוד" className="mb-4 text-sm font-semibold text-[#7A6042]">
              <Link href="/" className="hover:text-[#8A642E]">
                ראשי
              </Link>
              <span className="px-1.5 text-[#C7A56B]">/</span>
              <Link href="/info/guides" className="hover:text-[#8A642E]">
                מדריכים
              </Link>
              <span className="px-1.5 text-[#C7A56B]">/</span>
              <span>Save the Date מול הזמנה</span>
            </nav>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך · Invistimo</p>
            <h1 className="mt-3 max-w-3xl text-[1.75rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.45rem]">
              מה ההבדל בין Save the Date להזמנה לחתונה? ומתי שולחים כל אחת?
            </h1>
            <div className="mt-5 max-w-2xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                Save the Date הוא הודעה מוקדמת שמטרתה לבקש מהאורחים לשמור את תאריך החתונה ביומן. ההזמנה
                לחתונה נשלחת בהמשך, כשהפרטים המרכזיים כבר סגורים, וכוללת את המיקום, השעות ומידע נוסף שהאורחים
                צריכים לקראת האירוע. כאשר ההזמנה מחוברת למערכת אישורי הגעה, האורחים יכולים גם לעדכן אם יגיעו
                וכמה אנשים צפויים להגיע.
              </p>
              <p>
                לא כל זוג חייב לשלוח את שתיהן. ההחלטה תלויה במועד החתונה, בכמות הזמן שנותרה, באופי האירוע
                ובשאלה אם האורחים כבר יודעים על התאריך.
              </p>
              <p>
                במדריך הזה נבין מה מתאים לכל שלב, נראה דוגמאות אמיתיות ונבנה לוח זמנים פשוט לשליחת ההודעות.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <GuideToolbar title="Save the Date מול הזמנה לחתונה" path={PATH} readingMinutes={14} />
              <span className="text-xs font-semibold text-[#7A6042]">{UPDATED_LABEL}</span>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="#compare" className={ctaPrimary}>
                להשוואה המהירה
              </a>
              <a href="#planner" className={ctaSecondary}>
                למחשבון התכנון
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <MiniInvite kind="std" />
            <MiniInvite kind="invite" />
          </div>
        </div>
      </header>

      {/* WHAT IS STD */}
      <section aria-labelledby="what-std" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <FadeIn>
            <Eyebrow>שמרו את התאריך</Eyebrow>
            <h2 id="what-std" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה זה Save the Date לחתונה?
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                Save the Date, או בעברית «שמרו את התאריך», הוא הודעה מוקדמת שנשלחת לפני ההזמנה הרשמית. המטרה
                פשוטה: לבשר שהתאריך נקבע ולאפשר לאורחים לשריין אותו ביומן.
              </p>
              <p>
                נהוג לכלול שמות בני הזוג ואת התאריך. לפעמים מוסיפים אזור כללי. שם אולם מלא ושעות אינם חובה בשלב
                הזה — במיוחד אם עדיין לא נסגרו. בדרך כלל גם לא מבקשים כאן אישור הגעה.
              </p>
              <p>
                אפשר לשלוח Save the Date לפני שכל פרטי החתונה סגורים, כל עוד התאריך עצמו ודאי. אם התאריך עדיין
                יכול להשתנות — עדיף להמתין.
              </p>
              <p className="rounded-[20px] border border-[#E6D2AA] bg-[#FBF6EE] px-5 py-4 font-semibold text-[#5E4735]">
                בשירות Save the Date הנוכחי של Invistimo ההודעה המוקדמת נשלחת ב־WhatsApp פעם אחת ואינה אוספת
                אישורי הגעה. היא גם אינה נספרת כסבב מתוך חבילת האישורים.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <div className="mx-auto max-w-sm rounded-[28px] border border-[#E6D2AA] bg-gradient-to-b from-[#FFF8EA] to-[#F7EBD9] p-8 text-center shadow-[0_18px_40px_rgba(58,39,20,0.08)]">
              <p className="text-xs font-black tracking-[0.24em] text-[#A77A38]">SAVE THE DATE</p>
              <p className="mt-5 text-3xl font-black text-[#2C241C]">מיה ואלון מתחתנים!</p>
              <p className="mt-4 text-2xl font-black text-[#8A642E]">24.06.2027</p>
              <p className="mt-5 text-base leading-7 text-[#5C4A3A]">נשמח שתשמרו את התאריך ❤️</p>
              <p className="mt-2 text-sm text-[#7A6042]">פרטים נוספים בקרוב.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* WHAT IS INVITE */}
      <section aria-labelledby="what-invite" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <FadeIn className="order-2 lg:order-1">
            <div className="mx-auto max-w-sm overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_22px_50px_rgba(58,39,20,0.1)]">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src="/marketing/invites/invite-wedding-mia-alon.webp"
                  alt="הזמנה דיגיטלית מעוצבת לחתונה — מיה ואלון"
                  fill
                  className="object-cover"
                  sizes="360px"
                />
              </div>
              <div className="space-y-1.5 px-5 py-5 text-center">
                <p className="text-xl font-black text-[#2C241C]">מיה ואלון</p>
                <p className="text-sm leading-6 text-[#5C4A3A]">שמחים להזמינכם לחגוג עמנו את יום נישואינו</p>
                <p className="pt-2 text-sm font-bold text-[#2C241C]">יום חמישי, 24 ביוני 2027</p>
                <p className="text-sm text-[#5C4A3A]">קבלת פנים: 19:00 · חופה: 20:00</p>
                <p className="text-sm font-semibold text-[#8A642E]">אולם הגפן לדוגמה</p>
                <p className="pt-1 text-sm text-[#7A6042]">נשמח לראותכם!</p>
              </div>
            </div>
          </FadeIn>
          <FadeIn className="order-1 lg:order-2">
            <Eyebrow>ההזמנה הרשמית</Eyebrow>
            <h2 id="what-invite" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מהי הזמנה לחתונה ומה צריך להופיע בה?
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                ההזמנה מעבירה את פרטי האירוע שהאורחים צריכים כדי להגיע מוכנים. בדרך כלל יופיעו שמות בני הזוג,
                תאריך ויום, שם האולם, כתובת, שעת קבלת פנים, ובמידת הצורך גם שעת חופה.
              </p>
              <p>
                בהזמנה דיגיטלית אפשר להוסיף קישור ניווט, מידע נוסף לאורחים, ואם השירות מחובר — אפשרות לאישור
                הגעה דרך קישור אישי.
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {[
                  "שמות בני הזוג",
                  "תאריך ויום",
                  "שם האולם וכתובת",
                  "שעת קבלת פנים",
                  "שעת חופה (אם רלוונטי)",
                  "קישור ניווט ומידע נוסף",
                ].map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-[#E6D2AA] bg-[#FFFDF8] px-4 py-3 text-sm font-bold text-[#5E4735]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                לפרטים על הכנת ההזמנה בפועל ראו את{" "}
                <Link
                  href="/info/guides/send-digital-invitation"
                  className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                >
                  מדריך שליחת הזמנה דיגיטלית
                </Link>{" "}
                ואת{" "}
                <Link
                  href="/invitations/chatuna"
                  className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                >
                  עמוד ההזמנות לחתונה
                </Link>
                .
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* COMPARE */}
      <section id="compare" aria-labelledby="diff" className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow onDark>השוואה</Eyebrow>
          <h2 id="diff" className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#FFF8EF] md:text-4xl">
            מה ההבדל בין Save the Date להזמנה לחתונה?
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#D8CBB8]">
            אלה הבדלים מקובלים בתכנון חתונות. מערכות שונות עשויות להציע אפשרויות אחרות — וב־Invistimo Save the
            Date נפרד מסבבי אישורי ההגעה.
          </p>
          <div className="mt-8 overflow-x-auto rounded-[24px] border border-white/10 bg-white/5">
            <table className="min-w-[640px] w-full text-right text-sm md:min-w-0 md:text-base">
              <thead>
                <tr className="border-b border-white/10 text-[#E8C988]">
                  <th className="px-4 py-3 font-bold">נושא</th>
                  <th className="px-4 py-3 font-bold">Save the Date</th>
                  <th className="px-4 py-3 font-bold">הזמנה לחתונה</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(([topic, a, b]) => (
                  <tr key={topic} className="border-t border-white/10">
                    <td className="px-4 py-3 font-bold text-[#FFF8EF]">{topic}</td>
                    <td className="px-4 py-3 text-[#D8CBB8]">{a}</td>
                    <td className="px-4 py-3 text-[#D8CBB8]">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* WHEN */}
      <section aria-labelledby="when-send" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>לוח זמנים</Eyebrow>
          <h2 id="when-send" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            מתי שולחים Save the Date ומתי שולחים את ההזמנה?
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            הטווחים שלהלן הם דוגמאות גמישות לתכנון — לא כללים מחייבים לכל חתונה בישראל.
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {TIMELINE.map((step, i) => (
              <li key={step.title} className="rounded-[22px] border border-[#E6D2AA] bg-[#FBF6EE] p-4">
                <p className="text-xs font-bold tracking-[0.16em] text-[#A77A38]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#7A6042]">{step.when}</p>
                <h3 className="mt-1 text-base font-black text-[#2C241C]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "חתונה קרובה",
                "אם נשארו חודשיים או פחות וכל הפרטים סגורים — לעיתים עדיף הזמנה מלאה בלי Save the Date נפרד.",
              ],
              [
                "חתונה בחו״ל / אורחים מחו״ל",
                "כדאי לשקול הודעה מוקדמת יותר, כדי לאפשר טיסות, מלונות וחופשה.",
              ],
              [
                "חגים ותקופות עמוסות",
                "מתאימים את השליחה סביב לוח השנה, כדי שהאורחים יוכלו לשריין את התאריך בזמן.",
              ],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[20px] border border-[#E6D2AA] bg-white px-5 py-4">
                <h3 className="text-lg font-black text-[#2C241C]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#7A6042]">
            לפירוט על תזמון אישורי הגעה ראו גם את{" "}
            <Link href="/info/guides/when-to-send-rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              מדריך מתי שולחים אישורי הגעה
            </Link>
            .
          </p>
        </div>
      </section>

      {/* MUST BOTH */}
      <section aria-labelledby="must-both" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>החלטה</Eyebrow>
          <h2 id="must-both" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            האם חייבים לשלוח גם Save the Date וגם הזמנה?
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            אין חובה. חלק מהזוגות שולחים את שתיהן, ואחרים מסתפקים בהזמנה אחת ברורה.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-6">
              <h3 className="text-xl font-black text-[#2C241C]">מתי כדאי לשלוח את שתיהן?</h3>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5C4A3A]">
                {[
                  "החתונה מתוכננת זמן רב מראש",
                  "אורחים רבים מחוץ לעיר או מחו״ל",
                  "תאריך מבוקש או תקופה עמוסה",
                  "האירוע דורש היערכות מוקדמת",
                  "רוצים חוויית הזמנה בשני שלבים",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#C9A45C]" aria-hidden>
                      ◆
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-6">
              <h3 className="text-xl font-black text-[#2C241C]">מתי אפשר להסתפק בהזמנה?</h3>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5C4A3A]">
                {[
                  "החתונה קרובה יחסית",
                  "רוב האורחים כבר יודעים את התאריך",
                  "אין צורך בהיערכות מיוחדת",
                  "הזוג מעדיף הודעה אחת מסודרת",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#C9A45C]" aria-hidden>
                      ◆
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-[#7A6042]">
            יתרון של שני שלבים: יותר זמן לאורחים להיערך ופתיחה חגיגית מוקדמת. חיסרון אפשרי: עוד נקודת שליחה
            לנהל. אין צורך לרכוש שני מוצרים אם אינכם צריכים את שני השלבים.
          </p>
        </div>
      </section>

      {/* ORDER */}
      <section aria-labelledby="order" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>סדר פעולות</Eyebrow>
          <h2 id="order" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            מה שולחים קודם — Save the Date או הזמנה?
          </h2>
          <p className="mt-4 text-base leading-8 text-[#5C4A3A]">
            הסדר המקובל מתחיל בתאריך סגור, ממשיך בהודעה מוקדמת אם בוחרים בה, ורק אחר כך בהזמנה מלאה ובאישורים.
          </p>
          <ol className="mt-8 space-y-3">
            {ORDER_STEPS.map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-3 rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2C241C] text-xs font-black text-[#E8C988]">
                  {i + 1}
                </span>
                <span className="text-sm font-bold leading-7 text-[#3F3025] md:text-base">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 rounded-[18px] border border-[#E2B8B8]/60 bg-[#FBF0F0] px-4 py-3 text-sm font-semibold leading-7 text-[#7A3535]">
            אין לשלוח תאריך שלא אושר. שינוי תאריך אחרי Save the Date יוצר בלבול מיותר.
          </p>
        </div>
      </section>

      {/* NO VENUE */}
      <section aria-labelledby="no-venue" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>תאריך בלי אולם</Eyebrow>
          <h2 id="no-venue" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            האם אפשר לשלוח Save the Date בלי שסגרנו אולם?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A]">
            <p>
              אם התאריך ודאי אבל חלק מפרטי האירוע עדיין חסרים — אפשר לשקול הודעת שמירת תאריך בלי שם אולם, עם
              משפט כמו «פרטים נוספים בקרוב».
            </p>
            <p>
              אם התאריך עצמו עדיין לא סופי — עדיף להמתין. עדיף עיכוב קצר מאשר עדכון מביך לכל הרשימה.
            </p>
            <div className="rounded-[22px] border border-[#E6D2AA] bg-[#FFFDF8] px-5 py-5 text-center">
              <p className="text-xs font-black tracking-[0.2em] text-[#A77A38]">דוגמה</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#3F3025]">
                {`מיה ואלון מתחתנים!\n24.06.2027\nנשמח שתשמרו את התאריך\nפרטים נוספים בקרוב ❤️`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DATE CHANGE */}
      <section aria-labelledby="date-change" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שינוי תאריך</Eyebrow>
          <h2 id="date-change" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            מה עושים אם התאריך משתנה אחרי Save the Date?
          </h2>
          <ul className="mt-6 space-y-3 text-base leading-8 text-[#5C4A3A]">
            {[
              "מעדכנים את פרטי האירוע במערכת ובהזמנה",
              "שולחים הודעה יזומה וברורה לאורחים",
              "מדגישים את התאריך החדש בלי לטשטש",
              "בודקים שאין הזמנות או קישורים ישנים שמציגים תאריך שגוי",
              "מתאימים את לוח הזמנים לאישורי הגעה",
            ].map((item) => (
              <li key={item} className="rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-[22px] border border-[#E6D2AA] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-[#2C241C]">נוסח להעתקה</h3>
              <CopyChangeDateButton />
            </div>
            <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-[#3F3025]">
              {CHANGE_DATE_TEXT}
            </pre>
          </div>
        </div>
      </section>

      {/* RSVP? */}
      <section aria-labelledby="std-rsvp" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>אישורי הגעה</Eyebrow>
          <h2 id="std-rsvp" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            האם Save the Date כולל אישורי הגעה?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A]">
            <p>כדאי להפריד בין כמה מושגים שנשמעים דומים אך עושים עבודה שונה:</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ["הודעת שמירת תאריך", "מבשרת על התאריך"],
                ["הזמנה דיגיטלית", "מציגה את פרטי האירוע"],
                ["קישור אישי", "פותח את עמוד האורח"],
                ["מערכת אישורי הגעה", "אוספת מגיע / לא מגיע וכמות"],
                ["סבבי אישור", "פניות מאורגנות לפי החבילה"],
              ].map(([t, d]) => (
                <li key={t} className="rounded-2xl border border-[#E6D2AA] bg-[#FFFDF8] px-4 py-3">
                  <p className="font-black text-[#2C241C]">{t}</p>
                  <p className="mt-1 text-sm text-[#5C4A3A]">{d}</p>
                </li>
              ))}
            </ul>
            <p>
              במימוש הנוכחי של Invistimo, Save the Date אינו מחליף את אישורי ההגעה. זה לא אומר שכל Save the
              Date בעולם אינו יכול לכלול RSVP — רק שכאן מדובר בהודעה מוקדמת נפרדת. לפרטים על איסוף תשובות ראו
              את{" "}
              <Link href="/info/guides/when-to-send-rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מדריך אישורי ההגעה
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* WOW */}
      <section aria-labelledby="wow" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>הדגמה</Eyebrow>
          <h2 id="wow" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            שתי הזמנות, מסלול אחד
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            עברו בין Save the Date להזמנה המלאה — וראו גם שלב אישור הגעה — בלי לשלוח הודעות אמיתיות ובלי נתוני
            לקוחות.
          </p>
          <div className="mt-8">
            <JourneyDemo />
          </div>
        </div>
      </section>

      {/* INVISTIMO FLOW */}
      <section aria-labelledby="invistimo-flow" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>ב־Invistimo</Eyebrow>
          <h2 id="invistimo-flow" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            איך משלבים Save the Date והזמנה דיגיטלית ב־Invistimo?
          </h2>
          <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A]">
            <p>
              Save the Date הוא שירות Pre‑RSVP נפרד שנפתח בחשבון (לבד או יחד עם הזמנה מוקדמת). הוא אינו מופיע
              כשורה קבועה בחבילת ההודעות הבסיסית במחשבון.
            </p>
            <p>
              אחרי שהשירות פתוח, מכינים את{" "}
              <Link href="/info/guides/guest-list" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                רשימת המוזמנים
              </Link>
              , מעלים תמונת Save the Date, ושולחים הודעת WhatsApp חד־פעמית. אחר כך מכינים הזמנה מלאה, שולחים
              קישור אישי, ומתחילים סבבי אישורי הגעה בהתאם לחבילה.
            </p>
            <p>
              בחבילת הודעות טיפוסית כלולים שני סבבי WhatsApp לאישורי הגעה. תזכורת SMS והודעת תודה תלויות
              בחבילה ובהגדרות — אין להניח שהן זהות לכל לקוח. לפרטים מדויקים בדקו את{" "}
              <Link href="/pricing" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מחשבון החבילות
              </Link>
              .
            </p>
          </div>
          <ol className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              "פתיחת שירות Save the Date בחשבון",
              "הכנת רשימת מוזמנים",
              "שליחת הודעת שמירת התאריך",
              "הכנת הזמנה מלאה וקישור אישי",
              "התחלת סבבי אישורי הגעה",
              "מעקב תשובות לפי החבילה",
              "תזכורת / תודה אם כלולות",
              "הושבה ומספר שולחן אם נרכשו",
            ].map((step, i) => (
              <li key={step} className="rounded-[20px] border border-[#E6D2AA] bg-[#FFFDF8] px-4 py-4">
                <p className="text-xs font-bold text-[#A77A38]">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-[#2C241C]">{step}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <figure className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#1C1612]">
              <video
                className="aspect-video h-auto w-full object-cover"
                src="/marketing/videos/home-save-the-date.webm"
                poster="/marketing/videos/home-save-the-date-poster.jpg"
                controls
                playsInline
                preload="metadata"
              >
                סרטון הדגמת Save the Date
              </video>
              <figcaption className="px-4 py-3 text-center text-sm text-[#D8CBB8]">
                הדגמת מותג · חוויית Save the Date בטלפון
              </figcaption>
            </figure>
            <div className="flex flex-col justify-center gap-4 rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-6">
              <p className="text-base leading-8 text-[#5C4A3A]">
                רוצים לראות את הזרימה במערכת? אפשר להתחיל ב־
                <Link href="/try" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  דמו Invistimo
                </Link>
                , או לעבור ל־
                <Link
                  href="/rsvp/save-the-date"
                  className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                >
                  עמוד שירות Save the Date
                </Link>
                .
              </p>
              <TrackedCtaLink href="/contact" className={ctaPrimary} location={`flow_contact:${PATH}`}>
                לדבר על פתיחת השירות
              </TrackedCtaLink>
            </div>
          </div>
        </div>
      </section>

      {/* SAME GUESTS */}
      <section aria-labelledby="same-guests" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>רשימת מוזמנים</Eyebrow>
          <h2 id="same-guests" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            האם שולחים Save the Date והזמנה לאותם אורחים?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A]">
            <p>
              לרוב כן — לאותם אנשים שאתם מתכוונים להזמין. רשימה מסודרת עוזרת לעדכן מוקדם את מי שצריך, להוסיף
              אורחים בהמשך, ולהבדיל בין משפחות ליחידים.
            </p>
            <p>
              אורחים מחו״ל לעיתים מקבלים הודעה מוקדמת גם אם שאר הרשימה תמתין להזמנה. חשוב למנוע שליחה כפולה
              ולשמור על פרטיות פרטי הקשר. אין להבטיח פילוח אוטומטי אם אינו מוגדר בחשבון.
            </p>
          </div>
        </div>
      </section>

      {/* DIGITAL VS PRINT */}
      <section aria-labelledby="digital-print" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>דיגיטלי ומודפס</Eyebrow>
          <h2 id="digital-print" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            מה ההבדל בין Save the Date דיגיטלי למודפס?
          </h2>
          <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white">
            <table className="min-w-[560px] w-full text-right text-sm md:min-w-0 md:text-base">
              <thead className="bg-[#1C1612] text-[#F7F1E8]">
                <tr>
                  <th className="px-4 py-3 font-bold">נושא</th>
                  <th className="px-4 py-3 font-bold">דיגיטלי</th>
                  <th className="px-4 py-3 font-bold">מודפס</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["מהירות", "שליחה מהירה לרשימה", "הפקה ומשלוח לוקחים זמן"],
                  ["גמישות", "קל לעדכן לפני שליחה", "שינוי דורש הדפסה מחדש"],
                  ["נוחות", "מגיע לטלפון", "מגיע לתיבת הדואר / ביד"],
                  ["עיצוב", "מותאם למסך", "מרקם ונייר"],
                  ["עלויות", "לרוב לפי שירות/רשומות", "הדפסה + הפצה"],
                  ["ערך רגשי", "מיידי וחגיגי", "מזכרת פיזית"],
                ].map(([a, b, c]) => (
                  <tr key={a} className="border-t border-[#EADDC8]">
                    <td className="px-4 py-3 font-bold text-[#2C241C]">{a}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{b}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-[#7A6042]">
            אין פתרון אחד שמתאים לכולם. חלק מהזוגות משלבים כרטיס מודפס לקרובים ביותר עם שליחה דיגיטלית לשאר
            הרשימה.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section aria-labelledby="pricing" className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow onDark>מחיר</Eyebrow>
          <h2 id="pricing" className="mt-3 text-3xl font-black text-[#FFF8EF] md:text-4xl">
            כמה עולה Save the Date לעומת הזמנה דיגיטלית?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-[#D8CBB8]">
            <p>
              Save the Date הוא שירות נפרד (תוספת Pre‑RSVP). אפשר לרכוש אותו לבד או יחד עם הזמנה מוקדמת. הזמנה
              דיגיטלית ואישורי הגעה מתומחרים בעיקר לפי מספר רשומות, ערוצי שליחה ושירותים נלווים בחבילה.
            </p>
            <p>
              לפי מחירון ברירת המחדל להצעות מכירה במערכת: Save the Date בלבד במחיר בסיס של 150 ₪, ושילוב Save
              the Date עם הזמנה מוקדמת במחיר בסיס של 230 ₪. הסכום הסופי והזמינות תלויים בחשבון ובהטבות.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink href="/pricing" className={ctaPrimary} location={`price_pricing:${PATH}`}>
              למחשבון החבילות
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/rsvp/save-the-date#pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`price_std:${PATH}`}
            >
              פירוט בעמוד Save the Date
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* DESIGN MATCH */}
      <section aria-labelledby="design-match" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>עיצוב מתואם</Eyebrow>
          <h2 id="design-match" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            איך בוחרים עיצוב שמתאים לשתי ההודעות?
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "פלטת צבעים משותפת",
              "טיפוגרפיה תואמת",
              "מוטיב עיצובי חוזר",
              "גרסה קצרה לשמירת התאריך",
              "גרסה מלאה להזמנה",
              "התאמה למסכים קטנים וקריאות גבוהה",
            ].map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3 text-sm font-bold text-[#5E4735]"
              >
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <MiniInvite kind="std" />
            <MiniInvite kind="invite" />
          </div>
        </div>
      </section>

      {/* PLANNER */}
      <section id="planner" aria-labelledby="planner-title" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>מחשבון תכנון</Eyebrow>
          <h2 id="planner-title" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            מתי כדאי לשלוח?
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            הזינו תאריך חתונה וכמה פרטים בסיסיים — וקבלו לוח זמנים מוצע. ההמלצות גמישות בלבד ואינן מועדים
            מחייבים.
          </p>
          <div className="mt-8">
            <PlanningCalculator />
          </div>
        </div>
      </section>

      {/* SCENARIO */}
      <section aria-labelledby="scenario" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>דוגמה מלאה</Eyebrow>
          <h2 id="scenario" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            מיה ואלון מתחתנים בעוד שמונה חודשים
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            תרחיש לדוגמה: כ־280 אורחים מתוכננים, חלקם מחו״ל. התאריך: 24 ביוני 2027. הציר שלמטה מדגים תהליך
            אפשרי — לא תוכנית חובה.
          </p>
          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCENARIO_STEPS.map((step, i) => (
              <li key={step.title} className="rounded-[20px] border border-[#E6D2AA] bg-[#FBF6EE] p-4">
                <p className="text-xs font-bold text-[#A77A38]">
                  {String(i + 1).padStart(2, "0")} · {step.when}
                </p>
                <h3 className="mt-2 text-base font-black text-[#2C241C]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-[#7A6042]">
            להמשך הדרך:{" "}
            <Link href="/info/guides/table-number-message" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              הודעת מספר שולחן
            </Link>
            {" · "}
            <Link href="/seating-explained" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              סידורי הושבה
            </Link>
          </p>
        </div>
      </section>

      {/* COPY EXAMPLES */}
      <section aria-labelledby="examples" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>נוסחים מוכנים</Eyebrow>
          <h2 id="examples" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            דוגמאות מוכנות להעתקה
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            בחרו נוסח, התאימו שמות ותאריך, והעתיקו. שימו לב להבחנה בין נוסח ידני לבין תבניות מערכת מאושרות.
          </p>
          <div className="mt-8">
            <CopyExamples />
          </div>
        </div>
      </section>

      {/* MISTAKES */}
      <section aria-labelledby="mistakes" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>ללמוד מטעויות</Eyebrow>
          <h2 id="mistakes" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            טעויות נפוצות בשליחת Save the Date והזמנה
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {MISTAKES.map(([title, fix], i) => (
              <li key={title} className="rounded-[22px] border border-[#E6D2AA] bg-[#FBF6EE] p-5">
                <p className="text-xs font-bold tracking-[0.16em] text-[#A77A38]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-lg font-black text-[#2C241C]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{fix}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CHECKLIST */}
      <section aria-labelledby="checklist" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>לפני ששולחים</Eyebrow>
          <h2 id="checklist" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            מה כדאי לבדוק לפני ששולחים?
          </h2>
          <div className="mt-8">
            <SendChecklist />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            שאלות שזוגות באמת שואלים
          </h2>
          <div className="mt-8 space-y-3">
            {STD_VS_INVITE_FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-[20px] border border-[#E6D2AA] bg-[#FBF6EE] px-5 py-4 open:bg-white"
              >
                <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none">
                  <span className="flex items-start justify-between gap-3">
                    {item.q}
                    <span className="text-[#C9A45C] transition group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* RELATED + CTA */}
      <section className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[28px] border border-[#E6D2AA] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF8] to-[#F7EBD9] p-8 md:p-10">
            <Eyebrow>הצעד הבא</Eyebrow>
            <h2 className="mt-3 max-w-2xl text-3xl font-black text-[#2C241C] md:text-4xl">
              מוכנים לתכנן את שלבי ההזמנה?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#5C4A3A]">
              התחילו מ־Save the Date, מהזמנה דיגיטלית, או מצפייה בחבילות — לפי מה שמתאים לשלב שלכם.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="/rsvp/save-the-date" className={ctaPrimary} location={`cta_std:${PATH}`}>
                עמוד Save the Date
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/invitations/chatuna"
                className={ctaSecondary}
                location={`cta_invites:${PATH}`}
              >
                הזמנות דיגיטליות
              </TrackedCtaLink>
              <TrackedCtaLink href="/try" className={ctaSecondary} location={`cta_demo:${PATH}`}>
                דמו Invistimo
              </TrackedCtaLink>
            </div>
          </div>
          <nav aria-label="מדריכים קשורים" className="mt-10">
            <h2 className="text-xl font-black text-[#2C241C]">המשך קריאה</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { href: "/rsvp/save-the-date", label: "שירות Save the Date" },
                { href: "/invitations/chatuna", label: "הזמנות דיגיטליות לחתונה" },
                { href: "/info/guides/send-digital-invitation", label: "מדריך שליחת הזמנה דיגיטלית" },
                { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
                { href: "/info/guides/table-number-message", label: "הודעת מספר שולחן" },
                { href: "/seating-explained", label: "סידורי הושבה" },
                { href: "/pricing", label: "חבילות ומחירים" },
                { href: "/info/guides", label: "מרכז המדריכים" },
                { href: "/try", label: "דמו Invistimo" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-12 items-center rounded-2xl border border-[#E6D2AA] bg-[#FFFDF8] px-4 py-3 text-sm font-bold text-[#5E4735] transition hover:border-[#C7A56B]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </article>
  );
}

const CHANGE_DATE_TEXT = `משפחה וחברים יקרים ❤️
רצינו לעדכן שתאריך החתונה שלנו השתנה.
התאריך החדש הוא [תאריך].
נשמח שתעדכנו את היומן, ופרטים נוספים יישלחו בהמשך.`;

function CopyChangeDateButton() {
  return (
    <button
      type="button"
      className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735] print:hidden"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(CHANGE_DATE_TEXT);
        } catch {
          /* ignore */
        }
      }}
    >
      העתקה
    </button>
  );
}
