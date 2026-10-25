"use client";

import Image from "next/image";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { ALCOHOL_SERVICE_FAQS } from "./guideFaqs";
import QuoteForm from "./QuoteForm";

const PATH = "/services/alcohol-management";
const CALC = "/info/guides/wedding-alcohol-calculator";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

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
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 md:gap-12 md:px-8 md:pb-16 md:pt-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">שירות · Invistimo</p>
            <h1 className="mt-3 max-w-2xl text-[1.75rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
              ניהול אלכוהול לאירועים — אנשי צוות ומעקב ממוחשב אחרי כל בקבוק
            </h1>
            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735]">
              אתם דואגים לחגיגה. אנחנו דואגים שתדעו כמה אלכוהול הגיע, לאן כל בקבוק הוקצה, מה נפתח ומה
              נשאר סגור.
            </p>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>השקעתם לא מעט כסף באלכוהול לאירוע שלכם.</p>
              <p>
                אבל האם אתם באמת יודעים כמה בקבוקים נפתחו במהלך הערב? כמה נשארו סגורים? וכמה הועברו
                לבר או לשולחנות?
              </p>
              <p>
                שירות ניהול האלכוהול של Invistimo משלב אנשי צוות ייעודיים עם מערכת ממוחשבת לניהול מלאי
                בזמן האירוע.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="#quote" className={ctaPrimary} location={`hero_quote:${PATH}`}>
                לקבלת הצעת מחיר לניהול אלכוהול
              </TrackedCtaLink>
              <TrackedCtaLink href="#how-it-works" className={ctaSecondary} location={`hero_how:${PATH}`}>
                איך עובד ניהול האלכוהול?
              </TrackedCtaLink>
            </div>
          </div>
          <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
            <Image
              src="/images/rsvp/guides/alcohol/service/event-bar.jpg"
              alt="בר אירוע יוקרתי עם כוסות ומשקאות"
              width={1280}
              height={720}
              className="h-auto w-full object-cover"
              priority
              sizes="(max-width:1024px) 100vw, 46vw"
            />
          </figure>
        </div>
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
