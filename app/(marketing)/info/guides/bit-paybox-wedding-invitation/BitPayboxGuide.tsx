"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import InteractiveChecklist from "@/components/marketing/guides/InteractiveChecklist";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import GuestGiftDemo from "./GuestGiftDemo";
import { BIT_PAYBOX_FAQS } from "./guideFaqs";

const PATH = "/info/guides/bit-paybox-wedding-invitation";
const TITLE_SHARE = "איך מוסיפים bit ו־PayBox להזמנה דיגיטלית לחתונה? | Invistimo";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "what-is", label: "מהי אפשרות מתנה" },
  { id: "compare", label: "bit מול PayBox" },
  { id: "prepare-bit", label: "הכנת מספר bit" },
  { id: "prepare-paybox", label: "יצירת קישור PayBox" },
  { id: "setup", label: "הגדרה ב־Invistimo" },
  { id: "guest-view", label: "מה האורחים רואים" },
  { id: "one-or-both", label: "רק אחד או שניהם" },
  { id: "credit", label: "מתנות באשראי" },
  { id: "confirm-payment", label: "איך יודעים ששילמו" },
  { id: "after-send", label: "אחרי שההזמנה נשלחה" },
  { id: "safety", label: "אבטחה ופרטיות" },
  { id: "preflight", label: "בדיקה לפני שליחה" },
  { id: "troubleshoot", label: "פתרון תקלות" },
  { id: "mistakes", label: "טעויות נפוצות" },
  { id: "example-250", label: "דוגמה ל־250 אורחים" },
  { id: "checklist", label: "צ׳קליסט" },
  { id: "faq", label: "שאלות נפוצות" },
];

const CHECKLIST = [
  "החלטנו אילו אמצעים להציג",
  "בדקנו את מספר ה־bit",
  "בדקנו את חשבון מקבל התשלום",
  "יצרנו קישור PayBox מתאים",
  "בדקנו שהקישור תקין",
  "הזנו את הפרטים ב־Invistimo",
  "שמרנו את ההגדרות",
  "פתחנו את ההזמנה כאורח",
  "בדקנו שהאפשרויות מופיעות",
  "בדקנו שמספר ה־bit מועתק נכון",
  "בדקנו ש־PayBox נפתח",
  "בדקנו שאישור ההגעה עדיין עובד",
  "בדקנו את התצוגה בטלפון",
  "וידאנו שאין פרטי תשלום של אירוע אחר",
];

const MISTAKES = [
  {
    title: "הזנת מספר bit שגוי",
    fix: "העתיקו מהאפליקציה, שמרו, ובדקו העתקה מכפתור האורח מול המקור.",
  },
  {
    title: "שימוש בקישור PayBox שאינו פעיל",
    fix: "פתחו את הקישור בטלפון לפני השמירה; החליפו אם אינו מוביל ליעד הנכון.",
  },
  {
    title: "העתקת פרטים מאירוע אחר",
    fix: "ודאו שאתם באירוע הנכון לפני שמירה, ובדקו את הקישור האישי של האירוע הזה.",
  },
  {
    title: "אי־בדיקת התצוגה כאורח",
    fix: "פתחו קישור אישי לבדיקה במובייל אחרי כל שינוי משמעותי.",
  },
  {
    title: "הנחה שלחיצה שווה לתשלום",
    fix: "בדקו אישורים בהיסטוריית PayBox או bit — לא לפי לחיצה במערכת.",
  },
  {
    title: "הבטחת אישור תשלום אוטומטי",
    fix: "אל תבטיחו לאורחים או לעצמכם סטטוס «התקבל» ממסלולים אלה — הוא אינו קיים.",
  },
  {
    title: "הצגת יותר מדי פרטי תשלום",
    fix: "הציגו רק מספר/קישור שמיועדים למתנות. אל תפרסמו סיסמאות או קודי אימות.",
  },
  {
    title: "שימוש בקישור לא מאומת",
    fix: "העתיקו קישור ממקור PayBox שלכם בלבד, ובדקו שהוא https תקף.",
  },
  {
    title: "הצגת אפשרות שלא באמת הופעלה",
    fix: "שמרו אחרי הפעלה ובדקו כאורח שרק האמצעים הפעילים מופיעים.",
  },
  {
    title: "בלבול בין אשראי לבין bit",
    fix: "אשראי הוא מסלול סליקה חיצוני נפרד. bit הוא מספר להעתקה. אל תערבבו הנחיות.",
  },
  {
    title: "יצירת עומס חזותי באזור ההזמנה",
    fix: "הפעילו רק אמצעים שאתם באמת רוצים; פחות אפשרויות = בחירה ברורה יותר.",
  },
  {
    title: "אי־בדיקה במובייל",
    fix: "רוב האורחים בטלפון — בדקו העתקה ופתיחת קישור במכשיר נייד.",
  },
  {
    title: "פרטי מקבל תשלום לא נכונים",
    fix: "סכמו בין בני הזוג לאיזה חשבון/מספר מועברות המתנות לפני הפרסום.",
  },
  {
    title: "חוסר תיאום בין בני הזוג",
    fix: "תעדו בכתב מי מקבל ומה מוצג בהזמנה, כדי למנוע בלבול אחרי השליחה.",
  },
];

