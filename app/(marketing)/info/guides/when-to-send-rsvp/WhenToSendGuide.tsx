"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import TimingCalculator from "./TimingCalculator";
import { WHEN_TO_SEND_FAQS } from "./guideFaqs";

const PATH = "/info/guides/when-to-send-rsvp";

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

function TimelineMotion() {
  const steps = ["Save the Date", "הזמנה", "אישורי הגעה", "תזכורת", "האירוע"];
  return (
    <div
      className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF8] to-[#F7EBD9] p-6 md:p-8"
      role="img"
      aria-label="אנימציה: ציר זמן Save the Date, הזמנה, אישורי הגעה, תזכורת והאירוע"
    >
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 md:gap-3">
            <motion.span
              initial={{ opacity: 0.4, scale: 0.92 }}
              animate={{ opacity: [0.45, 1, 0.45], scale: [0.95, 1, 0.95] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.55 }}
              className="rounded-full border border-[#C9A45C]/50 bg-white px-4 py-2 text-sm font-black text-[#2C241C]"
            >
              {s}
            </motion.span>
            {i < steps.length - 1 ? (
              <span className="hidden text-[#C9A45C] md:inline" aria-hidden>
                ←
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-sm leading-7 text-[#6D5B4A]">
        כל הודעה שונה במטרה שלה — לא אותו שלב ולא אותה בקשה מהאורח.
      </p>
    </div>
  );
}

export default function WhenToSendGuide() {
  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(201,164,92,0.2),transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_50%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:px-8 md:pb-20 md:pt-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך תזמון</p>
            <h1 className="mt-3 max-w-3xl text-[1.85rem] font-black leading-[1.15] tracking-[-0.03em] text-[#2C241C] md:text-5xl">
              מתי שולחים אישורי הגעה לחתונה ולאירועים? המדריך לתזמון נכון
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-bold leading-9 text-[#5E4735]">
              מוקדם מדי, האורחים עוד לא יודעים. מאוחר מדי, אתם כבר צריכים תשובות.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              אחד הדברים שהכי מעסיקים זוגות לפני חתונה הוא מתי להתחיל לאסוף אישורי הגעה. מצד אחד רוצים
              לדעת כמה אורחים יגיעו, ומצד שני לא רוצים לקבל תשובות מוקדמות שישתנו עד האירוע. התזמון
              הנכון תלוי בתאריך, בעונת השנה, בחגים, במיקום האירוע ובמועד שבו האולם מבקש לקבל את מספר
              המנות.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              במדריך הזה נעשה סדר: מתי שולחים Save the Date, מתי שולחים הזמנה, מתי מתחילים אישורי
              הגעה ואיך מתכננים את הסבבים כך שיישאר מספיק זמן לסגור את הפרטים.
            </p>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[32px] border border-[#E6D2AA] bg-white shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
              <Image
                src="/marketing/invites/invite-wedding-mia-alon.webp"
                alt="הזמנה דיגיטלית יוקרתית לצד תכנון לוח זמנים לאישורי הגעה"
                width={900}
                height={1100}
                className="h-auto w-full object-cover object-top"
                priority
              />
            </div>
          </div>
        </div>
      </header>

      {/* Timeline */}
      <section aria-labelledby="timeline" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>ציר זמן</Eyebrow>
          <h2 id="timeline" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            שלוש הודעות שונות. שלושה רגעים שונים.
          </h2>
          <div className="mt-10">
            <TimelineMotion />
          </div>
          <ol className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                when: "3–6 חודשים לפני",
                title: "Save the Date",
                body: "זו ההודעה שמבקשת מהאורחים לשריין את התאריך. היא מתאימה במיוחד כאשר יש אורחים שצריכים להיערך מראש, לבקש חופש או לתכנן נסיעה. המטרה שלה אינה לקבל אישור סופי, אלא לעזור לאנשים לפנות מקום ביומן. ב־Invistimo — כשהאפשרות פתוחה בחשבון.",
              },
              {
                when: "חודש עד חודש וחצי לפני",
                title: "הזמנה רשמית",
                body: "כשהפרטים סגורים, אפשר לשלוח הזמנה מעוצבת עם התאריך, השעה, המיקום וכל המידע שחשוב לאורחים. זה הזמן לתת מקום להתרגשות ולוודא שהמידע מגיע בצורה מסודרת. לא חייבים לבקש אישור סופי כבר בשלב הזה.",
              },
              {
                when: "כשבועיים עד שבועיים וחצי לפני",
                title: "תחילת אישורי הגעה",
                body: "בשלב הזה לרבים מהאורחים כבר יש תמונה ברורה יותר של התוכניות שלהם. אפשר להתחיל לאסוף תשובות, לעקוב אחרי מי שלא השיב ולהשאיר זמן לסבב נוסף לפני שהאולם צריך את המספרים.",
              },
            ].map((s) => (
              <li key={s.title} className="rounded-[28px] border border-[#E7D3B0] bg-[#FBF6EE] p-6">
                <span className="text-xs font-black tracking-wide text-[#8A642E]">{s.when}</span>
                <h3 className="mt-3 text-xl font-black text-[#2C241C]">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-3xl text-sm leading-7 text-[#7A6042]">
            אלה טווחי תכנון מומלצים, לא כללים מחייבים. אירועים בחגים, בקיץ, ביעדים מרוחקים או עם
            אורחים מחו״ל עשויים לדרוש היערכות מוקדמת יותר.
          </p>
        </div>
      </section>

      {/* Too early */}
      <section aria-labelledby="too-early" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>תזמון מוקדם</Eyebrow>
          <h2 id="too-early" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            למה אישור מוקדם לא תמיד אומר תשובה סופית?
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-8 text-[#5C4A3A]">
            <p>
              כשמבקשים מאורחים לאשר הגעה זמן רב לפני האירוע, חלקם עדיין לא יודעים איך ייראה השבוע
              שלהם. משמרות עבודה עוד לא פורסמו, תוכניות משפחתיות עשויות להשתנות, חופשות לא תמיד נסגרו,
              ולעיתים יש גם שאלות של נסיעה או סידור לילדים.
            </p>
            <p>
              לכן תשובה מוקדמת יכולה להיות כוונה טובה, אבל לא בהכרח התחייבות שתישאר נכונה עד יום
              האירוע.
            </p>
            <p>
              ככל שמועד האירוע מתקרב, לאורחים רבים קל יותר להעריך אם יוכלו להגיע. עם זאת, גם אישור
              שניתן סמוך לאירוע אינו מבטיח הגעה בפועל.
            </p>
            <p className="font-black text-[#2C241C]">
              המטרה היא לא לשלוח כמה שיותר מוקדם, אלא לקבל תשובות שימושיות בזמן שבו עדיין אפשר לפעול
              לפיהן.
            </p>
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              { d: "60 ימים לפני", t: "עדיין קיימת אי־ודאות אצל חלק מהאורחים." },
              { d: "30 ימים לפני", t: "יותר פרטים מתחילים להתבהר." },
              { d: "14–18 ימים לפני", t: "חלון אפשרי לאיסוף תשובות לחתונה רגילה." },
              { d: "לפני סגירת המנות", t: "השלמת פניות ובדיקת הרשימה." },
            ].map((x) => (
              <li key={x.d} className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3">
                <p className="text-sm font-black text-[#8A642E]">{x.d}</p>
                <p className="mt-1 text-[14px] leading-6 text-[#5C4A3A]">{x.t}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[#7A6042]">
            זו המחשה רעיונית לתכנון — לא נתונים סטטיסטיים או אחוזי דיוק מוכחים.
          </p>
        </div>
      </section>

      {/* Too late */}
      <section aria-labelledby="too-late" className="bg-[#1C1612] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow onDark>תזמון מאוחר</Eyebrow>
          <h2 id="too-late" className="mt-3 text-3xl font-black text-[#FFF8EF] md:text-4xl">
            גם לשלוח מאוחר מדי זו בעיה
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#D8CBB8]">
            אם מתחילים לאסוף תשובות רק ימים ספורים לפני האירוע, עלול להישאר מעט מאוד זמן לאורחים שעדיין
            מתלבטים, להודעות נוספות ולשיחות השלמה. במקביל, האולם או הקייטרינג עשויים לבקש מספר מנות,
            ותכנון ההושבה צריך להתקדם.
          </p>
          <p className="mt-4 text-lg leading-8 text-[#D8CBB8]">
            תזמון טוב משאיר מרווח בין סבב ההודעות הראשון לבין המועד שבו חייבים לקבל החלטות.
          </p>
          <ol className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm font-black">
            {["שליחה ראשונה", "זמן לתשובות", "סבב נוסף", "השלמת תשובות", "מסירת מספרים לאולם"].map(
              (s, i, arr) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="rounded-full border border-[#C9A45C]/40 bg-white/5 px-3 py-2 text-[#FFF8EF]">
                    {s}
                  </span>
                  {i < arr.length - 1 ? <span className="text-[#C9A45C]">←</span> : null}
                </li>
              )
            )}
          </ol>
        </div>
      </section>

      {/* Holidays */}
      <section aria-labelledby="holidays" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>חגים</Eyebrow>
          <h2 id="holidays" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            מתחתנים סביב חג? לוח השנה משנה את התמונה.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">
            תקופות החגים משפיעות על זמינות האורחים ועל הקצב שבו הם יכולים לתת תשובה. חלק מהמשפחות
            מתכננות חופשות, אירוח או נסיעות, ואחרות צריכות לתאם בין כמה אירועים. לכן לפני שקובעים מתי
            לשלוח אישורי הגעה, כדאי לבדוק את החגים והמועדים שחלים סביב החתונה.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                h: "פסח וחופשת האביב",
                p: "חופשות משפחתיות, נסיעות בארץ ובחו״ל וימי חג עשויים להשפיע על הזמינות. אם האירוע מתקיים סמוך לפסח, מומלץ ליידע את האורחים מוקדם ולתכנן את איסוף האישורים כך שלא יידחק לימי החג.",
              },
              {
                h: "ראש השנה, יום כיפור וסוכות",
                p: "תקופת חגי תשרי כוללת רצף של מועדים, חופשות ושינויים בשגרה. אורחים עשויים לתכנן נסיעות ואירוח משפחתי, ולכן כדאי להפריד בין הודעה מוקדמת לשריון התאריך לבין בקשת אישור סופי.",
              },
              {
                h: "שבועות",
                p: "גם חג קצר עשוי ליצור סוף שבוע ארוך או חופשה, בהתאם לשנה וללוח העבודה. כדאי לבדוק את סמיכות האירוע לחג ואת זמינות האורחים.",
              },
              {
                h: "חנוכה וחופשות בתי הספר",
                p: "משפחות עם ילדים עשויות לתכנן פעילויות וחופשות. אם האירוע חל בתקופה הזאת, כדאי להתחשב בכך בתכנון ההודעות.",
              },
              {
                h: "ערבי חג, שבתות ומועדים",
                p: "יש להתחשב בהרגלי הקהל ולא להניח שכולם יפתחו הודעות בזמן חג או שבת. לתכנן שליחה בשעות ובימים המתאימים, בהתאם למדיניות השליחה ולמאפייני האורחים.",
              },
            ].map((b) => (
              <div key={b.h}>
                <h3 className="text-xl font-black text-[#2C241C]">{b.h}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{b.p}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm leading-7 text-[#7A6042]">
            תאריכי החגים משתנים ביחס ללוח האזרחי. יש לבדוק את לוח השנה של שנת האירוע ולא להשתמש
            בתאריכים קבועים משנה קודמת.
          </p>
        </div>
      </section>

      {/* Seasons */}
      <section aria-labelledby="seasons" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>עונות</Eyebrow>
          <h2 id="seasons" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            העונה שבה מתחתנים יכולה להשפיע גם על התשובות
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6 md:p-8">
              <h3 className="text-2xl font-black text-[#2C241C]">חתונת קיץ</h3>
              <p className="mt-4 text-[15px] leading-7 text-[#5C4A3A]">
                הקיץ מביא איתו חופשות, טיסות, חופש גדול ותוכניות משפחתיות. מצד אחד כדאי להודיע על
                התאריך מוקדם כדי שאנשים יוכלו להיערך. מצד שני, בקשת אישור סופי חודשים מראש לא בהכרח
                תיתן תמונה מדויקת.
              </p>
              <p className="mt-4 text-[15px] font-semibold leading-7 text-[#3F3025]">
                המלצה: Save the Date מוקדם יותר כאשר יש אורחים רבים שמתכננים חופשות, הזמנה במועד
                מתאים ואישורי הגעה סמוך לאירוע, תוך התחשבות במועד סגירת המנות.
              </p>
            </div>
            <div className="rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6 md:p-8">
              <h3 className="text-2xl font-black text-[#2C241C]">חתונת חורף</h3>
              <p className="mt-4 text-[15px] leading-7 text-[#5C4A3A]">
                בחורף יכולים להיות שינויים במזג האוויר, נסיעות בתנאים פחות נוחים ומחלות עונתיות. לכן
                כדאי לעקוב אחרי שינויים סמוך לאירוע ולהשאיר אפשרות לעדכן את הרשימה.
              </p>
              <p className="mt-4 text-[15px] font-semibold leading-7 text-[#3F3025]">
                המלצה: לא להניח שאישור שניתן מוקדם מבטיח הגעה; להיערך לעדכונים קרובים יותר למועד
                האירוע.
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-[15px] leading-7 text-[#5C4A3A]">
            אביב וסתיו: תקופות מעבר עשויות לחפוף לחגים, חופשות ושינויים במזג האוויר. בודקים את תאריך
            האירוע עצמו ולא מסתמכים רק על שם העונה.
          </p>
        </div>
      </section>

      {/* Abroad */}
      <section aria-labelledby="abroad" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>אורחים מרחוק</Eyebrow>
          <h2 id="abroad" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            כשצריך טיסה, מלון או יום חופש — מודיעים מוקדם יותר
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">
            לא כל אורח יכול להחליט שבועיים לפני האירוע. מי שמגיע מחו״ל או נוסע מרחק משמעותי עשוי
            להזדקק לזמן להזמנת טיסות, לינה, הסעות או חופשה מהעבודה.
          </p>
          <p className="mt-4 text-lg leading-8 text-[#5C4A3A]">
            במקרים כאלה, חשוב לשלוח את התאריך ואת פרטי האירוע מוקדם ככל האפשר, גם אם אישור ההגעה הסופי
            יתבקש מאוחר יותר.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] font-semibold leading-7 text-[#3F3025]">
            <li className="rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3">
              הודעה מוקדמת לצורך תכנון נסיעה
            </li>
            <li className="rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3">
              בקשת תשובה ראשונית לצורך היערכות
            </li>
            <li className="rounded-2xl border border-[#E6D2AA] bg-[#FBF6EE] px-4 py-3">
              אישור סופי במועד שמתאים לספקים ולאורחים
            </li>
          </ul>
        </div>
      </section>

      {/* Venue deadline */}
      <section aria-labelledby="venue" className="bg-[#2C241C] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow onDark>מול האולם</Eyebrow>
          <h2 id="venue" className="mt-3 text-3xl font-black text-[#FFF8EF] md:text-4xl">
            התאריך החשוב באמת הוא היום שבו האולם צריך את המספרים
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#D8CBB8]">
            לפני שמחליטים מתי לשלוח אישורי הגעה, כדאי לשאול את האולם או הקייטרינג מתי נדרש למסור את
            מספר המנות, האם ניתן לבצע עדכונים לאחר מכן ומה התנאים לשינויים.
          </p>
          <p className="mt-4 text-lg leading-8 text-[#D8CBB8]">
            משם מתכננים אחורה את לוח הזמנים: משאירים זמן לסבב הראשון, זמן לתשובות, סבב נוסף והשלמת
            אישורים.
          </p>
          <blockquote className="mt-8 rounded-[24px] border border-[#C9A45C]/35 bg-white/[0.04] p-5 text-[15px] leading-7 text-[#E8DCC8]">
            אם האולם מבקש לקבל מספר מנות עשרה ימים לפני האירוע, לא כדאי להתחיל את סבב האישורים הראשון
            רק באותו יום. יש לקבוע את מועד השליחה כך שיישאר זמן לקבל תשובות ולהשלים פניות לפני
            הדד־ליין.
            <footer className="mt-3 text-sm text-[#B8A890]">
              הדוגמה היא להמחשה, לא תנאי אחיד של אולמות.
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Examples */}
      <section aria-labelledby="examples" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>דוגמאות</Eyebrow>
          <h2 id="examples" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            כך נראה תכנון נכון בשלושה סוגי אירועים
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "חתונה רגילה באולם",
                lines: [
                  "אירוע: 20 ביוני.",
                  "Save the Date: כמה חודשים מראש.",
                  "הזמנה: בתחילת מאי עד אמצע מאי, בהתאם לצרכים.",
                  "אישורי הגעה: בתחילת יוני, בכפוף למועד סגירת המנות.",
                  "סבב נוסף: לאחר שניתן זמן סביר לתשובות, לפני מועד מסירת המספרים.",
                ],
              },
              {
                title: "חתונת קיץ עם אורחים מחו״ל",
                lines: [
                  "אירוע: 15 באוגוסט.",
                  "Save the Date: מוקדם ככל הנדרש לתכנון נסיעות.",
                  "הזמנה: לאחר שפרטי האירוע סגורים, מספיק זמן לפני הנסיעה.",
                  "בקשת תשובה ראשונית: אפשר לשקול מוקדם יותר עבור אורחים שצריכים להזמין טיסות.",
                  "אישור סופי: סמוך יותר לאירוע, בהתאם למועד סגירת המספרים.",
                ],
              },
              {
                title: "חתונה סמוך לחג",
                lines: [
                  "אירוע: שבוע סמוך לתקופת חגים.",
                  "Save the Date: מוקדם כדי לאפשר היערכות.",
                  "הזמנה: לפני תקופת העומס, כאשר הפרטים סגורים.",
                  "אישורי הגעה: לתכנן סביב ימי החג והזמינות הצפויה של האורחים, תוך השארת זמן לסבבים ולספקים.",
                ],
              },
            ].map((ex) => (
              <div key={ex.title} className="rounded-[28px] border border-[#E7D3B0] bg-[#FBF6EE] p-6">
                <h3 className="text-xl font-black text-[#2C241C]">{ex.title}</h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-7 text-[#5C4A3A]">
                  {ex.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#7A6042]">
            כל הדוגמאות הן המחשות לתכנון, לא לוחות זמנים מחייבים.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section aria-labelledby="calc" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>מחשבון תזמון</Eyebrow>
          <h2 id="calc" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            מתי כדאי להתחיל את אישורי ההגעה לאירוע שלכם?
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-[#5C4A3A]">
            החישוב רץ אצלכם בדפדפן בלבד — בלי לשלוח נתונים לשרת. התוצאה היא המלצת תכנון, לא ודאות.
          </p>
          <div className="mt-8">
            <TimingCalculator />
          </div>
        </div>
      </section>

      {/* Media note / illustrations */}
      <section aria-labelledby="media" className="bg-[#FFFDF8] px-5 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>המחשות</Eyebrow>
          <h2 id="media" className="mt-3 text-2xl font-black text-[#2C241C] md:text-3xl">
            מתי שולחים כל הודעה — ולמה לא מוקדם מדי
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <TimelineMotion />
            </div>
            <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#1C1612] p-6 text-[#F7F1E8]">
              <h3 className="text-lg font-black">למה לא לשלוח מוקדם מדי?</h3>
              <p className="mt-3 text-[14px] leading-7 text-[#D0C2AF]">
                אורח שקיבל בקשת אישור חודשיים מראש עדיין עשוי לחכות לסידור עבודה או חופשה. כשהתאריך
                קרוב יותר, קל יותר לתת תשובה מעודכנת. זו המחשה רעיונית — לא נתוני מחקר.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-center text-sm font-black">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-[#E8C988]">מוקדם</p>
                  <p className="mt-2 text-[#FFF8EF]">אי־ודאות גבוהה יותר</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-[#E8C988]">בזמן</p>
                  <p className="mt-2 text-[#FFF8EF]">תשובות שימושיות יותר</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Image
              src="/marketing/invites/invite-save-the-date-maya-itai.webp"
              alt="כרטיס Save the Date מעוצב לתכנון מוקדם של תאריך האירוע"
              width={600}
              height={750}
              className="h-auto w-full rounded-[24px] border border-[#E6D2AA] object-cover"
              loading="lazy"
            />
            <Image
              src="/marketing/invites/invite-wedding-mia-alon.webp"
              alt="הזמנת חתונה יוקרתית לפני שלב אישורי ההגעה"
              width={600}
              height={750}
              className="h-auto w-full rounded-[24px] border border-[#E6D2AA] object-cover"
              loading="lazy"
            />
            <Image
              src="/marketing/videos/hero-guest-journey-poster.jpg"
              alt="תצוגת קישור אישי לאישור הגעה בטלפון"
              width={600}
              height={750}
              className="h-auto w-full rounded-[24px] border border-[#E6D2AA] object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            השאלות שכולם שואלים לפני שמתחילים לשלוח
          </h2>
          <div className="mt-10 space-y-3">
            {WHEN_TO_SEND_FAQS.map((faq) => (
              <details key={faq.q} className="rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-4">
                <summary className="cursor-pointer list-none">
                  <h3 className="text-lg font-black text-[#35281F]">{faq.q}</h3>
                </summary>
                <p className="mt-3 text-[15px] leading-8 text-[#5C4A3A]">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section aria-labelledby="closing" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="closing" className="text-3xl font-black leading-[1.2] text-[#2C241C] md:text-4xl">
            כשהתזמון נכון, הרבה יותר קל להגיע מוכנים לאירוע
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#5C4A3A]">
            לא צריך לנחש מתי לשלוח כל הודעה. מתחילים מהתאריך, בודקים את מועד סגירת המספרים, מתחשבים
            באורחים ובתקופת השנה, ומתכננים את ההזמנה ואת אישורי ההגעה בהתאם. Invistimo עוזרת לכם
            לנהל את התהליך במקום אחד — מההודעה ועד לרשימת המוזמנים המעודכנת.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/rsvp" className={ctaPrimary} location={`closing:${PATH}`}>
              לגלות איך עובדים אישורי ההגעה
            </TrackedCtaLink>
            <TrackedCtaLink href="/rsvp/whatsapp" className={ctaSecondary} location={`closing_wa:${PATH}`}>
              אישורי הגעה ב־WhatsApp
            </TrackedCtaLink>
          </div>
          <nav aria-label="קישורים נוספים" className="mt-12 flex flex-wrap justify-center gap-3">
            {[
              { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
              { href: "/rsvp/save-the-date", label: "Save the Date" },
              { href: "/pricing", label: "חבילות ומחירים" },
              { href: "/info/guides", label: "כל המדריכים" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
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
