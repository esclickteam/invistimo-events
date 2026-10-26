"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import DecisionQuiz from "./DecisionQuiz";
import { EVENT_MGMT_VS_PRODUCTION_FAQS } from "./guideFaqs";

const PATH = "/info/guides/event-management-vs-production";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "producer", label: "מה זה מפיק אירועים" },
  { id: "external-manager", label: "מנהל אירוע חיצוני" },
  { id: "venue-manager", label: "מנהל מטעם האולם" },
  { id: "compare", label: "טבלת השוואה" },
  { id: "need-producer", label: "האם חייבים מפיק" },
  { id: "need-external", label: "מנהל חיצוני מול האולם" },
  { id: "quiz", label: "שאלון: מה צריך" },
  { id: "pricing", label: "תמחור ומודלים" },
  { id: "checklist", label: "צ'קליסט לפני סגירה" },
  { id: "invistimo", label: "איך Invistimo משתלבת" },
  { id: "faq", label: "שאלות נפוצות" },
];

const COMPARE_ROWS: { area: string; producer: string; external: string; venue: string }[] = [
  {
    area: "תכנון האירוע מההתחלה",
    producer: "לרוב בהפקה מלאה",
    external: "לעיתים, לפי המסלול",
    venue: "בדרך כלל לא",
  },
  {
    area: "בחירת ספקים",
    producer: "עשויה להיכלל",
    external: "בדרך כלל לא עיקר השירות",
    venue: "בדרך כלל לא",
  },
  {
    area: "ניהול תקציב",
    producer: "עשוי להיכלל",
    external: "מעקב בהתאם להסכם",
    venue: "תחומי האולם",
  },
  {
    area: "תיאום ספקים חיצוניים",
    producer: "לרוב",
    external: "בהתאם להסכם",
    venue: "בהתאם להסכם",
  },
  {
    area: "ניהול יום האירוע",
    producer: "אם נכלל",
    external: "לרוב מרכז השירות",
    venue: "בתחומי האולם",
  },
  {
    area: "תפעול צוות האולם",
    producer: "בתיאום",
    external: "בתיאום",
    venue: "באחריות האולם",
  },
  {
    area: "ייצוג צורכי הזוג",
    producer: "בהתאם להסכם",
    external: "בהתאם להסכם",
    venue: "במסגרת שירותי האולם",
  },
];

const PRODUCER_SCOPE = [
  "אפיון האירוע והחזון של הזוג",
  "בניית תקציב ותוכנית עבודה",
  "איתור ובחירת אולם",
  "המלצות ובחירת ספקים",
  "תיאום בין הספקים",
  "תכנון חוויית האורחים",
  "ניהול לוחות זמנים",
  "תיאום הקמות ופירוקים",
  "ליווי וניהול ביום האירוע, אם נכלל בהסכם",
];

const EXTERNAL_SCOPE = [
  "פגישת היערכות עם הזוג",
  "מעבר על הסכמים ותיאומים",
  "בניית לו״ז ליום האירוע",
  "תיאום עם הספקים",
  "בדיקת מוכנות האולם",
  "מעקב אחר מהלך האירוע",
  "טיפול בשינויים",
  "תיאום מול צוות ההושבה",
  "טיפול בנושאים שהוסמך לנהל",
];

const VENUE_SCOPE = [
  "צוותי שירות",
  "תזמון הגשת אוכל",
  "תפעול המקום",
  "תיאום פעולות של צוות האולם",
  "טיפול בנושאים תפעוליים שבאחריות המקום",
];

const COVERAGE_GAPS = [
  "מי מתאם עם הצלם וה־DJ?",
  "מי מוודא שספקי האטרקציות הגיעו?",
  "מי מטפל בבקשות מיוחדות של המשפחה?",
  "מי מנהל שינויים בלו״ז?",
  "מי אחראי על ציוד אישי שהובא לאולם?",
  "מי מתאם הפעלת רזרבות?",
  "מי אחראי על ספקים שלא הוזמנו דרך האולם?",
];

const CLOSE_CHECKLIST = [
  "מה בדיוק כלול בשירות?",
  "כמה פגישות מתקיימות?",
  "מתי מתחיל הליווי?",
  "האם המנהל נוכח באירוע?",
  "כמה אנשי צוות מגיעים?",
  "מי אחראי על ספקים חיצוניים?",
  "מי אחראי על ההושבה?",
  "מה שעות העבודה?",
  "מה קורה במקרה של מחלה או היעדרות?",
  "האם יש ביטוח מתאים?",
  "האם קיימות עלויות נוספות?",
  "מי מאשר הוצאות?",
  "מה מדיניות הביטול?",
  "האם יש ניסיון בסוג האירוע שלנו?",
  "האם מקבלים תוכנית עבודה מסודרת?",
];

