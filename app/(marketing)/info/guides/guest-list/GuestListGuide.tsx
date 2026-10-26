"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { GUEST_LIST_FAQS } from "./guideFaqs";

const PATH = "/info/guides/guest-list";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const RECORD_RULE =
  "רשומה היא יחידת קשר והזמנה. מספר המוזמנים הוא מספר האנשים שההזמנה כוללת.";

const EXAMPLES = [
  {
    title: "זוג",
    name: "ישראל כהן",
    phone: "מספר הטלפון של ישראל",
    count: 2,
    note: "ישראל ורונית כהן",
  },
  {
    title: "משפחה",
    name: "משפחת לוי / דנה לוי",
    phone: "מספר הטלפון של איש הקשר",
    count: 5,
    note: "שני הורים ושלושה ילדים",
  },
  {
    title: "אורח יחיד",
    name: "מיכל ישראלי",
    phone: "מספר הטלפון של מיכל",
    count: 1,
    note: "—",
  },
] as const;

const WHEN_SEPARATE = [
  "כאשר כל אחד מבני הזוג צריך לקבל קישור אישי נפרד.",
  "כאשר מדובר בשני אנשים שאינם מאשרים הגעה יחד.",
  "כאשר יש צורך לנהל את ההושבה שלהם בנפרד מההתחלה.",
  "כאשר מדובר בשני בתי אב או בשתי הזמנות עצמאיות.",
] as const;

const PHONE_CASES = [
  {
    title: "מספר טלפון לא תקין",
    example: "חסרה ספרה, או שמספר ישראלי שמתחיל ב־05 אינו בן 10 ספרות.",
    action: "בודקים מול האורח, מתקנים ושומרים. במערכת מופיעה התראה על אורך המספר.",
  },
  {
    title: "אותו אורח מופיע פעמיים",
    example: "ישראל כהן מופיע גם ברשימת החתן וגם ברשימת הכלה.",
    action: "בודקים אם מדובר באותו אדם ומחליטים איזו רשומה לשמור, תוך שימור מידע חשוב.",
  },
  {
    title: "אותו מספר משויך לשני שמות",
    example: "ישראל כהן ורונית כהן רשומים בנפרד עם אותו מספר.",
    action:
      "בודקים אם זו הזמנה משותפת. אם כן — מאחדים לרשומה אחת עם מספר מוזמנים מתאים. במערכת לא ניתן לשמור שתי רשומות עם אותו מספר.",
  },
  {
    title: "מספר ישן",
    example: "המספר נראה תקין בפורמט, אבל אינו פעיל או אינו שייך עוד לאורח.",
    action: "מוודאים מול האורח. בדיקת פורמט לבדה אינה מוכיחה שהמספר פעיל.",
  },
] as const;

const BUILD_STEPS = [
  {
    title: "מתחילים ברשימות של שתי המשפחות",
    text: "מכינים רשימות ראשוניות של בני הזוג וההורים, ומחלקים לקבוצות: משפחת הכלה, משפחת החתן, חברים, עבודה, צבא או לימודים.",
  },
  {
    title: "מאחדים לרשימה אחת",
    text: "אחרי שכל צד מכין את הרשימה שלו, מאחדים ובודקים אורחים שמופיעים בשתי הרשימות. לא מוחקים רק בגלל דמיון בשמות.",
  },
  {
    title: "מגדירים מי מוזמן יחד",
    text: "בודקים אילו זוגות ומשפחות מקבלים הזמנה משותפת, ולכל רשומה מגדירים את מספר המוזמנים.",
  },
  {
    title: "בודקים מספרי טלפון",
    text: "מוודאים שהמספרים מעודכנים ובפורמט הנכון. שומרים מספרים כטקסט באקסל כדי לא לאבד אפס מוביל.",
  },
  {
    title: "מסדרים הערות וקבוצות",
    text: "מוסיפים הערות תפעוליות רלוונטיות — בלי לאסוף מידע אישי רגיש שלא נחוץ לתכנון.",
  },
  {
    title: "מעלים ל־Invistimo",
    text: "מייבאים מאקסל או מוסיפים ידנית. המערכת בודקת כפילויות ומספרים שדורשים בדיקה.",
  },
  {
    title: "מטפלים בהתראות",
    text: "מתקנים מספרים שגויים, מאחדים הזמנות משותפות וממלאים חסרים לפני השליחה.",
  },
  {
    title: "מתחילים באישורי הגעה",
    text: "אחרי שהרשימה מוכנה, שולחים הזמנות ואישורי הגעה בהתאם לחבילה שנבחרה.",
  },
] as const;

const EXCEL_TIPS = [
  "שומרים מספרי טלפון כטקסט כדי לא לאבד אפסים מובילים.",
  "מאחדים פורמטים שונים של מספרים לפני ההעלאה.",
  "לא משאירים שורות כפולות בלי בדיקה.",
  "לא יוצרים עמודות מיותרות מעבר לפורמט הייבוא.",
  "לא מכניסים כמה מספרי טלפון לאותו תא.",
  "מוודאים שכל שורה מייצגת את יחידת ההזמנה הרצויה.",
] as const;

