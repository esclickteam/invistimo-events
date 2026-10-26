"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import VenueGuaranteeCalculator from "./VenueGuaranteeCalculator";
import { VENUE_GUARANTEE_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-venue-guest-guarantee";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>
  );
}

const ARRIVAL_FACTORS = [
  "מידת הקרבה של האורחים לבני הזוג",
  "הרכב המשפחה והחברים",
  "המרחק ממקום האירוע",
  "יום האירוע והשעה",
  "תקופת חגים וחופשות",
  "אורחים מחו״ל",
  "נסיבות אישיות של המוזמנים",
  "מידת הוודאות לגבי הגעת אורחים מסוימים",
] as const;

const CONTRACT_QUESTIONS = [
  "מהי ההתחייבות המינימלית שהאולם מוכן לקבל?",
  "עד מתי אפשר להגדיל את מספר המנות?",
  "האם אפשר להפחית את ההתחייבות ובאילו תנאים?",
  "האם הפחתת התחייבות משנה את המחיר למנה?",
  "מהי קיבולת האולם ומהי התוספת המרבית האפשרית?",
  "איך מחושבים שולחנות רזרבה ומנות רזרבה?",
  "מתי צריך למסור את מספר המוזמנים הסופי?",
  "איך נספרים ילדים, ספקים ואנשי צוות?",
] as const;

const MISTAKES = [
  "להתחייב לפי מספר המוזמנים במקום לפי צפי ריאלי",
  "להניח שכל מי שאישר הגעה יגיע בוודאות",
  "להתעלם ממי שעדיין לא השיב",
  "לחתום בלי לבדוק אפשרות להפחתת התחייבות",
  "להניח שאפשר להגדיל את ההתחייבות ללא מגבלה",
  "לא לבדוק איך מחושבות רזרבות",
  "לסמוך על הבטחות בעל פה",
  "להמתין עד הרגע האחרון כדי לבדוק את מספר המאשרים",
] as const;

const EXAMPLE_ROWS = [
  { stage: "מספר מוזמנים", qty: "400" },
  { stage: "הערכת הגעה ראשונית לפי 70%", qty: "280" },
  { stage: "התחייבות התחלתית הנמוכה ב־40% ממספר המוזמנים", qty: "240" },
  { stage: "אורחים שאישרו הגעה, לדוגמה", qty: "300" },
  { stage: "הערכת הגעה מתוך המאשרים לפי 90%", qty: "270" },
] as const;