const PRICING_MODELS = [
  {
    title: "מחיר קבוע לניהול יום האירוע",
    text: "מתאים כשהתכנון כבר מאחוריכם ודרושה בעיקר נוכחות ותיאום ביום עצמו.",
  },
  {
    title: "מחיר לליווי חלקי",
    text: "ליווי לאורך תקופה מוגדרת — למשל כמה פגישות והיערכות — בלי הפקה מלאה מההתחלה.",
  },
  {
    title: "מחיר להפקה מלאה",
    text: "ליווי רחב שמתחיל מוקדם יותר ועשוי לכלול אפיון, ספקים, תקציב ותיאום לאורך זמן.",
  },
  {
    title: "תמחור לפי היקף ומורכבות",
    text: "מספר ספקים, סוג המקום, מספר אורחים ודרישות מיוחדות משפיעים על ההצעה.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>;
}

function AnswerLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-2xl border border-[#EADDC8] bg-white/80 px-5 py-4 text-base font-bold leading-8 text-[#3F3025] md:text-lg">
      {children}
    </p>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-base leading-7 text-[#5C4A3A]">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7A56B]" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
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
      {caption ? (
        <figcaption className="border-t border-[#EADDC8] px-4 py-3 text-sm text-[#7A6042]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default function EventManagementVsProductionGuide() {
  const reduce = useReducedMotion();

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
            ניהול מול הפקה
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך מקצועי לזוגות</p>
            <GuideToolbar
              title="ניהול אירוע או הפקת אירוע? | Invistimo"
              path={PATH}
              readingMinutes={18}
            />
          </div>

          <div className="mt-6 grid items-end gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="max-w-4xl text-[1.75rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]"
              >
                ניהול אירוע או הפקת אירוע? ההבדלים, המחירים ואיך בוחרים מה באמת צריך
              </motion.h1>
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg"
              >
                <p>
                  כשמתחילים לתכנן חתונה, נתקלים במושגים שנשמעים דומים: מפיק אירועים, מנהל אירוע,
                  מנהל מטעם האולם ומנהל אירוע חיצוני.
                </p>
                <p className="font-bold text-[#3F3025]">אבל לא מדובר בהכרח באותו שירות.</p>
                <p>
                  מפיק אירועים עשוי ללוות את תכנון החתונה מהשלבים הראשונים, לעזור בגיבוש הקונספט,
                  בבחירת ספקים ובתיאום ההפקה. מנהל אירוע חיצוני עשוי להתמקד בהכנות התפעוליות ובניהול
                  יום האירוע מטעם הזוג. מנהל מטעם האולם אחראי בדרך כלל לתפעול השירותים שהאולם התחייב
                  לספק.
                </p>
                <p>
                  הגבולות בין התפקידים אינם אחידים, ולכן חשוב לבדוק את תחומי האחריות בפועל ולא
                  להסתפק בשם השירות. במדריך הזה נבין את ההבדלים, נבחן מתי כל שירות מתאים, ונעזור לכם
                  להחליט מה נכון לאירוע שלכם.
                </p>
              </motion.div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#quiz" className={ctaPrimary}>
                  לשאלון: מה מתאים לנו
                </a>
                <TrackedCtaLink
                  href="/event-management"
                  className={ctaSecondary}
                  location="hero_cta:/info/guides/event-management-vs-production"
                >
                  לשירותי ניהול האירוע
                </TrackedCtaLink>
              </div>
            </div>

            <motion.figure
              initial={reduce ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_24px_60px_rgba(58,39,20,0.12)]"
            >
              <Image
                src="/images/rsvp/guides/wedding-planning/hero-reception.jpg"
                alt="קבלת פנים באירוע — המחשה לתכנון וניהול חתונה"
                width={900}
                height={1100}
                className="h-full max-h-[520px] w-full object-cover"
                priority
                sizes="(max-width:1024px) 100vw, 420px"
              />
            </motion.figure>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <StickyToc items={TOC} />

        <div className="min-w-0 space-y-16 pb-20">
          <section id="producer" className="scroll-mt-28">
            <Eyebrow>01</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">מה זה מפיק אירועים?</h2>
            <AnswerLead>
              מפיק אירועים הוא איש מקצוע שעשוי להיות אחראי לתכנון הרחב של האירוע — מגיבוש הצרכים
              והקונספט ועד תיאום ספקים ולוגיסטיקה.
            </AnswerLead>
            <Prose>
              <p>
                לא כל מפיק מספק את כל השירותים שמופיעים ברשימה למטה. היקף האחריות נקבע בהסכם, ולכן
                חשוב לבקש פירוט כתוב לפני החתימה.
              </p>
            </Prose>
            <h3 className="mt-8 text-xl font-black text-[#35281F]">מה עשויה לכלול הפקה מלאה?</h3>
            <BulletList items={PRODUCER_SCOPE} />
            <h3 className="mt-8 text-xl font-black text-[#35281F]">למי זה מתאים?</h3>
            <Prose>
              <p>
                לזוגות שרוצים ליווי רחב, לאירועים מורכבים, לחתונות שטח, לאירועים עם תשתיות מיוחדות
                או למי שאין זמן לנהל את התכנון בעצמם.
              </p>
            </Prose>
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/venue.jpg"
              alt="אולם אירועים — בחירת מקום כחלק מתכנון והפקה"
              caption="בחירת אולם היא לעיתים חלק מהפקה מלאה — ולא בהכרח חלק מניהול יום האירוע בלבד"
            />
          </section>

          <section id="external-manager" className="scroll-mt-28">
            <Eyebrow>02</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">
              מה זה מנהל אירוע חיצוני?
            </h2>
            <AnswerLead>
              מנהל אירוע חיצוני הוא גורם מקצועי שנשכר מטעם הזוג כדי לתאם ולנהל תחומי אחריות שהוגדרו
              מראש — לרוב לקראת האירוע וביום עצמו.
            </AnswerLead>
            <Prose>
              <p>
                הוא עשוי להיכנס לתמונה אחרי שנבחרו אולם וספקים, לקבל את רשימת ההסכמים, לבנות תוכנית
                תפעולית וללוות את יום החתונה. זה שונה מליווי הפקה שמתחיל חודשים קודם — אבל בשוק יש
                גם מסלולי ביניים.
              </p>
            </Prose>
            <h3 className="mt-8 text-xl font-black text-[#35281F]">מה עשוי לכלול השירות?</h3>
            <BulletList items={EXTERNAL_SCOPE} />
            <h3 className="mt-8 text-xl font-black text-[#35281F]">למי זה מתאים?</h3>
            <Prose>
              <p>
                לזוגות שכבר בחרו אולם וספקים, רוצים לתכנן חלק גדול מהחתונה בעצמם, אבל מעדיפים שיהיה
                גורם מקצועי שירכז את התיאומים ביום האירוע.
              </p>
              <p>
                <strong>דוגמה מהחיים:</strong> הזוג בצילומים, הצלם מתעכב, וה־DJ שואל מתי מתחילים.
                מנהל חיצוני שקיבל סמכות מראש יכול לעדכן לו״ז, לתאם עם האולם ולשמור על רצף — בלי
                שהזוג יצטרך לנהל שיחות מהחופה.
              </p>
            </Prose>
            <SectionImage
              src="/images/marketing-captures/demo/event-mgmt-vs-prod-seating.webp"
              alt="שולחנות ערוכים באולם לפני קבלת האורחים"
              caption="יום האירוע מתחיל הרבה לפני שהאורחים נכנסים — בהיערכות, הקמות ותיאומים"
            />
          </section>

          <section id="venue-manager" className="scroll-mt-28">
            <Eyebrow>03</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">
              מה עושה מנהל האירוע של האולם?
            </h2>
            <AnswerLead>
              מנהל האירוע מטעם האולם אחראי בדרך כלל לתפעול תחומי השירות שהאולם מספק — לא בהכרח לכל
              הספקים והמשימות של הזוג.
            </AnswerLead>
            <Prose>
              <p>למשל:</p>
            </Prose>
            <BulletList items={VENUE_SCOPE} />
            <Prose>
              <p>
                חשוב לא לטעון שמנהל האולם אינו דואג לזוג. במקומות רבים ניתן שירות מקצועי ומקיף. עם
                זאת, לא כל אולם מתחייב לנהל גם ספקים חיצוניים, תשלומים פרטיים, ציוד שהזוג הביא או
                משימות משפחתיות.
              </p>
            </Prose>
          </section>

          <section id="compare" className="scroll-mt-28">
            <Eyebrow>04</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">טבלת השוואה מרכזית</h2>
            <AnswerLead>
              החלוקה בטבלה היא כיוון כללי — לא תקן מחייב. כל הצעה עשויה להיות שונה לפי ההסכם.
            </AnswerLead>
            <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white shadow-[0_16px_40px_rgba(58,39,20,0.06)]">
              <table className="min-w-[720px] w-full border-collapse text-right text-sm md:text-base">
                <caption className="sr-only">
                  השוואה בין מפיק אירועים, מנהל אירוע חיצוני ומנהל מטעם האולם
                </caption>
                <thead>
                  <tr className="border-b border-[#EADDC8] bg-[#FFF8EE]">
                    <th scope="col" className="px-4 py-4 font-black text-[#35281F]">
                      תחום
                    </th>
                    <th scope="col" className="px-4 py-4 font-black text-[#35281F]">
                      מפיק אירועים
                    </th>
                    <th scope="col" className="px-4 py-4 font-black text-[#35281F]">
                      מנהל חיצוני
                    </th>
                    <th scope="col" className="px-4 py-4 font-black text-[#35281F]">
                      מנהל מטעם האולם
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.area} className="border-b border-[#F0E4D2] last:border-0">
                      <th scope="row" className="px-4 py-4 font-bold text-[#3F3025]">
                        {row.area}
                      </th>
                      <td className="px-4 py-4 text-[#5C4A3A]">{row.producer}</td>
                      <td className="px-4 py-4 text-[#5C4A3A]">{row.external}</td>
                      <td className="px-4 py-4 text-[#5C4A3A]">{row.venue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="need-producer" className="scroll-mt-28">
            <Eyebrow>05</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">
              האם חייבים מפיק אירועים לחתונה?
            </h2>
            <AnswerLead>לא.</AnswerLead>
            <Prose>
              <p>
                חתונות רבות אפשר לתכנן עצמאית, במיוחד כאשר האולם מספק שירותים מסודרים והספקים כבר
                נבחרו. מפיק מקצועי עשוי להועיל במיוחד כאשר התכנון מורכב, יש ספקים רבים או נדרשת
                לוגיסטיקה יוצאת דופן.
              </p>
              <p>
                הבחירה תלויה בזמן הפנוי, בתקציב, במורכבות האירוע וברמת המעורבות שהזוג מעוניין בה.
              </p>
            </Prose>
          </section>

          <section id="need-external" className="scroll-mt-28">
            <Eyebrow>06</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">
              האם צריך מנהל חיצוני אם יש מנהל באולם?
            </h2>
            <AnswerLead>
              לא בהכרח — אבל כדאי לבדוק אילו תחומים אינם מכוסים.
            </AnswerLead>
            <Prose>
              <p>לדוגמה:</p>
            </Prose>
            <BulletList items={COVERAGE_GAPS} />
            <Prose>
              <p>
                אם הכול מכוסה בצורה מספקת על ידי האולם או אדם שהזוג מינה, ייתכן שאין צורך בשירות
                נוסף. אם יש פערים — מנהל חיצוני, ליווי חלקי או לפחות ריכוז דיגיטלי של האחריות יכולים
                לצמצם הפתעות ביום האירוע.
              </p>
            </Prose>
            <SectionImage
              src="/images/rsvp/guides/wedding-planning/toast.jpg"
              alt="רגע חגיגי באירוע — אחרי תיאום מאחורי הקלעים"
              caption="כשהתיאום מאחורי הקלעים ברור, הזוג יכול להיות נוכח ברגעים עצמם"
            />
          </section>

          <section id="quiz" className="scroll-mt-28">
            <Eyebrow>07</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">
              איך מחליטים מה צריך?
            </h2>
            <AnswerLead>
              ענו על שש שאלות קצרות וקבלו המלצה מנומקת — לא קביעה מוחלטת.
            </AnswerLead>
            <div className="mt-8">
              <DecisionQuiz />
            </div>
          </section>

          <section id="pricing" className="scroll-mt-28">
            <Eyebrow>08</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">
              כמה עולה ניהול אירוע לעומת הפקה?
            </h2>
            <AnswerLead>
              אין מחיר אחיד. התמחור תלוי במודל השירות, בהיקף העבודה ובמורכבות האירוע.
            </AnswerLead>
            <Prose>
              <p>מודלי תמחור נפוצים בשוק:</p>
            </Prose>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {PRICING_MODELS.map((model) => (
                <div
                  key={model.title}
                  className="rounded-2xl border border-[#E6D2AA] bg-white px-5 py-5"
                >
                  <h3 className="text-lg font-black text-[#35281F]">{model.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">{model.text}</p>
                </div>
              ))}
            </div>
            <Prose>
              <p>
                מדריך זה אינו מפרסם טווחי מחיר שוק שלא אומתו ממקורות ישראליים עדכניים עם תאריך
                ומקור. לפני סגירה בקשו הצעה כתובה שמבחינה בין ניהול יום, ליווי חלקי והפקה מלאה.
              </p>
              <p>
                ב־Invistimo, מחיר המערכת והתוספות מוצג במחשבון החבילות לפי מה שמסמנים; שירותי ליווי
                וניהול בשטח מתומחרים לפי הצעה בהתאם להיקף ולזמינות.
              </p>
            </Prose>
            <div className="mt-6">
              <TrackedCtaLink
                href="/pricing"
                className={ctaSecondary}
                location="pricing_cta:/info/guides/event-management-vs-production"
              >
                למחשבון החבילות של Invistimo
              </TrackedCtaLink>
            </div>
          </section>

          <section id="checklist" className="scroll-mt-28">
            <Eyebrow>09</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">
              מה כדאי לבדוק לפני שסוגרים?
            </h2>
            <AnswerLead>חמש־עשרה שאלות שכדאי לקחת לפגישה — לפני שחותמים.</AnswerLead>
            <ol className="mt-8 space-y-3">
              {CLOSE_CHECKLIST.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-4 rounded-2xl border border-[#E6D2AA] bg-white px-4 py-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF1DA] text-sm font-black text-[#8A642E]">
                    {index + 1}
                  </span>
                  <span className="pt-1 font-bold text-[#3F3025]">{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="invistimo" className="scroll-mt-28">
            <Eyebrow>10</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">
              ניהול חכם עם מערכת דיגיטלית ואנשי מקצוע בתחום האירועים
            </h2>
            <AnswerLead>
              Invistimo מציעה מערכת לניהול האירוע, לצד אפשרויות לשירותי ניהול וליווי מקצועיים.
            </AnswerLead>
            <Prose>
              <p>
                בנוסף, Invistimo עובדת עם מנהלי אירועים מקצועיים ברחבי הארץ, כך שניתן לבחון פתרון
                שמשלב כלים דיגיטליים עם שירות אנושי — בהתאם לאזור האירוע, לזמינות ולהיקף השירות. אין
                הבטחה למנהל זמין בכל עיר או בכל תאריך בלי בדיקה.
              </p>
            </Prose>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "ניהול עצמאי",
                  text: "משימות, ספקים, תקציב, תשלומים ולו״ז במערכת — למי שרוצה לנהל בעצמו.",
                },
                {
                  title: "ליווי מקצועי",
                  text: "הכוונה וליווי בהתאם למסלול השירות שנבחר בהצעה.",
                },
                {
                  title: "מנהל אירוע בשטח",
                  text: "שירות ניהול ביום האירוע באמצעות מנהל מקצועי — בהתאם לזמינות ולהצעה.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#E6D2AA] bg-white p-5">
                  <h3 className="text-lg font-black text-[#35281F]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink
                href="/event-management"
                className={ctaPrimary}
                location="invistimo_cta:/info/guides/event-management-vs-production"
              >
                גלו את שירותי ניהול האירועים של Invistimo
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/try/event-management"
                className={ctaSecondary}
                location="invistimo_cta:/info/guides/event-management-vs-production"
              >
                נסו את המערכת
              </TrackedCtaLink>
            </div>
            <SectionImage
              src="/images/marketing-captures/demo/event-mgmt-vs-prod-hero.webp"
              alt="מסך רשימת מוזמנים במערכת Invistimo"
              caption="ריכוז מידע במערכת עוזר גם כשיש מנהל אולם, מנהל חיצוני או תכנון עצמאי"
            />
          </section>

          <section id="faq" className="scroll-mt-28">
            <Eyebrow>11</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-[#2C241C] md:text-4xl">שאלות נפוצות</h2>
            <div className="mt-8 space-y-4">
              {EVENT_MGMT_VS_PRODUCTION_FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-4 open:shadow-[0_12px_30px_rgba(58,39,20,0.06)]"
                >
                  <summary className="cursor-pointer list-none">
                    <h3 className="text-lg font-black text-[#35281F]">{faq.q}</h3>
                  </summary>
                  <p className="mt-3 leading-8 text-[#5C4A3A]">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-6 md:p-8">
            <h2 className="text-2xl font-black text-[#2C241C] md:text-3xl">המשך קריאה</h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {[
                { href: "/event-management", label: "ניהול אירועים ב־Invistimo" },
                { href: "/info/guides/wedding-planning", label: "המדריך המלא לתכנון חתונה" },
                { href: "/info/guides/wedding-vendors-contracts", label: "ספקים וחוזים" },
                { href: "/info/guides/event-day-checklist", label: "בדיקה לפני יום האירוע" },
                { href: "/pricing", label: "חבילות ומחירים" },
                { href: "/info/guides", label: "כל המדריכים" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735] hover:border-[#C7A56B]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </article>
  );
}
