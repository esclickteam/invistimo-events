"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import InteractiveChecklist from "@/components/marketing/guides/InteractiveChecklist";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import PhoneInviteDemo from "./PhoneInviteDemo";
import MessageTemplates from "./MessageTemplates";
import { SEND_INVITE_FAQS } from "./guideFaqs";

const PATH = "/info/guides/send-digital-invitation";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "what-is", label: "מהי הזמנה דיגיטלית" },
  { id: "phone-demo", label: "כך מגיעה לאורח" },
  { id: "when-to-send", label: "מתי שולחים" },
  { id: "must-include", label: "מה חייב להופיע" },
  { id: "design", label: "בחירת עיצוב" },
  { id: "guest-list", label: "רשימת מוזמנים" },
  { id: "whatsapp", label: "שליחה ב־WhatsApp" },
  { id: "sms", label: "שליחה ב־SMS" },
  { id: "messages", label: "נוסחי הודעות" },
  { id: "pre-check", label: "בדיקה לפני שליחה" },
  { id: "checklist", label: "צ'קליסט" },
  { id: "mistakes-avoid", label: "בלי טעויות" },
  { id: "after-send", label: "אחרי השליחה" },
  { id: "not-received", label: "לא קיבל" },
  { id: "edit-after", label: "שינוי אחרי שליחה" },
  { id: "venue-change", label: "שינוי מקום" },
  { id: "rsvp-link", label: "אישורי הגעה" },
  { id: "timing-batch", label: "שליחה לכולם" },
  { id: "std-vs", label: "Save the Date" },
  { id: "print-vs", label: "דיגיטלית או מודפסת" },
  { id: "pricing", label: "מחיר" },
  { id: "common-mistakes", label: "טעויות נפוצות" },
  { id: "scenario-300", label: "דוגמה ל־300 אורחים" },
  { id: "faq", label: "שאלות נפוצות" },
];

const CHECKLIST_ITEMS = [
  "שמות בעלי השמחה נכונים",
  "התאריך נכון",
  "היום בשבוע נכון",
  "שעות האירוע נכונות",
  "שם האולם נכון",
  "הכתובת נכונה",
  "קישור הניווט עובד",
  "ההזמנה קריאה בטלפון",
  "כל הכפתורים עובדים",
  "רשימת המוזמנים מעודכנת",
  "אין כפילויות ברשימה",
  "מספרי הטלפון תקינים",
  "קישורים אישיים נבדקו",
  "נוסח ההודעה נבדק",
  "בוצעה שליחת ניסיון בסביבה מתאימה",
  "אפשרות אישור ההגעה נבדקה",
  "ברור מי מטפל בתקלות שליחה",
];

const PRE_SEND_CHECKS = [
  "פתיחת ההזמנה בטלפון",
  "בדיקת השמות",
  "בדיקת התאריך",
  "בדיקת השעות",
  "בדיקת מיקום האולם",
  "פתיחת קישור הניווט",
  "בדיקת תמונות וקריאות",
  "בדיקת מהירות הטעינה",
  "בדיקת קישור אישי",
  "בדיקת כפתורי אישור הגעה",
  "בדיקת מספר המגיעים",
  "בדיקת הודעת הצלחה",
  "בדיקת אורח שלא מגיע",
  "בדיקת טלפון נוסף",
  "בדיקת התאמה למובייל",
] as const;

const MUST_INCLUDE = [
  "שמות בעלי השמחה",
  "תאריך האירוע",
  "יום בשבוע",
  "שעה",
  "שם האולם",
  "כתובת",
  "קישור ניווט, אם קיים",
  "שעת קבלת פנים",
  "שעת חופה וקידושין, אם רלוונטית",
  "פרטי קשר או הוראות מיוחדות, לפי הצורך",
  "אפשרות אישור הגעה, אם כלולה",
] as const;

const TIMELINE = [
  {
    when: "מספר חודשים לפני",
    what: "Save the Date — אם בוחרים לשלוח. מודיע על התאריך בלי לאסוף אישור הגעה.",
  },
  {
    when: "מספר שבועות לפני",
    what: "ההזמנה המלאה עם פרטי האירוע וקישור אישי.",
  },
  {
    when: "בתקופה שלפני האירוע",
    what: "סבבי אישור הגעה ומעקב אחרי מי שטרם השיב.",
  },
  {
    when: "סמוך לסגירה מול האולם",
    what: "סגירת כמויות והכנת הושבה לפי התשובות.",
  },
  {
    when: "אחרי אישור סקיצת האולם",
    what: "הודעות מספרי שולחנות — לפי השירות והחבילה.",
  },
] as const;