const MERGE_TIPS = [
  "קובעים איש קשר מרכזי לכל צד.",
  "מאחדים רשימות בשלב מוקדם.",
  "בודקים שמות דומים ומספרי טלפון.",
  "מגדירים קבוצות ברורות במערכת.",
  "שומרים הערות תפעוליות רלוונטיות.",
  "מבצעים בדיקה סופית לפני שליחה.",
] as const;

const MISTAKES = [
  {
    title: "יצירת רשומה נפרדת לכל בן זוג ללא צורך",
    text: "כשמדובר בהזמנה משותפת, עדיף רשומה אחת עם מספר מוזמנים מתאים — וגם כי המערכת אינה מאפשרת אותו מספר בשתי רשומות.",
  },
  {
    title: "השארת מספרי טלפון שגויים",
    text: "מספר לא תקין עלול למנוע יצירת קשר. כדאי לסנן לפי «מספרי טלפון לבדיקה» לפני השליחה.",
  },
  {
    title: "מחיקת כפילויות בלי לבדוק",
    text: "לפני מחיקה בודקים אם מדובר באותה הזמנה או בשתי הזמנות שונות שדורשות הבהרה.",
  },
  {
    title: "ערבוב בין רשומות למספר אנשים",
    text: "140 רשומות לא בהכרח מייצגות 140 מוזמנים. מסתכלים גם על סכום מספר המוזמנים.",
  },
  {
    title: "ניהול כמה גרסאות של הרשימה",
    text: "שינויים בגיליונות שונים יוצרים חוסר התאמה. עדיף גרסה אחת מוסכמת במערכת.",
  },
  {
    title: "אי־עדכון תשובות שהתקבלו בטלפון",
    text: "תשובה מחוץ למסלול האוטומטי צריכה להיות מתועדת במערכת.",
  },
  {
    title: "התחלת שליחה לפני בדיקת הרשימה",
    text: "בדיקה קצרה של כפילויות, מספרים ומספר מוזמנים מצמצמת תיקונים בהמשך.",
  },
] as const;

const CHECKLIST_ITEMS = [
  "כל המוזמנים מופיעים ברשימה",
  "רשימות המשפחות אוחדו",
  "נבדקו כפילויות בשמות ובמספרים",
  "נבדקו מספרי טלפון וטופלו התראות",
  "לכל רשומה הוגדר מספר מוזמנים מתאים",
  "זוגות ומשפחות קובצו לפי אופן ההזמנה",
  "הוגדרו קבוצות וקרבה במידת הצורך",
  "אורחים ללא מספר טלפון טופלו בהתאם",
  "נבדקו הערות חשובות",
  "נבחרה חבילת אישורי הגעה מתאימה",
  "בוצעה בדיקה סופית לפני שליחה",
] as const;

