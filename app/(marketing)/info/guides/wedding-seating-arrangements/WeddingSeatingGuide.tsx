"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import InteractiveChecklist from "@/components/marketing/guides/InteractiveChecklist";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import SeatingCalculator from "./SeatingCalculator";
import {
  ArrivalScenariosChart,
  OccupancyDemoCards,
  SeatingMapIllustration,
  TableFillComparison,
} from "./TableVisuals";
import { WEDDING_SEATING_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-seating-arrangements";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "fill-tables-overview", label: "האם למלא שולחנות" },
  { id: "when-to-start", label: "מתי מתחילים" },
  { id: "three-numbers", label: "מוזמנים ומאשרים" },
  { id: "ten-percent", label: "האם 10%?" },
  { id: "seat-all", label: "לשבץ את כולם?" },
  { id: "fill-tables", label: "למלא שולחנות?" },
  { id: "empty-seats", label: "מקומות פנויים" },
  { id: "example-300", label: "דוגמה ל־300" },
  { id: "groups", label: "חלוקה לקבוצות" },
  { id: "no-reply", label: "מי שלא ענו" },
  { id: "cancellations", label: "ביטולים" },
  { id: "unexpected", label: "יותר מהצפוי" },
  { id: "reserves-vs-meals", label: "הושבה מול מנות" },
  { id: "digital", label: "מערכת דיגיטלית" },
  { id: "calculator", label: "מחשבון" },
  { id: "mistakes", label: "טעויות נפוצות" },
  { id: "checklist", label: "צ׳קליסט" },
  { id: "faq", label: "שאלות נפוצות" },
];

const STAGES = [
  "בתחילת ההכנות — בחירת שירות ההושבה והכנת רשימת מוזמנים.",
  "לאחר קביעת האולם — בדיקת מבנה האולם, מספר השולחנות וקיבולת כל שולחן.",
  "לפני סבבי אישורי ההגעה — חלוקה ראשונית של אורחים לקבוצות.",
  "לאחר קבלת תשובות — בניית טיוטת הושבה.",
  "לקראת האירוע — התאמות, רזרבות, אישור מול האולם ותיאום עם צוות ההושבה.",
  "ביום האירוע — טיפול בשינויים והגעה בפועל בהתאם לשירות שנבחר.",
] as const;

const GROUPS = [
  "משפחת הכלה",
  "משפחת החתן",
  "חברים קרובים",
  "חברים מהצבא או מהלימודים",
  "חברים מהעבודה",
  "שכנים ומכרים",
  "אורחים מבוגרים",
  "משפחות עם ילדים",
] as const;

const GROUP_PRINCIPLES = [
  "לא לפצל זוגות ללא צורך.",
  "להתחשב בקשרים ובמתחים משפחתיים.",
] as const;

const VENUE_QUESTIONS = [
  "מה הקיבולת המאושרת של כל שולחן?",
  "האם אפשר להוסיף כיסא?",
  "האם קיימים שולחנות רזרבה?",
  "מתי מחייבים על רזרבות?",
  "מי רשאי להפעיל רזרבה?",
  "האם ניתן להזיז אורחים בין שולחנות?",
  "מה עושים אם מגיעים יותר אנשים מהצפוי?",
] as const;

const UNEXPECTED_PLAN = [
  "מי אחראי לבדוק את רשימת המוזמנים.",
  "מי מוסמך לבצע שינוי בשיבוץ.",
  "היכן נמצאים מקומות הרזרבה.",
  "מי מאשר את הפעלתם.",
  "כיצד מעדכנים את צוות האולם.",
  "כיצד נמנעים ממצב שבו אורח נשלח לשולחן מלא.",
] as const;

const MISTAKES = [
  "להתחיל לתכנן את ההושבה רק יום לפני האירוע.",
  "לא לעדכן ביטולים ושינויים.",
  "להניח שכל מי שלא ענה לא יגיע.",
  "להסתמך על 10% אי־הגעה כאילו מדובר בנתון ודאי.",
  "לשבץ יותר אנשים מקיבולת השולחן.",
  "לא לתאם רזרבות עם האולם.",
  "לפצל משפחות וקבוצות ללא צורך.",
  "להתעלם מנגישות ומצרכים מיוחדים.",
  "לא למסור לצוות ההושבה גרסה מעודכנת.",
  "לבלבל בין מספר המאשרים, מספר המשובצים ומספר המגיעים בפועל.",
] as const;

