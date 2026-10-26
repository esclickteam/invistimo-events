"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { GUESTS_NO_REPLY_FAQS } from "./guideFaqs";

const PATH = "/info/guides/guests-who-dont-reply";

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

const WHY_REASONS = [
  {
    title: "עדיין לא יודעים אם יגיעו",
    text: "יש אורחים שצריכים לבדוק עבודה, ילדים, נסיעה או התחייבות אחרת.",
  },
  {
    title: "ראו את ההודעה ודחו את התשובה",
    text: "לפעמים מתכננים לענות בהמשך ושוכחים.",
  },
  {
    title: "לא זיהו מיד את ההודעה",
    text: "הודעה ממספר שאינו מוכר עשויה לקבל פחות תשומת לב.",
  },
  {
    title: "מעדיפים שיחה אישית",
    text: "יש אורחים שנוח להם יותר להשיב בטלפון.",
  },
  {
    title: "חושבים שכבר הודיעו לבני הזוג",
    text: "אורח שאמר בשיחה שהוא מגיע לא בהכרח עדכן את מערכת אישורי ההגעה.",
  },
] as const;

const PROCESS_STEPS = [
  "נשלחת פנייה לאישור הגעה במסגרת הסבב הפעיל.",
  "אורחים שמשיבים מקבלים סטטוס מעודכן במערכת.",
  "אורחים שלא השיבו נשארים במעקב.",
  "בהתאם לחבילה ולהגדרות, הם יכולים להיכלל בסבב הבא.",
  "בעלי האירוע רואים תמונת מצב מעודכנת של התשובות.",
] as const;

const AVOID_ITEMS = [
  "לא לשלוח פניות חוזרות בהפרשים קצרים מדי.",
  "לא לפנות שוב למי שכבר השיב, אלא אם יש צורך מוצדק.",
  "לא להתייחס לאי־מענה כאישור הגעה או כביטול.",
  "לא לכתוב הודעות מאיימות או מלחיצות.",
  "לא להוסיף סבבים ללא צורך.",
  "לא להמתין לרגע האחרון לפני מועד מסירת המספרים לאולם.",
] as const;

const DEMO_GUESTS = [
  { name: "דנה", status: "אישרה הגעה", tone: "ok" as const },
  { name: "רועי", status: "לא מגיע", tone: "no" as const },
  { name: "משפחת כהן", status: "ממתינים לתשובה", tone: "wait" as const },
  { name: "מאיה", status: "אישרה הגעה", tone: "ok" as const },
] as const;