const MISTAKES = [
  {
    title: "תאריך שגוי",
    example: "נשלח 17 ביוני במקום 18 ביוני.",
    fix: "לבדוק תאריך ויום בשבוע יחד לפני שליחה; לעדכן ולשלוח הודעת תיקון אם כבר יצא.",
  },
  {
    title: "שעה לא נכונה",
    example: "קבלת פנים ב־19:00 בהזמנה ו־18:30 בחוזה האולם.",
    fix: "להשוות להסכם האולם ולעדכן פרטי אירוע בקישור החי.",
  },
  {
    title: "אולם שגוי",
    example: "נשאר שם אולם ישן אחרי מעבר.",
    fix: "לעדכן שם, כתובת וניווט, ולשלוח עדכון יזום למי שכבר קיבל.",
  },
  {
    title: "קישור שבור",
    example: "הקישור נפתח לדף שגיאה או לאירוע אחר.",
    fix: "לבדוק קישור אישי ממכשיר נייד לפני סבב רחב.",
  },
  {
    title: "תמונה לא קריאה",
    example: "זהב דק על רקע בהיר — קשה לקרוא בטלפון בשמש.",
    fix: "לבדוק ניגודיות וגודל טקסט במכשיר אמיתי.",
  },
  {
    title: "רשימת מוזמנים כפולה",
    example: "אותו מספר בשתי רשומות — שליחה כפולה או בלבול תשובות.",
    fix: "לנקות כפילויות לפני השליחה; המערכת מונעת מספר כפול באותו אירוע.",
  },
  {
    title: "מספר טלפון שגוי",
    example: "חסרה ספרה או קידומת לא נכונה.",
    fix: "לאמת פורמט ישראלי/בינלאומי; לתקן לפני סבב נוסף.",
  },
  {
    title: "קישור אישי שהועבר לאדם אחר",
    example: "אורח א׳ שולח את הקישור שלו לאורח ב׳.",
    fix: "להסביר שהקישור אישי; לתקן תשובה ידנית אם נרשמה ברשומה הלא נכונה.",
  },
  {
    title: "שליחה מוקדמת מדי",
    example: "פרטים עדיין משתנים — ואז צריך עדכונים רבים.",
    fix: "לחכות ליציבות בסיסית של תאריך, מקום ושעות.",
  },
  {
    title: "שליחה מאוחרת מדי",
    example: "אין זמן לסבב שני לפני סגירת מנות.",
    fix: "לתזמן מול דד־ליין האולם, לא רק מול «נוחות השליחה».",
  },
  {
    title: "אי־בדיקת אישורי הגעה",
    example: "שולחים ולא עוקבים אחרי סטטוסים.",
    fix: "לבדוק דוחות אחרי כל סבב ולטפל בלא משיבים.",
  },
  {
    title: "אי־עדכון אורחים לאחר שינוי",
    example: "האולם השתנה במערכת בלי הודעה לאורחים.",
    fix: "עדכון במערכת + הודעת שינוי למי שכבר קיבל הזמנה.",
  },
  {
    title: "בלבול בין רשומות לאנשים",
    example: "«120 אישרו» נקרא כ־120 אנשים במקום 120 רשומות.",
    fix: "לעקוב גם אחרי סכום המגיעים בכל רשומה.",
  },
  {
    title: "נוסח שלא מתאים לקהל",
    example: "הודעה קלילה מדי לעמיתים לעבודה.",
    fix: "להתאים טון לקהל; בשליחה ידנית — נוסח נפרד לקבוצות.",
  },
] as const;

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

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>;
}

