"use client";

import Image from "next/image";
import Link from "next/link";
import { Frank_Ruhl_Libre } from "next/font/google";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { ALCOHOL_SERVICE_FAQS } from "./guideFaqs";
import QuoteForm from "./QuoteForm";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const PATH = "/services/alcohol-management";
const CALC = "/info/guides/wedding-alcohol-calculator";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(58,39,20,0.3)]";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition duration-300 hover:bg-white hover:border-[#C9A45C]";
const heroPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[#F7E6C4] px-8 py-3.5 text-base font-black text-[#2C211B] shadow-[0_14px_36px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#FFE9C2]";
const heroSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-8 py-3.5 text-base font-black text-[#FFF8EF] backdrop-blur-md transition duration-300 hover:bg-white/18 hover:border-[#E6D2AA]";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

const HERO_POINTS = [
  {
    title: "צוות ייעודי לאירוע",
    body: "ניהול האלכוהול בזמן אמת.",
  },
  {
    title: "מעקב אחר בקבוקים",
    body: "תיעוד פתיחה ושימוש בהתאם לתהליך השירות.",
  },
  {
    title: "התאמה לגודל האירוע",
    body: "מספר אנשי הצוות והמחיר נקבעים בהתאם לצורכי האירוע.",
  },
] as const;

const BENEFITS = [
  "תיעוד המלאי בתחילת האירוע",
  "מעקב אחרי הקצאות לבר ולשולחנות",
  "רישום פתיחת בקבוקים",
  "הפרדה בין בקבוקים סגורים לפתוחים",
  "מעקב אחרי מלאי הרזרבה",
  "תמונת מצב מעודכנת במהלך האירוע",
  "דוח סיכום בסיום",
  "זיהוי בקבוקים סגורים שנותרו לבדיקה מול הספק",
] as const;

const FLOW = [
  {
    title: "לפני שהאירוע מתחיל, יודעים בדיוק מה יש",
    body: "אנשי הצוות מבצעים ספירה מסודרת של הבקבוקים שהגיעו וקולטים למערכת מותג, דגם, נפח, כמות ומיקום אחסון. בסיום מתקבל מלאי פתיחה.",
  },
  {
    title: "כל בקבוק יודע לאן הוא שייך",
    body: "אפשר להקצות לבר מרכזי, בר נוסף, שולחן, VIP, קבלת פנים, מחסן או מיקום מותאם. הקצאה אינה נחשבת לפתיחה — בקבוק יכול להיות מוקצה ועדיין סגור.",
  },
  {
    title: "פותחים בקבוק חדש? מעדכנים במערכת",
    body: "כשנדרש בקבוק חדש, איש הצוות מתעד סוג, מותג, נפח, מיקום, שעה ומבצע הפעולה. מלאי הסגורים קטן ומספר הפתוחים גדל. בקבוק פתוח ובקבוק ריק אינם אותו מצב.",
  },
  {
    title: "לא כל הבקבוקים חייבים להיות בחוץ",
    body: "יתרת הבקבוקים יכולה להישאר סגורה ברזרבה. כשצריך — מעבירים למיקום ומתועדים. רק בפתיחה הבקבוק מסומן כפתוח.",
  },
  {
    title: "בסוף האירוע יודעים מה נשאר",
    body: "דוח סיכום לפי מלאי פתיחה, הקצאות, פתיחות, ריקים שדווחו, סגורים שנותרו והעברות — על בסיס פעולות וספירות שבוצעו בפועל.",
  },
] as const;

const STAFF_DUTIES = [
  "ספירת מלאי פתיחה",
  "קליטת הבקבוקים למערכת",
  "הקצאה לברים ולשולחנות",
  "ניהול מלאי הרזרבה",
  "תיעוד פתיחת בקבוקים",
  "מעקב אחר העברות",
  "ספירות ביניים לפי הצורך",
  "ספירת סיום והפקת דוח",
] as const;

const BUY_VS_VENUE = [
  {
    title: "רכישה עצמאית — לבדוק גם",
    items: [
      "מחיר הקנייה",
      "הובלה",
      "דמי מזיגה",
      "אחסון וקירור",
      "מדיניות החזרת סגורים",
      "האם שירותי בר כלולים",
    ],
  },
  {
    title: "אלכוהול מהאולם — לבדוק גם",
    items: [
      "אילו מותגים כלולים",
      "הגבלת כמויות",
      "תוספת למותגים",
      "מזיגה וברמנים",
      "מע״מ",
      "התחייבות מינימום",
    ],
  },
] as const;

export default function AlcoholManagementService() {
  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes alcohol-hero-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes alcohol-hero-zoom {
          from { transform: scale(1.08); }
          to { transform: scale(1); }
        }
        .alcohol-hero-copy { animation: alcohol-hero-fade-up 0.85s ease-out both; }
        .alcohol-hero-copy-delay { animation: alcohol-hero-fade-up 0.85s ease-out 0.12s both; }
        .alcohol-hero-copy-delay-2 { animation: alcohol-hero-fade-up 0.85s ease-out 0.24s both; }
        .alcohol-hero-point { animation: alcohol-hero-fade-up 0.7s ease-out both; }
        .alcohol-hero-point:nth-child(1) { animation-delay: 0.32s; }
        .alcohol-hero-point:nth-child(2) { animation-delay: 0.44s; }
        .alcohol-hero-point:nth-child(3) { animation-delay: 0.56s; }
        .alcohol-hero-bg-zoom { animation: alcohol-hero-zoom 18s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .alcohol-hero-copy,
          .alcohol-hero-copy-delay,
          .alcohol-hero-copy-delay-2,
          .alcohol-hero-point,
          .alcohol-hero-bg-zoom { animation: none !important; }
        }
      `,
        }}
      />

      <header className="relative isolate min-h-[min(92vh,900px)] overflow-hidden bg-[#1A120E]">
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            src="/images/rsvp/guides/alcohol/service/hero-event-bar.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="alcohol-hero-bg-zoom object-cover object-[center_35%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(28,18,12,0.88)_0%,rgba(28,18,12,0.72)_38%,rgba(58,36,22,0.42)_68%,rgba(28,18,12,0.55)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(201,164,92,0.22),transparent_48%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#FBF6EE] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[min(92vh,900px)] max-w-6xl flex-col justify-end px-5 pb-10 pt-16 md:justify-center md:px-8 md:pb-16 md:pt-20">
          <div className="max-w-2xl">
            <div className="alcohol-hero-copy flex items-center gap-3">
              <span className="h-px w-8 bg-[#C9A45C]/80" aria-hidden />
              <p className="text-[11px] font-black tracking-[0.18em] text-[#E6D2AA] md:text-xs">
                INVISTIMO | ניהול בר ואלכוהול באירועים
              </p>
            </div>

            <h1
              className={`${display.className} alcohol-hero-copy-delay mt-5 max-w-[15ch] text-[2.35rem] font-semibold leading-[1.12] tracking-[-0.02em] text-[#FFF8EF] md:text-[3.35rem] lg:text-[3.75rem]`}
            >
              אתם חוגגים. אנחנו דואגים שהבר יעבוד כמו שצריך.
            </h1>

            <p className="alcohol-hero-copy-delay-2 mt-5 max-w-xl text-lg font-bold leading-8 text-[#F0E0C8] md:text-xl md:leading-9">
              ניהול אלכוהול מקצועי לאירועים — עם צוות ייעודי, מעקב אחר הבקבוקים ושליטה טובה יותר במה
              שנפתח, הוגש ונשאר.
            </p>

            <div className="alcohol-hero-copy-delay-2 mt-5 max-w-xl space-y-3 text-[15px] leading-7 text-[#E8D9C4] md:text-base md:leading-8">
              <p>השקעתם באלכוהול לאירוע שלכם. עכשיו חשוב לוודא שהוא מנוהל בצורה מסודרת לאורך הערב.</p>
              <p>
                עם צוות ניהול האלכוהול של Invistimo תוכלו לקבל תמונה ברורה יותר של השימוש בבקבוקים,
                לעקוב אחר המלאי ולצמצם חוסר סדר — בזמן שאתם מתרכזים בחגיגה.
              </p>
            </div>

            <div className="alcohol-hero-copy-delay-2 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="#quote" className={heroPrimary} location={`hero_quote:${PATH}`}>
                לקבלת הצעת מחיר לניהול אלכוהול
              </TrackedCtaLink>
              <TrackedCtaLink href="#how-it-works" className={heroSecondary} location={`hero_how:${PATH}`}>
                איך השירות עובד?
              </TrackedCtaLink>
            </div>
          </div>

          <ul className="mt-10 grid gap-3 border-t border-[#C9A45C]/35 pt-6 sm:grid-cols-3 md:mt-14">
            {HERO_POINTS.map((point) => (
              <li key={point.title} className="alcohol-hero-point min-w-0">
                <p className="text-sm font-black tracking-wide text-[#F7E6C4]">{point.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-[#D8CBB8] md:text-sm md:leading-6">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <span className="sr-only">
          בר אירוע פעיל עם מדפי בקבוקים ותאורת ערב חמה
        </span>
      </header>

      <section className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>למה זה חשוב</Eyebrow>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            קניתם אלכוהול לאירוע. מי מנהל אותו בזמן שאתם חוגגים?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>כאשר רוכשים אלכוהול לחתונה או לאירוע גדול, לא מספיק לדעת כמה בקבוקים נקנו.</p>
            <p>
              בקבוקים יכולים להיות מוקצים לבר המרכזי, לשולחנות, לעמדות שירות או להישאר במחסן כרזרבה.
              בלי מעקב מסודר קשה לדעת כמה נפתחו ומה נותר בסיום.
            </p>
            <p>
              ניהול ממוחשב עם אנשי צוות מאפשר לתעד את התנועות במקום אחד וליצור תמונת מצב ברורה.
            </p>
            <p className="rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-5 py-4 text-sm font-semibold text-[#5E4735]">
              השירות אינו מבטיח מניעת גניבות או חיסכון כספי מובטח — הוא מספק תיעוד ותמונת מצב לפי
              הפעולות שבוצעו.
            </p>
          </div>
          <ul className="mt-8 grid gap-2 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li
                key={b}
                className="rounded-2xl border border-[#E6D2AA] bg-white/85 px-4 py-3 text-sm font-semibold text-[#5E4735]"
              >
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>איך זה עובד</Eyebrow>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            חמישה שלבים לניהול מסודר ביום האירוע
          </h2>
          <ol className="mt-10 space-y-6">
            {FLOW.map((step, i) => (
              <li
                key={step.title}
                className="rounded-[28px] border border-[#E6D2AA] bg-white/90 p-5 md:p-6"
              >
                <p className="text-xs font-black tracking-[0.12em] text-[#C9A45C]">שלב {i + 1}</p>
                <h3 className="mt-2 text-xl font-black text-[#2C241C]">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#5C4A3A]">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm leading-6 text-[#8A6B45]">
            דוגמאות כמו «20 בקבוקי גריי גוס» הן להמחשה בלבד — לא נתוני אירוע אמיתי.
          </p>
        </div>
      </section>

      <section className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA]">
            <Image
              src="/images/rsvp/guides/alcohol/service/bottles-stock.jpg"
              alt="בקבוקי אלכוהול מסודרים במלאי"
              width={1200}
              height={800}
              className="h-auto w-full object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          </figure>
          <div>
            <Eyebrow>אנשי צוות</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              זה שירות עם אנשים באירוע — לא רק תוכנה
            </h2>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              ניהול האלכוהול של Invistimo כולל אנשי צוות פיזיים שמפעילים את המעקב הממוחשב לפי היקף
              השירות שסוכם. הם אינם בהכרח ברמנים או מלצרים — ושירות מזיגה אינו כלול אלא אם הוגדר
              במפורש.
            </p>
            <ul className="mt-6 grid gap-2">
              {STAFF_DUTIES.map((d) => (
                <li key={d} className="text-sm font-semibold text-[#5E4735]">
                  • {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>תמחור</Eyebrow>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            כמה עולה שירות ניהול אלכוהול באירוע?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>כל אירוע שונה, ולכן גם היקף ניהול האלכוהול משתנה.</p>
            <p>
              באירוע קטן עם בר אחד נדרש מערך עבודה שונה מאירוע גדול עם כמה ברים, שולחנות רבים ומאות
              בקבוקים.
            </p>
            <p>
              ב־Invistimo מספר אנשי הצוות והמחיר נקבעים בהתאם לגודל האירוע, כמות המשתתפים והיקף
              השירות הנדרש. אין מחיר קבוע בעמוד זה.
            </p>
          </div>
          <div className="mt-8">
            <TrackedCtaLink href="#quote" className={ctaPrimary} location={`pricing_quote:${PATH}`}>
              לקבלת הצעת מחיר מותאמת לאירוע
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      <section className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <QuoteForm />
        </div>
      </section>

      <section className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>החזרות</Eyebrow>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            מה עושים עם הבקבוקים שנשארו סגורים?
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              לפני שרוכשים אלכוהול לאירוע, כדאי לבדוק עם הספק אם ניתן להחזיר בקבוקים שלא נפתחו — ומה
              התנאים בכתב.
            </p>
            <p>
              ניהול מלאי מסודר יכול לעזור לזהות בסיום כמה בקבוקים נותרו סגורים. עצם העובדה שבקבוק
              נשאר סגור אינה מבטיחה שהספק יקבל אותו בחזרה.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>לפני הקנייה</Eyebrow>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            לקנות אלכוהול לבד או לקחת דרך האולם?
          </h2>
          <p className="mt-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
            כדאי לבדוק את העלות הכוללת — לא רק את מחיר הבקבוק. אין טענה שקנייה עצמאית תמיד זולה יותר.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {BUY_VS_VENUE.map((col) => (
              <div key={col.title} className="rounded-[24px] border border-[#E6D2AA] bg-white/90 p-5">
                <h3 className="text-lg font-black text-[#2C241C]">{col.title}</h3>
                <ul className="mt-3 space-y-2 text-sm font-semibold text-[#5E4735]">
                  {col.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#8A6B45]">
            לתכנון כמויות לפני האירוע:{" "}
            <Link href={CALC} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              מחשבון האלכוהול של Invistimo
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[#E6D2AA] bg-white/90 p-6 md:p-8">
          <h2 className="text-2xl font-black text-[#2C241C]">
            עוד לא החלטתם כמה בקבוקים לקנות?
          </h2>
          <p className="mt-3 text-base leading-7 text-[#5C4A3A]">
            עברו למחשבון האלכוהול כדי לתכנן כמויות ועלויות לפני האירוע.
          </p>
          <TrackedCtaLink href={CALC} className={`${ctaPrimary} mt-6`} location={`to_calc:${PATH}`}>
            למחשבון האלכוהול
          </TrackedCtaLink>
        </div>
      </section>

      <section className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
            שאלות על ניהול אלכוהול באירועים
          </h2>
          <div className="mt-8 space-y-3">
            {ALCOHOL_SERVICE_FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-[22px] border border-[#E6D2AA] bg-white/90 px-5 py-4"
              >
                <summary className="cursor-pointer list-none text-base font-black text-[#2C241C]">
                  <span className="flex items-start justify-between gap-3">
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

      <section className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-[#FFF8EF] md:text-4xl">
            רוצים הצעת מחיר לניהול אלכוהול באירוע שלכם?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            שלחו פרטים קצרים — ונתאים את היקף הצוות והשירות לאירוע.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="#quote" className={ctaPrimary} location={`footer_quote:${PATH}`}>
              להצעת מחיר
            </TrackedCtaLink>
            <TrackedCtaLink
              href={CALC}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`footer_calc:${PATH}`}
            >
              למחשבון האלכוהול
            </TrackedCtaLink>
          </div>
        </div>
      </section>
    </article>
  );
}