function StatusPill({ tone, children }: { tone: "ok" | "no" | "wait"; children: React.ReactNode }) {
  const styles =
    tone === "ok"
      ? "border-[#B7D4BC] bg-[#EAF5EC] text-[#2F5A38]"
      : tone === "no"
        ? "border-[#E2B8B8] bg-[#F8EAEA] text-[#7A3535]"
        : "border-[#E4D3B6] bg-[#F7EDDF] text-[#7A5530]";
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles}`}>
      {children}
    </span>
  );
}

export default function GuestsNoReplyGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.2),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(58,43,34,0.08),transparent_38%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_52%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 md:gap-12 md:px-8 md:pb-16 md:pt-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך · Invistimo</p>
            <h1 className="mt-3 max-w-2xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.65rem]">
              אורחים שלא עונים לאישורי הגעה — מה עושים?
            </h1>
            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735]">
              לא כל אורח משיב בפנייה הראשונה. זה לא אומר שצריך להתחיל לרדוף אחריו.
            </p>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              עם תהליך אישורי הגעה מסודר, אפשר לעקוב אחרי האורחים שעדיין לא השיבו ולהמשיך לפנות אליהם
              בהתאם לסבבים הכלולים בחבילה שלכם.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="/rsvp/chatuna" className={ctaPrimary} location={`hero_chatuna:${PATH}`}>
                לאישורי הגעה לחתונה
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/info/guides/when-to-send-rsvp"
                className={ctaSecondary}
                location={`hero_timing:${PATH}`}
              >
                מתי כדאי לשלוח
              </TrackedCtaLink>
            </div>
          </div>
          <figure className="relative space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
              <Image
                src="/images/marketing-captures/demo/guests-no-reply-hero.webp"
                alt="מסך ניהול מוזמנים אמיתי ב־Invistimo עם סטטוסים: אישרו הגעה, לא מגיעים וממתינים לתשובה"
                width={1200}
                height={900}
                className="h-auto w-full object-contain object-top"
                priority
                sizes="(max-width:1024px) 100vw, 46vw"
              />
            </div>
            <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#1E1814]">
              <PublicAutoplayVideo
                src="/videos/marketing-captures/demo-guests-dashboard.webm"
                poster="/videos/marketing-captures/demo-guests-dashboard-poster.jpg"
                title="סרטון דמו — דשבורד מוזמנים עם סטטוסי אישור הגעה"
                shellClassName="w-full"
                className="aspect-[8/5] w-full"
                expandable
                frameBg="#1E1814"
              />
            </div>
            <figcaption className="text-center text-sm text-[#7A6042]">
              סטטוסים אמיתיים במערכת: אישרו הגעה · לא מגיעים · ממתינים לתשובה
            </figcaption>
          </figure>
        </div>
      </header>

      {/* Core explanation */}
      <section aria-labelledby="what-happens" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>העיקרון</Eyebrow>
          <h2 id="what-happens" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            מה קורה כשאורח לא עונה לאישור ההגעה?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              רוב האורחים מקבלים את הודעות ההזמנה ואישורי ההגעה ונחשפים אליהן, אבל לא כולם משיבים מיד.
              לפעמים הם עסוקים, לפעמים הם עדיין לא יודעים אם יוכלו להגיע, ולפעמים הם פשוט מתכוונים
              לענות מאוחר יותר.
            </p>
            <p>
              ב־Invistimo אורחים שלא השיבו נשארים במעקב במערכת, ובהתאם לחבילה שנבחרה הם יכולים לעבור
              לסבב הפנייה הבא.
            </p>
            <p>
              כך אפשר להמשיך לאסוף תשובות בצורה מסודרת, בלי לחזור ידנית לכל אורח ובלי לאבד את המעקב
              אחר מי שעדיין לא השיב.
            </p>
            <p className="rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-4 text-[15px] leading-7 text-[#5C4A3A]">
              חשוב: מסירה וקריאה בפועל תלויות בגורמים שונים. אנחנו מתארים כאן התנהגות נפוצה של אורחים —
              לא הבטחה שכל הודעה נמסרה או נקראה, ולא מספר קבוע של סבבים שכל אורח מקבל.{" "}
              <Link
                href="/info/guides/whatsapp-vs-sms-rsvp"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                מה ההבדל בין הודעה שלא נמסרה לאורח שלא השיב?
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Why */}
      <section aria-labelledby="why-no-reply" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>סיבות נפוצות</Eyebrow>
          <h2 id="why-no-reply" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            למה אורחים לא משיבים לאישורי הגעה?
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {WHY_REASONS.map((r, i) => (
              <li
                key={r.title}
                className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-6 shadow-[0_12px_32px_rgba(44,36,28,0.04)]"
              >
                {!reduce ? (
                  <motion.span
                    className="text-xs font-black tracking-[0.16em] text-[#8A642E]"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </motion.span>
                ) : (
                  <span className="text-xs font-black tracking-[0.16em] text-[#8A642E]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <h3 className="mt-3 text-xl font-black text-[#2C241C]">{r.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{r.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-10 max-w-3xl text-base font-bold leading-8 text-[#2C241C] md:text-lg">
            אורח שלא ענה הוא לא בהכרח אורח שלא מגיע. עד שמתקבלת תשובה, חשוב להשאיר אותו בסטטוס
            המתאים ולא לנחש.
          </p>
        </div>
      </section>

      {/* How Invistimo handles */}
      <section aria-labelledby="how-followup" className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow onDark>איך זה עובד</Eyebrow>
          <h2 id="how-followup" className="mt-3 max-w-3xl text-3xl font-black text-[#FFF8EF] md:text-4xl">
            המעקב ממשיך בהתאם לחבילה שלכם
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#D8CBB8]">
            לא כל לקוח רוכש את אותה חבילה. יש הרכבים שונים של סבבים, ולכן סוג הפנייה הבאה — הודעת
            WhatsApp או שיחה — תלוי בחבילה ובתהליך שהוגדר. אין כאן מספר סבבים קבוע שכל אורח מקבל.
          </p>
          <ol className="mt-12 grid gap-4 lg:grid-cols-5">
            {PROCESS_STEPS.map((step, i) => (
              <li
                key={step}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-5"
              >
                <span className="text-xs font-black text-[#E8C988]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-[15px] font-semibold leading-7 text-[#F3E8D8]">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-3xl text-sm leading-7 text-[#B8A890]">
            זו המחשת תהליך מעקב — לא רשימת מספר פניות מחייבת לכל אורח.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/rsvp/whatsapp" className="font-bold text-[#E8C988] underline-offset-4 hover:underline">
              אישורי הגעה ב־WhatsApp
            </Link>
            <span className="text-[#6B5A48]" aria-hidden>
              ·
            </span>
            <Link href="/rsvp/calls" className="font-bold text-[#E8C988] underline-offset-4 hover:underline">
              אישורי הגעה בשיחות טלפון
            </Link>
            <span className="text-[#6B5A48]" aria-hidden>
              ·
            </span>
            <Link href="/rsvp/chatuna" className="font-bold text-[#E8C988] underline-offset-4 hover:underline">
              אישורי הגעה לחתונה
            </Link>
          </div>
        </div>
      </section>

      {/* More rounds? */}
      <section aria-labelledby="more-rounds" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>תכנון סבבים</Eyebrow>
          <h2 id="more-rounds" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            האם יותר סבבים באמת עוזרים?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              סבב נוסף יכול לעזור להגיע לאורחים שלא השיבו, במיוחד כאשר יש מספיק זמן עד המועד שבו צריך
              למסור את מספר המוזמנים לאולם.
            </p>
            <p>
              עם זאת, יותר פניות לא תמיד מובילות ליותר תשובות. כאשר פונים לאותו אורח שוב ושוב בפרק
              זמן קצר, התהליך עלול להפוך למעיק וליצור תחושת לחץ.
            </p>
            <p>
              לכן חשוב לבחור מספר סבבים סביר, לפזר אותם לאורך הזמן ולהימנע מפניות מיותרות.
            </p>
          </div>
          <aside className="mt-10 rounded-[28px] border border-[#E7D3B0] bg-[#FBF6EE] px-6 py-7">
            <p className="text-sm font-black tracking-[0.14em] text-[#8A642E]">המלצת Invistimo</p>
            <p className="mt-3 text-xl font-black leading-9 text-[#2C241C]">
              בדרך כלל אין צורך ביותר מ־3 סבבי הודעות ו־3 סבבי שיחות.
            </p>
            <p className="mt-4 text-[15px] leading-7 text-[#5C4A3A]">
              זהו גבול תכנוני מומלץ, ולא חובה לנצל את כל הסבבים. אין הכוונה שכל אורח חייב לקבל שש
              פניות. המספר המתאים תלוי בגודל האירוע, בהרכב האורחים, בזמן שנותר ובחבילה שנבחרה. מעבר
              לכך, פניות חוזרות עלולות לגרום ללחץ מיותר ולפגוע בשיתוף הפעולה של האורחים.
            </p>
            <p className="mt-3 text-sm leading-7 text-[#7A6042]">
              זו המלצה מקצועית לתכנון — לא נתון מחקרי ולא טענה שהוכחה סטטיסטית.
            </p>
          </aside>
        </div>
      </section>

      {/* Phone calls */}
      <section aria-labelledby="phone-calls" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שיחות</Eyebrow>
          <h2 id="phone-calls" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            למה שיחה טלפונית יכולה לעזור כשלא עונים להודעות?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              הודעות הן דרך נוחה לאיסוף תשובות, אבל יש אורחים שלא משיבים דרך קישור או הודעה. שיחה
              טלפונית יכולה להיות דרך נוספת להגיע אליהם, להסביר בקצרה את מטרת הפנייה ולקבל תשובה.
            </p>
            <p>
              במיוחד לקראת סיום תהליך אישורי ההגעה, שילוב שיחות יכול לעזור לצמצם את מספר האורחים שעדיין
              לא השיבו. חשוב לשמור על גישה נעימה ומכבדת — המטרה היא לקבל תשובה, לא להפעיל לחץ.
            </p>
            <p>
              ב־Invistimo אפשר לבחור חבילות עם{" "}
              <strong className="font-black text-[#2C241C]">שיחות מוקלטות</strong>,{" "}
              <strong className="font-black text-[#2C241C]">שיחות אנושיות</strong> או{" "}
              <strong className="font-black text-[#2C241C]">שילוב</strong> — בהתאם למסלול שנרכש. שיחות
              אינן כלולות אוטומטית בכל חבילת הודעות.
            </p>
          </div>
          <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/rsvp/calls" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              איך עובדים אישורי הגעה בשיחות טלפון?
            </Link>
            <Link href="/info/guides/cost-rsvp-wedding" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              כמה עולים אישורי הגעה לחתונה?
            </Link>
          </p>
        </div>
      </section>

      {/* What not to do */}
      <section aria-labelledby="avoid" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>גישה נעימה</Eyebrow>
          <h2 id="avoid" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            איך להימנע מלהלחיץ את האורחים?
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {AVOID_ITEMS.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-4 text-[15px] leading-7 text-[#5C4A3A]"
              >
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C9A45C]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who hasn't replied */}
      <section aria-labelledby="who-waiting" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>במערכת</Eyebrow>
          <h2 id="who-waiting" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            רואים מי השיב — ומי עדיין ממתין
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
            ברשימת המוזמנים אפשר לעקוב אחרי סטטוס אישור ההגעה, לראות מי השיב ומי לא, לעדכן מספר
            משתתפים מאושר ולהתכונן למסירת המספרים לאולם — בהתאם ליכולות המערכת ולשלב שבו נמצא האירוע.
          </p>
          <div className="mt-10 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white shadow-[0_24px_60px_rgba(58,39,20,0.1)]">
            <Image
              src="/images/marketing-captures/demo/guests-no-reply-hero.webp"
              alt="צילום מסך אמיתי של דשבורד מוזמנים ב־Invistimo עם סיכומי סטטוס אישורי הגעה"
              width={1400}
              height={1000}
              className="h-auto w-full object-cover object-top"
              sizes="(max-width:1024px) 100vw, 1100px"
            />
          </div>
          <ul className="mt-8 grid gap-3 text-[15px] leading-7 text-[#5C4A3A] sm:grid-cols-2">
            <li>סטטוס אישור הגעה לכל רשומה</li>
            <li>אורחים שהשיבו ואורחים שלא השיבו</li>
            <li>מספר משתתפים מאושר</li>
            <li>מעקב אחרי הרשימה לקראת מסירת מספרים לאולם</li>
          </ul>
        </div>
      </section>

      {/* When to start */}
      <section aria-labelledby="when-start" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>תזמון</Eyebrow>
          <h2 id="when-start" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            לתת לאורחים מספיק זמן לענות — בלי להתחיל מוקדם מדי
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              בחתונה רגילה, אפשר להתחיל את סבב אישורי ההגעה הראשון כ־14–18 ימים לפני האירוע.{" "}
              <strong className="font-black text-[#2C241C]">
                זהו המועד של הסבב הראשון בלבד, לא המועד שבו חייבים לסיים את כל הסבבים.
              </strong>
            </p>
            <p>
              את הסבבים הנוספים יש לפרוס בצורה מאוזנת עד למועד שבו צריך למסור את מספר המוזמנים לאולם.
              לכן, לפני שמתכננים את אישורי ההגעה, חשוב לדעת מתי האולם דורש את המספרים הסופיים.
            </p>
            <p>
              אם המועד של האולם אינו מאפשר להתחיל 14–18 ימים לפני האירוע, יש להתאים את התכנון למציאות
              ולא להציג לוח זמנים בלתי אפשרי.
            </p>
          </div>
          <div className="mt-8">
            <TrackedCtaLink
              href="/info/guides/when-to-send-rsvp"
              className={ctaSecondary}
              location={`timing_calc:${PATH}`}
            >
              למחשבון ומדריך התזמון
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* Demo example */}
      <section aria-labelledby="demo-example" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>דוגמה להמחשה</Eyebrow>
          <h2 id="demo-example" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            כך נראה מעקב מסודר אחרי אורחים שלא השיבו
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#7A6042]">
            דוגמה להמחשה בלבד — לא צילום של נתוני לקוחות אמיתיים.
          </p>
          <ul className="mt-8 divide-y divide-[#E7D3B0] overflow-hidden rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8]">
            {DEMO_GUESTS.map((g) => (
              <li key={g.name} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-base font-bold text-[#2C241C]">{g.name}</span>
                <StatusPill tone={g.tone}>{g.status}</StatusPill>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            לאחר סבב הפנייה, מי שעדיין לא השיב נשאר במעקב ויכול להיכלל בסבב הבא בהתאם לחבילה. אין כאן
            מספר קבוע של סבבים — רק עיקרון של מעקב מסודר.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            שאלות על אורחים שלא עונים
          </h2>
          <div className="mt-10 space-y-3">
            {GUESTS_NO_REPLY_FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-4 open:bg-white"
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
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-[#FFF8EF] md:text-4xl">
            רוצים תהליך אישורי הגעה עם מעקב מסודר?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            בחרו את החבילה שמתאימה לגודל הרשימה ולאופן הפנייה — הודעות, שיחות או שילוב — ושמרו על מעקב
            ברור אחרי מי שעדיין לא השיב.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/pricing" className={ctaPrimary} location={`footer_pricing:${PATH}`}>
              לצפייה בחבילות
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/rsvp/calls"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`footer_calls:${PATH}`}
            >
              אישורי הגעה בשיחות
            </TrackedCtaLink>
          </div>
          <p className="mt-8 text-sm text-[#B8A890]">
            <Link href="/info/guides" className="underline-offset-4 hover:underline">
              כל המדריכים
            </Link>
            {" · "}
            <Link href="/info/guides/guest-list" className="underline-offset-4 hover:underline">
              רשימת מוזמנים
            </Link>
            {" · "}
            <Link href="/rsvp/whatsapp" className="underline-offset-4 hover:underline">
              WhatsApp
            </Link>
            {" · "}
            <Link
              href="/info/guides/wedding-venue-guest-guarantee"
              className="underline-offset-4 hover:underline"
            >
              התחייבות לאולם
            </Link>
            {" · "}
            <Link href="/info/guides/whatsapp-vs-sms-rsvp" className="underline-offset-4 hover:underline">
              WhatsApp או SMS
            </Link>
            {" · "}
            <Link href="/info/guides/cost-rsvp-wedding" className="underline-offset-4 hover:underline">
              עלויות אישורי הגעה
            </Link>
          </p>
        </div>
      </section>
    </article>
  );
}