const TROUBLE = [
  ["bit לא מופיע", "האם Bit הופעל ונשמר בפרטי האירוע, והאם הוזן מספר תקין"],
  ["מספר bit שגוי", "השוו את המספר המועתק מכפתור האורח למספר באפליקציה"],
  ["PayBox לא מופיע", "האם PayBox מופעל, נשמר, והקישור אינו ריק"],
  ["קישור PayBox לא נפתח", "בדקו https, פעילות הקישור, ופתיחה בטלפון אחר"],
  ["מופיע אמצעי שלא רצינו", "כבו אותו בהגדרות, שמרו, ורעננו את קישור האורח"],
  ["אורח לא רואה שינוי", "ודאו שמירה הצליחה ושהאורח פתח מחדש את הקישור המעודכן"],
] as const;

const SETUP_STEPS = [
  {
    n: "01",
    title: "נכנסים לאירוע",
    text: "פותחים את האירוע הרלוונטי בחשבון Invistimo. ודאו שזה האירוע הנכון לפני שמזינים פרטי תשלום.",
  },
  {
    n: "02",
    title: "פותחים את פרטי האירוע",
    text: "באזור הגדרות האירוע מופיעות אפשרויות המתנה: אשראי, PayBox ו־Bit — כל אחת עם מתג הפעלה נפרד.",
  },
  {
    n: "03",
    title: "מפעילים PayBox",
    text: "מסמנים PayBox ומדביקים קישור HTTPS תקף בשדה «קישור PayBox». הכפתור הציבורי יהיה «מתנה ב־PayBox».",
  },
  {
    n: "04",
    title: "מפעילים bit",
    text: "מסמנים Bit ומזינים מספר ישראלי (למשל 0501234567). הכפתור הציבורי מעתיק את המספר — אין קישור bit ואין QR בעורך.",
  },
  {
    n: "05",
    title: "שומרים",
    text: "שומרים את פרטי האירוע. בלי שמירה האורחים לא יראו את השינוי.",
  },
  {
    n: "06",
    title: "בודקים כקישור אורח",
    text: "פותחים קישור אישי לבדיקה במובייל, בודקים אילו כפתורים מופיעים, מעתיקים bit ופותחים PayBox.",
  },
] as const;

