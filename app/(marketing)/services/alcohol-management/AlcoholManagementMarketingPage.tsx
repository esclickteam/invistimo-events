"use client";

import Image from "next/image";
import Link from "next/link";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import AlcoholQuoteForm from "./QuoteForm";
import {
  ALCOHOL_MGMT_FAQS,
  COMPARE_ROWS,
  EXAMPLE_ALLOCATION,
  FAQ_TOPICS,
  HOW_STEPS,
  LINKS,
  MEDIA,
  PRICING_FACTORS,
  RETURN_CHECKS,
  STAFF_POINTS,
  WHY_POINTS,
} from "./content";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-alcohol-display",
});

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function Section({
  id,
  tone = "cream",
  children,
}: {
  id?: string;
  tone?: "cream" | "ivory" | "dark" | "white";
  children: React.ReactNode;
}) {
  const tones = {
    cream: "bg-[#F7EDDF] text-[#2C241C]",
    ivory: "bg-[#FBF6EE] text-[#2C241C]",
    white: "bg-[#FFFDF8] text-[#2C241C]",
    dark: "bg-[#1A1410] text-[#F7EDDF]",
  } as const;
  return (
    <section id={id} className={tones[tone]}>
      <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">{children}</div>
    </section>
  );
}

function Cta({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-gradient-to-l from-[#1A1410] via-[#3A2B22] to-[#5A4333] !text-white"
      : "border border-[#E6D2AA] bg-[#FFF8EA] !text-[#2C241C] hover:bg-white";
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 text-[15px] font-black transition hover:-translate-y-0.5 ${styles}`}
    >
      {children}
    </Link>
  );
}

function FaqBlock() {
  const byId = Object.fromEntries(ALCOHOL_MGMT_FAQS.map((f) => [f.id, f]));
  return (
    <div className="space-y-10">
      {FAQ_TOPICS.map((topic) => (
        <div key={topic.id}>
          <h3 className={`mb-4 text-2xl text-[#2C241C] ${display.className}`}>{topic.title}</h3>
          <div className="divide-y divide-[#E8D9C2] rounded-[24px] border border-[#E8D9C2] bg-white/85">
            {topic.ids.map((id, i) => {
              const faq = byId[id];
              if (!faq) return null;
              return (
                <details key={faq.id} className="group px-5 py-4 md:px-6" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-right marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="text-base font-bold text-[#2C241C] md:text-lg">{faq.q}</span>
                    <span className="mt-1 text-[#8A642E]" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#5C4A3A]">{faq.a}</p>
                </details>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AlcoholManagementMarketingPage() {
  const reduce = useReducedMotion();

  return (
    <div dir="rtl" className={`${display.variable} min-h-screen overflow-x-hidden bg-[#FFFDF8] text-[#2C241C]`}>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-[#EAD9BE]/70">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#E8D2A8_0%,transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F3E8D7_100%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-24 md:pt-14">
          <motion.div
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={fade}
            transition={{ duration: 0.55 }}
          >
            <p className="text-xs font-black tracking-[0.2em] text-[#8A642E]">ניהול אלכוהול לאירועים</p>
            <h1 className={`mt-4 text-[2.2rem] leading-[1.15] text-[#1A1410] md:text-5xl md:leading-[1.12] ${display.className}`}>
              ניהול אלכוהול לאירועים — אנשי צוות ומעקב ממוחשב אחרי כל בקבוק
            </h1>
            <p className="mt-5 text-xl font-semibold text-[#5C4324] md:text-2xl">
              אתם דואגים לחגיגה. אנחנו דואגים שתדעו כמה אלכוהול הגיע, לאן כל בקבוק הוקצה, מה נפתח ומה נשאר
              סגור.
            </p>
            <p className="mt-5 max-w-xl text-[16px] leading-8 text-[#5C4A3A]">
              השקעתם לא מעט כסף באלכוהול לאירוע שלכם. אבל האם אתם באמת יודעים כמה בקבוקים נפתחו במהלך
              הערב? כמה נשארו סגורים? וכמה הועברו לבר או לשולחנות? שירות ניהול האלכוהול של Invistimo
              משלב אנשי צוות ייעודיים עם מערכת ממוחשבת לניהול מלאי בזמן האירוע.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Cta href={LINKS.quote} variant="primary">
                לקבלת הצעת מחיר לניהול אלכוהול
              </Cta>
              <Cta href={LINKS.how} variant="secondary">
                איך עובד ניהול האלכוהול?
              </Cta>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="relative"
          >
            <div className="absolute -inset-6 -z-10 rounded-full bg-[#E8D2A8]/35 blur-3xl" />
            <div className="overflow-hidden rounded-[28px] border border-[#E4D3B6] shadow-[0_28px_60px_rgba(26,20,16,0.18)]">
              <Image
                src={MEDIA.hero}
                alt="בר אירועים יוקרתי עם בקבוקים מסודרים"
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why */}
      <Section tone="ivory">
        <h2 className={`max-w-3xl text-3xl leading-tight md:text-4xl ${display.className}`}>
          קניתם אלכוהול לאירוע. מי מנהל אותו בזמן שאתם חוגגים?
        </h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[16px] leading-8 text-[#5C4A3A]">
          <p>
            כאשר רוכשים אלכוהול לחתונה או לאירוע גדול, לא מספיק לדעת כמה בקבוקים נקנו. חשוב גם לדעת מה
            קרה איתם במהלך הערב.
          </p>
          <p>
            בקבוקים יכולים להיות מוקצים לבר המרכזי, לשולחנות, לעמדות שירות נוספות או להישאר במחסן
            כרזרבה. ללא מעקב מסודר, קשה יותר לדעת כמה בקבוקים באמת נפתחו, אילו נשארו סגורים ומה נותר
            בסיום האירוע.
          </p>
          <p className="font-semibold text-[#2C241C]">
            ניהול ממוחשב עם אנשי צוות מאפשר לתעד את התנועות במקום אחד וליצור תמונת מצב ברורה — בלי
            להבטיח מניעת גניבות או חיסכון כספי מובטח.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_POINTS.map((p) => (
            <div key={p.title} className="rounded-[22px] border border-[#E8D9C2] bg-white/90 px-5 py-6">
              <h3 className={`text-xl text-[#1A1410] ${display.className}`}>{p.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 overflow-hidden rounded-[28px] border border-[#E4D3B6]">
          <Image
            src={MEDIA.staff}
            alt="איש צוות סופר בקבוקי אלכוהול סגורים לפני תחילת האירוע"
            width={1400}
            height={900}
            className="h-auto w-full object-cover"
          />
        </div>
      </Section>

      {/* How */}
      <Section id="how-it-works" tone="cream">
        <h2 className={`text-3xl leading-tight md:text-4xl ${display.className}`}>
          איך השירות עובד בפועל?
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          התהליך בנוי סביב חמש פעולות ברורות. כל שלב מתבצע על ידי אנשי הצוות ומתועד במערכת לפי מה
          שנרשם בפועל.
        </p>
        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {HOW_STEPS.map((s) => (
            <li key={s.n} className="rounded-[22px] border border-[#E4D3B6] bg-white/90 px-5 py-6">
              <p className="text-xs font-black tracking-[0.18em] text-[#8A642E]">{s.n}</p>
              <h3 className={`mt-2 text-xl text-[#1A1410] ${display.className}`}>{s.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-2">
          <div>
            <h3 className={`text-2xl text-[#1A1410] ${display.className}`}>
              כל בקבוק יודע לאן הוא שייך
            </h3>
            <p className="mt-4 text-[15px] leading-7 text-[#5C4A3A]">
              {EXAMPLE_ALLOCATION.caption}. מתוך {EXAMPLE_ALLOCATION.total} בקבוקי{" "}
              {EXAMPLE_ALLOCATION.product}:
            </p>
            <ul className="mt-5 space-y-3">
              {EXAMPLE_ALLOCATION.rows.map((row) => (
                <li
                  key={row.location}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-[#E8D9C2] bg-[#FFFDF8] px-4 py-3"
                >
                  <div>
                    <p className="font-bold text-[#2C241C]">{row.location}</p>
                    <p className="text-xs text-[#8A6B45]">{row.note}</p>
                  </div>
                  <p className="text-lg font-black tabular-nums text-[#8A642E]">{row.qty}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold text-[#5C4324]">
              חשוב: הקצאת בקבוק אינה נחשבת לפתיחת בקבוק.
            </p>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-[#E4D3B6]">
            <Image
              src={MEDIA.bottles}
              alt="בקבוקי אלכוהול מסודרים לתכנון בר באירוע"
              width={1200}
              height={900}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </Section>

      {/* Staff */}
      <Section tone="dark">
        <p className="text-xs font-black tracking-[0.18em] text-[#E8C98A]">אנשי צוות הם חלק מהשירות</p>
        <h2 className={`mt-3 max-w-3xl text-3xl leading-tight text-[#F7EDDF] md:text-4xl ${display.className}`}>
          ניהול אלכוהול עם צוות פיזי — לא רק גישה לתוכנה
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#E8D9C2]">
          הצוות אחראי לתפעול המעקב הממוחשב לפי היקף השירות שסוכם. אנשי צוות ניהול האלכוהול אינם בהכרח
          ברמנים או מלצרים, ושירות מזיגה אינו כלול אלא אם הוגדר במפורש.
        </p>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {STAFF_POINTS.map((item) => (
            <li
              key={item}
              className="rounded-[18px] border border-white/10 bg-white/5 px-5 py-4 text-[15px] leading-7 text-[#F7EDDF]"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {/* Pricing */}
      <Section id="pricing" tone="white">
        <h2 className={`text-3xl leading-tight md:text-4xl ${display.className}`}>
          כמה עולה שירות ניהול אלכוהול באירוע?
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          כל אירוע שונה, ולכן גם היקף ניהול האלכוהול משתנה. באירוע קטן עם בר אחד נדרש מערך עבודה שונה
          מאירוע גדול עם כמה ברים, שולחנות רבים ומאות בקבוקים. ב־Invistimo מספר אנשי הצוות והמחיר
          נקבעים בהתאם לגודל האירוע, כמות המשתתפים והיקף השירות הנדרש.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {PRICING_FACTORS.map((f) => (
            <li key={f} className="rounded-2xl border border-[#E6D2AA] bg-[#FFF8EA]/70 px-4 py-3 text-sm font-bold text-[#5E4735]">
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Cta href={LINKS.quote} variant="primary">
            לקבלת הצעת מחיר מותאמת לאירוע
          </Cta>
        </div>
      </Section>

      {/* Quote */}
      <Section id="quote" tone="cream">
        <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h2 className={`text-3xl leading-tight md:text-4xl ${display.className}`}>
              בקשת הצעת מחיר לניהול אלכוהול
            </h2>
            <p className="mt-4 text-[16px] leading-8 text-[#5C4A3A]">
              מלאו את הפרטים הידועים לכם. אחרי שנבין את היקף האירוע — נחזור עם הצעה מותאמת.
            </p>
            <div className="mt-8 overflow-hidden rounded-[24px] border border-[#E4D3B6]">
              <Image
                src={MEDIA.weddingBar}
                alt="בר חתונה מוכן לאירוע"
                width={1000}
                height={700}
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
          <div className="rounded-[28px] border border-[#E6D2AA] bg-white/90 p-5 md:p-7">
            <AlcoholQuoteForm />
          </div>
        </div>
      </Section>

      {/* Returns + buy vs venue */}
      <Section tone="ivory">
        <h2 className={`text-3xl leading-tight md:text-4xl ${display.className}`}>
          מה עושים עם הבקבוקים שנשארו סגורים?
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          לפני שרוכשים אלכוהול לאירוע, כדאי לבדוק עם החנות או הספק אם ניתן להחזיר בקבוקים שלא נפתחו.
          ניהול מלאי מסודר יכול לעזור לזהות בסיום כמה בקבוקים נותרו סגורים — אבל עצם העובדה שבקבוק נשאר
          סגור אינה מבטיחה שהספק יקבל אותו בחזרה.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {RETURN_CHECKS.map((c) => (
            <li key={c} className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-sm font-bold text-[#5E4735]">
              {c}
            </li>
          ))}
        </ul>

        <h2 className={`mt-16 text-3xl leading-tight md:text-4xl ${display.className}`}>
          לקנות אלכוהול לבד או לקחת דרך האולם?
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          לפני שמחליטים מאיפה להזמין אלכוהול, כדאי לבדוק את העלות הכוללת ולא רק את מחיר הבקבוק. אין
          תשובה אחת שמתאימה לכל אירוע — ואין להניח שקנייה עצמאית תמיד זולה יותר.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {COMPARE_ROWS.map((col) => (
            <div key={col.title} className="rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-6">
              <h3 className={`text-xl text-[#1A1410] ${display.className}`}>{col.title}</h3>
              <ul className="mt-4 space-y-2 text-[15px] leading-7 text-[#5C4A3A]">
                {col.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 text-[15px] text-[#5C4A3A]">
          עוד לא החלטתם כמה בקבוקים לקנות?{" "}
          <Link href={LINKS.calculator} className="font-black text-[#8A642E] underline-offset-4 hover:underline">
            עברו למחשבון האלכוהול
          </Link>
          .
        </p>
      </Section>

      {/* FAQ */}
      <Section id="faq" tone="white">
        <h2 className={`text-3xl leading-tight md:text-4xl ${display.className}`}>
          שאלות נפוצות על ניהול אלכוהול באירועים
        </h2>
        <p className="mt-4 max-w-2xl text-[16px] leading-8 text-[#5C4A3A]">
          תשובות לפי מה שהשירות והמערכת מאפשרים בפועל — בלי הבטחות על חיסכון או זיהוי אוטומטי של שתייה.
        </p>
        <div className="mt-10">
          <FaqBlock />
        </div>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href={LINKS.calculator} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            מחשבון אלכוהול לחתונה
          </Link>
          <Link href={LINKS.chatuna} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            אישורי הגעה לחתונה
          </Link>
          <Link href={LINKS.seating} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            סידורי הושבה
          </Link>
          <Link href={LINKS.guides} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
            מרכז המדריכים
          </Link>
        </div>
      </Section>

      {/* Final CTA */}
      <Section tone="dark">
        <h2 className={`max-w-3xl text-3xl leading-tight text-[#F7EDDF] md:text-4xl ${display.className}`}>
          כבר יודעים כמה אלכוהול לקנות? עכשיו צריך גם לנהל אותו נכון
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#E8D9C2]">
          המחשבון עוזר לתכנן כמויות לפני האירוע. שירות ניהול האלכוהול של Invistimo מסייע לעקוב אחר
          הבקבוקים בפועל ביום האירוע, באמצעות אנשי צוות ומערכת ממוחשבת.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Cta href={LINKS.quote} variant="primary">
            לשירות ניהול אלכוהול באירועים
          </Cta>
          <Cta href={LINKS.calculator} variant="secondary">
            למחשבון האלכוהול
          </Cta>
        </div>
      </Section>
    </div>
  );
}
