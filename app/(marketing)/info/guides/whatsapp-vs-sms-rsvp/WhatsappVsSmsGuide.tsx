"use client";

import { useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";
import { WHATSAPP_VS_SMS_FAQS } from "./guideFaqs";

const PATH = "/info/guides/whatsapp-vs-sms-rsvp";

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

function ChannelDemo({ reduce }: { reduce: boolean | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="rounded-[32px] border border-[#E6D2AA] bg-[#FFFDF8] p-4 shadow-[0_28px_70px_rgba(58,39,20,0.14)]">
        <div className="space-y-3">
          <div
            className={`rounded-2xl border border-[#D8E8D4] bg-[#F3FAF3] p-3 ${
              reduce ? "" : "transition-opacity"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-[#2F5A38]">WhatsApp</p>
              <span className="rounded-full bg-[#2F5A38] px-2 py-0.5 text-[10px] font-bold text-white">נשלח</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#3F3025]">
              שלום דנה, מזמינים אתכם לחתונה. לאישור הגעה:{" "}
              <span className="font-bold text-[#8A642E]">invistimo.com/i/…</span>
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2B8B8] bg-[#FBF0F0] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-[#7A3535]">סטטוס שליחה</p>
              <span className="rounded-full bg-[#7A3535] px-2 py-0.5 text-[10px] font-bold text-white">נכשל</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">
              זוהה כשל מתאים במסירת WhatsApp — לא אי־מענה של האורח.
            </p>
          </div>

          <div className="flex justify-center" aria-hidden>
            <span className="text-lg text-[#A77A38]">↓</span>
          </div>

          <div className="rounded-2xl border border-[#DCC7A6] bg-[#FFF8EA] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-[#7A5530]">SMS חלופי</p>
              <span className="rounded-full bg-[#7A5530] px-2 py-0.5 text-[10px] font-bold text-white">נשלח</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#3F3025]">
              אישור הגעה לחתונה — אותו קישור אישי נשלח ב־SMS.
            </p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-[#7A6042]">המחשה ויזואלית · לא לוג לקוח אמיתי</p>
    </div>
  );
}

const FALLBACK_STEPS = [
  {
    n: "01",
    title: "שליחת WhatsApp",
    text: "המערכת מנסה לשלוח הודעת אישור הגעה עם קישור אישי.",
  },
  {
    n: "02",
    title: "בדיקת סטטוס",
    text: "מתקבלים ומעובדים דיווחי השליחה מ־WhatsApp (נשלח, נמסר, נקרא או נכשל).",
  },
  {
    n: "03",
    title: "זיהוי כשל",
    text: "רק סטטוס «נכשל» או «לא נשלח» נכנסים למנגנון הגיבוי — לא הודעה שנמסרה בלי תשובה.",
  },
  {
    n: "04",
    title: "שליחת SMS חלופי",
    text: "לאחר זמן המתנה קצר בכשל WhatsApp, נשלח SMS עם אותו קישור אישי — רק לאותו אורח.",
  },
  {
    n: "05",
    title: "האורח מאשר הגעה",
    text: "האורח פותח את הקישור ומעדכן את תשובתו בעמוד האישי.",
  },
] as const;

const COMPARE_ROWS = [
  ["אופן קבלה", "באפליקציית WhatsApp", "באפליקציית ההודעות"],
  ["נדרש חשבון WhatsApp", "כן", "לא"],
  ["נדרש מספר טלפון תקין", "כן", "כן"],
  ["קישור לאישור הגעה", "אפשרי", "אפשרי"],
  ["תלות במדיניות WhatsApp", "כן", "לא"],
  ["תלות במפעיל סלולרי", "קיימת ברמת קישוריות", "כן"],
  ["מסירה מובטחת", "לא", "לא"],
  ["שימוש מומלץ", "ערוץ ראשי", "ערוץ חלופי בעת כשל מתאים"],
] as const;

const REPORT_FIELDS = [
  "מספר הטלפון של הנמען",
  "שם האורח או הרשומה המשויכת",
  "סוג ההודעה או הסבב",
  "ערוץ השליחה — WhatsApp או SMS",
  "זמן האירוע הרלוונטי לסטטוס",
  "סטטוס השליחה",
  "אישור מסירה, כאשר התקבל מ־WhatsApp",
  "אישור קריאה, כאשר WhatsApp מספק אותו",
  "כשל שליחה וסיבת/קוד כשל, כאשר המידע זמין",
  "הפעלת SMS חלופי בעקבות כשל WhatsApp",
  "סטטוס ה־SMS החלופי (נשלח / נכשל / דולג)",
] as const;

const DEMO_REPORT = [
  { guest: "דנה כהן", channel: "WhatsApp", status: "נמסרה ונקראה", action: "ממתינים לאישור הגעה" },
  { guest: "רועי לוי", channel: "WhatsApp", status: "נכשלה", action: "נשלח SMS חלופי" },
  { guest: "רועי לוי", channel: "SMS", status: "נשלחה", action: "מעקב לפי דיווח הספק" },
  { guest: "מאיה ישראלי", channel: "WhatsApp", status: "נמסרה", action: "אין דיווח קריאה" },
] as const;

const SCENARIOS = [
  {
    name: "דנה",
    title: "WhatsApp נמסר",
    text: "דנה מקבלת את ההודעה, פותחת את הקישור ומאשרת הגעה. אין צורך ב־SMS.",
    tone: "ok" as const,
  },
  {
    name: "רועי",
    title: "WhatsApp נכשל",
    text: "המערכת מזהה כשל מתאים, שולחת SMS חלופי עם אותו קישור, ורועי פותח את העמוד.",
    tone: "fallback" as const,
  },
  {
    name: "משפחת כהן",
    title: "ההודעה נמסרה, אך אין תשובה",
    text: "הרשומה נשארת במעקב ויכולה להיכלל בסבב הבא בהתאם לחבילה. זה אינו טריגר ל־SMS חלופי.",
    tone: "wait" as const,
  },
] as const;

export default function WhatsappVsSmsGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* HERO */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.2),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(58,43,34,0.08),transparent_38%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_52%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 md:gap-12 md:px-8 md:pb-16 md:pt-8 lg:grid-cols-[1.05fr_0.95fr]">
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
              <span>WhatsApp או SMS</span>
            </nav>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך · Invistimo</p>
            <h1 className="mt-3 max-w-2xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
              אישורי הגעה ב־WhatsApp או SMS — מה באמת עדיף?
            </h1>
            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735]">
              הדרך החכמה היא לא לבחור רק אחד מהם. היא לדעת מתי להשתמש בכל אחד.
            </p>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                WhatsApp הפך לחלק טבעי מהתקשורת היומיומית שלנו. לכן, כששולחים אישורי הגעה לחתונה או לאירוע, זו לרוב
                דרך נוחה להתחיל את התהליך.
              </p>
              <p>
                אבל מה קורה אם ההודעה לא נשלחת? אם לאורח אין WhatsApp? או אם קיימת מגבלה שמונעת את מסירת ההודעה?
              </p>
              <p>
                ב־Invistimo שילבנו בין WhatsApp ל־SMS כדי לצמצם את התלות בערוץ שליחה אחד. כאשר מזוהה כשל מתאים
                בשליחת WhatsApp, המערכת מפעילה שליחת SMS חלופית באופן אוטומטי.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="/rsvp" className={ctaPrimary} location={`hero_rsvp:${PATH}`}>
                לגלות איך עובדים אישורי ההגעה
              </TrackedCtaLink>
              <a href="#fallback" className={ctaSecondary}>
                איך עובד הגיבוי ב־SMS?
              </a>
            </div>
          </div>
          <div className="space-y-6">
            <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
              <Image
                src="/images/rsvp/guides/unique-atmosphere/whatsapp-vs-sms-hero.jpg"
                alt="השוואה ויזואלית בין הודעת צ׳אט ל־SMS — המחשה"
                width={1280}
                height={720}
                className="h-auto w-full object-cover"
                priority
                sizes="(max-width:1024px) 100vw, 40vw"
              />
            </figure>
            <ChannelDemo reduce={reduce} />
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#1E1814]">
          <PublicAutoplayVideo
            src="/videos/marketing-captures/product-messages.webm"
            poster="/videos/marketing-captures/product-messages-poster.jpg"
            title="הקלטת מסך — בחירת ערוץ WhatsApp או SMS בשליחת הודעות"
            shellClassName="w-full"
            className="aspect-[8/5] w-full"
            expandable
            frameBg="#1E1814"
          />
          <p className="border-t border-[#EFE2CC] bg-[#FFFDF8] px-5 py-3 text-sm font-semibold text-[#7A6042]">
            הקלטת מסך אמיתית מדמו מבודד — מסך שליחת הודעות עם ערוצי WhatsApp ו־SMS
          </p>
        </div>
      </header>

      {/* WHY WHATSAPP */}
      <section aria-labelledby="why-wa" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>למה WhatsApp</Eyebrow>
          <h2 id="why-wa" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            כי שם אנשים כבר רגילים לקבל הודעות
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              WhatsApp הוא אחד מאמצעי התקשורת הנפוצים בישראל. אנשים משתמשים בו לשיחות עם המשפחה, לתיאומים, לקבוצות
              ולהודעות יומיומיות. לכן קבלת הודעת אישור הגעה ב־WhatsApp יכולה להרגיש טבעית ונוחה.
            </p>
            <p>
              האורח מקבל הודעה, פותח את הקישור האישי ומגיע לעמוד שבו הוא יכול לצפות בפרטי האירוע ולאשר אם יגיע. אין
              צורך להוריד אפליקציה נוספת כדי להשתמש בעמוד אישור ההגעה עצמו.
            </p>
            <p className="rounded-[18px] border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3 text-sm leading-7 md:text-base">
              האישור מתבצע בעמוד האישי דרך הקישור — לא באמצעות כפתור תגובה בתוך הודעת WhatsApp.
            </p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "ערוץ מוכר ונוח לאורחים רבים",
              "אפשרות לשלב קישור אישי",
              "חוויית פתיחה נוחה בטלפון",
              "מעבר פשוט מההודעה לעמוד האישור",
              "שילוב עם ניהול המוזמנים",
            ].map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-sm font-bold text-[#5E4735]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LIMITATIONS */}
      <section aria-labelledby="limits" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>מגבלות</Eyebrow>
          <h2 id="limits" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            WhatsApp נוח מאוד — אבל לא כל הודעה בהכרח תגיע
          </h2>
          <p className="mt-6 text-base leading-8 text-[#5C4A3A] md:text-lg">
            למרות היתרונות, יש מצבים שבהם הודעה לא נמסרת. חשוב להבחין בין חסימת שולח, הגדרות פרטיות, מגבלות שיווקיות
            וכשלי מסירה — ולא לטעון שכל מי שלא שמר את מספר השולח חוסם הודעות.
          </p>
          <div className="mt-8 space-y-4">
            {[
              ["לאורח אין WhatsApp", "לא כל מספר טלפון משויך לחשבון WhatsApp פעיל."],
              [
                "מגבלות של הפלטפורמה",
                "WhatsApp Business Platform כפופה למדיניות Meta: תבניות מאושרות, סיווג הודעות, איכות שליחה ומגבלות נוספות.",
              ],
              [
                "מגבלות על הודעות שיווקיות",
                "הודעות שמסווגות כשיווקיות עשויות להיות כפופות למגבלות נוספות, ולא כל ניסיון שליחה יסתיים במסירה.",
              ],
              [
                "הגדרות פרטיות וחסימה",
                "הגדרות המשתמש, חסימת שולח או מנגנוני הגנה של הפלטפורמה עשויים להשפיע על קבלת הודעות.",
              ],
              ["מספר טלפון לא תקין", "אם פרטי הקשר שגויים, ההודעה עלולה להיכשל."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[20px] border border-[#E6D2AA] bg-white/85 px-5 py-4">
                <h3 className="text-lg font-black text-[#2C241C]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DON'T RELY ONLY */}
      <section aria-labelledby="dont-rely" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>למה לא רק WhatsApp</Eyebrow>
          <h2 id="dont-rely" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            כי אישורי הגעה צריכים להגיע גם למי שלא זמין ב־WhatsApp
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              כשמנהלים אירוע, המטרה היא לקבל תמונה מדויקת ככל האפשר של תשובות האורחים. אם מסתמכים על ערוץ שליחה אחד
              בלבד, כשל במסירת ההודעה עלול להשאיר אורח בלי הזמנה לאישור הגעה.
            </p>
            <p>
              לכן כדאי להשתמש במנגנון שמזהה כשלים ומאפשר ניסיון שליחה בערוץ חלופי. הדגש אינו על שליחת יותר הודעות
              לאותו אורח, אלא על שימוש נכון בערוץ המתאים כדי להגדיל את הסיכוי שהפנייה תגיע אליו.
            </p>
          </div>
        </div>
      </section>

      {/* FALLBACK MECHANISM */}
      <section id="fallback" aria-labelledby="fallback-title" className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow onDark>מנגנון הגיבוי</Eyebrow>
          <h2 id="fallback-title" className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#FFF8EF] md:text-4xl">
            WhatsApp לא נשלח? המערכת יכולה לעבור אוטומטית ל־SMS
          </h2>
          <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-[#D8CBB8] md:text-lg">
            <p>
              ב־Invistimo לא הסתפקנו בשליחת הודעות WhatsApp בלבד. בנינו מנגנון שמזהה כשלי שליחה ומפעיל הודעת SMS
              חלופית לאורח הרלוונטי — בלי להמתין שבעלי האירוע יגלו את הכשל וישלחו ידנית.
            </p>
            <p>
              הגיבוי מופעל רק כשסטטוס ה־WhatsApp הוא «נכשל» או «לא נשלח». הודעה שנמסרה או נקראה — גם אם האורח עדיין
              לא השיב — אינה מפעילה SMS חלופי.
            </p>
            <p>
              אותו קישור אישי נשמר במעבר בין הערוצים. המערכת מונעת שליחה כפולה לאותו ניסיון, ומגבילה את חלון הגיבוי
              (ברירת מחדל: עד כ־24 שעות ממועד הכשל). אם גם ה־SMS נכשל, ניתן לבצע עד שלושה ניסיונות חוזרים עם השהייה
              קצרה — ואם התוצאה לא ידועה אחרי שליחה לספק, אין שליחה חוזרת אוטומטית.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {FALLBACK_STEPS.map((step) => (
              <li key={step.n} className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-bold tracking-[0.2em] text-[#E8C988]">{step.n}</p>
                <h3 className="mt-2 text-lg font-black text-[#FFF8EF]">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#D8CBB8]">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* DELIVERY REPORTS */}
      <section aria-labelledby="reports" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>דוחות שליחה</Eyebrow>
          <h2 id="reports" className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            לא רק שולחים הודעות — גם יודעים מה קרה לכל שליחה
          </h2>
          <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              כששולחים אישורי הגעה למאות אורחים, חשוב לא רק לדעת שהפעלתם סבב הודעות, אלא גם להבין מה קרה בפועל: האם
              ההודעה נשלחה? האם WhatsApp אישר את מסירתה? האם התקבל דיווח קריאה? האם השליחה נכשלה ונדרש SMS חלופי?
            </p>
            <p>
              ב־Invistimo מתקבלים נתוני סטטוס ממערכות השליחה, המאפשרים מעקב מפורט לפי מספר טלפון — בהתאם למידע שספק
              השליחה מדווח בפועל.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-black text-[#2C241C]">מה אפשר לראות בדוח השליחה?</h3>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {REPORT_FIELDS.map((field) => (
              <li key={field} className="rounded-xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3 text-sm font-bold text-[#5E4735]">
                {field}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-7 text-[#7A6042]">
            ספק ה־SMS הנוכחי אינו מספק אישורי מסירה או קריאה; ל־SMS, סטטוס «נשלח» הוא הסטטוס הסופי הזמין.
          </p>

          <div className="mt-10 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white">
            <table className="min-w-full text-right text-sm md:text-base">
              <caption className="border-b border-[#EADDC8] px-4 py-3 text-right text-sm font-semibold text-[#7A6042]">
                המחשת דוח שליחה · נתונים פיקטיביים בלבד
              </caption>
              <thead className="bg-[#1C1612] text-[#F7F1E8]">
                <tr>
                  <th className="px-4 py-3 font-bold">אורח</th>
                  <th className="px-4 py-3 font-bold">ערוץ</th>
                  <th className="px-4 py-3 font-bold">סטטוס</th>
                  <th className="px-4 py-3 font-bold">פעולה</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_REPORT.map((row, i) => (
                  <tr key={`${row.guest}-${row.channel}-${i}`} className="border-t border-[#EADDC8]">
                    <td className="px-4 py-3 font-bold text-[#2C241C]">{row.guest}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{row.channel}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{row.status}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SENT / DELIVERED / READ */}
      <section aria-labelledby="statuses" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>סטטוסי WhatsApp</Eyebrow>
          <h2 id="statuses" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            נשלחה, נמסרה או נקראה — מה ההבדל?
          </h2>
          <div className="mt-8 space-y-4">
            {[
              [
                "נשלחה (Sent)",
                "WhatsApp דיווחה שההודעה נשלחה במסגרת תהליך המסירה. זה עדיין לא בהכרח אישור שההודעה הגיעה למכשיר הנמען.",
              ],
              [
                "נמסרה (Delivered)",
                "התקבל אישור מסירה מ־WhatsApp. המשמעות היא שהפלטפורמה דיווחה שההודעה נמסרה, אך אין בכך הוכחה שהאורח קרא את התוכן.",
              ],
              [
                "נקראה (Read)",
                "WhatsApp דיווחה שההודעה נקראה. דיווחי קריאה עשויים להיות תלויים בהגדרות הפרטיות ובזמינות המידע.",
              ],
              [
                "נכשלה (Failed)",
                "התקבל דיווח על כשל בשליחה או במסירה. בהתאם לסוג הכשל, המערכת יכולה להפעיל שליחת SMS חלופי.",
              ],
              [
                "אין אישור קריאה",
                "לא התקבל דיווח קריאה. זה לא בהכרח אומר שהאורח לא קרא את ההודעה.",
              ],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[20px] border border-[#E6D2AA] bg-white px-5 py-4">
                <h3 className="text-lg font-black text-[#2C241C]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-[22px] border border-[#C9A962]/40 bg-[#1C1612] px-5 py-5 text-[#F7F1E8]">
            <p className="text-sm font-bold tracking-[0.14em] text-[#E8C988]">הבחנה קריטית</p>
            <p className="mt-2 text-lg font-black text-[#FFF8EF]">
              אישור קריאה של WhatsApp אינו אישור הגעה לאירוע.
            </p>
            <p className="mt-3 text-sm leading-7 text-[#D8CBB8] md:text-base">
              אורח יכול לקרוא את ההודעה ועדיין לא להשיב. אישור ההגעה עצמו מתבצע בקישור האישי, וסטטוס התשובה מנוהל
              בנפרד מסטטוס המסירה והקריאה.
            </p>
          </div>
        </div>
      </section>

      {/* REPORT BENEFIT */}
      <section aria-labelledby="report-why" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שקיפות</Eyebrow>
          <h2 id="report-why" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            יותר שקיפות. פחות ניחושים.
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              דוח שליחה מפורט עוזר להבין מה קרה להודעות אישורי ההגעה ולזהות בעיות במסירה. הוא מאפשר להבחין בין אורח
              שלא השיב למרות שההודעה נמסרה לבין אורח שההודעה אליו נכשלה.
            </p>
            <p>
              כך אפשר לנהל את ההמשך בצורה מסודרת יותר, במקום להתייחס לכל מי שלא ענה באותה צורה. מעקב אחר מסירה וקריאה
              אינו מבטיח שכל האורחים יפתחו את הקישור או יאשרו הגעה.
            </p>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section aria-labelledby="compare" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>השוואה</Eyebrow>
          <h2 id="compare" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            WhatsApp או SMS: מה ההבדל?
          </h2>
          <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white">
            <table className="min-w-[640px] w-full text-right text-sm md:min-w-0 md:text-base">
              <thead className="bg-[#1C1612] text-[#F7F1E8]">
                <tr>
                  <th className="px-4 py-3 font-bold">נושא</th>
                  <th className="px-4 py-3 font-bold">WhatsApp</th>
                  <th className="px-4 py-3 font-bold">SMS</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(([topic, wa, sms]) => (
                  <tr key={topic} className="border-t border-[#EADDC8]">
                    <th className="px-4 py-3 font-bold text-[#2C241C]">{topic}</th>
                    <td className="px-4 py-3 text-[#5C4A3A]">{wa}</td>
                    <td className="px-4 py-3 text-[#5C4A3A]">{sms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SMS STILL RELEVANT */}
      <section aria-labelledby="sms-relevant" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>SMS היום</Eyebrow>
          <h2 id="sms-relevant" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            בהחלט. דווקא כש־WhatsApp לא זמין.
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              למרות השימוש הנרחב ב־WhatsApp, ל־SMS עדיין יש תפקיד חשוב. הוא אינו מחייב חשבון WhatsApp או התקנה של
              אפליקציית מסרים מסוימת, ויכול לשמש ערוץ חלופי כאשר הודעת WhatsApp נכשלת.
            </p>
            <p>
              עם זאת, גם SMS תלוי בתקינות מספר הטלפון, במפעיל הסלולרי ובגורמים נוספים, ולכן אינו מבטיח מסירה או
              קריאה.
            </p>
          </div>
        </div>
      </section>

      {/* SMART COMBINATION */}
      <section aria-labelledby="smart" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>שילוב חכם</Eyebrow>
          <h2 id="smart" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            לא עוד הודעות. שליחה חכמה יותר.
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              הדרך המומלצת היא להתחיל בערוץ המתאים לרוב האורחים ולהפעיל ערוץ חלופי כאשר מתגלה כשל. כך אפשר לצמצם
              פניות שדורשות טיפול ידני ולשמור על חוויית אורח נעימה.
            </p>
          </div>
          <div className="mt-8 rounded-[24px] border border-[#C9A962]/50 bg-[#1C1612] px-6 py-6 text-[#FFF8EF]">
            <p className="text-sm font-bold tracking-[0.14em] text-[#E8C988]">היתרון האמיתי</p>
            <p className="mt-3 text-xl font-black leading-9 md:text-2xl">
              לא שכל אורח מקבל גם WhatsApp וגם SMS — אלא שהמערכת יודעת מתי נדרש ניסיון שליחה חלופי.
            </p>
          </div>
        </div>
      </section>

      {/* NO REPLY VS FAILURE */}
      <section aria-labelledby="no-reply" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>אי־מענה</Eyebrow>
          <h2 id="no-reply" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            ההודעה הגיעה, אבל אין תשובה? זה כבר שלב אחר בתהליך.
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              יש הבדל חשוב בין הודעה שלא נמסרה לבין אורח שקיבל הודעה ועדיין לא השיב. כאשר הודעה נכשלת, מנגנון הגיבוי
              יכול להפעיל SMS חלופי. כאשר אורח עדיין לא השיב, הוא נשאר במעקב ובהתאם לסבבים הכלולים בחבילה יכול להיכלל
              בסבב הפנייה הבא.
            </p>
          </div>
          <p className="mt-6">
            <Link
              href="/info/guides/guests-who-dont-reply"
              className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
            >
              למדריך: מה עושים עם אורחים שלא עונים
            </Link>
          </p>
        </div>
      </section>

      {/* CALLS */}
      <section aria-labelledby="calls" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שיחות</Eyebrow>
          <h2 id="calls" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            לפעמים הודעה לא מספיקה — ושיחה יכולה להשלים את התהליך
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              יש אורחים שמעדיפים לענות בטלפון, ויש כאלה שלא מגיבים להודעות גם אחרי שקיבלו אותן. לכן שיחות טלפוניות
              יכולות להיות השלמה טובה לתהליך, בהתאם לחבילה שנבחרה.
            </p>
            <p>שיחות אינן חלק אוטומטי מכל חבילה — הן מופיעות בחבילות השיחה במחשבון.</p>
          </div>
        </div>
      </section>

      {/* THREE SCENARIOS */}
      <section aria-labelledby="scenarios" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>דוגמאות</Eyebrow>
          <h2 id="scenarios" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            אותו אירוע, שלושה מצבים שונים
          </h2>
          <p className="mt-4 text-sm text-[#7A6042]">הדגמה עם נתונים פיקטיביים בלבד.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {SCENARIOS.map((s) => (
              <article key={s.name} className="rounded-[24px] border border-[#E6D2AA] bg-[#FBF6EE] p-6">
                <p className="text-sm font-bold tracking-[0.14em] text-[#A77A38]">{s.name}</p>
                <h3 className="mt-2 text-xl font-black text-[#2C241C]">{s.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5C4A3A]">{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ILLUSTRATED FLOW VIDEO SUBSTITUTE */}
      <section aria-labelledby="demo-flow" className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow onDark>המחשת תהליך</Eyebrow>
          <h2 id="demo-flow" className="mt-3 text-3xl font-black text-[#FFF8EF] md:text-4xl">
            מההודעה ועד לאישור — עם גיבוי כשצריך
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#D8CBB8]">
            ההמחשה למטה מסכמת את התהליך: ניסיון WhatsApp → בדיקת סטטוס → כשל מתאים → SMS חלופי → פתיחת קישור ואישור
            הגעה. זו אנימציית הסבר מסומנת, לא הקלטת לקוח או לוג אמיתי.
          </p>
          <div className="mx-auto mt-10 max-w-md">
            <ChannelDemo reduce={reduce} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            שאלות על WhatsApp, SMS ודוחות שליחה
          </h2>
          <div className="mt-10 space-y-3">
            {WHATSAPP_VS_SMS_FAQS.map((item) => (
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
          <h2 className="text-3xl font-black text-[#FFF8EF] md:text-4xl">רוצים אישורי הגעה עם גיבוי חכם?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            התחילו ב־WhatsApp, ותנו למערכת להפעיל SMS חלופי כשמתגלה כשל מתאים — עם מעקב לפי מספר טלפון ודוחות
            מסירה.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/rsvp" className={ctaPrimary} location={`footer_rsvp:${PATH}`}>
              לאישורי הגעה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`footer_pricing:${PATH}`}
            >
              לצפייה בחבילות
            </TrackedCtaLink>
          </div>
          <nav aria-label="קישורים קשורים" className="mt-12 flex flex-wrap justify-center gap-3 text-sm">
            {[
              { href: "/rsvp", label: "אישורי הגעה" },
              { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
              { href: "/rsvp/whatsapp", label: "אישורי הגעה ב־WhatsApp" },
              { href: "/rsvp/calls", label: "שיחות טלפון" },
              { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
              { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
              { href: "/info/guides/cost-rsvp-wedding", label: "עלויות אישורי הגעה" },
              { href: "/info/guides", label: "כל המדריכים" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-[#C9A962]/30 px-4 py-2 text-[#E8D1A5] transition hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </article>
  );
}