const RELATED = [
  { href: "/credit-gifts", label: "מתנות באשראי, bit ו־PayBox" },
  { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
  { href: "/info/guides/send-digital-invitation", label: "איך שולחים הזמנה" },
  { href: "/rsvp/save-the-date", label: "Save the Date" },
  { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
  { href: "/info/guides", label: "מרכז המדריכים" },
  { href: "/pricing", label: "חבילות ומחירים" },
  { href: "/try", label: "דמו" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>;
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="mt-6 rounded-[24px] border border-[#E6D2AA] bg-[#FFF8EA] px-5 py-4 text-sm leading-7 text-[#5C4A3A] md:text-base">
      <p className="font-black text-[#2C241C]">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </aside>
  );
}

/** Accurate UI mock of event gift settings — labeled as illustration. */
function SettingsMock() {
  return (
    <figure className="my-8 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_16px_40px_rgba(58,39,20,0.08)]">
      <div className="border-b border-[#EADDC8] bg-[#FCFAF6] px-4 py-3 text-sm font-black text-[#6B5B4A]">
        פרטי אירוע · אפשרויות מתנה
      </div>
      <div className="space-y-3 p-4">
        {[
          { label: "PayBox", hint: "כפתור ציבורי: מתנה ב-PayBox", field: "https://… קישור PayBox" },
          { label: "Bit", hint: "כפתור ציבורי: העתקת מספר ל-Bit", field: "0501234567" },
        ].map((row) => (
          <div key={row.label} className="rounded-2xl border border-[#EFE4D6] bg-[#FCFAF6] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-black text-[#6B5B4A]">{row.label}</span>
              <span className="inline-flex h-5 w-9 items-center justify-end rounded-full bg-[#B8844F] px-1" aria-hidden>
                <span className="h-3.5 w-3.5 rounded-full bg-white" />
              </span>
            </div>
            <div
              className="mt-3 flex h-[48px] items-center rounded-[18px] border border-[#E3D6C3] bg-white px-4 text-sm font-bold text-[#241A14]"
              dir="ltr"
            >
              {row.field}
            </div>
            <p className="mt-2 text-xs font-semibold text-[#9B8D7D]">{row.hint}</p>
          </div>
        ))}
      </div>
      <figcaption className="border-t border-[#EADDC8] px-4 py-3 text-center text-sm text-[#7A6042]">
        המחשת ממשק לפי שדות המערכת · מספר וקישור לדוגמה בלבד · לא צילום לקוח
      </figcaption>
    </figure>
  );
}

function GuestButtonsMock() {
  return (
    <figure className="my-8 mx-auto max-w-sm overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_16px_40px_rgba(58,39,20,0.08)]">
      <div className="space-y-2.5 p-5">
        <p className="text-center text-sm font-black text-[#2C241C]">רוצים לשמח גם במתנה?</p>
        <div className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-center text-sm font-black text-[#5A4634]">
          מתנה ב־PayBox
        </div>
        <div className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 text-center text-sm font-black text-[#5A4634]">
          מתנה ב־Bit
        </div>
        <p className="pt-2 text-center text-xs text-[#9B8D7D]">אישור הגעה נשאר זמין בנפרד</p>
      </div>
      <figcaption className="border-t border-[#EADDC8] px-4 py-3 text-center text-sm text-[#7A6042]">
        המחשת כפתורי האורח · תואם למסלול הקישור האישי
      </figcaption>
    </figure>
  );
}

export default function BitPayboxGuide() {
  const reduce = useReducedMotion();

  return (
    <article dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(232,214,180,0.55),transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_48%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-6 md:px-8 md:pt-8">
          <nav aria-label="מיקום בעמוד" className="text-sm font-semibold text-[#7A6042]">
            <Link href="/" className="hover:text-[#8A642E]">
              ראשי
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            <Link href="/info/guides" className="hover:text-[#8A642E]">
              מדריכים
            </Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            <span>bit ו־PayBox</span>
          </nav>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך · Invistimo</p>
            <GuideToolbar title={TITLE_SHARE} path={PATH} readingMinutes={18} />
          </div>
          <div className="mt-4 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h1 className="max-w-3xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.45rem]">
                איך מוסיפים bit ו־PayBox להזמנה דיגיטלית לחתונה?
              </h1>
              <div className="mt-5 max-w-2xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
                <p>
                  רוצים לאפשר לאורחים לשלוח מתנה דרך bit או PayBox? אפשר להוסיף להזמנה הדיגיטלית את
                  פרטי התשלום הרלוונטיים, כך שהאורחים יוכלו לבחור בדרך הנוחה להם. ב־Invistimo ניתן
                  להגדיר קישור PayBox ומספר טלפון ל־bit, והאפשרויות שהופעלו יוצגו לאורחים בקישור
                  ההזמנה.
                </p>
                <p>
                  חשוב לדעת שההעברה עצמה מתבצעת מחוץ ל־Invistimo, באמצעות שירות התשלום שבחר האורח. לכן
                  כדאי לבדוק מראש שהקישור והמספר נכונים, ושהם מובילים לחשבון המתאים.
                </p>
                <p>
                  במדריך הזה נראה איך מכינים את הפרטים, היכן מגדירים אותם, מה האורחים רואים ואילו
                  בדיקות חשוב לבצע לפני ששולחים את ההזמנה.
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <TrackedCtaLink href="#setup" className={ctaPrimary} location={`hero_setup:${PATH}`}>
                  להגדרה ב־Invistimo
                </TrackedCtaLink>
                <TrackedCtaLink href="#guest-view" className={ctaSecondary} location={`hero_demo:${PATH}`}>
                  להדגמת חוויית האורח
                </TrackedCtaLink>
              </div>
            </div>
            <div>
              {!reduce ? (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Image
                    src="/images/rsvp/guides/unique-atmosphere/bit-paybox-hero.jpg"
                    alt="המחשה למתנה דיגיטלית עם bit ו־PayBox בהזמנה"
                    width={1280}
                    height={720}
                    priority
                    className="h-auto w-full rounded-[28px] border border-[#E6D2AA] object-cover shadow-[0_28px_70px_rgba(58,39,20,0.12)]"
                    sizes="(max-width:1024px) 100vw, 42vw"
                  />
                </motion.div>
              ) : (
                <Image
                  src="/images/rsvp/guides/unique-atmosphere/bit-paybox-hero.jpg"
                  alt="המחשה למתנה דיגיטלית עם bit ו־PayBox בהזמנה"
                  width={1280}
                  height={720}
                  priority
                  className="h-auto w-full rounded-[28px] border border-[#E6D2AA] object-cover shadow-[0_28px_70px_rgba(58,39,20,0.12)]"
                  sizes="(max-width:1024px) 100vw, 42vw"
                />
              )}
            </div>
          </div>
          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#1E1814]">
            <PublicAutoplayVideo
              src="/videos/marketing-captures/guide-bit-paybox.webm"
              poster="/videos/marketing-captures/guide-bit-paybox-poster.jpg"
              title="המחשה תכנונית — הוספת bit ו־PayBox להזמנה"
              shellClassName="w-full"
              className="aspect-video w-full"
              expandable
              frameBg="#1E1814"
            />
            <p className="border-t border-[#EFE2CC] bg-[#FFFDF8] px-5 py-3 text-sm font-semibold text-[#7A6042]">
              המחשה ייעודית למדריך bit/PayBox — בלי להציג יכולות סליקה שאינן של Invistimo
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-16">
        <StickyToc items={TOC} />
        <div className="min-w-0 space-y-16 md:space-y-20">
          <section id="what-is" className="scroll-mt-24">
            <Eyebrow>יסודות</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מוסיפים אפשרות למתנה דיגיטלית להזמנה לחתונה?
            </h2>
            <Prose>
              <p>
                אפשרות לקבלת מתנה דיגיטלית היא הצגה מסודרת של דרכי תשלום שהזוג בחר — למשל קישור
                PayBox או מספר bit — בתוך הקישור האישי של ההזמנה. האורח רואה כפתורים רק עבור
                האמצעים שהופעלו ונשמרו.
              </p>
              <p>
                חשוב להבחין בין הצגת פרטים לבין סליקה בתוך המערכת: ב־bit וב־PayBox Invistimo מציגה את
                מה שהזנתם, וההעברה מתבצעת אצל ספק התשלום. לכן בדיקת מספר וקישור לפני השליחה היא חלק
                מהתהליך — לא שלב אופציונלי.
              </p>
              <p>
                אין חובה להפעיל את שתי האפשרויות. אפשר bit בלבד, PayBox בלבד, שתיהן, או אף אחת.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> זוג הכין הזמנה דיגיטלית
                והפעיל PayBox ו־bit. אורח שבוחר PayBox עובר לקישור החיצוני. אורח שבוחר bit מעתיק את
                המספר ומשתמש בו באפליקציה. המערכת אינה יודעת מהלחיצה בלבד אם הכסף הועבר.
              </p>
            </Prose>
          </section>

          <section id="compare" className="scroll-mt-24">
            <Eyebrow>השוואה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה ההבדל בין bit ל־PayBox בהזמנה דיגיטלית?
            </h2>
            <Prose>
              <p>
                הטבלה מתארת את המימוש המאומת ב־Invistimo — לא את כל היכולות האפשריות של אפליקציות
                התשלום עצמן.
              </p>
            </Prose>
            <div className="mt-8 overflow-x-auto rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <table className="min-w-[560px] w-full border-collapse text-right text-sm md:text-base">
                <thead>
                  <tr className="border-b border-[#E6D2AA] bg-[#FFF8EA]">
                    <th className="px-4 py-3 font-black text-[#2C241C]">נושא</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">bit</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">PayBox</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["מה מגדירים ב־Invistimo", "מספר טלפון", "קישור תקף"],
                    ["מה האורח עושה", "מעתיק מספר", "פותח קישור"],
                    ["היכן מתבצע התשלום", "באפליקציית bit", "בשירות PayBox"],
                    ["האם Invistimo סולקת", "לא", "לא"],
                    ["האם לחיצה מאשרת תשלום", "לא", "לא"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-[#EADDC8] last:border-b-0">
                      <td className="px-4 py-3 font-bold text-[#2C241C]">{row[0]}</td>
                      <td className="px-4 py-3 text-[#5C4A3A]">{row[1]}</td>
                      <td className="px-4 py-3 text-[#5C4A3A]">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="prepare-bit" className="scroll-mt-24">
            <Eyebrow>הכנה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מכינים את פרטי ה־bit לפני שמוסיפים להזמנה?
            </h2>
            <ol className="mt-6 space-y-3">
              {[
                "בודקים באפליקציית bit מהו מספר הטלפון הרלוונטי לקבלת התשלום.",
                "מוודאים שהמספר שייך לאדם ולחשבון שסוכמתם.",
                "מחליטים אם זה המספר שרוצים להציג לאורחים.",
                "מזינים את המספר באזור Bit בפרטי האירוע ב־Invistimo.",
                "שומרים את השינויים.",
                "פותחים את ההזמנה כאורח.",
                "בודקים שהמספר מועתק נכון מהכפתור.",
              ].map((item, i) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm md:text-base"
                >
                  <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                  <span className="font-semibold text-[#3F3025]">{item}</span>
                </li>
              ))}
            </ol>
            <Tip title="חשוב לדעת">
              <p>
                אין להבטיח כפתור «תשלום ב־bit» שפותח אוטומטית בקשת תשלום. במימוש הנוכחי האורח מקבל
                מספר להעתקה בלבד — בלי קישור bit ובלי QR bit בעורך.
              </p>
            </Tip>
          </section>

          <section id="prepare-paybox" className="scroll-mt-24">
            <Eyebrow>הכנה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך יוצרים קישור PayBox למתנות לחתונה?
            </h2>
            <Prose>
              <p>
                תהליך יצירת הקישור באפליקציית PayBox עשוי להשתנות לפי גרסת האפליקציה ותנאי השירות.
                לפני שמעתיקים קישור לאירוע, בדקו את ההוראות והתנאים הרשמיים העדכניים של PayBox
                (למשל ב־
                <a
                  href="https://www.payboxapp.com/tos"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                >
                  payboxapp.com/tos
                </a>
                ), וודאו איזה סוג קישור או Box מתאים לאיסוף כספים אצלכם, ומה האורחים רואים בפתיחה.
                מגבלות סכומים ומסלולים נקבעות אצל PayBox — לא ב־Invistimo.
              </p>
            </Prose>
            <ol className="mt-6 space-y-3">
              {[
                "פותחים את אפליקציית PayBox.",
                "יוצרים או מאתרים אפשרות מתאימה לקבלת כספים.",
                "מעתיקים את הקישור שנוצר.",
                "בודקים שהוא תקין ונפתח בטלפון.",
                "מדביקים אותו בהגדרות האירוע ב־Invistimo.",
                "שומרים.",
                "בודקים שוב בטלפון אחר דרך קישור האורח.",
              ].map((item, i) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm md:text-base"
                >
                  <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                  <span className="font-semibold text-[#3F3025]">{item}</span>
                </li>
              ))}
            </ol>
            <Tip title="דוגמה לתקלה">
              <p>
                הזוג העתיק קישור שגוי או קישור שאינו פעיל. האורח לוחץ על PayBox אבל לא מגיע לאפשרות
                המתאימה. הפתרון: להחליף את הקישור ולבדוק שוב את חוויית האורח אחרי שמירה.
              </p>
            </Tip>
          </section>

          <section id="setup" className="scroll-mt-24">
            <Eyebrow>במערכת</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך מוסיפים bit ו־PayBox במערכת Invistimo?
            </h2>
            <Prose>
              <p>
                זהו התהליך המרכזי. השדות והכפתורים שלהלן תואמים את ממשק פרטי האירוע הפעיל — מתגי
                PayBox ו־Bit, שדה קישור ושדה מספר.
              </p>
            </Prose>
            <div className="mt-8 grid gap-4">
              {SETUP_STEPS.map((step) => (
                <div key={step.n} className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                  <p className="text-sm font-black text-[#8A642E]">שלב {step.n}</p>
                  <h3 className="mt-1 text-lg font-black text-[#2C241C]">{step.title}</h3>
                  <p className="mt-2 text-base leading-7 text-[#5C4A3A]">{step.text}</p>
                </div>
              ))}
            </div>
            <SettingsMock />
          </section>

          <section id="guest-view" className="scroll-mt-24">
            <Eyebrow>חוויית האורח</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך האורחים רואים את אפשרויות המתנה?
            </h2>
            <Prose>
              <p>
                בקישור האישי מופיעים כפתורי המתנה לפי מה שהופעל: «מתנה ב־PayBox» פותח את הקישור
                החיצוני, ו«מתנה ב־Bit» מעתיק את המספר. אם הופעלה אפשרות אחת בלבד — רק היא מוצגת. אם
                שתיהן כבויות — אזור המתנה לא מופיע.
              </p>
              <p>
                האורח יכול לחזור לתוכן ההזמנה ולהמשיך לאישור הגעה בנפרד. אפשרויות המתנה אינן חוסמות
                את אישור ההגעה, ואין להציג מתנה כתנאי להשתתפות.
              </p>
            </Prose>
            <GuestButtonsMock />
            <div className="mt-10 rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 md:p-8">
              <GuestGiftDemo />
            </div>
          </section>

          <section id="one-or-both" className="scroll-mt-24">
            <Eyebrow>בחירות</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם אפשר להוסיף רק bit או רק PayBox?
            </h2>
            <Prose>
              <p>כן. האפשרויות מופעלות בנפרד בהתאם למימוש הקיים.</p>
            </Prose>
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                "רק bit — מספר להעתקה בלבד",
                "רק PayBox — קישור חיצוני בלבד",
                "שתיהן — האורח בוחר",
                "אף אחת — בלי אזור מתנה דיגיטלית",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold md:text-base"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              בהדגמה למעלה אפשר להחליף בין התרחישים ולראות איך משתנה תצוגת הטלפון.
            </p>
          </section>

          <section id="credit" className="scroll-mt-24">
            <Eyebrow>מסלולים נוספים</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם צריך להפעיל גם מתנות באשראי?
            </h2>
            <Prose>
              <p>
                לא חובה. מתנות באשראי הן מסלול נפרד דרך ספק סליקה חיצוני (RSVP): נרשמים, מקבלים קישור
                ומדביקים אותו באירוע. זה שונה מ־bit (מספר להעתקה) ומ־PayBox (קישור שאתם מזינים).
              </p>
              <p>
                העברה בנקאית, מזומן או צ׳ק אינם מוצגים ככפתורי מתנה דיגיטלית במסך זה. זמינות כל אפשרות
                תלויה בשירות ובהגדרות שנבחרו.
              </p>
            </Prose>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A]">
              לפירוט מלא ראו את{" "}
              <Link href="/credit-gifts" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                עמוד המתנות באשראי, bit ו־PayBox
              </Link>
              .
            </p>
          </section>

          <section id="confirm-payment" className="scroll-mt-24">
            <Eyebrow>גבולות המערכת</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך יודעים אם אורח באמת שלח מתנה?
            </h2>
            <Prose>
              <p>
                לחיצה על קישור PayBox או העתקת מספר bit אינה אישור לכך שהתשלום בוצע. הזוג בודק את
                אישור ההעברה או את היסטוריית הפעולות בשירות התשלום הרלוונטי.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> אורח פתח את קישור
                PayBox אך לא השלים העברה. Invistimo אינה יכולה להסיק מהלחיצה בלבד שהתקבלה מתנה — ואין
                סטטוס «המתנה התקבלה» אוטומטי למסלולים אלה.
              </p>
            </Prose>
          </section>

          <section id="after-send" className="scroll-mt-24">
            <Eyebrow>אחרי השליחה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם אפשר להוסיף bit ו־PayBox להזמנה שכבר נשלחה?
            </h2>
            <Prose>
              <p>
                בדרך כלל אפשר להוסיף או לעדכן אפשרויות אחרי יצירת ההזמנה: מזינים, שומרים, ובודקים
                בקישור אישי קיים. הקישורים האישיים אמורים לשקף את ההגדרות המעודכנות בפתיחה הבאה של
                העמוד.
              </p>
              <p>
                עדכון תוכן בקישור אינו זהה להודעה יזומה לאורחים. אל תניחו שכל אורח יפתח שוב את
                ההזמנה בלי תזכורת או סיבה לפתוח.
              </p>
            </Prose>
          </section>

          <section id="safety" className="scroll-mt-24">
            <Eyebrow>אבטחה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם בטוח להציג פרטי bit ו־PayBox בהזמנה?
            </h2>
            <ul className="mt-6 space-y-2">
              {[
                "השתמשו במספר שמיועד לקבלת כספים ושסוכם בין בני הזוג.",
                "בדקו את זהות מקבל התשלום לפני הפרסום.",
                "הימנעו מהצגת פרטים מיותרים מעבר למספר או לקישור.",
                "לעולם אל תשתפו סיסמאות או קודי אימות בהזמנה.",
                "בדקו קישורים לפני השמירה — רק ממקור PayBox שלכם.",
                "היזהרו מהודעות התחזות שמבקשות «לעדכן פרטי תשלום».",
                "זכרו: מי שיש לו את הקישור האישי יכול לראות את פרטי המתנה שהופעלו.",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold md:text-base"
                >
                  {item}
                </li>
              ))}
            </ul>
            <Tip title="פרטיות במדריך זה">
              <p>
                כל המספרים והקישורים בעמוד זה פיקטיביים. אל תפרסמו מספרי טלפון אמיתיים או קישורי
                תשלום פרטיים בתוכן ציבורי.
              </p>
            </Tip>
          </section>

          <section id="preflight" className="scroll-mt-24">
            <Eyebrow>לפני שליחה</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איך בודקים שהכול עובד לפני שליחת ההזמנה?
            </h2>
            <ol className="mt-6 space-y-2">
              {[
                "נכנסים להגדרות האירוע",
                "בודקים אילו אמצעים הופעלו",
                "בודקים את מספר ה־bit",
                "בודקים את קישור PayBox",
                "שומרים",
                "פותחים קישור אישי לבדיקה",
                "בודקים את התצוגה במובייל",
                "מעתיקים את מספר ה־bit ומשווים למקור",
                "פותחים את PayBox",
                "בודקים שהקישור מוביל ליעד הנכון",
                "בודקים שהאורח יכול לחזור להזמנה",
                "בודקים שאישור ההגעה עובד בנפרד",
              ].map((item, i) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm md:text-base"
                >
                  <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                  <span className="font-semibold">{item}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm leading-7 text-[#7A6042]">
              אין לבצע העברת כסף אמיתית כחלק מבדיקת המדריך או מבדיקות אוטומטיות.
            </p>
          </section>

          <section id="troubleshoot" className="scroll-mt-24">
            <Eyebrow>תקלות</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה עושים אם bit או PayBox לא מופיעים בהזמנה?
            </h2>
            <div className="mt-8 overflow-x-auto rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8]">
              <table className="min-w-[520px] w-full border-collapse text-right text-sm md:text-base">
                <thead>
                  <tr className="border-b border-[#E6D2AA] bg-[#FFF8EA]">
                    <th className="px-4 py-3 font-black text-[#2C241C]">תקלה</th>
                    <th className="px-4 py-3 font-black text-[#2C241C]">מה לבדוק</th>
                  </tr>
                </thead>
                <tbody>
                  {TROUBLE.map(([a, b]) => (
                    <tr key={a} className="border-b border-[#EADDC8] last:border-b-0">
                      <td className="px-4 py-3 font-bold text-[#2C241C]">{a}</td>
                      <td className="px-4 py-3 text-[#5C4A3A]">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="mistakes" className="scroll-mt-24">
            <Eyebrow>למידה מניסיון</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              טעויות נפוצות שכדאי להימנע מהן
            </h2>
            <div className="mt-8 grid gap-4">
              {MISTAKES.map((item, i) => (
                <div key={item.title} className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                  <p className="text-sm font-black text-[#8A642E]">טעות {i + 1}</p>
                  <h3 className="mt-1 text-lg font-black text-[#2C241C]">{item.title}</h3>
                  <p className="mt-2 text-base leading-7 text-[#5C4A3A]">
                    <span className="font-bold text-[#2C241C]">פתרון: </span>
                    {item.fix}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="example-250" className="scroll-mt-24">
            <Eyebrow>תרחיש</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              דוגמה: הוספת אפשרויות מתנה להזמנה של 250 אורחים
            </h2>
            <Prose>
              <p>
                זוג מתכנן חתונה עם כ־250 אורחים ורוצה לאפשר בחירה בין מתנה רגילה לבין אפשרויות
                דיגיטליות — בלי לחייב אף אורח.
              </p>
            </Prose>
            <ol className="mt-6 space-y-3">
              {[
                "מכינים את ההזמנה הדיגיטלית ואת רשימת המוזמנים.",
                "בודקים את פרטי ה־bit ומסכימים לאיזה מספר יוצג.",
                "יוצרים או מאתרים קישור PayBox מתאים ובודקים אותו.",
                "מזינים את הפרטים בפרטי האירוע ושומרים.",
                "פותחים הזמנה לדוגמה בטלפון.",
                "בודקים ששתי האפשרויות עובדות ושאישור ההגעה נפרד.",
                "שולחים את ההזמנות לפי החבילה והתזמון.",
                "האורחים בוחרים בעצמם אם לתת מתנה ובאיזו דרך.",
              ].map((item, i) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm md:text-base"
                >
                  <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                  <span className="font-semibold">{item}</span>
                </li>
              ))}
            </ol>
            <Tip title="לזכור">
              <p>
                הפעלת אפשרויות מתנה אינה מבטיחה שאורחים ישתמשו בהן — רק שתהיה להם דרך נוחה אם בחרו
                בכך.
              </p>
            </Tip>
          </section>

          <section id="checklist" className="scroll-mt-24">
            <Eyebrow>לפני פרסום</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              רשימת בדיקה לפני שמפרסמים את אפשרויות המתנה
            </h2>
            <Prose>
              <p>סמנו, הדפיסו או אפסו. הסימון נשמר במכשיר זה בלבד.</p>
            </Prose>
            <div className="mt-6">
              <InteractiveChecklist
                id="bit-paybox-checklist"
                storageKey="invistimo-bit-paybox-gift-checklist"
                title="צ׳קליסט bit ו־PayBox"
                items={CHECKLIST}
              />
            </div>
          </section>

          <section id="faq" className="scroll-mt-24">
            <Eyebrow>שאלות ותשובות</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שאלות נפוצות על bit ו־PayBox בהזמנה
            </h2>
            <div className="mt-8 space-y-3">
              {BIT_PAYBOX_FAQS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] px-5 py-4 open:shadow-[0_14px_36px_rgba(58,39,20,0.06)]"
                >
                  <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-3">
                      <span>{item.q}</span>
                      <span className="mt-0.5 text-[#C7A56B] transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-base leading-8 text-[#5C4A3A]">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="scroll-mt-24 border-t border-[#E6D2AA] pt-12">
            <h2 className="text-2xl font-black text-[#2C241C]">המשך קריאה</h2>
            <nav className="mt-6 flex flex-wrap gap-3" aria-label="קישורים קשורים">
              {RELATED.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-11 items-center rounded-full border border-[#E3C990] bg-white/70 px-4 py-2 text-sm font-bold text-[#5E4735] transition hover:border-[#C7A56B] hover:bg-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink href="/credit-gifts" className={ctaPrimary} location={`footer_credit:${PATH}`}>
                לעמוד המתנות הדיגיטליות
              </TrackedCtaLink>
              <TrackedCtaLink href="/try" className={ctaSecondary} location={`footer_try:${PATH}`}>
                נסו את הדמו
              </TrackedCtaLink>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