export default function SendDigitalInvitationGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(232,214,180,0.5),transparent_38%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_52%,#FBF6EE_100%)]"
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
            הזמנה דיגיטלית
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">Invistimo · מדריך הזמנות</p>
            <GuideToolbar title="איך שולחים הזמנה דיגיטלית לחתונה" path={PATH} readingMinutes={22} />
          </div>

          <h1 className="mt-4 max-w-4xl text-[1.75rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
            איך שולחים הזמנה דיגיטלית לחתונה? מדריך מעשי צעד אחר צעד
          </h1>

          <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              הזמנה דיגיטלית לחתונה אפשר לשלוח באמצעות קישור שנפתח בטלפון של האורח, למשל דרך WhatsApp
              או SMS, בהתאם לשירות שבו משתמשים. לפני השליחה חשוב לוודא שהשמות, התאריך, השעה והמיקום
              נכונים, שרשימת המוזמנים מעודכנת ושההזמנה נראית טוב גם במכשיר נייד.
            </p>
            <p>
              אם ההזמנה מחוברת למערכת אישורי הגעה, ניתן גם לאפשר לאורחים להשיב ולנהל את התגובות במקום
              אחד.
            </p>
            <p>
              במדריך הזה נעבור על הכנת ההזמנה, בחירת אופן השליחה, בדיקת הקישורים, שליחה לאורחים, מעקב
              אחרי אישורי ההגעה וטיפול בשינויים.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="#phone-demo" className={ctaPrimary} location={`hero_demo:${PATH}`}>
              כך ההזמנה מגיעה לאורח
            </TrackedCtaLink>
            <TrackedCtaLink href="#checklist" className={ctaSecondary} location={`hero_checklist:${PATH}`}>
              לצ&apos;קליסט לפני שליחה
            </TrackedCtaLink>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl items-end gap-6 px-5 pb-10 md:grid-cols-[1.1fr_0.9fr] md:px-8">
          {reduce ? (
            <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <Image
                src="/images/rsvp/chatuna/phone-invite.jpg"
                alt="הזמנה דיגיטלית בטלפון — מסך אורח ב־Invistimo"
                width={900}
                height={1200}
                priority
                className="h-auto w-full object-cover"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_20px_50px_rgba(58,39,20,0.1)]"
            >
              <Image
                src="/images/rsvp/chatuna/phone-invite.jpg"
                alt="הזמנה דיגיטלית בטלפון — מסך אורח ב־Invistimo"
                width={900}
                height={1200}
                priority
                className="h-auto w-full object-cover"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </motion.div>
          )}
          <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8]">
            <Image
              src="/marketing/invites/invite-wedding-mia-alon.webp"
              alt="דוגמת הזמנה דיגיטלית לחתונה — מיה ואלון"
              width={800}
              height={1100}
              className="h-auto w-full object-cover"
              sizes="(max-width:768px) 100vw, 40vw"
            />
            <p className="px-4 py-3 text-sm text-[#7A6042]">דוגמת עיצוב הזמנה · נתוני הדגמה</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-16">
        <StickyToc items={TOC} />

        <div className="min-w-0 space-y-16 md:space-y-20">
          {/* What is */}
          <section id="what-is" className="scroll-mt-24" aria-labelledby="what-is-h">
            <FadeIn>
              <Eyebrow>יסודות</Eyebrow>
              <h2 id="what-is-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מהי הזמנה דיגיטלית לחתונה ואיך היא מגיעה לאורחים?
              </h2>
              <Prose>
                <p>
                  הזמנה דיגיטלית היא עמוד או מסך שמוצג בטלפון של האורח דרך קישור — עם פרטי האירוע,
                  ולעיתים גם אפשרות לאשר הגעה. בניגוד לקובץ תמונה שנשלח לקבוצה, קישור אישי משויך
                  לרשומה ברשימת המוזמנים ומאפשר מעקב מסודר אחרי תשובות.
                </p>
                <p>
                  האורח פותח את הקישור בדפדפן או מתוך WhatsApp — בלי להוריד אפליקציה. אם אין לו
                  WhatsApp, אפשר לשתף את אותו קישור בערוץ אחר (למשל SMS או הודעה אחרת), בהתאם למה
                  שזמין בחבילה ובחשבון.
                </p>
                <p>
                  זוג ששולח תמונה בקבוצת משפחה: האורחים רואים פרטים, אבל קשה לדעת מי בדיוק אישר.
                  בקישור אישי המחובר לאישורי הגעה אפשר לשייך תשובה לרשומה ולעקוב אחריה — התנהגות זו
                  תלויה במערכת ובחבילה שנבחרה.
                </p>
              </Prose>
            </FadeIn>
          </section>

          <PhoneInviteDemo />

          {/* When */}
          <section id="when-to-send" className="scroll-mt-24" aria-labelledby="when-to-send-h">
            <FadeIn>
              <Eyebrow>תזמון</Eyebrow>
              <h2 id="when-to-send-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מתי כדאי לשלוח הזמנה דיגיטלית לחתונה?
              </h2>
              <Prose>
                <p>
                  כדאי להפריד בין הודעת Save the Date מוקדמת, הזמנה מלאה, פתיחת אישורי הגעה, תזכורת
                  לקראת האירוע והודעת מספר שולחן. אלה שלבים שונים — לא אותו מסר באותו מועד.
                </p>
                <p>
                  לוח הזמנים הבא הוא דוגמה לתכנון בלבד, לא דרישה קשיחה. הזמנים תלויים בסוג האירוע,
                  באורחים, בחגים, במיקום ובהסכם עם האולם.
                </p>
              </Prose>
            </FadeIn>
            <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <table className="w-full min-w-[480px] text-right text-sm md:text-base">
                <thead>
                  <tr className="border-b border-[#EADDC8] bg-[#FFF8EA]">
                    <th className="px-4 py-3 font-black text-[#2C241C]">מתי</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">מה שולחים</th>
                  </tr>
                </thead>
                <tbody>
                  {TIMELINE.map((row) => (
                    <tr key={row.when} className="border-b border-[#F0E4D2] last:border-0">
                      <td className="px-4 py-3 font-bold text-[#8A642E]">{row.when}</td>
                      <td className="px-4 py-3 leading-7 text-[#5C4A3A]">{row.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-[#7A6042]">
              לפירוט על מועדי אישורי הגעה ראו גם את{" "}
              <Link href="/info/guides/when-to-send-rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מדריך מתי שולחים אישורי הגעה
              </Link>
              .
            </p>
          </section>

          {/* Must include */}
          <section id="must-include" className="scroll-mt-24" aria-labelledby="must-include-h">
            <FadeIn>
              <Eyebrow>תוכן ההזמנה</Eyebrow>
              <h2 id="must-include-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מה חייב להופיע בהזמנה דיגיטלית?
              </h2>
              <Prose>
                <p>
                  הזמנה טובה עונה על שאלות בסיסיות של האורח: מי מזמין, מתי, איפה, ומתי מגיעים. אם
                  יש חופה — כדאי לציין גם אותה בנפרד מקבלת הפנים.
                </p>
              </Prose>
            </FadeIn>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {MUST_INCLUDE.map((item, i) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-white/90 px-4 py-3 text-sm font-semibold leading-7 text-[#3F3025]"
                >
                  <span className="tabular-nums text-[#C7A56B]">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <FadeIn className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                <p className="text-xs font-black tracking-[0.1em] text-[#8A642E]">דוגמה מומצאת</p>
                <div className="mt-4 space-y-2 text-center text-[#2C241C]">
                  <p className="text-2xl font-black">מיה ואלון</p>
                  <p className="text-sm leading-7 text-[#5C4A3A]">
                    שמחים להזמינכם לחגוג עמנו את יום נישואינו
                  </p>
                  <p className="pt-2 text-base font-bold">יום חמישי, 17 ביוני 2027</p>
                  <p className="text-sm text-[#5C4A3A]">קבלת פנים — 19:00</p>
                  <p className="text-sm text-[#5C4A3A]">חופה וקידושין — 20:00</p>
                  <p className="pt-2 text-sm font-semibold text-[#8A642E]">
                    אולם «גן הדקל» — שם ופרטי מקום לדוגמה בלבד
                  </p>
                </div>
                <p className="mt-4 text-xs leading-6 text-[#9A8570]">
                  זו דוגמה מומצאת ולא אירוע או אולם אמיתי.
                </p>
              </div>
              <div className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
                <Image
                  src="/marketing/invites/invite-wedding-mia-alon.webp"
                  alt="אותם פרטי אירוע בתוך הזמנה מעוצבת לדוגמה"
                  width={800}
                  height={1100}
                  className="h-auto w-full object-cover"
                  sizes="(max-width:1024px) 100vw, 40vw"
                />
                <p className="px-4 py-3 text-sm text-[#7A6042]">איך הפרטים נראים בתוך עיצוב הזמנה</p>
              </div>
            </FadeIn>
          </section>

          {/* Design */}
          <section id="design" className="scroll-mt-24" aria-labelledby="design-h">
            <FadeIn>
              <Eyebrow>עיצוב</Eyebrow>
              <h2 id="design-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                איך בוחרים עיצוב להזמנה דיגיטלית?
              </h2>
              <Prose>
                <p>
                  בחרו עיצוב שמתאים לאופי האירוע ולצבעים שלכם — אבל קודם כול לקריאות בטלפון.
                  ניגודיות חלשה, כתב דק מדי או קובץ כבד מקשים על האורחים עוד לפני שהם מגיעים לפרטים.
                </p>
                <p>
                  ב־Invistimo אפשר להעלות עיצוב קיים (JPEG, PNG או WebP), להשתמש בהזמנה שבמערכת, או
                  להזמין עיצוב בהתאמה אישית כתוספת במחשבון. אין ספריית תבניות חיה לבחירה בממשק
                  היצירה — גלריות באתר הן להשראה.
                </p>
                <p>
                  הזמנה עם כתב זהב דק על רקע בהיר מאוד עשויה להיראות מרשימה במחשב, אבל להיות קשה
                  לקריאה בטלפון בשמש. בדקו תמיד במכשיר נייד אמיתי.
                </p>
              </Prose>
            </FadeIn>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[#B7D4BC] bg-[#F3FAF4] p-5">
                <p className="text-sm font-black text-[#2F5A38]">קריא יותר בטלפון</p>
                <p className="mt-2 text-sm leading-7 text-[#3F4A3A]">
                  ניגודיות ברורה, טקסט גדול מספיק, פריסה אנכית שמתאימה למסך, קובץ קל יחסית.
                </p>
              </div>
              <div className="rounded-[24px] border border-[#E8C9C0] bg-[#FFF6F4] p-5">
                <p className="text-sm font-black text-[#7A3B32]">פחות קריא</p>
                <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                  זהב דק על רקע בהיר, טקסט קטן, פריסה אופקית שנחתכת, קובץ כבד שנפתח לאט.
                </p>
              </div>
            </div>
          </section>

          {/* Guest list */}
          <section id="guest-list" className="scroll-mt-24" aria-labelledby="guest-list-h">
            <FadeIn>
              <Eyebrow>רשימה</Eyebrow>
              <h2 id="guest-list-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                איך מכינים רשימת מוזמנים לשליחת הזמנה?
              </h2>
              <Prose>
                <p>
                  לכל רשומה שצריכה לקבל הודעה נדרשים לפחות שם ומספר טלפון תקין (כולל קידומת מדינה
                  כשצריך). רשומה אחת אינה בהכרח אדם אחד — זוג או משפחה יכולים להיות ברשומה אחת עם
                  מספר מוזמנים.
                </p>
                <p>
                  כדאי לנקות כפילויות, להשלים מספרים חסרים ולבדוק מספרים שגויים לפני השליחה. אורחים
                  מחו״ל דורשים קידומת נכונה. פירוט נוסף במדריך{" "}
                  <Link href="/info/guides/guest-list" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                    רשימת מוזמנים
                  </Link>
                  .
                </p>
              </Prose>
            </FadeIn>
            <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <table className="w-full min-w-[420px] text-right text-sm md:text-base">
                <thead>
                  <tr className="border-b border-[#EADDC8] bg-[#FFF8EA]">
                    <th className="px-4 py-3 font-black text-[#2C241C]">רשומה</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">טלפון</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">מספר מוזמנים</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#F0E4D2]">
                    <td className="px-4 py-3">משפחת כהן</td>
                    <td className="px-4 py-3 text-[#7A6042]">מספר לדוגמה</td>
                    <td className="px-4 py-3 tabular-nums">4</td>
                  </tr>
                  <tr className="border-b border-[#F0E4D2]">
                    <td className="px-4 py-3">דנה ויוסי</td>
                    <td className="px-4 py-3 text-[#7A6042]">מספר לדוגמה</td>
                    <td className="px-4 py-3 tabular-nums">2</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">רונית לוי</td>
                    <td className="px-4 py-3 text-[#7A6042]">מספר לדוגמה</td>
                    <td className="px-4 py-3 tabular-nums">1</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <FadeIn className="mt-8 overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <Image
                src="/images/rsvp/chatuna/dashboard-guests.jpg"
                alt="מסך רשימת מוזמנים ב־Invistimo — ללא פרטים אישיים אמיתיים"
                width={1400}
                height={900}
                className="h-auto w-full object-cover"
                sizes="(max-width:1024px) 100vw, 60vw"
              />
              <p className="px-4 py-3 text-sm text-[#7A6042]">
                תצוגת רשימת מוזמנים במערכת · צילום מסך לדוגמה
              </p>
            </FadeIn>
          </section>

          {/* WhatsApp */}
          <section id="whatsapp" className="scroll-mt-24" aria-labelledby="whatsapp-h">
            <FadeIn>
              <Eyebrow>שליחה</Eyebrow>
              <h2 id="whatsapp-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                איך שולחים הזמנה דיגיטלית ב־WhatsApp?
              </h2>
              <Prose>
                <p>
                  יש שני מסלולים שונים: שליחת קישור ידנית בשיחה, ושליחה אוטומטית באמצעות המערכת.
                  הם לא אותו תהליך — ואין לערבב ביניהם בלי תיאום.
                </p>
              </Prose>
            </FadeIn>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                <h3 className="text-xl font-black text-[#2C241C]">מסלול א׳: שליחה ידנית</h3>
                <ol className="mt-4 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                  <li>1. מכינים הזמנה ובודקים פרטים.</li>
                  <li>2. מעתיקים קישור אישי של האורח, אם קיים.</li>
                  <li>3. פותחים שיחה עם האורח.</li>
                  <li>4. מוסיפים הודעה אישית.</li>
                  <li>5. שולחים.</li>
                  <li>6. מוודאים שהקישור נפתח.</li>
                </ol>
                <p className="mt-4 text-sm leading-7 text-[#7A6042]">
                  שליחה ידנית אינה יוצרת בהכרח מעקב מסירה אוטומטי כמו סבבי המערכת.
                </p>
              </div>
              <div className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
                <h3 className="text-xl font-black text-[#2C241C]">מסלול ב׳: שליחה במערכת</h3>
                <ol className="mt-4 space-y-2 text-sm leading-7 text-[#5C4A3A] md:text-base">
                  <li>1. יוצרים אירוע ומגדירים פרטים.</li>
                  <li>2. מעלים או בוחרים הזמנה שבמערכת.</li>
                  <li>3. מכינים את רשימת המוזמנים.</li>
                  <li>4. בודקים הודעה וקישור.</li>
                  <li>5. מבצעים בדיקת ניסיון.</li>
                  <li>6. שולחים סבב ראשון לפי החבילה.</li>
                  <li>7. עוקבים אחרי תגובות.</li>
                  <li>8. שולחים סבב שני למי שלא ענה.</li>
                </ol>
                <p className="mt-4 text-sm leading-7 text-[#7A6042]">
                  בחבילת ההודעות: שני סבבי WhatsApp לאישור הגעה. התבנית האוטומטית היא תבנית מערכת
                  מאושרת — לא נוסח חופשי.
                </p>
              </div>
            </div>
            <FadeIn className="mt-8 overflow-hidden rounded-[24px] border border-[#E6D2AA]">
              <Image
                src="/images/rsvp/chatuna/phone-whatsapp.jpg"
                alt="המחשת הודעת WhatsApp עם קישור להזמנה דיגיטלית"
                width={1200}
                height={900}
                className="h-auto w-full object-cover"
                sizes="(max-width:1024px) 100vw, 60vw"
              />
            </FadeIn>
          </section>

          {/* SMS */}
          <section id="sms" className="scroll-mt-24" aria-labelledby="sms-h">
            <FadeIn>
              <Eyebrow>SMS</Eyebrow>
              <h2 id="sms-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                איך שולחים הזמנה דיגיטלית ב־SMS?
              </h2>
              <Prose>
                <p>
                  SMS מתאים במיוחד לאורחים שלא משתמשים ב־WhatsApp, או כערוץ משלים. ההודעה צריכה
                  להיות קצרה ולכלול קישור ברור שנבדק מראש.
                </p>
                <p>
                  בחבילות Invistimo, סבבי אישור ההגעה הראשיים בחבילת ההודעות הם ב־WhatsApp. SMS
                  מופיע כתזכורת לקראת האירוע וכהודעת תודה אחריו. אם WhatsApp נכשל או לא נשלח,
                  המערכת יכולה לשלוח SMS חלופי עם אותו קישור אישי. אי־מענה אינו מפעיל SMS אוטומטי.
                  לפירוט:{" "}
                  <Link href="/info/guides/whatsapp-vs-sms-rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                    WhatsApp מול SMS
                  </Link>
                  .
                </p>
              </Prose>
            </FadeIn>
          </section>

          {/* Messages */}
          <section id="messages" className="scroll-mt-24" aria-labelledby="messages-h">
            <FadeIn>
              <Eyebrow>נוסחים</Eyebrow>
              <h2 id="messages-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                איך כותבים הודעה יפה לשליחת ההזמנה?
              </h2>
              <Prose>
                <p>
                  הודעה טובה קצרה, ברורה ומתאימה לקהל. השאירו מקום לקישור, והימנעו מהבטחות שהאורח
                  «חייב» לאשר מיד. הנוסחים למטה מיועדים להשראה או לשליחה ידנית — לא כהבטחה שניתן
                  לשנות בחופשיות תבנית WhatsApp אוטומטית מאושרת.
                </p>
              </Prose>
            </FadeIn>
            <div className="mt-8">
              <MessageTemplates />
            </div>
          </section>

          {/* Mid CTA */}
          <FadeIn>
            <aside className="rounded-[28px] border border-[#E6D2AA] bg-gradient-to-l from-[#FFF8EA] to-[#FFFDF8] p-6 md:p-8">
              <h2 className="text-2xl font-black text-[#2C241C] md:text-3xl">רוצים לראות איך זה נראה בפועל?</h2>
              <p className="mt-3 max-w-2xl text-base leading-8 text-[#5C4A3A]">
                צפו בהדגמה של הזמנה דיגיטלית ואישור הגעה וגלו איך האורחים מקבלים את הפרטים ומשיבים.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <TrackedCtaLink href="/try" className={ctaPrimary} location={`mid_try:${PATH}`}>
                  לצפייה בדמו
                </TrackedCtaLink>
                <TrackedCtaLink
                  href="/invitations/chatuna"
                  className={ctaSecondary}
                  location={`mid_invitations:${PATH}`}
                >
                  להזמנות דיגיטליות
                </TrackedCtaLink>
              </div>
            </aside>
          </FadeIn>

          {/* Pre-check */}
          <section id="pre-check" className="scroll-mt-24" aria-labelledby="pre-check-h">
            <FadeIn>
              <Eyebrow>בדיקות</Eyebrow>
              <h2 id="pre-check-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                איך בודקים את ההזמנה לפני ששולחים?
              </h2>
              <Prose>
                <p>
                  בדיקה במחשב בלבד אינה מספיקה. פתחו את הקישור בטלפון, עברו על הפרטים, נסו אישור
                  הגעה ואי־הגעה, ובדקו ניווט. טעות קטנה שנשלחת ל־180 רשומות הופכת לעשרות הודעות
                  תיקון.
                </p>
              </Prose>
            </FadeIn>
            <ol className="mt-6 grid gap-2 sm:grid-cols-2">
              {PRE_SEND_CHECKS.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-white/90 px-4 py-3 text-sm font-semibold leading-7 text-[#3F3025]"
                >
                  <span className="tabular-nums text-[#C7A56B]">{index + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="checklist" className="scroll-mt-24">
            <InteractiveChecklist
              storageKey="invistimo-send-digital-invitation-checklist-v1"
              title="רשימת בדיקה לפני ששולחים את ההזמנה"
              items={CHECKLIST_ITEMS}
              id="interactive-checklist"
            />
          </section>

          {/* Avoid mistakes */}
          <section id="mistakes-avoid" className="scroll-mt-24" aria-labelledby="mistakes-avoid-h">
            <FadeIn>
              <Eyebrow>זהירות</Eyebrow>
              <h2 id="mistakes-avoid-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                איך שולחים הזמנה בלי לעשות טעויות?
              </h2>
              <Prose>
                <p>
                  אל תשלחו לפני סיום בדיקות, אל תשתמשו ברשימה לא מעודכנת, ואל תשלחו קישור אישי של
                  אורח אחד לאחר. אל תבטיחו שהודעה התקבלה אם אין אישור מסירה, ואל תשתפו רשימת טלפונים
                  עם אנשים לא מורשים. פרטיות האורחים היא חלק מהתהליך — לא תוספת.
                </p>
              </Prose>
            </FadeIn>
          </section>

          {/* After send */}
          <section id="after-send" className="scroll-mt-24" aria-labelledby="after-send-h">
            <FadeIn>
              <Eyebrow>מעקב</Eyebrow>
              <h2 id="after-send-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מה קורה אחרי שליחת ההזמנה?
              </h2>
              <Prose>
                <p>
                  האורח פותח את הקישור, רואה את ההזמנה, ואם האפשרות קיימת — מאשר הגעה ומעדכן מספר
                  מגיעים. במערכת תראו מי אישר, מי לא מגיע ומי טרם השיב. סבב המשך מיועד בעיקר למי
                  שלא ענה.
                </p>
                <p>
                  דוגמה: מתוך 200 רשומות — 120 אישרו הגעה, 25 הודיעו שלא יגיעו, 55 עדיין לא השיבו.
                  המספרים מתייחסים לרשומות, לא בהכרח למספר האנשים. בדקו גם את סכום המגיעים בכל
                  רשומה.
                </p>
              </Prose>
            </FadeIn>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { n: "120", t: "אישרו הגעה" },
                { n: "25", t: "לא מגיעים" },
                { n: "55", t: "טרם השיבו" },
              ].map((s) => (
                <div key={s.t} className="rounded-[22px] border border-[#EADDC8] bg-white px-5 py-5 text-center">
                  <p className="text-3xl font-black text-[#8A642E]">{s.n}</p>
                  <p className="mt-1 text-sm font-bold text-[#5C4A3A]">{s.t}</p>
                </div>
              ))}
            </div>
            <FadeIn className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="overflow-hidden rounded-[24px] border border-[#E6D2AA]">
                <Image
                  src="/images/rsvp/chatuna/phone-rsvp-form.jpg"
                  alt="מסך אישור הגעה בטלפון"
                  width={800}
                  height={1000}
                  className="h-auto w-full object-cover"
                  sizes="(max-width:768px) 100vw, 40vw"
                />
              </div>
              <div className="overflow-hidden rounded-[24px] border border-[#E6D2AA]">
                <Image
                  src="/images/rsvp/chatuna/phone-thanks.jpg"
                  alt="מסך אישור שהתגובה נקלטה"
                  width={800}
                  height={1000}
                  className="h-auto w-full object-cover"
                  sizes="(max-width:768px) 100vw, 40vw"
                />
              </div>
            </FadeIn>
          </section>

          {/* Not received */}
          <section id="not-received" className="scroll-mt-24" aria-labelledby="not-received-h">
            <FadeIn>
              <Eyebrow>תקלות</Eyebrow>
              <h2 id="not-received-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מה עושים אם אורח לא קיבל את ההזמנה?
              </h2>
              <Prose>
                <p>
                  בודקים מספר טלפון וקידומת, סטטוס שליחה אם מוצג, חסימות או מגבלות ערוץ, ומנסים קשר
                  חלופי או שליחה ידנית. לאורחים מבוגרים או ללא סמארטפון — שיחה או הזמנה מודפסת
                  עשויות להיות הפתרון הנכון. לא כל בעיית מסירה ניתנת לפתרון אוטומטי.
                </p>
              </Prose>
            </FadeIn>
          </section>

          {/* Edit after */}
          <section id="edit-after" className="scroll-mt-24" aria-labelledby="edit-after-h">
            <FadeIn>
              <Eyebrow>עדכונים</Eyebrow>
              <h2 id="edit-after-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                האם אפשר לשנות הזמנה אחרי שנשלחה?
              </h2>
              <Prose>
                <p>
                  יש הבדל בין קובץ תמונה שכבר נשלח בצ׳אט לבין עמוד הזמנה שמחובר לקישור קבוע. ב־Invistimo,
                  פרטי אירוע (שמות, תאריך, שעה, אולם, ניווט) אפשר לעדכן כל עוד האירוע פעיל — והעדכון
                  מופיע כשהאורח פותח שוב את הקישור. שינוי קובץ עיצוב שהועלה דורש בדרך כלל העלאת קובץ
                  חדש.
                </p>
                <p>
                  עדכון פרטי ההזמנה אינו מבטיח שכל אורח יראה את השינוי או יקבל התראה עליו. בשינוי
                  משמעותי — שלחו הודעת עדכון יזומה לאורחים הרלוונטיים.
                </p>
              </Prose>
            </FadeIn>
          </section>

          {/* Venue change */}
          <section id="venue-change" className="scroll-mt-24" aria-labelledby="venue-change-h">
            <FadeIn>
              <Eyebrow>תרחיש</Eyebrow>
              <h2 id="venue-change-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מה עושים אם תאריך או מקום האירוע משתנים?
              </h2>
              <Prose>
                <p>
                  זוג שלח הזמנה עם אולם מסוים, ואחר כך עבר לאולם אחר. הסדר המומלץ: מעדכנים פרטי
                  אירוע, בודקים את הקישור ואת הניווט החדש, מזהים מי כבר קיבל הזמנה, מעדכנים את
                  האורחים, מוודאים שהמידע החדש ברור, ובודקים אם נדרש עדכון אישורי הגעה.
                </p>
              </Prose>
            </FadeIn>
            <div className="mt-6 rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 md:p-6">
              <p className="text-sm font-black text-[#7A5530]">נוסח עדכון מיקום להעתקה</p>
              <blockquote className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#3F3025] md:text-base">
                {`שלום,
רצינו לעדכן אתכם על שינוי חשוב: האירוע יתקיים באולם [שם האולם החדש], בכתובת [כתובת].
פרטים מעודכנים וניווט בקישור:
[קישור להזמנה]
תודה על ההבנה — נשמח לראותכם.`}
              </blockquote>
            </div>
          </section>

          {/* RSVP */}
          <section id="rsvp-link" className="scroll-mt-24" aria-labelledby="rsvp-link-h">
            <FadeIn>
              <Eyebrow>אישורים</Eyebrow>
              <h2 id="rsvp-link-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                איך משלבים אישורי הגעה עם הזמנה דיגיטלית?
              </h2>
              <Prose>
                <p>
                  קישור אישי מקשר בין ההזמנה לרשומה. האורח משיב בקישור; התשובה נשמרת תחת אותה
                  רשומה. סבב ראשון פונה לרשימה; סבב המשך — בעיקר למי שטרם השיב. הסטטוסים הנפוצים:
                  מגיע, לא מגיע, וטרם השיב.
                </p>
                <p>
                  חשוב לבדוק מספר מגיעים ולא רק מספר רשומות. ראו גם{" "}
                  <Link href="/rsvp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                    אישורי הגעה
                  </Link>{" "}
                  ו־
                  <Link href="/rsvp/whatsapp" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                    אישורי הגעה ב־WhatsApp
                  </Link>
                  .
                </p>
              </Prose>
            </FadeIn>
          </section>

          {/* Batch */}
          <section id="timing-batch" className="scroll-mt-24" aria-labelledby="timing-batch-h">
            <FadeIn>
              <Eyebrow>תזמון שליחה</Eyebrow>
              <h2 id="timing-batch-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                האם כדאי לשלוח את ההזמנה לכל האורחים באותו זמן?
              </h2>
              <Prose>
                <p>
                  שליחה לרשימה מלאה בסבב אחד פשוטה יותר למעקב. בשליחה ידנית אפשר לפצל לקבוצות לפי
                  נוחות. לאורחים מחו״ל כדאי להתחשב באזור זמן; בישראל — להימנע משעות לא סבירות ומסביב
                  לשבתות וחגים כשאפשר. הימנעו מהודעות כפולות בלי צורך. אין להניח שקיים תזמון חופשי
                  לכל פלח בלי לבדוק את הממשק בחשבון.
                </p>
              </Prose>
            </FadeIn>
          </section>

          {/* STD */}
          <section id="std-vs" className="scroll-mt-24" aria-labelledby="std-vs-h">
            <FadeIn>
              <Eyebrow>השוואה</Eyebrow>
              <h2 id="std-vs-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                מה ההבדל בין Save the Date להזמנה מלאה?
              </h2>
            </FadeIn>
            <div className="mt-6 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <table className="w-full min-w-[520px] text-right text-sm md:text-base">
                <thead>
                  <tr className="border-b border-[#EADDC8] bg-[#FFF8EA]">
                    <th className="px-4 py-3 font-black text-[#2C241C]"> </th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">Save the Date</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">הזמנה מלאה</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["מטרה", "לשמור תאריך ביומן", "להזמין עם פרטים מלאים"],
                    ["מועד", "חודשים מראש (לרוב)", "שבועות לפני (לרוב)"],
                    ["פרטים", "תאריך וטון כללי", "מקום, שעות, ניווט ועוד"],
                    ["אישור הגעה", "לא אוסף תשובה", "יכול להתחבר לאישור"],
                    ["מעקב", "לא סבב RSVP", "סטטוסים ותשובות"],
                  ].map(([k, a, b]) => (
                    <tr key={k} className="border-b border-[#F0E4D2] last:border-0">
                      <td className="px-4 py-3 font-bold text-[#8A642E]">{k}</td>
                      <td className="px-4 py-3 leading-7 text-[#5C4A3A]">{a}</td>
                      <td className="px-4 py-3 leading-7 text-[#5C4A3A]">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-[#7A6042]">
              פירוט מלא:{" "}
              <Link
                href="/info/guides/save-the-date-vs-invitation"
                className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
              >
                Save the Date מול הזמנה
              </Link>
              {" · "}
              <Link href="/rsvp/save-the-date" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                עמוד Save the Date
              </Link>
              .
            </p>
          </section>

          {/* Print vs */}
          <section id="print-vs" className="scroll-mt-24" aria-labelledby="print-vs-h">
            <FadeIn>
              <Eyebrow>בחירה</Eyebrow>
              <h2 id="print-vs-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                הזמנה דיגיטלית או הזמנה מודפסת?
              </h2>
              <Prose>
                <p>
                  דיגיטלית נוחה לעדכון, לקישור אישי ולמעקב תשובות. מודפסת נותנת ערך רגשי ומתאימה
                  לאורחים שפחות נוחים עם קישור. אפשר לשלב: מודפסת למעגל קרוב ודיגיטלית ליתר הרשימה.
                  אין פתרון אחד שמתאים לכל זוג ולכל אורח.
                </p>
              </Prose>
            </FadeIn>
          </section>

          {/* Pricing */}
          <section id="pricing" className="scroll-mt-24" aria-labelledby="pricing-h">
            <FadeIn>
              <Eyebrow>מחיר</Eyebrow>
              <h2 id="pricing-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                כמה עולה לשלוח הזמנה דיגיטלית?
              </h2>
              <Prose>
                <p>
                  המחיר מושפע ממספר הרשומות, סוג החבילה, ערוצי השליחה, מספר סבבים ותוספות כמו עיצוב
                  בהתאמה אישית או הושבה. הזמנה דיגיטלית עצמה כלולה בחבילות שבעמוד המחירים; עיצוב
                  אישי הוא תוספת במחשבון. אין מחיר קבוע במדריך — הסכום העדכני מופיע במחשבון.
                </p>
              </Prose>
              <TrackedCtaLink href="/pricing" className={`${ctaPrimary} mt-6`} location={`pricing:${PATH}`}>
                לחבילות ומחירים
              </TrackedCtaLink>
            </FadeIn>
          </section>

          {/* Common mistakes */}
          <section id="common-mistakes" className="scroll-mt-24" aria-labelledby="common-mistakes-h">
            <FadeIn>
              <Eyebrow>למידה מטעויות</Eyebrow>
              <h2 id="common-mistakes-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                טעויות נפוצות בשליחת הזמנות דיגיטליות
              </h2>
            </FadeIn>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {MISTAKES.map((m, i) => (
                <FadeIn key={m.title} delay={Math.min(i * 0.03, 0.2)}>
                  <article className="h-full rounded-[22px] border border-[#EADDC8] bg-white/90 p-5">
                    <h3 className="text-lg font-black text-[#2C241C]">{m.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                      <span className="font-bold text-[#2C241C]">דוגמה: </span>
                      {m.example}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
                      <span className="font-bold text-[#2C241C]">פתרון: </span>
                      {m.fix}
                    </p>
                  </article>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* 300 scenario */}
          <section id="scenario-300" className="scroll-mt-24" aria-labelledby="scenario-300-h">
            <FadeIn>
              <Eyebrow>דוגמה מלאה</Eyebrow>
              <h2 id="scenario-300-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                שליחת הזמנות ל־300 אורחים — מתחילה ועד סוף
              </h2>
              <Prose>
                <p>
                  זוג מתכנן חתונה עם כ־300 מוזמנים. ברשימה יש 185 רשומות, כי חלק מהן מייצגות זוגות
                  ומשפחות. המספרים הבאים הם דוגמה לתכנון — לא תוצאה מובטחת.
                </p>
              </Prose>
            </FadeIn>
            <ol className="mt-6 space-y-3">
              {[
                "מכינים רשימה עם שמות, טלפונים ומספר מוזמנים לכל רשומה.",
                "בודקים טלפונים, קידומות וכפילויות.",
                "בוחרים עיצוב: העלאה / הזמנה שבמערכת / עיצוב אישי כתוספת.",
                "ממלאים פרטי אירוע ובודקים ניווט.",
                "יוצרים קישורים אישיים ובודקים קישור ניסיון בטלפון.",
                "מריצים את צ׳קליסט הבדיקות לפני שליחה.",
                "שולחים סבב ראשון (מערכת או ידני — לפי בחירה וחבילה).",
                "עוקבים אחרי תגובות בלוח הבקרה.",
                "מטפלים בלא משיבים בסבב שני / קשר אישי.",
                "מעדכנים רשימה לפני הושבה וסגירת מנות.",
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-white/90 px-4 py-3 text-sm font-semibold leading-7 text-[#3F3025] md:text-base"
                >
                  <span className="tabular-nums text-[#C7A56B]">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 rounded-[24px] border border-[#E7D3B0] bg-[#FFF8EA] p-5 md:p-6">
              <p className="font-black text-[#2C241C]">דוגמה לתוצאות אחרי מעקב</p>
              <ul className="mt-3 space-y-1 text-sm leading-7 text-[#5C4A3A] md:text-base">
                <li>110 רשומות אישרו הגעה</li>
                <li>30 רשומות לא מגיעות</li>
                <li>45 רשומות טרם השיבו</li>
                <li>סך הכול 185 רשומות</li>
              </ul>
              <p className="mt-3 text-sm leading-7 text-[#7A6042]">
                מכאן ממשיכים עם סבב למי שטרם השיב, משלימים תשובות ידניות אם צריך, ורק אז סוגרים
                כמויות והושבה — לפי סכום המגיעים, לא רק לפי מספר הרשומות שאישרו. להודעות שולחן ראו{" "}
                <Link
                  href="/info/guides/table-number-message"
                  className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                >
                  מדריך מספר שולחן
                </Link>
                .
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="scroll-mt-24" aria-labelledby="faq-h">
            <FadeIn>
              <Eyebrow>שאלות נפוצות</Eyebrow>
              <h2 id="faq-h" className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
                שאלות נפוצות על שליחת הזמנה דיגיטלית
              </h2>
            </FadeIn>
            <div className="mt-8 space-y-3">
              {SEND_INVITE_FAQS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-[22px] border border-[#EADDC8] bg-white/90 px-5 py-4 open:bg-[#FFFDF8]"
                >
                  <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-3">
                      <span>{item.q}</span>
                      <span className="text-[#C7A56B] transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <FadeIn>
            <aside className="rounded-[28px] border border-[#E6D2AA] bg-gradient-to-l from-[#3A2B22] to-[#5A4333] p-6 text-white md:p-10">
              <h2 className="text-2xl font-black md:text-3xl">ההזמנה מוכנה? עכשיו אפשר לשלוח אותה בצורה מסודרת.</h2>
              <p className="mt-3 max-w-2xl text-base leading-8 text-white/85">
                הכירו את אפשרויות ההזמנות הדיגיטליות ואישורי ההגעה של Invistimo, ובחרו את השירות
                שמתאים לאירוע שלכם.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <TrackedCtaLink
                  href="/invitations/chatuna"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-black text-[#3A2B22] transition hover:-translate-y-0.5"
                  location={`footer_invitations:${PATH}`}
                >
                  להזמנות דיגיטליות
                </TrackedCtaLink>
                <TrackedCtaLink
                  href="/pricing"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 bg-transparent px-8 py-3.5 text-base font-black text-white transition hover:bg-white/10"
                  location={`footer_pricing:${PATH}`}
                >
                  לחבילות ומחירים
                </TrackedCtaLink>
              </div>
              <p className="mt-6 text-sm text-white/70">
                גם:{" "}
                <Link href="/wedding-website" className="underline-offset-4 hover:underline">
                  אתר חתונה אישי
                </Link>
                {" · "}
                <Link href="/credit-gifts" className="underline-offset-4 hover:underline">
                  מתנות באשראי, bit ו־PayBox
                </Link>
                {" · "}
                <Link href="/info/guides" className="underline-offset-4 hover:underline">
                  מרכז המדריכים
                </Link>
              </p>
            </aside>
          </FadeIn>
        </div>
      </div>
    </article>
  );
}
