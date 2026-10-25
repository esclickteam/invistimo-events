"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import FactTableView from "@/components/seo/FactTableView";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { PACKAGE_COMPARISON } from "@/lib/seo/answers";
import RecordsCalculator from "./RecordsCalculator";
import { COST_RSVP_FAQS } from "./guideFaqs";

const PATH = "/info/guides/cost-rsvp-wedding";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

const RECORD_EXAMPLES = [
  { kind: "אורח יחיד", records: 1, people: 1, icons: 1 },
  { kind: "זוג שמוזמן יחד", records: 1, people: 2, icons: 2 },
  { kind: "משפחה של ארבעה", records: 1, people: 4, icons: 4 },
  { kind: "משפחה של חמישה", records: 1, people: 5, icons: 5 },
  { kind: "חמישה אורחים בנפרד", records: 5, people: 5, icons: 5 },
] as const;

const PRICE_PARTS = [
  "חבילת אישורי ההגעה לפי מספר הרשומות המחויבות",
  "מספר וסוג הסבבים הכלולים בחבילה",
  "הודעת Save the Date, אם נרכשה בנפרד",
  "שליחת הזמנה דיגיטלית מוקדמת, אם נרכשה בנפרד",
  "שירותי שיחות טלפוניות, אם אינם כלולים בחבילה",
  "שירותי הושבה, אם אינם כלולים בחבילה",
  "תוספות נוספות שהלקוח בחר במחשבון",
] as const;

function PeopleDots({ count }: { count: number }) {
  return (
    <span className="flex flex-wrap items-center gap-1" aria-hidden>
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <span
          key={i}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#E8D4A8] to-[#C9A45C] text-[10px] font-black text-[#3A2B22]"
        >
          {i + 1}
        </span>
      ))}
    </span>
  );
}