const CHECKLIST = [
  "רשימת המוזמנים מעודכנת.",
  "מספרי האורחים בכל רשומה נבדקו.",
  "בוצע מעקב אחר מי שלא ענו.",
  "כל מאשרי ההגעה נכללו בתכנון הישיבה.",
  "קיבולת כל שולחן אומתה מול האולם.",
  "קבוצות האורחים חולקו.",
  "צורכי נגישות נבדקו.",
  "סוכמו מקומות רזרבה.",
  "הוגדר מי רשאי לשנות שיבוצים.",
  "תוכנית ההושבה נבדקה מול האולם.",
  "צוות ההושבה קיבל גרסה מעודכנת.",
  "קיימת תוכנית לטיפול באורחים בלתי צפויים.",
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>
  );
}

/** Opening paragraph under each H2 — natural lead, not an SEO/AI callout. */
function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-base font-semibold leading-8 text-[#3F3025] md:text-lg md:leading-9">
      {children}
    </p>
  );
}

export default function WeddingSeatingGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <header className="relative isolate">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(232,214,180,0.55),transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 md:px-8 md:pb-10 md:pt-8">
          <p className="text-sm font-semibold text-[#7A6042]">
            <Link href="/" className="hover:text-[#8A642E]">
              ראשי
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            <Link href="/info/guides" className="hover:text-[#8A642E]">
              מדריכים
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            סידורי הושבה לחתונה
          </p>
          <p className="mt-5 text-sm font-black tracking-[0.12em] text-[#7A5530]">
            מדריך · Invistimo
          </p>
          <h1 className="mt-3 max-w-4xl text-[1.75rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
            סידורי הושבה לחתונה: המדריך המלא לחלוקת שולחנות, מאשרי הגעה ורזרבות
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A] md:text-xl md:leading-9">
            סידורי הושבה הם הרבה יותר מחלוקת שמות לשולחנות. זהו אחד השלבים שבהם רשימת המוזמנים,
            אישורי ההגעה, קיבולת האולם והקשרים בין האורחים נפגשים לתוכנית אחת שצריכה לעבוד גם
            במציאות.
          </p>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              האם כדאי למלא כל שולחן עד המקום האחרון? האם צריך להושיב את כל מי שאישר הגעה? מה עושים
              אם חלק מהמאשרים לא מגיעים? וכמה מקומות כדאי להשאיר לשינויים של הרגע האחרון?
            </p>
            <p>
              במדריך הזה נסביר כיצד מתכננים הושבה חכמה, נעימה ומסודרת, מה ההבדל בין מספר מאשרים לבין
              מספר מגיעים בפועל, ואיך מתמודדים עם חוסר הוודאות בלי לסכן את חוויית האורחים.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink
              href="#seating-calculator"
              className={ctaPrimary}
              location={`hero_calc:${PATH}`}
            >
              למחשבון ההושבה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="#fill-tables-overview"
              className={ctaSecondary}
              location={`hero_overview:${PATH}`}
            >
              האם למלא את כל השולחנות?
            </TrackedCtaLink>
          </div>
        </div>

        <div className="relative">
          {!reduce ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="overflow-hidden border-y border-[#E6D2AA]"
            >
              <Image
                src="/images/rsvp/guides/venue-guarantee-hall.jpg"
                alt="אולם חתונה ערוך עם שולחנות עגולים, מפות שמנת ומרכזי פרחים — המחשת סידורי הושבה"
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
                src="/images/rsvp/guides/venue-guarantee-hall.jpg"
                alt="אולם חתונה ערוך עם שולחנות עגולים, מפות שמנת ומרכזי פרחים — המחשת סידורי הושבה"
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
          <section id="fill-tables-overview" className="scroll-mt-24" aria-labelledby="fill-tables-overview-h">
            <Eyebrow>לפני הכול</Eyebrow>
            <h2 id="fill-tables-overview-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם כדאי למלא את כל השולחנות?
            </h2>
            <Lead>
              כדאי לשבץ את כל האורחים שאישרו הגעה ושעבורם נדרש מקום, אך לא בהכרח למלא כל שולחן עד
              הקיבולת המרבית. מומלץ לתכנן לפי מבנה האולם, סוג השולחנות, קבוצות האורחים והסדרי
              הרזרבה שסוכמו עם האולם. גם אם מעריכים שחלק מהמאשרים לא יגיעו, אין להסתמך על כך כדי
              להושיב יותר אורחים ממספר המקומות הזמינים בפועל.
            </Lead>
          </section>

          {/* 2 When to start */}
          <section id="when-to-start" className="scroll-mt-24" aria-labelledby="when-h">
            <Eyebrow>תזמון</Eyebrow>
            <h2 id="when-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מתי מתחילים סידורי הושבה לחתונה?
            </h2>
            <Lead>
              את שירות סידורי ההושבה מומלץ לבחור ולסגור מוקדם ככל האפשר לאחר קביעת האולם והתאריך.
              השיבוץ הסופי לשולחנות נעשה בדרך כלל קרוב יותר לאירוע, לאחר שהתקבלו מרבית אישורי
              ההגעה.
            </Lead>
            <Prose>
              <p>
                לא לחכות לרגע האחרון כדי להתחיל את ההכנות. אפשר לסגור את השירות ולהכין את התשתית
                מוקדם, גם אם השיבוץ הסופי יתבצע סמוך לחתונה.
              </p>
            </Prose>
            <ol className="mt-6 space-y-3">
              {STAGES.map((item, i) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-[20px] border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3.5 text-[15px] font-semibold leading-7 text-[#3F3025]"
                >
                  <span className="font-black tabular-nums text-[#C7A56B]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6">
              <TrackedCtaLink
                href="/seating-explained"
                className={ctaSecondary}
                location={`when_service:${PATH}`}
              >
                להכיר את שירות סידורי ההושבה
              </TrackedCtaLink>
            </div>
          </section>

          {/* 3 Three numbers */}
          <section id="three-numbers" className="scroll-mt-24" aria-labelledby="three-h">
            <Eyebrow>הגדרות</Eyebrow>
            <h2 id="three-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              למה מספר מאשרי ההגעה לא תמיד שווה למספר האורחים שמגיעים?
            </h2>
            <Lead>
              יש שלושה נתונים שונים: מוזמנים, מאשרי הגעה ומגיעים בפועל. אישורי הגעה משפרים את יכולת
              התכנון, אך אינם מבטיחים הגעה ביום האירוע.
            </Lead>
            <dl className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  t: "מוזמנים",
                  d: "כל האנשים שהוזמנו, כולל מי שטרם השיבו ומי שהודיעו שלא יגיעו.",
                },
                {
                  t: "מאשרי הגעה",
                  d: "אורחים שהודיעו שהם מתכננים להגיע, כולל מספר האנשים בכל רשומה.",
                },
                {
                  t: "מגיעים בפועל",
                  d: "האנשים שנכנסו לאירוע ביום החתונה.",
                },
              ].map((item) => (
                <div
                  key={item.t}
                  className="rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5"
                >
                  <dt className="text-lg font-black text-[#2C241C]">{item.t}</dt>
                  <dd className="mt-2 text-sm leading-7 text-[#5C4A3A]">{item.d}</dd>
                </div>
              ))}
            </dl>
            <Prose>
              <p>
                גם לאחר שאורח מאשר הגעה, ייתכן שיחול שינוי עקב מחלה, נסיבות אישיות, בעיות תחבורה או
                אירועים בלתי צפויים.
              </p>
              <p>
                לניהול הרשימה עצמה ראו את{" "}
                <Link href="/info/guides/guest-list" className="font-black text-[#8A642E] underline-offset-4 hover:underline">
                  מדריך רשימת המוזמנים
                </Link>
                . את התשובות אוספים ב<Link href="/rsvp" className="font-black text-[#8A642E] underline-offset-4 hover:underline">אישורי הגעה</Link>
                , ובחתונה גם ב<Link href="/rsvp/chatuna" className="font-black text-[#8A642E] underline-offset-4 hover:underline">עמוד אישורי ההגעה לחתונה</Link>
                .
              </p>
            </Prose>
          </section>

          {/* 4 Ten percent */}
          <section id="ten-percent" className="scroll-mt-24" aria-labelledby="ten-h">
            <Eyebrow>תרחישים</Eyebrow>
            <h2 id="ten-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם נכון להניח ש־10% מהאורחים שאישרו הגעה לא יגיעו?
            </h2>
            <Lead>
              לפעמים משתמשים באומדן של כ־10% אי־הגעה מתוך המאשרים לצורך תכנון. אין מדובר בכלל
              קבוע, בנתון מובטח לכל חתונה או באחוז שאפשר להסתמך עליו בלי בדיקה. אין להציג 10%
              כסטטיסטיקה רשמית או ממוצע מוכח ללא מקור מחקרי אמין.
            </Lead>
            <Prose>
              <p>
                שיעור אי־ההגעה עשוי להשתנות בהתאם למאפייני האירוע, מיקום האולם, מזג האוויר, מועד
                החתונה, אופי המוזמנים, אופן ביצוע אישורי ההגעה והנסיבות האישיות.
              </p>
              <p className="font-bold text-[#2C241C]">
                דוגמה מספרית: נניח ש־300 אנשים אישרו הגעה.
              </p>
            </Prose>
            <div className="mt-6">
              <ArrivalScenariosChart />
            </div>
            <Prose>
              <p>
                המסקנה: לא נכון להבטיח מקום רק ל־270 אנשים כאשר 300 אישרו הגעה, אלא אם קיימת תוכנית
                קיבולת ורזרבה מאושרת שמאפשרת לקלוט את כל 300 האנשים.
              </p>
            </Prose>
          </section>

          {/* 5 Seat all */}
          <section id="seat-all" className="scroll-mt-24" aria-labelledby="seat-all-h">
            <Eyebrow>שיבוץ</Eyebrow>
            <h2 id="seat-all-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם חייבים להושיב את כל מי שאישר הגעה?
            </h2>
            <Lead>
              ההמלצה היא לתכנן פתרון ישיבה לכל אדם שאישר הגעה ונדרש עבורו מקום. אפשר להשתמש
              ברזרבות ובתכנון גמיש לפי ההסכם עם האולם — אך אין להסתמך על אי־הגעה משוערת כדי להותיר
              אורחים ללא מקום מתאים.
            </Lead>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5">
                <h3 className="text-lg font-black text-[#2C241C]">שיבוץ</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                  לאיזה שולחן האורח מיועד להגיע.
                </p>
              </div>
              <div className="rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5">
                <h3 className="text-lg font-black text-[#2C241C]">קיבולת פיזית</h3>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                  כמה מקומות ישיבה באמת זמינים באולם ובשולחנות, לרבות רזרבות שאושרו להפעלה.
                </p>
              </div>
            </div>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> 300 אנשים אישרו הגעה.
                האולם ערוך ל־280 מקומות רגילים ועוד 20 מקומות רזרבה שניתן להפעיל לפי הסכם ברור.
                במצב כזה יש לבדוק מראש כיצד ניתן להושיב את כל 300 האנשים אם כולם יגיעו, מי מפעיל את
                הרזרבות והיכן הם ישבו.
              </p>
              <p>
                אם אין אפשרות אמיתית לקלוט 300 אנשים, התוכנית אינה מספקת גם אם מעריכים שחלקם לא
                יגיעו.
              </p>
            </Prose>
          </section>

          {/* 6 Fill tables */}
          <section id="fill-tables" className="scroll-mt-24" aria-labelledby="fill-h">
            <Eyebrow>מילוי שולחנות</Eyebrow>
            <h2 id="fill-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם כדאי למלא כל שולחן במספר האורחים המרבי?
            </h2>
            <Lead>
              לא תמיד. שולחן שמיועד לעשרה אנשים אינו בהכרח שולחן שחייבים לשבץ בו עשרה אנשים בכל
              מצב. ההחלטה תלויה בקיבולת שאישר האולם, בגודל השולחן, במרווח בין הכיסאות, במבנה
              הקבוצות ובצורכי האורחים.
            </Lead>
            <div className="mt-8">
              <TableFillComparison />
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5">
                <h3 className="text-lg font-black text-[#2C241C]">יתרונות של שולחנות מלאים</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5C4A3A]">
                  <li>• ניצול יעיל של שטח האולם</li>
                  <li>• אפשרות לצמצם מספר שולחנות פעילים</li>
                  <li>• חלוקה ברורה של קבוצות גדולות</li>
                  <li>• פחות שולחנות עם מספר משתתפים נמוך</li>
                </ul>
              </div>
              <div className="rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5">
                <h3 className="text-lg font-black text-[#2C241C]">חסרונות של מילוי מרבי</h3>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5C4A3A]">
                  <li>• פחות גמישות לשינויים</li>
                  <li>• קושי לשלב אורחים ברגע האחרון</li>
                  <li>• לעיתים צורך לפצל משפחה או קבוצת חברים</li>
                  <li>• פגיעה אפשרית בנוחות בקיבולת צפופה</li>
                </ul>
              </div>
            </div>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">המלצה מקצועית:</strong> למלא שולחנות
                באופן מאוזן ולא באופן אוטומטי. יש שולחנות שבהם עשרה אנשים מתאימים בדיוק, ויש
                קבוצות שבהן שמונה או תשעה ייצרו הושבה נעימה יותר. השארת מקומות פנויים אינה תחליף
                לתוכנית רזרבות.
              </p>
            </Prose>
          </section>

          {/* 7 Empty seats */}
          <section id="empty-seats" className="scroll-mt-24" aria-labelledby="empty-h">
            <Eyebrow>גמישות</Eyebrow>
            <h2 id="empty-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              כמה מקומות פנויים כדאי להשאיר בשולחנות?
            </h2>
            <Lead>
              אין מספר קבוע שמתאים לכל אירוע. אפשר לתכנן מספר שולחנות עם גמישות מסוימת, בהתאם
              לקיבולת ולמדיניות האולם — אבל לא כל מקום פנוי הוא מקום רזרבה שניתן להשתמש בו בלי עלות
              או תיאום.
            </Lead>
            <Prose>
              <p>
                למשל, באירוע עם שולחנות של עשרה מקומות, ייתכן שחלק מהשולחנות ישובצו בתשעה אנשים
                וחלק בעשרה, לפי מבנה הקבוצות.
              </p>
              <p className="font-bold text-[#2C241C]">חשוב להבדיל בין:</p>
            </Prose>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                "מקום פנוי בשולחן שכבר נפתח",
                "מקום רזרבה שאפשר להפעיל",
                "שולחן רזרבה שלם",
                "מקום שהאולם טרם התחייב לספק",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-bold text-[#3F3025]"
                >
                  {item}
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-xl font-black text-[#2C241C]">מה כדאי לשאול את האולם?</h3>
            <ul className="mt-4 space-y-2">
              {VENUE_QUESTIONS.map((q) => (
                <li
                  key={q}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold leading-7 text-[#5C4A3A]"
                >
                  {q}
                </li>
              ))}
            </ul>
          </section>

          {/* 8 Example 300 */}
          <section id="example-300" className="scroll-mt-24" aria-labelledby="ex-h">
            <Eyebrow>דוגמה מעשית</Eyebrow>
            <h2 id="ex-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מסדרים הושבה ל־300 מאשרי הגעה?
            </h2>
            <Lead>
              נניח שיש 300 מאשרי הגעה ושולחנות בקיבולת מאושרת של עשרה אנשים. אין אפשרות אחת
              שמתאימה לכולם — ההחלטה לפי האולם, ההסכם, התקציב וההרכב החברתי.
            </Lead>
            <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <table className="w-full min-w-[560px] text-right text-sm">
                <caption className="sr-only">
                  השוואת אפשרויות הושבה ל־300 מאשרי הגעה
                </caption>
                <thead className="bg-[#FFF8EA] text-[#8A642E]">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-black">
                      אפשרות
                    </th>
                    <th scope="col" className="px-5 py-3 font-black">
                      חישוב
                    </th>
                    <th scope="col" className="px-5 py-3 font-black">
                      יתרון
                    </th>
                    <th scope="col" className="px-5 py-3 font-black">
                      חיסרון
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#5C4A3A]">
                  <tr className="border-t border-[#EFE2CC]">
                    <td className="px-5 py-3.5 font-black text-[#2C241C]">א׳ — 30 מלאים</td>
                    <td className="px-5 py-3.5 tabular-nums">30 × 10 = 300</td>
                    <td className="px-5 py-3.5">כל המאשרים בקיבולת רגילה</td>
                    <td className="px-5 py-3.5">אין מקום פנוי בשולחנות לתוספות</td>
                  </tr>
                  <tr className="border-t border-[#EFE2CC]">
                    <td className="px-5 py-3.5 font-black text-[#2C241C]">ב׳ — 34 גמישים</td>
                    <td className="px-5 py-3.5">
                      28×9 + 6×8 = 300
                      <br />
                      <span className="text-xs">קיבולת 340</span>
                    </td>
                    <td className="px-5 py-3.5">גמישות רבה יותר במיקום</td>
                    <td className="px-5 py-3.5">יותר שולחנות — השפעה על פריסה ועלות</td>
                  </tr>
                  <tr className="border-t border-[#EFE2CC]">
                    <td className="px-5 py-3.5 font-black text-[#2C241C]">ג׳ — רגילים + רזרבות</td>
                    <td className="px-5 py-3.5">לפי הסכם האולם</td>
                    <td className="px-5 py-3.5">שילוב קיבולת וגמישות מאושרת</td>
                    <td className="px-5 py-3.5">דורש תיאום מדויק של תנאים ועלויות</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-8">
              <SeatingMapIllustration />
            </div>
          </section>

          {/* 9 Groups */}
          <section id="groups" className="scroll-mt-24" aria-labelledby="groups-h">
            <Eyebrow>חלוקה חברתית</Eyebrow>
            <h2 id="groups-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מחלקים משפחות וחברים לשולחנות?
            </h2>
            <Lead>
              מתחילים בחלוקה לקבוצות טבעיות, ואז בודקים אילו קבוצות אפשר לשלב יחד. הושבה טובה אינה
              רק פתרון מתמטי — היא משפיעה על האווירה ועל הנוחות של האורחים.
            </Lead>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {GROUPS.map((g) => (
                <li
                  key={g}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-bold text-[#3F3025]"
                >
                  {g}
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-xl font-black text-[#2C241C]">עקרונות</h3>
            <ul className="mt-4 space-y-2">
              {GROUP_PRINCIPLES.map((p) => (
                <li
                  key={p}
                  className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold leading-7 text-[#5C4A3A]"
                >
                  {p}
                </li>
              ))}
            </ul>
            <h3 id="groups-kids" className="mt-8 scroll-mt-24 text-xl font-black text-[#2C241C]">
              איך מתכננים שולחנות לילדים?
            </h3>
            <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
              ילדים צעירים בדרך כלל יושבים עם ההורים. לפעמים מתאים שולחן ילדים או נוער נפרד
              לגילאים מתאימים, בתיאום עם ההורים ועם מדיניות האולם. חשוב לוודא נגישות להורים,
              בטיחות ומיקום נוח יחסית לשירותים ולרעש.
            </p>
            <h3 id="groups-access" className="mt-8 scroll-mt-24 text-xl font-black text-[#2C241C]">
              איך מתחשבים באורחים מבוגרים ובנגישות?
            </h3>
            <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
              שואלים מראש על צרכים מיוחדים: מרחק מהכניסה, קרבה לשירותים, הימנעות מרמקולים חזקים,
              מקום לכיסא גלגלים או מלווה. משבצים בהתאם במפה, לא רק במקום שנשאר פנוי.
            </p>
            <h3 id="groups-solo" className="mt-8 scroll-mt-24 text-xl font-black text-[#2C241C]">
              איך מושיבים אורחים שמגיעים לבד?
            </h3>
            <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
              נמנעים מהשארת אורח בודד בשולחן שבו אינו מכיר איש. מחברים אותו לקבוצה שיש לה נקודת
              מגע משותפת — חברים משותפים, קרובי משפחה רחוקים או קולגות — או לשולחן עם אנשים
              פתוחים ודומים בגיל או בהקשר.
            </p>
          </section>

          {/* 10 No reply */}
          <section id="no-reply" className="scroll-mt-24" aria-labelledby="noreply-h">
            <Eyebrow>מעקב</Eyebrow>
            <h2 id="noreply-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם משבצים לשולחן אורחים שלא אישרו הגעה?
            </h2>
            <Lead>
              יש להפריד בין מי שאישרו, מי שסירבו ומי שטרם השיבו. אורח שלא ענה אינו בהכרח אורח שלא
              יגיע — אין להחשיב אותו אוטומטית כלא מגיע.
            </Lead>
            <Prose>
              <p>
                מומלץ לבצע מעקב מסודר, להשלים פניות בהתאם לצורך ולברר את התשובה לפני סגירת ההושבה.
                אם עדיין קיימים אורחים ללא תשובה, יש להחליט עם האולם ועם הגורם שמנהל את ההושבה כיצד
                להיערך לאפשרות שיגיעו.
              </p>
              <p>
                להרחבה:{" "}
                <Link
                  href="/info/guides/guests-who-dont-reply"
                  className="font-black text-[#8A642E] underline-offset-4 hover:underline"
                >
                  מדריך אורחים שלא עונים
                </Link>
                {" · "}
                <Link
                  href="/rsvp/calls"
                  className="font-black text-[#8A642E] underline-offset-4 hover:underline"
                >
                  שיחות מוקלטות ומוקד אנושי
                </Link>
              </p>
            </Prose>
          </section>

          {/* 11 Cancellations */}
          <section id="cancellations" className="scroll-mt-24" aria-labelledby="cancel-h">
            <Eyebrow>שינויים</Eyebrow>
            <h2 id="cancel-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מעדכנים הושבה כשאורחים מבטלים?
            </h2>
            <Lead>
              כאשר אורח מבטל, מעדכנים את רשימת המוזמנים ואת תוכנית ההושבה. ביטול הגעה לא בהכרח מבטל
              התחייבות כספית שכבר נמסרה לאולם.
            </Lead>
            <Prose>
              <p>אפשר לבדוק האם נכון:</p>
            </Prose>
            <ul className="mt-4 space-y-2">
              {[
                "להשאיר את המקום פנוי",
                "לאחד קבוצות",
                "להעביר אורח משולחן אחר",
                "לצמצם שולחן בהתאם להסכם ולמועד השינוי",
                "לעדכן את האולם ואת צוות ההושבה",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#5C4A3A]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 12 Unexpected */}
          <section id="unexpected" className="scroll-mt-24" aria-labelledby="unexp-h">
            <Eyebrow>יום האירוע</Eyebrow>
            <h2 id="unexp-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה קורה אם אורחים מגיעים בלי אישור או עם מלווה נוסף?
            </h2>
            <Lead>
              מכינים תוכנית ברורה מראש: מי בודק, מי משנה שיבוץ, היכן הרזרבות ומי מאשר הפעלה. לא
              מניחים שתמיד אפשר להוסיף כיסא או לפתוח שולחן חדש.
            </Lead>
            <ol className="mt-6 space-y-3">
              {UNEXPECTED_PLAN.map((item, i) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-[20px] border border-[#EADDC8] bg-white px-4 py-3.5 text-[15px] font-semibold leading-7 text-[#3F3025]"
                >
                  <span className="font-black tabular-nums text-[#C7A56B]">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 13 Reserves vs meals */}
          <section id="reserves-vs-meals" className="scroll-mt-24" aria-labelledby="res-h">
            <Eyebrow>הבחנה חשובה</Eyebrow>
            <h2 id="res-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה ההבדל בין סידורי הושבה לרזרבות באולם?
            </h2>
            <Lead>
              סידורי הושבה קובעים היכן האורחים ישבו. מנות רזרבה הן חלק מההסדר המסחרי והתפעולי מול
              האולם. מקום פיזי פנוי אינו מעיד בהכרח על מנה שהוזמנה, ומנה נוספת אינה מבטיחה שיש מקום
              ישיבה מתאים.
            </Lead>
            <Prose>
              <p>יש לתאם בין שני הדברים בהסכם ובתכנון.</p>
              <p>
                להרחבה על התחייבות למנות ורזרבות:{" "}
                <Link
                  href="/info/guides/wedding-venue-guest-guarantee"
                  className="font-black text-[#8A642E] underline-offset-4 hover:underline"
                >
                  כמה אורחים כדאי להתחייב לאולם?
                </Link>
              </p>
            </Prose>
          </section>

          {/* 14 Digital */}
          <section id="digital" className="scroll-mt-24" aria-labelledby="digital-h">
            <Eyebrow>Invistimo</Eyebrow>
            <h2 id="digital-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מנהלים סידורי הושבה בצורה מסודרת?
            </h2>
            <Lead>
              מערכת דיגיטלית מאפשרת לנהל את השיבוץ לצד רשימת המוזמנים, לעקוב אחר מספר המשובצים בכל
              שולחן ולזהות שולחנות מלאים או מקומות פנויים — במקום להעביר רשימות ידניות בין כלים.
            </Lead>
            <Prose>
              <p>
                ב־Invistimo קיימת מערכת סידורי הושבה המשולבת עם רשימת המוזמנים ואישורי ההגעה.
                בהתאם לחבילה וליכולות הזמינות, ניתן לשלב גם שירותי LIVE לניהול ההגעה ביום האירוע.
                הושבה דיגיטלית היא תוספת במחשבון החבילות; LIVE וצוות תלויים במה שסוכם.
              </p>
            </Prose>
            <div className="mt-8 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white shadow-[0_18px_40px_rgba(58,39,20,0.08)]">
              <Image
                src="/images/seating/seating-map.png"
                alt="צילום מסך של מפת סידורי הושבה ב־Invistimo עם שולחנות, קיבולת ומקומות פנויים"
                width={1400}
                height={900}
                className="h-auto w-full object-cover object-top"
                sizes="(max-width:1024px) 100vw, 720px"
              />
              <p className="border-t border-[#EFE2CC] px-5 py-3 text-sm font-semibold text-[#7A6042]">
                מפת הושבה במערכת Invistimo — המחשה מהמוצר (לא נתוני לקוח)
              </p>
            </div>
            <div className="mt-6 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white shadow-[0_18px_40px_rgba(58,39,20,0.08)]">
              <Image
                src="/images/seating/seating-assign.png"
                alt="צילום מסך של שיבוץ אורחים לשולחנות ב־Invistimo עם רשימת אורחים שטרם שובצו"
                width={1200}
                height={900}
                className="h-auto w-full object-cover object-top"
                sizes="(max-width:1024px) 100vw, 720px"
              />
              <p className="border-t border-[#EFE2CC] px-5 py-3 text-sm font-semibold text-[#7A6042]">
                שיבוץ אורחים ורשימת מי שטרם שובץ
              </p>
            </div>
            <div className="mt-8">
              <OccupancyDemoCards />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink
                href="/seating-explained"
                className={ctaPrimary}
                location={`digital_service:${PATH}`}
              >
                הכירו את מערכת סידורי ההושבה
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/info/guides/seating-plan"
                className={ctaSecondary}
                location={`digital_howto:${PATH}`}
              >
                רוצים להכין את מפת ההושבה בעצמכם? למדריך המעשי
              </TrackedCtaLink>
            </div>
          </section>

          {/* 15 Calculator */}
          <section id="calculator" className="scroll-mt-24" aria-labelledby="calc-h">
            <Eyebrow>כלי מעשי</Eyebrow>
            <h2 id="calc-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מחשבון הושבה — קיבולת מול מאשרים
            </h2>
            <Prose>
              <p>
                הזינו את מספר מאשרי ההגעה, מספר השולחנות, הקיבולת לרזרבות שאושרו. המחשבון מציג גם
                תרחיש אי־הגעה — ומזהיר אם התרחיש «מסתיר» מחסור בקיבולת מול כל המאשרים.
              </p>
            </Prose>
            <div className="mt-8">
              <SeatingCalculator />
            </div>
          </section>

          {/* 16 Mistakes */}
          <section id="mistakes" className="scroll-mt-24" aria-labelledby="mistakes-h">
            <Eyebrow>טעויות נפוצות</Eyebrow>
            <h2 id="mistakes-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              10 טעויות שכדאי להימנע מהן
            </h2>
            <ul className="mt-8 grid gap-3 md:grid-cols-2">
              {MISTAKES.map((item, i) => (
                <li
                  key={item}
                  className="rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5 text-[15px] font-bold leading-7 text-[#2C241C]"
                >
                  <span className="ml-2 text-[#8A642E]">{String(i + 1).padStart(2, "0")}</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 17 Checklist */}
          <section id="checklist" className="scroll-mt-24" aria-labelledby="check-h">
            <Eyebrow>לפני שסוגרים</Eyebrow>
            <h2 id="check-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              רשימת בדיקה לפני שסוגרים את ההושבה
            </h2>
            <div className="mt-8">
              <InteractiveChecklist
                id="seating-checklist"
                storageKey="invistimo-wedding-seating-checklist-v1"
                title="צ׳קליסט סידורי הושבה"
                items={[...CHECKLIST]}
              />
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="scroll-mt-24" aria-labelledby="faq-h">
            <Eyebrow>שאלות נפוצות</Eyebrow>
            <h2 id="faq-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שאלות על סידורי הושבה, שולחנות ומאשרים
            </h2>
            <div className="mt-8 space-y-3">
              {WEDDING_SEATING_FAQS.map((item) => (
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
              מתכננים את ההושבה? כדאי שכל הנתונים יהיו במקום אחד
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              עם מערכת סידורי ההושבה של Invistimo תוכלו לנהל את רשימת המוזמנים, לעקוב אחר אישורי
              ההגעה ולבנות את מפת השולחנות בצורה מסודרת — לראות שיבוצים, לזהות מקומות פנויים ולעדכן
              בהתאם לשינויים.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink
                href="/seating-explained"
                className={ctaPrimary}
                location={`footer_seating:${PATH}`}
              >
                הכירו את מערכת סידורי ההושבה
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/pricing"
                className={ctaSecondary}
                location={`footer_pricing:${PATH}`}
              >
                צפו בחבילות ובמחירים
              </TrackedCtaLink>
            </div>
            <nav aria-label="מדריכים קשורים" className="mt-8 flex flex-wrap gap-3 text-sm">
              {[
                {
                  href: "/info/guides/seating-plan",
                  label: "מדריך מעשי לבניית סידורי הושבה",
                },
                {
                  href: "/info/guides/seating-cards-vs-qr",
                  label: "פתקיות הושבה או QR דיגיטלי",
                },
                { href: "/info/guides/wedding-venue-guest-guarantee", label: "התחייבות למנות ורזרבות" },
                { href: "/info/guides/guest-list", label: "רשימת מוזמנים" },
                { href: "/info/guides/wedding-planning", label: "תכנון חתונה" },
                { href: "/rsvp/chatuna", label: "אישורי הגעה" },
                { href: "/rsvp/calls", label: "שיחות אישורי הגעה" },
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