export default function VenueGuaranteeGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(232,214,180,0.55),transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 md:gap-12 md:px-8 md:pb-16 md:pt-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך · Invistimo</p>
            <h1 className="mt-3 max-w-2xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.65rem]">
              כמה אורחים כדאי להתחייב לאולם לחתונה?
            </h1>
            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735]">
              התחייבות נכונה מתחילה במספר ריאלי — לא במספר השמות ברשימת המוזמנים.
            </p>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                אחת ההחלטות החשובות בתכנון חתונה היא על כמה מנות להתחייב מול האולם.
              </p>
              <p>
                התחייבות גבוהה מדי עלולה לגרום לתשלום עבור מנות שלא נוצלו. התחייבות נמוכה מדי, בלי
                אפשרות להגדיל אותה בזמן, עלולה ליצור בעיה מול האולם לקראת האירוע.
              </p>
              <p>
                לכן חשוב להבחין בין מספר המוזמנים, מספר האורחים שצפויים להגיע ומספר המנות שעליו
                מתחייבים בהסכם.
              </p>
              <p>
                במדריך הזה נסביר איך לחשב התחייבות ראשונית, מה כדאי לבדוק לפני החתימה ואיך להשתמש
                באישורי הגעה כדי להגיע למספר מדויק יותר.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink
                href="#venue-calculator"
                className={ctaPrimary}
                location={`hero_calc:${PATH}`}
              >
                למחשבון התחייבות לאולם
              </TrackedCtaLink>
              <TrackedCtaLink
                href="#before-signing"
                className={ctaSecondary}
                location={`hero_contract:${PATH}`}
              >
                מה לבדוק לפני שחותמים?
              </TrackedCtaLink>
            </div>
          </div>

          <div className="relative">
            <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
              <Image
                src="/images/rsvp/guides/unique-atmosphere/venue-guarantee-hall.jpg"
                alt="אולם חתונה יוקרתי ערוך עם שולחנות עגולים, מפות שמנת ומרכזי פרחים"
                width={1280}
                height={720}
                className="h-auto w-full object-cover"
                priority
                sizes="(max-width:1024px) 100vw, 46vw"
              />
            </figure>
            <ul
              aria-label="שלושת המספרים לתכנון"
              className="mt-4 grid grid-cols-3 gap-2"
            >
              {[
                { label: "מוזמנים", value: "400", note: "ברשימה" },
                { label: "צפי הגעה", value: "~280", note: "הערכה" },
                { label: "התחייבות", value: "240+", note: "מול האולם" },
              ].map((item, i) => (
                <li key={item.label}>
                  {!reduce ? (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="rounded-[20px] border border-[#E6D2AA] bg-white/90 px-3 py-3 text-center shadow-[0_10px_24px_rgba(58,39,20,0.06)] backdrop-blur"
                    >
                      <p className="text-[11px] font-black tracking-[0.08em] text-[#8A642E]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xl font-black tabular-nums text-[#2C241C]">
                        {item.value}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#7A6042]">{item.note}</p>
                    </motion.div>
                  ) : (
                    <div className="rounded-[20px] border border-[#E6D2AA] bg-white/90 px-3 py-3 text-center">
                      <p className="text-[11px] font-black tracking-[0.08em] text-[#8A642E]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xl font-black tabular-nums text-[#2C241C]">
                        {item.value}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#7A6042]">{item.note}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* What is guarantee */}
      <section aria-labelledby="what-is" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>הגדרה</Eyebrow>
          <h2 id="what-is" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            מה המשמעות של התחייבות למספר מנות?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              כאשר סוגרים חתונה באולם, בדרך כלל נדרשים להסכים על מספר מנות מינימלי לתשלום.
            </p>
            <p>
              המשמעות היא שגם אם בפועל יגיעו פחות אורחים, ייתכן שתידרשו לשלם על מספר המנות שהתחייבתם
              אליו.
            </p>
            <p>לכן מספר המוזמנים ברשימה אינו בהכרח המספר הנכון להתחייב עליו.</p>
            <p>
              חשוב לבדוק בהסכם מה בדיוק נחשב מנה, כיצד נספרים ילדים, ספקים ואנשי צוות, אילו רזרבות
              קיימות ומה קורה אם מספר האורחים משתנה.
            </p>
          </div>
        </div>
      </section>

      {/* Recommendation */}
      <section aria-labelledby="recommendation" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>ההמלצה שלנו</Eyebrow>
          <h2
            id="recommendation"
            className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
          >
            ההמלצה של Invistimo: לא להתחייב מראש על כל המוזמנים
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              מהניסיון שלנו בתחום אישורי ההגעה וניהול האירועים, אנחנו ממליצים להתחיל מהערכה ריאלית של
              מספר האורחים שצפויים להגיע — ולא ממספר המוזמנים הכולל.
            </p>
            <p>
              במקרים המתאימים, כדאי לנסות לקבל מהאולם את ההתחייבות הנמוכה ביותר שהוא מוכן לאשר.
            </p>
            <p>
              כאשר רשימת המוזמנים עדיין ראשונית ויש אי־ודאות משמעותית, אפשר לבחון במסגרת המשא ומתן גם
              התחייבות התחלתית הנמוכה בכ־40% ממספר המוזמנים.
            </p>
            <p>
              זו אינה נוסחה שמתאימה אוטומטית לכל חתונה. יש לבחון את הרכב האורחים, את תנאי האולם ואת
              האפשרות להגדיל את ההתחייבות בהמשך.
            </p>
            <p className="rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-4 font-bold text-[#2C241C]">
              המטרה אינה להתחייב למספר נמוך בכל מחיר, אלא להימנע מהתחייבות גבוהה שלא ניתן יהיה להקטין.
            </p>
          </div>
        </div>
      </section>

      {/* Arrival rates */}
      <section aria-labelledby="arrival-rate" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>צפי הגעה</Eyebrow>
            <h2
              id="arrival-rate"
              className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
            >
              מספר המוזמנים אינו מספר המגיעים בפועל
            </h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                לפי ההערכה והניסיון שלנו, בחלק מהחתונות מספר האורחים שמגיעים בפועל עשוי להיות סביב
                70% ממספר המוזמנים.
              </p>
              <p>
                לדוגמה, מתוך 400 מוזמנים, הערכה של 70% משקפת כ־280 משתתפים.
              </p>
              <p>
                עם זאת, זה אינו שיעור קבוע או ממוצע ארצי מאומת. בפועל, שיעור ההגעה יכול להיות גבוה או
                נמוך משמעותית.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FBF6EE] p-6">
              <p className="text-sm font-black text-[#7A5530]">דוגמת תכנון</p>
              <div className="mt-6 flex items-end justify-between gap-3">
                {[
                  { label: "מוזמנים", h: "100%", n: "400" },
                  { label: "צפי ~70%", h: "70%", n: "280" },
                ].map((bar) => (
                  <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-lg font-black tabular-nums text-[#2C241C]">{bar.n}</span>
                    <div className="flex h-40 w-full items-end rounded-2xl bg-white/70 px-3 pb-2 pt-4">
                      {!reduce ? (
                        <motion.div
                          className="w-full rounded-xl bg-gradient-to-t from-[#5A4333] to-[#C9A45C]"
                          initial={{ height: "0%" }}
                          whileInView={{ height: bar.h }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                      ) : (
                        <div
                          className="w-full rounded-xl bg-gradient-to-t from-[#5A4333] to-[#C9A45C]"
                          style={{ height: bar.h }}
                        />
                      )}
                    </div>
                    <span className="text-sm font-bold text-[#5E4735]">{bar.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-[#7A6042]">
                70% מוצג כהנחת תכנון לדוגמה המבוססת על ניסיון עסקי — לא כהבטחה או נתון מחקרי.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-black text-[#2C241C]">מה משפיע על שיעור ההגעה?</h3>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {ARRIVAL_FACTORS.map((factor) => (
                  <li
                    key={factor}
                    className="rounded-[18px] border border-[#E7D3B0] bg-white px-4 py-3 text-[15px] leading-7 text-[#5C4A3A]"
                  >
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* After RSVP */}
      <section aria-labelledby="after-rsvp" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>אחרי אישורים</Eyebrow>
            <h2
              id="after-rsvp"
              className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
            >
              אישורי ההגעה עוזרים להפוך הערכה למספר מבוסס יותר
            </h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                לפני אישורי ההגעה אנחנו מסתמכים בעיקר על רשימת המוזמנים ועל ההיכרות שלנו עם האורחים.
              </p>
              <p>
                לאחר תחילת האישורים מתקבלת תמונה טובה יותר: מי אישר, מי הודיע שלא יגיע וממי עדיין
                ממתינים לתשובה.
              </p>
              <p>
                לפי הניסיון שלנו, אפשר להשתמש בכ־90% ממספר האורחים שאישרו הגעה כאחת מהנחות התכנון
                לצפי ההגעה בפועל.
              </p>
              <p>לדוגמה, אם 300 אורחים אישרו הגעה, 90% מהם הם 270 אורחים.</p>
              <p>
                חשוב להבין שגם זו הערכה בלבד, ולא התחייבות או תחזית מדויקת. בחתונות מסוימות כמעט כל
                המאשרים מגיעים, ובאחרות יש יותר ביטולים או אי־הופעות.
              </p>
              <p className="rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-4 font-bold text-[#2C241C]">
                אין להשתמש ב־90% ממספר המאשרים כמספר ההתחייבות האוטומטי לאולם. צריך להביא בחשבון גם
                אורחים שטרם השיבו, הגעה אפשרית ללא אישור, רזרבות ותנאי החוזה.
              </p>
            </div>
          </div>
          <figure>
            <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white shadow-[0_24px_60px_rgba(58,39,20,0.1)]">
              <Image
                src="/images/marketing-captures/unique/module-guests-overview.webp"
                alt="צילום אמיתי של נתוני אישורי הגעה ב־Invistimo: מאשרים, לא מגיעים וממתינים"
                width={1400}
                height={1000}
                className="h-auto w-full object-cover object-top"
                sizes="(max-width:1024px) 100vw, 46vw"
              />
            </div>
            <figcaption className="mt-3 text-center text-sm text-[#7A6042]">
              מחשה: רשימת מוזמנים מול מספר מאשרים וממתינים במערכת
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Flexibility */}
      <section aria-labelledby="flexibility" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>גמישות מול האולם</Eyebrow>
          <h2
            id="flexibility"
            className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
          >
            להגדיל התחייבות אפשר לעיתים קרובות. להקטין אותה — לא תמיד.
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              במקרים רבים, אולמות מאפשרים להגדיל את מספר המנות לקראת האירוע, כל עוד הדבר אפשרי
              מבחינת קיבולת האולם, כוח האדם, המטבח ותנאי ההסכם.
            </p>
            <p>לעומת זאת, הפחתת התחייבות שכבר נקבעה בהסכם עלולה להיות מורכבת יותר.</p>
            <p>
              יש אולמות שלא מאפשרים להפחית את מספר המנות לאחר החתימה. אחרים עשויים להסכים להפחתה
              מסוימת בתנאים מוגדרים, ולעיתים שינוי כזה כרוך בעליית המחיר למנה.
            </p>
            <p>
              לכן חשוב להסדיר את הנושא מראש, לפני החתימה על ההסכם, ולא להסתמך על הבטחות בעל פה.
            </p>
            <p className="rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-4 font-bold text-[#2C241C]">
              לפני שחותמים, לא שואלים רק מה מחיר המנה — שואלים גם עד כמה אפשר לשנות את ההתחייבות.
            </p>
            <p className="text-sm leading-7 text-[#7A6042]">
              תנאי הגדלה או הפחתה משתנים בין אולמות. אין להניח שכל אולם חייב להסכים להגדלה, או
              שהפחתה תמיד גוררת עליית מחיר.
            </p>
          </div>
        </div>
      </section>

      {/* Contract checklist */}
      <section
        id="before-signing"
        aria-labelledby="contract-questions"
        className="scroll-mt-24 bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>לפני החתימה</Eyebrow>
            <h2
              id="contract-questions"
              className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
            >
              8 שאלות שכדאי לשאול לפני שחותמים
            </h2>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-2">
            {CONTRACT_QUESTIONS.map((q, i) => (
              <li
                key={q}
                className="flex gap-4 rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5"
              >
                <span className="text-sm font-black tracking-[0.12em] text-[#8A642E]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] font-bold leading-7 text-[#2C241C]">{q}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                מומלץ לבקש שכל הסכמה מהותית — מינימום מנות, מועדי עדכון, אפשרות הפחתה או הגדלה —
                תופיע בכתב בהסכם או בנספח חתום.
              </p>
              <p className="text-sm leading-7 text-[#7A6042]">
                המידע בעמוד זה הוא כללי ומיועד לתכנון. הוא אינו ייעוץ משפטי פרטני לחוזה שלכם.
              </p>
            </div>
            <aside
              aria-label="המחשה של סעיפים לבדיקה בהסכם"
              className="rounded-[24px] border border-dashed border-[#C9A45C] bg-white px-5 py-5"
            >
              <p className="text-xs font-black tracking-[0.14em] text-[#8A642E]">
                המחשה בלבד — לא חוזה אמיתי
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5C4A3A]">
                <li className="rounded-xl bg-[#FBF6EE] px-3 py-2">
                  <span className="font-black text-[#2C241C]">סעיף מינימום מנות — </span>
                  מה נחשב מנה ומה נכלל בתשלום
                </li>
                <li className="rounded-xl bg-[#FBF6EE] px-3 py-2">
                  <span className="font-black text-[#2C241C]">סעיף שינוי כמות — </span>
                  הגדלה / הפחתה ומועדים
                </li>
                <li className="rounded-xl bg-[#FBF6EE] px-3 py-2">
                  <span className="font-black text-[#2C241C]">סעיף רזרבות — </span>
                  שולחנות ומנות מעבר לצפי
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section aria-labelledby="calculator" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow>מחשבון</Eyebrow>
            <h2
              id="calculator"
              className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
            >
              כמה מנות כדאי לתכנן? בואו נחשב
            </h2>
            <p className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              הזינו את נתוני הרשימה, האישורים ותנאי האולם. המחשבון מפריד בין הערכה ראשונית, הערכה
              אחרי אישורים והתחייבות — בלי לספור אורחים פעמיים ובלי להמליץ אוטומטית על מספר חוזי.
            </p>
          </div>
          <div className="mt-10">
            <VenueGuaranteeCalculator />
          </div>
        </div>
      </section>

      {/* Numeric example */}
      <section aria-labelledby="example-400" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>דוגמה מספרית</Eyebrow>
          <h2
            id="example-400"
            className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
          >
            דוגמה: חתונה עם 400 מוזמנים
          </h2>
          <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8]">
            <table className="w-full min-w-[320px] text-right text-[15px]">
              <caption className="sr-only">טבלת דוגמה להתחייבות מול צפי הגעה</caption>
              <thead className="bg-[#F7EFE0] text-sm font-black text-[#5E4735]">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    שלב
                  </th>
                  <th scope="col" className="px-5 py-3">
                    כמות
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_ROWS.map((row) => (
                  <tr key={row.stage} className="border-t border-[#EFE2CC]">
                    <td className="px-5 py-3.5 font-semibold text-[#2C241C]">{row.stage}</td>
                    <td className="px-5 py-3.5 font-black tabular-nums text-[#35281F]">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              240 מנות הן דוגמה לנקודת פתיחה אפשרית במשא ומתן, לא המלצה סופית להתחייב על 240.
            </p>
            <p>
              אם בהמשך מתקבלים 300 אישורי הגעה, יש לעדכן את התכנון בהתאם לנתונים, לאורחים שעדיין לא
              השיבו, לרזרבות ולתנאי האולם.
            </p>
            <p>
              אין להשוות בין 270 ל־240 כאילו 240 «מספיק לנצח»: ייתכן שיהיה צורך להגדיל את ההתחייבות
              כשהתמונה מתבהרת — אם ההסכם והקיבולת מאפשרים.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-[#E7D3B0] bg-white px-5 py-5">
              <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">התחייבות ראשונית</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-[#2C241C]">240</p>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">נקודת פתיחה למשא ומתן</p>
            </div>
            <div className="rounded-[22px] border border-[#E7D3B0] bg-white px-5 py-5">
              <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">צפי מעודכן</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-[#2C241C]">270+</p>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">
                לפי מאשרים + ממתינים + רזרבות
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RSVP link section */}
      <section aria-labelledby="rsvp-link" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>אישורי הגעה</Eyebrow>
          <h2
            id="rsvp-link"
            className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
          >
            ככל שיש יותר תשובות, אפשר לתכנן בצורה מדויקת יותר
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              אישורי הגעה אינם מבטיחים שכל אורח שאישר אכן יגיע, אבל הם מספקים מידע טוב יותר מהערכה
              המבוססת רק על רשימת שמות.
            </p>
            <p>
              ב־Invistimo אפשר לעקוב אחרי מספר המאשרים, מספר המשתתפים בכל רשומה, האורחים שלא מגיעים
              ומי שעדיין לא השיב.
            </p>
            <p>
              כך אפשר להתקרב למועד מסירת המספרים לאולם עם תמונת מצב מעודכנת יותר.
            </p>
          </div>
          <div className="mt-8">
            <TrackedCtaLink
              href="/rsvp/chatuna"
              className={ctaPrimary}
              location={`rsvp_cta:${PATH}`}
            >
              לגלות איך עובדים אישורי ההגעה של Invistimo
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* Timing */}
      <section aria-labelledby="final-number" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>תזמון</Eyebrow>
          <h2
            id="final-number"
            className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl"
          >
            המועד של האולם הוא התאריך שממנו מתכננים את סבבי האישורים
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>חשוב לדעת מראש מתי האולם דורש לקבל את מספר המנות הסופי.</p>
            <p>
              את סבב אישורי ההגעה הראשון אפשר לתכנן בחתונה רגילה כ־14–18 ימים לפני האירוע.
            </p>
            <p className="font-bold text-[#2C241C]">זהו מועד הסבב הראשון בלבד.</p>
            <p>
              את יתר הסבבים יש לפרוס באופן מאוזן עד סמוך למועד מסירת המספרים לאולם, בהתאם לחבילה
              ולהגדרות.
            </p>
          </div>
          <div className="mt-8">
            <TrackedCtaLink
              href="/info/guides/when-to-send-rsvp"
              className={ctaSecondary}
              location={`timing:${PATH}`}
            >
              למחשבון ומדריך התזמון
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* Mistakes */}
      <section aria-labelledby="mistakes" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>טעויות נפוצות</Eyebrow>
          <h2 id="mistakes" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            הטעויות שעלולות לעלות ביוקר
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {MISTAKES.map((item, i) => (
              <li
                key={item}
                className="rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-5 text-[15px] font-bold leading-7 text-[#2C241C]"
              >
                <span className="ml-2 text-[#8A642E]">{String(i + 1).padStart(2, "0")}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            שאלות על התחייבות לאולם ומנות
          </h2>
          <div className="mt-10 space-y-3">
            {VENUE_GUARANTEE_FAQS.map((item) => (
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
        </div>
      </section>

      {/* Related + CTA */}
      <section className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-[#FFF8EF] md:text-4xl">
            רוצים תמונת מצב מעודכנת לפני שמסירים מספר לאולם?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            אישורי הגעה מסודרים עוזרים להחליף ניחושים בנתונים — בלי להפוך אחוזים להתחייבות אוטומטית.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/rsvp/chatuna" className={ctaPrimary} location={`footer_chatuna:${PATH}`}>
              לאישורי הגעה לחתונה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/seating-explained"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`footer_seating:${PATH}`}
            >
              סידורי הושבה
            </TrackedCtaLink>
          </div>
          <nav aria-label="מדריכים קשורים" className="mt-10 flex flex-wrap justify-center gap-3 text-sm">
            {[
              { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
              { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
              { href: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
              { href: "/rsvp/calls", label: "שיחות אישורי הגעה" },
              { href: "/info/guides/cost-rsvp-wedding", label: "עלויות אישורי הגעה" },
              { href: "/info/guides/wedding-alcohol-calculator", label: "מחשבון אלכוהול לחתונה" },
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