export default function CostRsvpGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_10%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_90%_0%,rgba(232,214,180,0.5),transparent_38%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 md:gap-12 md:px-8 md:pb-16 md:pt-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך · Invistimo</p>
            <h1 className="mt-3 max-w-2xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
              כמה עולים אישורי הגעה לחתונה ואיך מחשבים את המחיר?
            </h1>
            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735]">
              מבינים בדיוק על מה משלמים — מרשימת המוזמנים ועד סבבי אישורי ההגעה.
            </p>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>כשמתכננים חתונה, לא תמיד ברור איך מחשבים את המחיר של שירות אישורי הגעה.</p>
              <p>
                האם משלמים על כל אורח? על כל מספר טלפון? האם זוג נחשב לשתי רשומות? ומה קורה כשמוסיפים
                בני משפחה קרובים שכבר יודעים שהם מגיעים?
              </p>
              <p>
                ב־Invistimo התמחור מבוסס על רשומות בהתאם לחבילה שנבחרה. במדריך הזה נסביר מהי רשומה,
                אילו אורחים נכללים במכסת החבילה, איך מחושבות הודעות נוספות ומה חשוב לבדוק לפני
                הרכישה.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="#what-is-record" className={ctaPrimary} location={`hero_record:${PATH}`}>
                להבין מהי רשומה
              </TrackedCtaLink>
              <TrackedCtaLink href="/pricing" className={ctaSecondary} location={`hero_pricing:${PATH}`}>
                לצפייה בחבילות ובמחירים
              </TrackedCtaLink>
            </div>
          </div>

          <div>
            <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
              <Image
                src="/images/rsvp/chatuna/dashboard-guests.jpg"
                alt="המחשת רשימת מוזמנים במערכת Invistimo עם סטטוסי אישור הגעה"
                width={1400}
                height={1000}
                className="h-auto w-full object-cover object-top"
                priority
                sizes="(max-width:1024px) 100vw, 46vw"
              />
            </figure>
            <ul className="mt-4 grid grid-cols-2 gap-2" aria-label="המחשת רשומות">
              <li className="rounded-[20px] border border-[#E6D2AA] bg-white/90 px-4 py-3">
                <p className="text-xs font-black tracking-[0.1em] text-[#8A642E]">רשומה אחת</p>
                <p className="mt-1 text-sm font-bold text-[#2C241C]">דנה ורועי · 2 מוזמנים</p>
              </li>
              <li className="rounded-[20px] border border-[#E6D2AA] bg-white/90 px-4 py-3">
                <p className="text-xs font-black tracking-[0.1em] text-[#8A642E]">רשומה אחת</p>
                <p className="mt-1 text-sm font-bold text-[#2C241C]">משפחת כהן · 5 מוזמנים</p>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Core principles */}
      <section aria-labelledby="principles" className="bg-[#FFFDF8] px-5 py-12 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 id="principles" className="sr-only">
            עקרונות התמחור
          </h2>
          <p className="max-w-3xl text-xl font-black leading-9 text-[#2C241C] md:text-2xl">
            מחיר אישורי ההגעה נקבע לפי הרשומות המחויבות בחבילה — לא בהכרח לפי מספר האנשים שמוזמנים
            לחתונה.
          </p>
          <ul className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              "רשומה אחת יכולה לייצג אורח יחיד, זוג או משפחה",
              "רשומות ללא מספר טלפון אינן נגרעות ממכסת התשלום",
              "Save the Date והזמנה מוקדמת מחושבים בנפרד מסבבי האישור",
              "מחיר החבילה תלוי במסלול ובשירותים הכלולים",
              "אין לחייב פעמיים על שירות שכבר כלול בחבילה או במבצע",
            ].map((item, i) => (
              <li
                key={item}
                className="rounded-[20px] border border-[#E7D3B0] bg-[#FBF6EE] px-4 py-4 text-[15px] font-bold leading-7 text-[#2C241C]"
              >
                {!reduce ? (
                  <motion.span
                    className="mb-2 block text-xs font-black tracking-[0.14em] text-[#8A642E]"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </motion.span>
                ) : (
                  <span className="mb-2 block text-xs font-black tracking-[0.14em] text-[#8A642E]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What is a record */}
      <section
        id="what-is-record"
        aria-labelledby="record-heading"
        className="scroll-mt-24 bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>הגדרה</Eyebrow>
            <h2
              id="record-heading"
              className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
            >
              מה זה בעצם &quot;רשומה&quot; ברשימת המוזמנים?
            </h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>רשומה היא כניסה אחת ברשימת המוזמנים.</p>
              <p>
                רשומה יכולה לייצג אדם אחד, זוג או משפחה, בהתאם לאופן שבו בונים את רשימת המוזמנים.
              </p>
              <p>
                לדוגמה, אם מזמינים זוג יחד תחת רשומה אחת, זו רשומה אחת — גם אם שני אנשים צפויים
                להגיע.
              </p>
              <p>אותו הדבר לגבי משפחה שמוזמנת יחד.</p>
              <p>
                לכן חשוב להבחין בין{" "}
                <strong className="font-black text-[#2C241C]">מספר הרשומות</strong> — כמה כניסות
                קיימות ברשימה — לבין{" "}
                <strong className="font-black text-[#2C241C]">מספר המוזמנים</strong> — כמה אנשים
                כלולים בכל הרשומות יחד.
              </p>
            </div>
          </div>

          <div className="mt-10 overflow-x-auto rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8]">
            <table className="w-full min-w-[360px] text-right text-[15px]">
              <caption className="sr-only">דוגמאות לרשומות מול מספר מוזמנים</caption>
              <thead className="bg-[#F7EFE0] text-sm font-black text-[#5E4735]">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    סוג הזמנה
                  </th>
                  <th scope="col" className="px-5 py-3">
                    רשומות
                  </th>
                  <th scope="col" className="px-5 py-3">
                    מוזמנים
                  </th>
                </tr>
              </thead>
              <tbody>
                {RECORD_EXAMPLES.map((row) => (
                  <tr key={row.kind} className="border-t border-[#EFE2CC]">
                    <td className="px-5 py-3.5 font-semibold text-[#2C241C]">{row.kind}</td>
                    <td className="px-5 py-3.5 font-black tabular-nums">{row.records}</td>
                    <td className="px-5 py-3.5 font-black tabular-nums">{row.people}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECORD_EXAMPLES.slice(0, 3).map((ex) => (
              <li
                key={ex.kind}
                className="rounded-[22px] border border-[#E7D3B0] bg-white px-5 py-5"
              >
                <PeopleDots count={ex.icons} />
                <p className="mt-3 text-base font-black text-[#2C241C]">{ex.kind}</p>
                <p className="mt-1 text-sm leading-6 text-[#5C4A3A]">
                  {ex.records} רשומה · {ex.people} מוזמנים
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-3xl rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-4 text-lg font-black text-[#2C241C]">
            300 מוזמנים לא בהכרח שווים ל־300 רשומות.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            המחיר לפי רשומות מתייחס למכסת הרשומות המחויבות בהתאם לחבילה, ולא בהכרח למספר האנשים
            הכולל. במערכת, לכל רשומה אפשר לסמן כמה מוזמנים היא מייצגת.
          </p>
        </div>
      </section>

      {/* Phoneless family */}
      <section aria-labelledby="phoneless" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>מכסת החבילה</Eyebrow>
            <h2 id="phoneless" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              גם המשפחה הקרובה ברשימה — בלי לשלם על אישורי הגעה מיותרים
            </h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>יש אורחים שאתם פשוט יודעים שהם מגיעים.</p>
              <p>
                האחים שלכם, הדודים, בני הדודים ובני משפחה קרובים נוספים — אנשים שכבר דיברתם איתם
                וברור לכם שהם יהיו חלק מהשמחה.
              </p>
              <p>
                אבל גם אותם חשוב להכניס לרשימת המוזמנים. הרי בסופו של דבר צריך לספור אותם, לתכנן
                עבורם מקום ולשבץ אותם בשולחנות.
              </p>
              <p>
                ב־Invistimo אפשר להוסיף את האורחים האלה לרשימת המוזמנים גם ללא מספר טלפון.
              </p>
              <p className="rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-4 font-bold text-[#2C241C]">
                רשומות ללא מספר טלפון אינן נגרעות ממכסת הרשומות בתשלום של חבילת אישורי ההגעה.
              </p>
              <p>
                כך אפשר לשמור על רשימת מוזמנים מלאה ומסודרת, בלי לנצל את מכסת אישורי ההגעה על בני
                משפחה שכבר יודעים שהם מגיעים ואין צורך לשלוח להם הודעות.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-[#E7D3B0] bg-white px-5 py-5">
              <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">עם טלפון</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-[#2C241C]">250</p>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">רשומות מחויבות בחבילה</p>
            </div>
            <div className="rounded-[22px] border border-[#E7D3B0] bg-white px-5 py-5">
              <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">בלי טלפון</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-[#2C241C]">30</p>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">ברשימה, לא במכסת התשלום</p>
            </div>
            <div className="rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-5">
              <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">סה״כ ברשימה</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-[#2C241C]">280</p>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">מכסה נדרשת: 250 בלבד</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-[#B7D4BC] bg-[#EAF5EC] px-5 py-5">
              <h3 className="text-lg font-black text-[#2F5A38]">רשומה עם מספר טלפון</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#3F5E45]">
                נכללת במכסת הרשומות המחויבות. אפשר לשלוח אליה הודעות ופניות לפי החבילה.
              </p>
            </div>
            <div className="rounded-[22px] border border-[#E4D3B6] bg-[#F7EDDF] px-5 py-5">
              <h3 className="text-lg font-black text-[#7A5530]">רשומה ללא מספר טלפון</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
                נמצאת ברשימת המוזמנים, אך אינה נגרעת ממכסת החבילה.
              </p>
            </div>
          </div>

          <ul className="mt-8 grid gap-3 text-[15px] leading-7 text-[#5C4A3A] sm:grid-cols-2">
            <li>האורחים ללא מספר טלפון עדיין מופיעים ברשימת המוזמנים</li>
            <li>אפשר לכלול אותם בתכנון ההושבה כאשר השירות פעיל</li>
            <li>הם נספרים במספר האנשים הכולל לפי כמות המוזמנים ברשומה</li>
            <li>הם לא יקבלו WhatsApp או SMS למספר שאינו קיים</li>
            <li>היעדר טלפון אינו מסמן אוטומטית אישור הגעה</li>
            <li>יש לעדכן את סטטוס ההגעה שלהם לפי המידע הידוע</li>
          </ul>
        </div>
      </section>

      {/* How price is calculated */}
      <section aria-labelledby="how-price" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>חישוב</Eyebrow>
          <h2 id="how-price" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            איך מחשבים את מחיר חבילת אישורי ההגעה?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>מחיר החבילה נקבע בהתאם למסלול שנבחר ולמספר הרשומות המחויבות.</p>
            <p>מספר האנשים הכולל יכול להיות גבוה יותר ממספר הרשומות.</p>
            <p>
              לדוגמה: משפחה של חמישה שמוזמנת יחד ברשומה אחת עם מספר טלפון אינה הופכת אוטומטית לחמש
              רשומות.
            </p>
            <p>
              חשוב לבחור חבילה שמתאימה למספר הרשומות המחויבות בפועל ולשירותים הנדרשים. הסכום העדכני
              מופיע רק במחשבון החבילות — לא בעמוד זה.
            </p>
          </div>
          <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8]">
            <table className="w-full min-w-[320px] text-right text-[15px]">
              <caption className="sr-only">דוגמה לחיבור רשומות, אנשים ומכסה</caption>
              <tbody>
                {[
                  ["רשומות עם טלפון", "250"],
                  ["רשומות בלי טלפון", "30"],
                  ["סך רשומות ברשימה", "280"],
                  ["אנשים ברשומות עם טלפון (לדוגמה)", "320"],
                  ["אנשים ברשומות בלי טלפון (לדוגמה)", "45"],
                  ["מכסת חבילה נדרשת", "250"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-t border-[#EFE2CC] first:border-0">
                    <th scope="row" className="px-5 py-3 font-semibold text-[#2C241C]">
                      {k}
                    </th>
                    <td className="px-5 py-3 font-black tabular-nums text-[#35281F]">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pre-RSVP stages */}
      <section aria-labelledby="three-stages" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>שלושה שלבים</Eyebrow>
            <h2
              id="three-stages"
              className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
            >
              Save the Date, הזמנה ואישורי הגעה — אלה לא אותן הודעות
            </h2>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              לפני שמתחילים לאסוף אישורי הגעה, זוגות רבים רוצים לשלוח הודעות מוקדמות לאורחים. חשוב
              להבין את ההבדל בין שלושת השלבים.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Save the Date — שומרים את התאריך",
                text: "הודעה מוקדמת שמטרתה לאפשר לאורחים לשריין את תאריך החתונה ביומן.",
              },
              {
                title: "הזמנה דיגיטלית — שולחים את פרטי החתונה",
                text: "הודעה עם ההזמנה הרשמית: שמות, תאריך, אולם, מיקום ושעות האירוע.",
              },
              {
                title: "אישורי הגעה — אוספים תשובות",
                text: "סבבי הודעות או פניות לקבלת תשובה: מגיעים, לא מגיעים וכמה משתתפים.",
              },
            ].map((step, i) => (
              <li
                key={step.title}
                className="rounded-[24px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-6"
              >
                <span className="text-xs font-black tracking-[0.14em] text-[#8A642E]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg font-black text-[#2C241C]">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{step.text}</p>
              </li>
            ))}
          </ol>

          <p className="mt-8 max-w-3xl rounded-[22px] border border-[#E7D3B0] bg-white px-5 py-4 text-base font-bold leading-8 text-[#2C241C]">
            הודעת Save the Date והודעת ההזמנה המוקדמת מחושבות בנפרד מסבבי אישורי ההגעה. הן אינן
            מנצלות סבב אישורי הגעה מתוך החבילה.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
            כאשר רוכשים את השירותים האלה, הם מחושבים בהתאם למחירון או להטבה הפעילה. אם חבילה או מבצע
            מסוימים כוללים אותם ללא תוספת תשלום — התנאים המדויקים מופיעים בהצעה שנבחרה. אין להציג
            אותם ככלולים אוטומטית בכל חבילת אישורי הגעה.
          </p>
        </div>
      </section>

      {/* Full example */}
      <section aria-labelledby="package-example" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>דוגמה</Eyebrow>
          <h2
            id="package-example"
            className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl"
          >
            איך נראית חבילה עם הודעות מקדימות ואישורי הגעה?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              נניח שיש 250 רשומות מחויבות, והלקוח בחר חבילת אישורי הגעה הכוללת מספר סבבים מסוים.
            </p>
            <p>
              בנוסף, הוא רוצה לשלוח הודעת Save the Date והודעת הזמנה דיגיטלית. אלה שתי פעולות נפרדות
              שמתרחשות לפני תחילת אישורי ההגעה. לאחר מכן מתחילים סבבי אישורי ההגעה בהתאם לחבילה
              שנבחרה.
            </p>
          </div>
          <ul className="mt-8 space-y-3">
            {[
              ["Save the Date", "שירות הודעה מקדימה"],
              ["הזמנה דיגיטלית", "שליחת הודעת ההזמנה המוקדמת"],
              ["אישורי הגעה", "הסבבים הכלולים בחבילת אישורי ההגעה"],
            ].map(([t, d]) => (
              <li
                key={t}
                className="rounded-[18px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-4"
              >
                <span className="font-black text-[#2C241C]">{t}</span>
                <span className="mt-1 block text-sm leading-6 text-[#5C4A3A]">{d}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-6 space-y-2 text-sm leading-7 text-[#7A6042]">
            <li>אין להגדיר מספר סבבי אישורי הגעה קבוע לכל החבילות.</li>
            <li>אין להניח שכל חבילה כוללת שיחות.</li>
            <li>אין לחשב הודעה מקדימה כאחד מסבבי אישורי ההגעה.</li>
            <li>אין לחייב שוב על רכיב שכבר כלול בחבילה.</li>
          </ul>
        </div>
      </section>

      {/* What is a round */}
      <section aria-labelledby="round-meaning" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>סבבים</Eyebrow>
          <h2
            id="round-meaning"
            className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl"
          >
            מה המשמעות של סבב אישורי הגעה?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>סבב אישורי הגעה הוא שלב פנייה לאורחים במסגרת תהליך איסוף התשובות.</p>
            <p>הסבבים הכלולים בחבילה עשויים להשתנות בהתאם למסלול שנבחר.</p>
            <p>
              אורחים שכבר השיבו מקבלים סטטוס מעודכן, ואורחים שעדיין לא השיבו יכולים להיכלל בסבב הבא
              בהתאם להגדרות התהליך.
            </p>
            <p>כך אפשר להמשיך לעקוב אחרי מי שעדיין לא אישר הגעה.</p>
            <p className="text-sm leading-7 text-[#7A6042]">
              לא כל אורח מקבל בהכרח את כל הסבבים, ואין מספר קבוע של הודעות או שיחות לכל החבילות.
            </p>
          </div>
        </div>
      </section>

      {/* Price components + packages table */}
      <section aria-labelledby="price-parts" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>רכיבי מחיר</Eyebrow>
            <h2 id="price-parts" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
              ממה מורכב המחיר הכולל?
            </h2>
          </div>
          <ol className="mt-8 grid gap-3 md:grid-cols-2">
            {PRICE_PARTS.map((item, i) => (
              <li
                key={item}
                className="flex gap-3 rounded-[18px] border border-[#E7D3B0] bg-[#FFFDF8] px-4 py-4 text-[15px] font-bold leading-7 text-[#2C241C]"
              >
                <span className="text-[#8A642E]">{String(i + 1).padStart(2, "0")}</span>
                {item}
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-[#7A6042]">
            המחירים והתוספות מופיעים במחשבון החי. לא מוסיפים פעמיים שירות שכבר כלול בחבילה שנבחרה.
          </p>
          <div className="mt-10">
            <FactTableView table={PACKAGE_COMPARISON} />
          </div>
          <div className="mt-8">
            <TrackedCtaLink href="/pricing" className={ctaPrimary} location={`packages:${PATH}`}>
              לצפייה בחבילות ובמחירים
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section aria-labelledby="calc-heading" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>מחשבון המחשה</Eyebrow>
            <h2
              id="calc-heading"
              className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl"
            >
              כמה רשומות אתם באמת צריכים בחבילה?
            </h2>
            <p className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              המחשבון ממחיש את ההבדל בין מספר המוזמנים למספר הרשומות המחויבות. הוא אינו מחשב מחיר
              כספי — לשם כך יש{" "}
              <Link href="/pricing" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מחשבון החבילות
              </Link>
              .
            </p>
          </div>
          <div className="mt-10">
            <RecordsCalculator />
          </div>
        </div>
      </section>

      {/* Three scenarios */}
      <section aria-labelledby="scenarios" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>דוגמאות שימוש</Eyebrow>
          <h2 id="scenarios" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            שלושה מצבים נפוצים ברשימת מוזמנים
          </h2>
          <p className="mt-3 text-sm text-[#7A6042]">דוגמאות להמחשה בלבד — לא נתוני לקוחות.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "זוג שמוזמן יחד",
                body: "דנה ורועי מוזמנים יחד תחת מספר טלפון אחד. זו רשומה אחת ושני מוזמנים.",
              },
              {
                title: "משפחה שמוזמנת יחד",
                body: "משפחת כהן כוללת שני הורים ושלושה ילדים. אם הוזמנה יחד ברשומה אחת — רשומה אחת וחמישה מוזמנים.",
              },
              {
                title: "בני משפחה שכבר יודעים שמגיעים",
                body: "אחים ודודים שנוספו לרשימה ללא מספר טלפון. הם ברשימה, אך אינם נגרעים ממכסת הרשומות המחויבות.",
              },
            ].map((card) => (
              <article
                key={card.title}
                className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-6"
              >
                <h3 className="text-xl font-black text-[#2C241C]">{card.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            שאלות נפוצות על מחירי אישורי הגעה ורשומות
          </h2>
          <div className="mt-10 space-y-3">
            {COST_RSVP_FAQS.map((item) => (
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
            רוצים לראות את מחיר אישורי ההגעה שלכם?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            עברו למחשבון — שם מופיע המחיר לפי הרשומות המחויבות, החבילה והתוספות שבחרתם.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/pricing" className={ctaPrimary} location={`footer_pricing:${PATH}`}>
              למחשבון החבילות
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/rsvp/chatuna"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`footer_chatuna:${PATH}`}
            >
              אישורי הגעה לחתונה
            </TrackedCtaLink>
          </div>
          <nav aria-label="קישורים קשורים" className="mt-10 flex flex-wrap justify-center gap-3 text-sm">
            {[
              { href: "/rsvp", label: "אישורי הגעה" },
              { href: "/rsvp/whatsapp", label: "אישורי הגעה ב־WhatsApp" },
              { href: "/rsvp/save-the-date", label: "Save the Date" },
              { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
              { href: "/seating-explained", label: "סידורי הושבה" },
              { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
              { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
              { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
              { href: "/info/guides", label: "כל המדריכים" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-white/15 px-4 py-2 text-[#E8DCC8] underline-offset-4 hover:underline"
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