export default function GuestListGuide() {
  const reduce = useReducedMotion();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(232,214,180,0.5),transparent_38%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_52%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 md:gap-12 md:px-8 md:pb-16 md:pt-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">
              מדריך לתכנון חתונה | רשימת מוזמנים
            </p>
            <h1 className="mt-3 max-w-2xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
              איך מנהלים רשימת מוזמנים לחתונה בצורה נכונה?
            </h1>
            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735]">
              רשימה מסודרת היא הבסיס לאישורי הגעה מדויקים, לסידורי הושבה נוחים ולתכנון נכון של מספר
              האורחים.
            </p>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>הכנת רשימת המוזמנים היא אחד השלבים הראשונים והחשובים בתכנון חתונה.</p>
              <p>אבל רשימת מוזמנים טובה היא הרבה יותר מאוסף שמות ומספרי טלפון.</p>
              <p>
                צריך לדעת את מי מזמינים יחד, כמה אנשים כל הזמנה כוללת, האם המספרים תקינים, האם יש
                כפילויות ומי עדיין צריך לאשר הגעה.
              </p>
              <p>
                במדריך הזה נסביר איך להכין רשימה מסודרת, מה חשוב לבדוק לפני ששולחים אישורי הגעה ואיך
                להשתמש ב־Invistimo כדי לנהל את התהליך במקום אחד.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="/register" className={ctaPrimary} location={`hero_register:${PATH}`}>
                התחילו לנהל את רשימת המוזמנים
              </TrackedCtaLink>
              <TrackedCtaLink
                href="#checklist"
                className={ctaSecondary}
                location={`hero_checklist:${PATH}`}
              >
                מה חשוב לבדוק ברשימה?
              </TrackedCtaLink>
            </div>
          </div>

          <div className="relative">
            <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
              <Image
                src="/images/guides/guest-list/guest-list-table.png"
                alt="צילום מסך אמיתי של רשימת מוזמנים ב־Invistimo עם שמות, טלפון, קבוצה, סטטוס ומספר מוזמנים"
                width={1440}
                height={900}
                className="h-auto w-full object-cover object-top"
                priority
                sizes="(max-width:1024px) 100vw, 46vw"
              />
            </figure>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "רשומה עם מספר מוזמנים", value: "אורן לוי · 2" },
                { label: "סטטוס אישור הגעה", value: "מגיע / בהמתנה" },
                { label: "בדיקת מספרים", value: "מסננת «לבדיקה»" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[18px] border border-[#E7D3B0] bg-white/90 px-3 py-3 text-center shadow-[0_10px_24px_rgba(44,36,28,0.04)]"
                >
                  <p className="text-[11px] font-black tracking-[0.08em] text-[#8A642E]">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-[#2C241C]">{item.value}</p>
                </div>
              ))}
            </div>
            <figcaption className="mt-3 text-center text-sm text-[#7A6042]">
              צילום מממשק הדמו של Invistimo — נתוני דמו בלבד, לא לקוחות אמיתיים
            </figcaption>
          </div>
        </div>
      </header>

      {/* What is a record */}
      <section aria-labelledby="what-is-record" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <Eyebrow>העיקרון</Eyebrow>
            <h2 id="what-is-record" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
              רשומה אחת לא חייבת להיות אורח אחד
            </h2>
            <div className="mt-6 max-w-3xl space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                אחת הטעויות הנפוצות בהכנת רשימת מוזמנים היא להתייחס לכל אדם כאילו הוא חייב לקבל הזמנה
                נפרדת.
              </p>
              <p>
                בפועל, במקרים רבים מזמינים זוג או משפחה באמצעות איש קשר אחד. אם אתם מזמינים את דוד
                ואשתו יחד, בדרך כלל אין צורך ליצור שתי רשומות עם אותו מספר טלפון.
              </p>
              <p>
                אפשר ליצור רשומה אחת על שם איש הקשר, ולהגדיר שההזמנה מיועדת לשני אנשים. אותו עיקרון
                מתאים גם למשפחה עם ילדים, כאשר ההזמנה ואישור ההגעה מתנהלים יחד.
              </p>
            </div>
            <p className="mt-8 max-w-3xl rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-4 text-base font-black leading-8 text-[#3A2B22] md:text-lg">
              {RECORD_RULE}
            </p>
          </FadeIn>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {EXAMPLES.map((ex, i) => (
              <FadeIn key={ex.title} delay={i * 0.06}>
                <div className="h-full rounded-[24px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-6">
                  <p className="text-xs font-black tracking-[0.14em] text-[#8A642E]">{ex.title}</p>
                  <p className="mt-3 text-xl font-black text-[#2C241C]">{ex.name}</p>
                  <dl className="mt-4 space-y-2 text-sm leading-6 text-[#5C4A3A]">
                    <div className="flex justify-between gap-3 border-b border-[#EAD9BE] pb-2">
                      <dt className="font-bold">טלפון</dt>
                      <dd className="text-left font-semibold">{ex.phone}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-[#EAD9BE] pb-2">
                      <dt className="font-bold">מספר מוזמנים</dt>
                      <dd className="font-black text-[#8A642E]">{ex.count}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-bold">הערה</dt>
                      <dd className="text-left font-semibold">{ex.note}</dd>
                    </div>
                  </dl>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-12 max-w-3xl">
            <h3 className="text-2xl font-black text-[#2C241C]">מתי דווקא כדאי ליצור רשומות נפרדות?</h3>
            <ul className="mt-5 space-y-3">
              {WHEN_SEPARATE.map((item) => (
                <li key={item} className="flex gap-3 text-base leading-7 text-[#5C4A3A]">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#C9A45C]" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-7 text-[#7A6042]">
              לא כל שני אנשים עם אותו מספר הם בהכרח «כפילות תכנונית» — אבל ב־Invistimo מספר טלפון יכול
              להיות משויך לרשומה אחת בלבד באותו אירוע.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Good vs less recommended */}
      <section aria-labelledby="good-list" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <Eyebrow>המחשה</Eyebrow>
            <h2 id="good-list" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
              כך נראית רשימת מוזמנים מסודרת
            </h2>
          </FadeIn>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <FadeIn>
              <div className="h-full overflow-hidden rounded-[24px] border border-[#E2B8B8] bg-[#FFFDF8]">
                <div className="border-b border-[#E2B8B8] bg-[#F8EAEA] px-4 py-3 text-sm font-black text-[#7A3535]">
                  פחות מומלץ — רשומות כפולות ללא צורך
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm">
                    <thead className="bg-[#FFF8F8] text-xs font-black text-[#7A3535]">
                      <tr>
                        <th className="px-3 py-3">שם</th>
                        <th className="px-3 py-3">טלפון</th>
                        <th className="px-3 py-3">מוזמנים</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#5C4A3A]">
                      <tr className="border-t border-[#F0DADA]">
                        <td className="px-3 py-3 font-bold">ישראל כהן</td>
                        <td className="px-3 py-3" dir="ltr">
                          05X-XXX-XXXX
                        </td>
                        <td className="px-3 py-3">1</td>
                      </tr>
                      <tr className="border-t border-[#F0DADA]">
                        <td className="px-3 py-3 font-bold">רונית כהן</td>
                        <td className="px-3 py-3">אותו מספר</td>
                        <td className="px-3 py-3">1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="px-4 py-4 text-sm leading-7 text-[#5C4A3A]">
                  אם בני הזוג מקבלים הזמנה משותפת, שתי רשומות עם אותו מספר יוצרות כפילות מיותרת — ובמערכת
                  השנייה לא תישמר.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.05}>
              <div className="h-full overflow-hidden rounded-[24px] border border-[#B7D4BC] bg-[#FFFDF8]">
                <div className="border-b border-[#B7D4BC] bg-[#EAF5EC] px-4 py-3 text-sm font-black text-[#2F5A38]">
                  מומלץ — רשומה משותפת
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm">
                    <thead className="bg-[#F3FAF4] text-xs font-black text-[#2F5A38]">
                      <tr>
                        <th className="px-3 py-3">שם</th>
                        <th className="px-3 py-3">טלפון</th>
                        <th className="px-3 py-3">מוזמנים</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#5C4A3A]">
                      <tr className="border-t border-[#D7E8DA]">
                        <td className="px-3 py-3 font-bold">ישראל ורונית כהן</td>
                        <td className="px-3 py-3" dir="ltr">
                          05X-XXX-XXXX
                        </td>
                        <td className="px-3 py-3 font-black text-[#2F5A38]">2</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="px-4 py-4 text-sm leading-7 text-[#5C4A3A]">
                  רשומה אחת מאפשרת לשלוח הזמנה משותפת ולנהל את מספר המשתתפים בצורה מסודרת.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="h-full overflow-hidden rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8]">
                <div className="border-b border-[#E7D3B0] bg-[#F7EDDF] px-4 py-3 text-sm font-black text-[#7A5530]">
                  משפחה ברשומה אחת
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm">
                    <thead className="bg-[#FBF6EE] text-xs font-black text-[#7A5530]">
                      <tr>
                        <th className="px-3 py-3">שם</th>
                        <th className="px-3 py-3">טלפון</th>
                        <th className="px-3 py-3">מוזמנים</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#5C4A3A]">
                      <tr className="border-t border-[#EAD9BE]">
                        <td className="px-3 py-3 font-bold">משפחת לוי</td>
                        <td className="px-3 py-3" dir="ltr">
                          05X-XXX-XXXX
                        </td>
                        <td className="px-3 py-3 font-black text-[#8A642E]">5</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="px-4 py-4 text-sm leading-7 text-[#5C4A3A]">
                  כאשר כל המשפחה מוזמנת ומאשרת יחד, אפשר לנהל אותה כרשומה אחת עם מספר מוזמנים מתאים.
                </p>
              </div>
            </FadeIn>
          </div>

          <p className="mt-8 max-w-3xl text-sm leading-7 text-[#7A6042]">
            הדוגמאות מתייחסות להזמנות משותפות. אין למחוק או למזג רשומות שונות אוטומטית רק משום שמספר
            הטלפון זהה — יש לבדוק את ההקשר. ב־Invistimo אין מיזוג אוטומטי; כפילויות בייבוא מדולגות.
          </p>
        </div>
      </section>

      {/* Phone validation */}
      <section aria-labelledby="phones" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <Eyebrow>בדיקת נתונים</Eyebrow>
            <h2 id="phones" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
              איך מזהים מספרי טלפון שגויים וכפילויות ברשימת המוזמנים?
            </h2>
            <div className="mt-6 max-w-3xl space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                גם רשימה שהוכנה בקפידה יכולה להכיל טעויות: ספרה חסרה, מספר ישן, אותו איש קשר שמופיע
                פעמיים, או רשומות שנוצרו בזמן איחוד רשימות שתי המשפחות.
              </p>
              <p>
                ב־Invistimo יש בדיקות פעילות: התראה על מספר ישראלי שמתחיל ב־05 ואינו בן 10 ספרות,
                ומניעת מספר טלפון כפול באותו אירוע — גם בהוספה ידנית וגם בייבוא Excel.
              </p>
            </div>
          </FadeIn>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <FadeIn>
              <figure className="overflow-hidden rounded-[24px] border border-[#E7D3B0] bg-white shadow-[0_16px_40px_rgba(44,36,28,0.06)]">
                <Image
                  src="/images/guides/guest-list/phone-invalid-warning.png"
                  alt="התראת מערכת: מספר הטלפון אינו כולל 10 ספרות ויש לבדוק את תקינות המספר"
                  width={1440}
                  height={900}
                  className="h-auto w-full object-cover object-top"
                  loading="lazy"
                  sizes="(max-width:1024px) 100vw, 48vw"
                />
                <figcaption className="px-4 py-3 text-sm leading-6 text-[#7A6042]">
                  התראה בעת הוספה/עריכה: מספר ישראלי שמתחיל ב־05 חייב לכלול 10 ספרות. המערכת אינה
                  מתקנת מספרים אוטומטית.
                </figcaption>
              </figure>
            </FadeIn>
            <FadeIn delay={0.06}>
              <figure className="overflow-hidden rounded-[24px] border border-[#E7D3B0] bg-white shadow-[0_16px_40px_rgba(44,36,28,0.06)]">
                <Image
                  src="/images/guides/guest-list/phone-duplicate-warning.png"
                  alt="התראת מערכת: מספר הטלפון כבר קיים באירוע זה"
                  width={1440}
                  height={900}
                  className="h-auto w-full object-cover object-top"
                  loading="lazy"
                  sizes="(max-width:1024px) 100vw, 48vw"
                />
                <figcaption className="px-4 py-3 text-sm leading-6 text-[#7A6042]">
                  כפילות: «מספר הטלפון כבר קיים באירוע זה». בייבוא Excel הכפילויות מדולגות ומוצגות
                  בסיכום הייבוא.
                </figcaption>
              </figure>
            </FadeIn>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {PHONE_CASES.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.04}>
                <div className="h-full rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-5">
                  <p className="text-xs font-black tracking-[0.14em] text-[#8A642E]">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#2C241C]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#5C4A3A]">
                    <span className="font-bold">לדוגמה: </span>
                    {item.example}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                    <span className="font-bold">מה עושים? </span>
                    {item.action}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Records vs guests vs arriving */}
      <section aria-labelledby="three-numbers" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <Eyebrow>שלושה מספרים</Eyebrow>
            <h2
              id="three-numbers"
              className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl"
            >
              רשומות, מוזמנים ומגיעים — שלושה מספרים שחשוב להכיר
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              כשמנהלים חתונה, חשוב להבחין בין מספר אנשי הקשר ברשימה לבין מספר האנשים שהוזמנו ומספר
              האנשים שאישרו הגעה.
            </p>
          </FadeIn>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "מספר רשומות",
                value: "140",
                text: "אנשי קשר או יחידות הזמנה שנוצרו במערכת.",
              },
              {
                title: "מספר מוזמנים",
                value: "280",
                text: "סכום האנשים שההזמנות כוללות — לפי מספר המוזמנים בכל רשומה.",
              },
              {
                title: "מספר מגיעים",
                value: "לפי תשובות",
                text: "האנשים שאישרו הגעה, לפי הסטטוס ומספר המגיעים המעודכן.",
              },
            ].map((card, i) => (
              <FadeIn key={card.title} delay={i * 0.05}>
                <div className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-6 text-center shadow-[0_12px_32px_rgba(44,36,28,0.04)]">
                  <p className="text-xs font-black tracking-[0.14em] text-[#8A642E]">{card.title}</p>
                  <p
                    className={`mt-4 font-black text-[#2C241C] ${
                      reduce ? "" : "transition-transform duration-500"
                    } text-4xl md:text-5xl`}
                  >
                    {card.value}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#5C4A3A]">{card.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-10 max-w-3xl rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-6">
            <h3 className="text-xl font-black text-[#2C241C]">דוגמה מספרית</h3>
            <ul className="mt-4 space-y-2 text-base leading-8 text-[#5C4A3A]">
              <li>80 זוגות — רשומה אחת לכל זוג</li>
              <li>40 אורחים יחידים</li>
              <li>20 משפחות של ארבעה מוזמנים</li>
            </ul>
            <p className="mt-4 text-base font-bold leading-8 text-[#3A2B22]">
              התוצאה: 140 רשומות ו־280 מוזמנים פוטנציאליים. מספר המגיעים בפועל נקבע לפי תשובות אישורי
              ההגעה.
            </p>
            <p className="mt-4 text-sm leading-7 text-[#7A6042]">
              מחיר החבילה נקבע לפי רשומות עם מספר טלפון — לא לפי סכום המוזמנים. רשומות ללא טלפון אינן
              נגרעות מהמכסה.{" "}
              <Link
                href="/info/guides/cost-rsvp-wedding"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                כמה עולים אישורי הגעה?
              </Link>{" "}
              ·{" "}
              <Link href="/pricing" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מחשבון חבילות
              </Link>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Build steps timeline */}
      <section aria-labelledby="build-steps" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <Eyebrow>תהליך</Eyebrow>
            <h2 id="build-steps" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
              איך מכינים רשימת מוזמנים מסודרת, שלב אחר שלב?
            </h2>
          </FadeIn>
          <ol className="relative mt-12 space-y-0 border-r-2 border-[#E7D3B0] pr-8">
            {BUILD_STEPS.map((step, i) => (
              <li key={step.title} className="relative pb-10 last:pb-0">
                <span
                  className="absolute -right-[41px] top-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#E7D3B0] bg-[#FFFDF8] text-xs font-black text-[#8A642E]"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <FadeIn>
                  <h3 className="text-xl font-black text-[#2C241C]">{step.title}</h3>
                  <p className="mt-2 text-base leading-8 text-[#5C4A3A]">{step.text}</p>
                </FadeIn>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedCtaLink href="/register" className={ctaPrimary} location={`steps_register:${PATH}`}>
              התחילו לנהל את רשימת המוזמנים
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/info/guides/when-to-send-rsvp"
              className={ctaSecondary}
              location={`steps_timing:${PATH}`}
            >
              מתי שולחים אישורי הגעה
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* Excel */}
      <section aria-labelledby="excel" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <Eyebrow>ייבוא</Eyebrow>
            <h2 id="excel" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
              איך מסדרים קובץ Excel לפני שמעלים רשימת מוזמנים?
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              אפשר להתחיל בגיליון מסודר ואז להעלות אותו למערכת לפי תבנית הייבוא של Invistimo. השדות
              הנתמכים כוללים: שם מלא, טלפון, סטטוס, קרבה, קבוצה, מספר מוזמנים, הערות ושולחן.
            </p>
          </FadeIn>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <FadeIn>
              <div className="overflow-x-auto rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] shadow-[0_12px_32px_rgba(44,36,28,0.04)]">
                <table className="min-w-full text-right text-sm">
                  <caption className="sr-only">דוגמה למבנה גיליון ייבוא</caption>
                  <thead className="bg-[#F7EDDF] text-xs font-black text-[#7A5530]">
                    <tr>
                      <th className="px-3 py-3">שם מלא</th>
                      <th className="px-3 py-3">טלפון</th>
                      <th className="px-3 py-3">מוזמנים</th>
                      <th className="px-3 py-3">קבוצה</th>
                      <th className="px-3 py-3">הערות</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#5C4A3A]">
                    <tr className="border-t border-[#EAD9BE]">
                      <td className="px-3 py-3 font-bold">ישראל ורונית כהן</td>
                      <td className="px-3 py-3" dir="ltr">
                        05X-XXX-XXXX
                      </td>
                      <td className="px-3 py-3">2</td>
                      <td className="px-3 py-3">משפחת החתן</td>
                      <td className="px-3 py-3">זוג</td>
                    </tr>
                    <tr className="border-t border-[#EAD9BE]">
                      <td className="px-3 py-3 font-bold">משפחת לוי</td>
                      <td className="px-3 py-3" dir="ltr">
                        05X-XXX-XXXX
                      </td>
                      <td className="px-3 py-3">4</td>
                      <td className="px-3 py-3">משפחת הכלה</td>
                      <td className="px-3 py-3">שני ילדים</td>
                    </tr>
                    <tr className="border-t border-[#EAD9BE]">
                      <td className="px-3 py-3 font-bold">מיכל ישראלי</td>
                      <td className="px-3 py-3" dir="ltr">
                        05X-XXX-XXXX
                      </td>
                      <td className="px-3 py-3">1</td>
                      <td className="px-3 py-3">חברים</td>
                      <td className="px-3 py-3">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-5">
                <TrackedCtaLink
                  href="/Invistimo_v4.xlsx?v=4"
                  className={ctaSecondary}
                  location={`excel_template:${PATH}`}
                >
                  הורידו תבנית לרשימת מוזמנים
                </TrackedCtaLink>
              </div>
            </FadeIn>

            <FadeIn delay={0.05}>
              <figure className="overflow-hidden rounded-[24px] border border-[#E7D3B0] bg-white shadow-[0_16px_40px_rgba(44,36,28,0.06)]">
                <Image
                  src="/images/guides/guest-list/import-excel-modal.png"
                  alt="מסך ייבוא מוזמנים מאקסל ב־Invistimo עם הורדת תבנית והעלאת קובץ"
                  width={1440}
                  height={900}
                  className="h-auto w-full object-cover object-top"
                  loading="lazy"
                  sizes="(max-width:1024px) 100vw, 50vw"
                />
                <figcaption className="px-4 py-3 text-sm leading-6 text-[#7A6042]">
                  תהליך הייבוא במערכת: הורדת תבנית, מילוי הפרטים והעלאת XLSX/XLS.
                </figcaption>
              </figure>
            </FadeIn>
          </div>

          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {EXCEL_TIPS.map((tip) => (
              <li
                key={tip}
                className="rounded-[18px] border border-[#E7D3B0] bg-[#FFFDF8] px-4 py-3 text-sm leading-7 text-[#5C4A3A]"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* No phone */}
      <section aria-labelledby="no-phone" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <Eyebrow>רשומות מיוחדות</Eyebrow>
            <h2 id="no-phone" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
              מה עושים עם מוזמנים שאין להם מספר טלפון?
            </h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                לא לכל מוזמן חייב להיות מספר טלפון משלו. ילדים, חברים לכיתה או בני משפחה שמאשרים
                באמצעות אדם אחר הם דוגמאות נפוצות.
              </p>
              <p>
                ב־Invistimo אפשר להוסיף רשומות בלי מספר טלפון — שדה הטלפון מסומן כאופציונלי. הרשומות
                האלה נשארות ברשימה וניתן לשבץ אותן בהושבה לפי מספר המוזמנים, אבל הן אינן נספרות במכסת
                החבילה, ולא ניתן להוסיף להן טלפון מאוחר יותר.
              </p>
              <p>
                לדוגמה, בבר מצווה אפשר לשלוח הודעה להורים, לקבל מהם תשובה ולתעד את האישור ידנית במערכת.
                המערכת אינה קוראת אוטומטית תשובות מקבוצת WhatsApp.
              </p>
            </div>
            <p className="mt-6 rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-4 text-[15px] leading-7 text-[#5C4A3A]">
              כלל מאומת: רק רשומות עם מספר טלפון נגרעות ממכסת החבילה.{" "}
              <Link
                href="/info/guides/cost-rsvp-wedding"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                פירוט במדריך העלויות
              </Link>
              {" · "}
              <Link
                href="/rsvp/bar-bat-mitzvah"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                אישורי הגעה לבר/בת מצווה
              </Link>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Two families */}
      <section aria-labelledby="two-families" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <Eyebrow>איחוד רשימות</Eyebrow>
            <h2 id="two-families" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
              איך מאחדים את רשימות המוזמנים של החתן והכלה?
            </h2>
            <div className="mt-6 max-w-3xl space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>לעיתים כל צד במשפחה מכין רשימה בנפרד. האתגר מתחיל כשמנסים לאחד אותן.</p>
              <p>
                חברים משותפים מופיעים פעמיים, שמות נכתבים בצורה שונה, ולפעמים אותו זוג מוזמן בנפרד על
                ידי שני הצדדים. כדאי להגדיר מראש מי אחראי לעדכון הרשימה ולוודא שיש גרסה אחת מוסכמת.
              </p>
            </div>
          </FadeIn>
          <ul className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {MERGE_TIPS.map((tip) => (
              <li
                key={tip}
                className="rounded-[18px] border border-[#E7D3B0] bg-[#FFFDF8] px-4 py-4 text-sm font-bold leading-7 text-[#5C4A3A]"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Venue + seating */}
      <section aria-labelledby="venue-link" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2">
            <FadeIn>
              <Eyebrow>תקציב ואולם</Eyebrow>
              <h2 id="venue-link" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
                למה רשימת מוזמנים מדויקת חשובה גם לתקציב החתונה?
              </h2>
              <div className="mt-5 space-y-4 text-base leading-8 text-[#5C4A3A]">
                <p>
                  מספר המוזמנים משפיע על תכנון האירוע, אבל הוא אינו בהכרח מספר המשתתפים שיגיעו בפועל.
                </p>
                <p>
                  רשימה מסודרת עוזרת לעקוב אחר מי הוזמן, מי אישר, מי לא מגיע ומי עדיין לא השיב — ואז
                  לנהל שיחה מושכלת עם האולם על מנות ורזרבות.
                </p>
                <p>
                  אם ברשימה יש 400 מוזמנים, אין להתחייב אוטומטית ל־400 מנות. בוחנים את תשובות אישורי
                  ההגעה, את תנאי האולם ואת מרווח הביטחון המתאים.
                </p>
              </div>
              <Link
                href="/info/guides/wedding-venue-guest-guarantee"
                className="mt-6 inline-flex font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                מדריך: כמה אורחים להתחייב לאולם →
              </Link>
            </FadeIn>

            <FadeIn delay={0.05}>
              <Eyebrow>הושבה</Eyebrow>
              <h2 className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
                רשימת מוזמנים נכונה היא הבסיס לסידורי הושבה נוחים
              </h2>
              <div className="mt-5 space-y-4 text-base leading-8 text-[#5C4A3A]">
                <p>
                  אחרי שמתקבלות תשובות, אפשר להתקדם להושבה. כדאי להכיר את הקבוצות, את מספר המשתתפים בכל
                  הזמנה ואת הבקשות שחשוב להתחשב בהן.
                </p>
                <p>
                  רשומה משותפת לזוג אינה מחייבת ששני האנשים ינוהלו תמיד כיחידה אחת בהושבה — אבל בשיבוץ
                  הראשוני הרשומה משויכת לפי מספר המקומות שלה. כשמספר המגיעים משתנה, מעדכנים את הרשומה
                  ואת השיבוץ.
                </p>
              </div>
              <figure className="mt-6 overflow-hidden rounded-[22px] border border-[#E7D3B0] bg-white">
                <Image
                  src="/images/marketing-captures/demo/guest-list-seating.webp"
                  alt="מפת הושבה ב־Invistimo לצד רשימת מוזמנים ושיבוץ לשולחנות"
                  width={1440}
                  height={900}
                  className="h-auto w-full object-cover object-top"
                  loading="lazy"
                  sizes="(max-width:1024px) 100vw, 46vw"
                />
              </figure>
              <Link
                href="/seating-explained"
                className="mt-4 inline-flex font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                למדריך סידורי הושבה →
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* RSVP changes */}
      <section aria-labelledby="rsvp-changes" className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <Eyebrow>עדכונים</Eyebrow>
            <h2 id="rsvp-changes" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
              איך מעדכנים את הרשימה כשמישהו משנה את אישור ההגעה?
            </h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                אורחים יכולים לשנות תוכניות. זוג שאישר הגעה של שני אנשים עשוי לעדכן שרק אחד מגיע.
                משפחה יכולה להודיע שילד נוסף יצטרף.
              </p>
              <p>
                ב־Invistimo ניתן לעדכן סטטוס ומספר מגיעים ידנית, וגם לעקוב אחרי תשובות שהתקבלו דרך
                הקישור האישי. כך נתוני ההגעה וההושבה משקפים את התשובה האחרונה.
              </p>
            </div>
            <div className="mt-8 rounded-[22px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5">
              <p className="text-sm font-black tracking-[0.12em] text-[#8A642E]">דוגמה</p>
              <p className="mt-3 text-base leading-8 text-[#5C4A3A]">
                משפחת לוי הוזמנה בהרכב של חמישה. בהתחלה אושרה הגעה של חמישה. בהמשך המשפחה מעדכנת
                שיגיעו ארבעה — מעדכנים את מספר המגיעים ברשומה כדי שההושבה והסיכומים יישארו מדויקים.
              </p>
            </div>
            <p className="mt-6 text-sm leading-7 text-[#7A6042]">
              קישורים שימושיים:{" "}
              <Link
                href="/info/guides/guests-who-dont-reply"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                אורחים שלא עונים
              </Link>
              {" · "}
              <Link
                href="/rsvp/whatsapp"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                אישורי הגעה ב־WhatsApp
              </Link>
              {" · "}
              <Link
                href="/rsvp/calls"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                שיחות טלפון
              </Link>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Mistakes */}
      <section aria-labelledby="mistakes" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <Eyebrow>טעויות נפוצות</Eyebrow>
            <h2 id="mistakes" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
              שבע טעויות שכדאי להימנע מהן ברשימת המוזמנים
            </h2>
          </FadeIn>
          <ol className="mt-10 space-y-6">
            {MISTAKES.map((item, i) => (
              <li key={item.title} className="border-b border-[#EAD9BE] pb-6 last:border-0">
                <FadeIn>
                  <p className="text-xs font-black tracking-[0.16em] text-[#8A642E]">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#2C241C]">{item.title}</h3>
                  <p className="mt-2 text-base leading-8 text-[#5C4A3A]">{item.text}</p>
                </FadeIn>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Checklist */}
      <section
        id="checklist"
        aria-labelledby="checklist-title"
        className="bg-[#FBF6EE] px-5 py-16 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <Eyebrow>לפני השליחה</Eyebrow>
            <h2 id="checklist-title" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
              הרשימה מוכנה? בדקו את הדברים האלה לפני השליחה
            </h2>
            <p className="mt-4 text-base leading-8 text-[#5C4A3A]">
              סמנו את הפריטים תוך כדי בדיקה. {checkedCount} מתוך {CHECKLIST_ITEMS.length} הושלמו.
            </p>
          </FadeIn>
          <ul className="mt-8 space-y-3">
            {CHECKLIST_ITEMS.map((item, index) => {
              const isOn = Boolean(checked[index]);
              return (
                <li key={item}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-[18px] border px-4 py-3 transition ${
                      isOn
                        ? "border-[#B7D4BC] bg-[#EAF5EC]"
                        : "border-[#E7D3B0] bg-[#FFFDF8] hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#8A642E]"
                      checked={isOn}
                      onChange={() =>
                        setChecked((prev) => ({ ...prev, [index]: !prev[index] }))
                      }
                    />
                    <span className="text-[15px] font-bold leading-7 text-[#2C241C]">{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-[#FFFDF8] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            שאלות על ניהול רשימת מוזמנים
          </h2>
          <div className="mt-10 space-y-3">
            {GUEST_LIST_FAQS.map((item) => (
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

      {/* Closing CTAs */}
      <section className="bg-[#1C1612] px-5 py-16 text-[#F7F1E8] md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-[#FFF8EF] md:text-4xl">
            מוכנים לבנות רשימת מוזמנים מסודרת?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#D8CBB8]">
            נהלו רשומות, בדקו מספרים, עקבו אחרי תשובות והמשיכו להושבה — במקום אחד, בלי להפוך את הרשימה
            לבלגן של גיליונות.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="/register" className={ctaPrimary} location={`footer_register:${PATH}`}>
              התחילו לנהל את רשימת המוזמנים
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`footer_pricing:${PATH}`}
            >
              לצפייה בחבילות אישורי הגעה
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/seating-explained"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-black text-[#FFF8EF] transition hover:bg-white/10"
              location={`footer_seating:${PATH}`}
            >
              עברו למדריך סידורי הושבה
            </TrackedCtaLink>
          </div>
          <p className="mt-8 text-sm text-[#B8A890]">
            <Link href="/info/guides" className="underline-offset-4 hover:underline">
              כל המדריכים
            </Link>
            {" · "}
            <Link href="/rsvp/chatuna" className="underline-offset-4 hover:underline">
              אישורי הגעה לחתונה
            </Link>
            {" · "}
            <Link href="/info/guides/when-to-send-rsvp" className="underline-offset-4 hover:underline">
              מתי שולחים
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
              WhatsApp ו־SMS
            </Link>
          </p>
        </div>
      </section>
    </article>
  );
}
