"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import InteractiveChecklist from "@/components/marketing/guides/InteractiveChecklist";
import StickyToc, { type TocItem } from "@/components/marketing/guides/StickyToc";
import VendorCompareTable from "@/components/marketing/guides/VendorCompareTable";
import { VENDOR_CONTRACT_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-vendors-contracts";
const LEGAL_REVIEWED = "26 באוקטובר 2026";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC: TocItem[] = [
  { id: "which-first", label: "מאיזה ספק מתחילים" },
  { id: "seven-checks", label: "שבע בדיקות" },
  { id: "compare-quotes", label: "השוואת הצעות" },
  { id: "read-contract", label: "קריאת החוזה" },
  { id: "deposit-vs-hold", label: "מקדמה מול שריון" },
  { id: "why-hold-fee", label: "למה גובים שריון" },
  { id: "refunds", label: "החזרים וביטול" },
  { id: "cancel-policy", label: "מדיניות ביטול" },
  { id: "fourteen-days", label: "ביטול תוך 14 יום" },
  { id: "vendor-cancels", label: "כשהספק מבטל" },
  { id: "postpone-vs-cancel", label: "דחייה מול ביטול" },
  { id: "force-majeure", label: "מצב חירום" },
  { id: "by-vendor-type", label: "לפי סוג ספק" },
  { id: "questions-before-pay", label: "שאלות לפני תשלום" },
  { id: "keep-documents", label: "שמירת מסמכים" },
  { id: "pre-sign-checklist", label: "צ׳קליסט לפני חתימה" },
  { id: "faq", label: "שאלות נפוצות" },
];

const ORDER = [
  "תקציב, מספר מוזמנים ואופי האירוע",
  "אולם ותאריך",
  "ספקים מרכזיים עם זמינות מוגבלת, כמו צלם ו־DJ",
  "איפור, שיער, שמלה וחליפה",
  "עיצוב, בר, אטרקציות ותוספות",
  "הזמנות, אישורי הגעה, הושבה וניהול יום האירוע",
];

const SEVEN = [
  {
    title: "זהות העסק ומי נותן את השירות בפועל",
    text: "ודאו שם עוסק, פרטי קשר, ומי יגיע ביום האירוע — לא רק מי מנהל את השיחה.",
  },
  {
    title: "תיק עבודות רלוונטי ועדכני",
    text: "בקשו לראות עבודות מאירועים מלאים, לא רק Highlights קצרים.",
  },
  {
    title: "ביקורות והמלצות אמינות",
    text: "הצליבו מקורות שונים ושאלו זוגות על עמידה בזמנים ובחוזה.",
  },
  {
    title: "זמינות בתאריך ובשעות הנדרשות",
    text: "אשרו בכתב את שעות ההגעה, ההתחלה והסיום.",
  },
  {
    title: "מה כלול ומה לא כלול בהצעה",
    text: "שעות, אנשי צוות, ציוד, עריכה, נסיעות, מע״מ ותוספות.",
  },
  {
    title: "תוכנית גיבוי למקרה של תקלה או היעדרות",
    text: "ציוד חלופי, מחליף מוסכם, ומי מחליט על ההחלפה.",
  },
  {
    title: "חוזה ברור ומדיניות ביטול",
    text: "לפני מקדמה — קראו מה קורה אם אתם מבטלים או אם הספק מבטל.",
  },
];

const CONTRACT_CLAUSES = [
  "שם ופרטי הצדדים",
  "תאריך ומקום האירוע",
  "תיאור השירות המדויק",
  "מי נותן את השירות בפועל",
  "שעות התחלה וסיום",
  "מחיר סופי כולל מסים רלוונטיים",
  "תוספות אפשריות",
  "לוח תשלומים",
  "דמי שריון ומקדמות",
  "תנאי ביטול",
  "תנאי דחיית תאריך",
  "מה קורה אם הספק מבטל",
  "מחלה או היעדרות",
  "החלפת איש מקצוע",
  "תקלות וציוד גיבוי",
  "מועדי מסירת תוצרים",
  "אחריות במקרה של הפרה",
  "תנאים לאירועים חריגים",
  "דרך מסירת הודעות ותיעוד שינויים",
];

const BEFORE_PAY = [
  "מה בדיוק כלול במחיר?",
  "האם המחיר כולל מע״מ אם חל?",
  "מי נותן את השירות בפועל?",
  "האם התאריך שמור באופן מחייב?",
  "האם המקדמה מתקזזת מהמחיר?",
  "מה המשמעות של דמי השריון?",
  "מה קורה אם אנחנו מבטלים?",
  "מה קורה אם הספק מבטל?",
  "האם אפשר לדחות תאריך?",
  "האם יש דמי שינוי?",
  "האם יש שעות נוספות?",
  "האם יש עלויות נסיעה או ציוד?",
  "האם יש תוכנית גיבוי?",
  "מתי משלמים את היתרה?",
  "האם נקבל חוזה וקבלה או חשבונית לפי הדין?",
];

const PRE_SIGN = [
  "בדקנו המלצות",
  "ראינו עבודות מלאות",
  "קיבלנו הצעת מחיר בכתב",
  "בדקנו מה כלול",
  "בדקנו תוספות",
  "ביררנו מי מגיע בפועל",
  "קראנו את החוזה",
  "הבנו את המקדמה",
  "הבנו את דמי השריון",
  "בדקנו ביטול",
  "בדקנו דחייה",
  "בדקנו ביטול מצד הספק",
  "ביררנו תוכנית גיבוי",
  "בדקנו מועדי תשלום",
  "שמרנו עותק של כל המסמכים",
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>;
}

function LegalNote() {
  return (
    <aside className="rounded-[24px] border border-[#E6D2AA] bg-[#FFF8EA] px-5 py-4 text-sm leading-7 text-[#5C4A3A]">
      <p className="font-black text-[#2C241C]">הבהרה משפטית</p>
      <p className="mt-2">
        המדריך הוא מידע כללי בלבד ואינו תחליף לייעוץ משפטי פרטני. הדין עשוי להשתנות; בדקו מקורות
        רשמיים. מועד בדיקת המידע המשפטי בעמוד זה: {LEGAL_REVIEWED} (Asia/Jerusalem).
      </p>
    </aside>
  );
}

function SectionImage({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-10 overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_20px_50px_rgba(58,39,20,0.08)]">
      <Image src={src} alt={alt} width={1400} height={800} className="h-auto w-full object-cover" sizes="(max-width:1024px) 100vw, 720px" />
    </figure>
  );
}

export default function WeddingVendorsGuide() {
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
            <Link href="/" className="hover:text-[#8A642E]">ראשי</Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            <Link href="/info/guides" className="hover:text-[#8A642E]">מדריכים</Link>
            <span className="px-1.5 text-[#C7A56B]">/</span>
            ספקים וחוזים
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">בוחרים נכון. חותמים בביטחון.</p>
            <GuideToolbar title="מדריך ספקים וחוזים לחתונה | Invistimo" path={PATH} readingMinutes={30} />
          </div>
          <h1 className="mt-4 max-w-4xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
            איך בוחרים ספקים לחתונה ומה חייבים לבדוק לפני שסוגרים?
          </h1>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
            <p>
              בחירת ספקים היא אחד השלבים המשמעותיים בתכנון חתונה. הצלם יתעד את הרגעים, התקליטן ילווה
              את הרחבה, המאפרת תהיה חלק מההתארגנות והאולם יארח את האנשים החשובים לכם.
            </p>
            <p>
              אבל מעבר לסגנון, למחיר ולכימיה האישית, יש עוד דבר שחשוב להבין: מה בדיוק אתם רוכשים, מה
              כלול בשירות, מה קורה אם התוכניות משתנות ואילו התחייבויות נוצרות כשחותמים על הסכם.
            </p>
            <p>
              המדריך הזה יעזור לכם להשוות הצעות, לשאול את השאלות הנכונות ולהבין חוזים, מקדמות, דמי
              שריון ומדיניות ביטול לפני שמתחייבים.
            </p>
          </div>
          <div className="mt-6 max-w-3xl">
            <LegalNote />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="#vendor-compare" className={ctaPrimary} location={`hero_compare:${PATH}`}>
              לטבלת השוואת ספקים
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/info/guides/wedding-planning"
              className={ctaSecondary}
              location={`hero_planning:${PATH}`}
            >
              למדריך תכנון החתונה
            </TrackedCtaLink>
          </div>
        </div>
        <div className="relative mt-4 w-full">
          {!reduce ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden border-y border-[#E6D2AA]">
              <Image
                src="/images/rsvp/guides/wedding-vendors/contract.jpg"
                alt="מסמכים ועט על שולחן — המחשה לבדיקת חוזה לפני חתימה"
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
                src="/images/rsvp/guides/wedding-vendors/contract.jpg"
                alt="מסמכים ועט על שולחן — המחשה לבדיקת חוזה לפני חתימה"
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
          <section id="which-first" className="scroll-mt-24">
            <Eyebrow>פרק 1</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              איזה ספקים כדאי לסגור קודם לחתונה?
            </h2>
            <Prose>
              <p>הסדר המומלץ גמיש, אך עוזר למנוע מצב שבו סוגרים תוספות לפני שיש תאריך ומסגרת תקציב.</p>
            </Prose>
            <ol className="mt-6 space-y-2">
              {ORDER.map((item, i) => (
                <li key={item} className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold md:text-base">
                  <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-base leading-8 text-[#5C4A3A] md:text-lg">
              ספק שחשוב במיוחד לזוג עשוי לקבל קדימות. לרצף התכנון המלא ראו את{" "}
              <Link href="/info/guides/wedding-planning" className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                מדריך תכנון החתונה
              </Link>
              .
            </p>
          </section>

          <section id="seven-checks" className="scroll-mt-24">
            <Eyebrow>פרק 2</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שבע בדיקות שכדאי לבצע לפני שסוגרים ספק לחתונה
            </h2>
            <div className="mt-8 grid gap-4">
              {SEVEN.map((item, i) => (
                <div key={item.title} className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                  <p className="text-sm font-black text-[#8A642E]">בדיקה {i + 1}</p>
                  <h3 className="mt-1 text-lg font-black text-[#2C241C]">{item.title}</h3>
                  <p className="mt-2 text-base leading-7 text-[#5C4A3A]">{item.text}</p>
                </div>
              ))}
            </div>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמאות לפי סוג:</strong> בצלם — מי
                מצלם בפועל וכמה שעות. ב־DJ — האם התקליטן בהצעה הוא מי שמגיע. באולם — התחייבות מנות
                ורזרבות. באיפור — האם הניסיון נעשה עם אותו איש מקצוע.
              </p>
            </Prose>
            <SectionImage src="/images/rsvp/guides/wedding-vendors/photographer.jpg" alt="צלם בעבודה באירוע" />
          </section>

          <section id="compare-quotes" className="scroll-mt-24">
            <Eyebrow>פרק 3</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              למה לא כדאי לבחור ספק רק לפי המחיר?
            </h2>
            <Prose>
              <p>
                צלם א׳ מציע מחיר נמוך יותר אך כולל פחות שעות, פחות אנשי צוות וללא אלבום. צלם ב׳ מציע
                מחיר גבוה יותר אך כולל שעות נוספות, צלם שני ומוצרים נוספים. ההשוואה צריכה להתייחס
                להיקף השירות, איכות העבודה, תנאי המסירה, האחריות והעלות הכוללת.
              </p>
            </Prose>
            <div className="mt-8">
              <VendorCompareTable />
            </div>
            <p className="mt-4 text-sm text-[#7A6042]">
              תבנית CSV להורדה זמינה גם ב־
              <a href="/downloads/guides/wedding-vendor-comparison.csv" download className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                /downloads/guides/wedding-vendor-comparison.csv
              </a>
              .
            </p>
          </section>

          <section id="read-contract" className="scroll-mt-24">
            <Eyebrow>פרק 4</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              למה חייבים לקרוא את החוזה לפני שמשלמים מקדמה?
            </h2>
            <Prose>
              <p>
                החוזה הוא המסמך שמגדיר את ההתחייבויות של שני הצדדים: מה הספק מתחייב לספק, מה הלקוח
                מתחייב לשלם, מתי השירות יינתן ומה קורה אם אחד הצדדים אינו יכול לקיים את ההסכם.
              </p>
              <p>
                גם כאשר השיחה הייתה נעימה, חשוב שכל פרט מהותי יופיע בכתב. הבטחות בעל פה — כמו שעות
                נוספות ללא תשלום או איש צוות מסוים — עלולות ליצור מחלוקת אם אינן מופיעות בהסכם.
              </p>
            </Prose>
            <h3 className="mt-8 text-xl font-black text-[#2C241C]">סעיפים שחשוב לבדוק</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {CONTRACT_CLAUSES.map((c) => (
                <li key={c} className="rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3025]">
                  {c}
                </li>
              ))}
            </ul>
          </section>

          <section id="deposit-vs-hold" className="scroll-mt-24">
            <Eyebrow>פרק 5</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה ההבדל בין מקדמה לדמי שריון תאריך?
            </h2>
            <LegalNote />
            <Prose>
              <h3 className="text-xl font-black text-[#2C241C]">מקדמה</h3>
              <p>
                מקדמה היא בדרך כלל תשלום ראשון על חשבון המחיר הכולל. לדוגמה: מחיר צילום 8,000 ₪,
                מקדמה 2,000 ₪ בחתימה, יתרה 6,000 ₪ לפי מועדי התשלום. בדקו האם המקדמה מקוזזת מהמחיר
                הסופי ומה יקרה אם העסקה תבוטל.
              </p>
              <h3 className="text-xl font-black text-[#2C241C]">דמי שריון</h3>
              <p>
                דמי שריון עשויים להיות קשורים להתחייבות של הספק לשמור תאריך ולהימנע מהזמנות
                מתנגשות. עצם השימוש במונח אינו קובע אוטומטית שהתשלום אינו ניתן להחזר. צריך לבדוק מה
                הוסכם, מה התמורה, והאם חלה זכות ביטול לפי דין.
              </p>
            </Prose>
            <div className="mt-6 overflow-x-auto rounded-[24px] border border-[#E6D2AA] bg-white">
              <table className="min-w-[560px] w-full border-collapse text-sm md:text-base">
                <caption className="sr-only">השוואה בין מקדמה לדמי שריון</caption>
                <thead>
                  <tr className="border-b border-[#E6D2AA] bg-[#FFF8EA] text-right text-[#7A5530]">
                    <th className="px-4 py-3 font-black" scope="col">נושא</th>
                    <th className="px-4 py-3 font-black" scope="col">מקדמה</th>
                    <th className="px-4 py-3 font-black" scope="col">דמי שריון</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["מטרה נפוצה", "תשלום על חשבון השירות", "שמירת תאריך או זמינות"],
                    ["קיזוז מהמחיר", "לפי ההסכם", "לפי ההסכם"],
                    ["החזר במקרה ביטול", "לפי הדין וההסכם", "לפי הדין וההסכם"],
                    ["מה חשוב לבדוק", "מועדי תשלום ותנאי השבה", "מה בדיוק נשמר ומה קורה בביטול"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-[#F0E4D0]">
                      <th scope="row" className="px-4 py-3 text-right font-bold text-[#2C241C]">{row[0]}</th>
                      <td className="px-4 py-3 text-[#5C4A3A]">{row[1]}</td>
                      <td className="px-4 py-3 text-[#5C4A3A]">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="why-hold-fee" className="scroll-mt-24">
            <Eyebrow>פרק 6</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              למה ספק חתונות מבקש תשלום כדי לשמור תאריך?
            </h2>
            <Prose>
              <p>
                ספקי חתונות פועלים בענף שבו חלק גדול מהעבודה מתרכז בתאריכים מוגדרים. התחייבות לתאריך
                עשויה לדחות הזמנות אחרות, לתכנן צוות ולהקדיש זמן להכנות. לכן דמי שריון עשויים לשקף
                התחייבות אמיתית.
              </p>
              <p>
                עם זאת, חשוב להבחין בין הסבר עסקי לגביית התשלום לבין השאלה המשפטית אם מותר לספק
                לשמור אותו לאחר ביטול. אלה אינן אותה שאלה.
              </p>
            </Prose>
            <SectionImage
              src="/images/rsvp/guides/wedding-vendors/handshake.jpg"
              alt="לחיצת יד עסקית — המחשה להסכמה אחרי הבנת תנאי שריון ומקדמה"
            />
          </section>

          <section id="refunds" className="scroll-mt-24">
            <Eyebrow>פרק 7</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם דמי שריון או מקדמה חייבים להיות מוחזרים אם מבטלים חתונה?
            </h2>
            <div className="mt-6">
              <LegalNote />
            </div>
            <Prose>
              <p>
                <strong className="font-black text-[#2C241C]">תשובה ישירה:</strong> לא תמיד. הזכאות
                להחזר תלויה בסוג העסקה, בדרך שבה בוצעה, במועד הביטול, בתנאי ההסכם ובדין החל.
              </p>
              <p>
                לעיתים הספק כבר ביצע עבודה או איבד הזדמנות להזמנה חלופית. במקרים אחרים עשויה לעמוד
                לצרכן זכות ביטול על פי חוק, או שתנאי בחוזה עשוי להיות נתון לביקורת משפטית. אין כלל
                גורף שלפיו כל תשלום שהוגדר «שריון» או «מקדמה» הוא אוטומטית בלתי ניתן להחזר.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה:</strong> זוג סגר צלם ושילם 1,500
                ₪. כעבור חודשיים מבטל. כדי להבין אם הסכום יוחזר יש לבדוק מתי ואיך נכרת ההסכם, מה
                נכתב על ביטול, כמה זמן נותר, האם בוצעה עבודה, האם קיימת זכות ביטול חוקית, האם הספק
                יכול היה למלא את התאריך, והאם מדובר בפיצוי מוסכם שסבירותו עשויה להיבדק. לא נקבע כאן
                מראש שהספק זכאי לכל הסכום או שהזוג זכאי להחזר מלא.
              </p>
            </Prose>
          </section>

          <section id="cancel-policy" className="scroll-mt-24">
            <Eyebrow>פרק 8</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה חייב להופיע במדיניות ביטול של ספק לחתונה?
            </h2>
            <div className="mt-6">
              <LegalNote />
            </div>
            <Prose>
              <p>
                מדיניות ביטול טובה צריכה להיות ברורה עוד לפני התשלום: איך מודיעים על ביטול, מהו מועד
                הביטול הקובע, אילו סכומים יוחזרו או עשויים להישאר, האם הדמים משתנים ככל שמתקרבים
                לאירוע, האם ניתן לדחות תאריך, מה קורה אם התאריך החדש אינו פנוי, מה קורה אם הספק מבטל,
                ומה קורה באירוע חריג.
              </p>
              <p>
                <strong className="font-black text-[#2C241C]">דוגמה להמחשה בלבד</strong> (לא דין
                מחייב ולא תנאים סטנדרטיים): יותר מ־120 יום לפני האירוע — תנאי ביטול מסוימים; בין 60
                ל־120 יום — תנאים אחרים; פחות מ־60 יום — דמי ביטול גבוהים יותר עשויים להיקבע בהסכם.
                אלה דוגמאות למבנה חוזי אפשרי בלבד.
              </p>
            </Prose>
          </section>

          <section id="fourteen-days" className="scroll-mt-24">
            <Eyebrow>פרק 9</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              האם אפשר לבטל ספק חתונה בתוך 14 ימים מהחתימה?
            </h2>
            <LegalNote />
            <Prose>
              <p>
                אין תשובה אחת לכל סוגי ספקי החתונות. יש הבדל בין עסקה שנעשתה בטלפון או באינטרנט לבין
                עסקה שנעשתה בבית העסק. גם סוג השירות ומועד האירוע עשויים להשפיע.
              </p>
              <p>
                כאשר קיימת זכות ביטול צרכנית על פי חוק, עשויים לחול כללים מוגדרים לגבי מועדים ודמי
                ביטול. כאשר לא קיימת זכות ביטול סטטוטורית מתאימה, יש לבחון את ההסכם ואת דיני החוזים.
                לגבי אולמות אירועים, פרסומים של גורמי צרכנות מדגישים לעיתים שתקנות ביטול עסקה מסוימות
                אינן חלות באותו אופן — ולכן חשוב לקרוא את החוזה לפני החתימה.
              </p>
              <p>לא נכתב כאן שכל ספק חייב לאפשר ביטול תוך 14 יום, וגם לא שכל ספק פטור מהחזר ברגע ששולמה מקדמה.</p>
              <p className="font-semibold">מקורות רשמיים ומעודכנים לבדיקה:</p>
              <ul className="list-disc pr-5">
                <li>
                  <a className="text-[#8A642E] underline-offset-4 hover:underline" href="https://www.gov.il/he/pages/returns" target="_blank" rel="noopener noreferrer">
                    הרשות להגנת הצרכן ולסחר הוגן — ביטול עסקה
                  </a>
                </li>
                <li>
                  <a className="text-[#8A642E] underline-offset-4 hover:underline" href="https://www.kolzchut.org.il/he/%D7%91%D7%99%D7%98%D7%95%D7%9C_%D7%A2%D7%A1%D7%A7%D7%94_%D7%A9%D7%A0%D7%A2%D7%A9%D7%AA%D7%94_%D7%91%D7%90%D7%99%D7%A0%D7%98%D7%A8%D7%A0%D7%98_%D7%90%D7%95_%D7%91%D7%98%D7%9C%D7%A4%D7%95%D7%9F" target="_blank" rel="noopener noreferrer">
                    כל־זכות — ביטול עסקה באינטרנט או בטלפון
                  </a>
                </li>
                <li>
                  <a className="text-[#8A642E] underline-offset-4 hover:underline" href="https://www.consumers.org.il/" target="_blank" rel="noopener noreferrer">
                    המועצה הישראלית לצרכנות
                  </a>
                </li>
              </ul>
            </Prose>
          </section>

          <section id="vendor-cancels" className="scroll-mt-24">
            <Eyebrow>פרק 10</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה עושים אם צלם, DJ או ספק אחר מבטל לפני החתונה?
            </h2>
            <Prose>
              <p>
                פנו לספק בכתב, בדקו את ההסכם ואת סיבת הביטול, בדקו חלופה מוצעת, אל תסכימו אוטומטית
                למחליף שלא מתאים, תעדו הוצאות ונזקים, ובררו זכאות להחזר או לסעד אחר. במחלוקת
                משמעותית — ייעוץ משפטי.
              </p>
              <p>
                שאלות להכניס מראש לחוזה: מי אחראי למצוא מחליף? האם נדרש אישור הזוג? מי נושא בהפרש
                המחיר?
              </p>
            </Prose>
            <SectionImage src="/images/rsvp/guides/wedding-vendors/dj.jpg" alt="אווירת מוזיקה ותקליטן באירוע" />
          </section>

          <section id="postpone-vs-cancel" className="scroll-mt-24">
            <Eyebrow>פרק 11</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה ההבדל בין ביטול חתונה לדחיית תאריך?
            </h2>
            <Prose>
              <p>
                דחיית אירוע אינה בהכרח ביטול, אך יכולה להשפיע על זמינות הספק, העלויות וההסכם. בדקו
                האם אפשר לדחות ללא תשלום, כמה פעמים, עד מתי, האם יש תוספת מחיר, האם המקדמה עוברת
                לתאריך החדש, ומה קורה אם הספק אינו פנוי.
              </p>
            </Prose>
          </section>

          <section id="force-majeure" className="scroll-mt-24">
            <Eyebrow>פרק 12</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              מה קורה לחוזים עם ספקים במקרה של מלחמה, הנחיות חירום או אירוע חריג?
            </h2>
            <div className="mt-6">
              <LegalNote />
            </div>
            <Prose>
              <p>
                אין תשובה אוטומטית לכל מצב. יש לבחון הוראות חוק והנחיות רשמיות, תנאי ההסכם, אפשרות
                ממשית לקיים את האירוע, סעיפי דחייה וביטול, נסיבות המקרה וזכויות שני הצדדים. לא
                מבטיחים כאן החזר אוטומטי או פטור אוטומטי מתשלום.
              </p>
            </Prose>
          </section>

          <section id="by-vendor-type" className="scroll-mt-24">
            <Eyebrow>פרק 13</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              סעיפים מיוחדים לפי סוג ספק
            </h2>
            <div className="mt-8 grid gap-4">
              {[
                ["אולם", "התחייבות למנות, רזרבות, תוספות, כוח אדם, בטיחות, שעות פעילות וביטול. בדקו גם רישיון עסק."],
                ["צלם", "מספר צלמים, שעות, גיבוי, חומרי גלם, עריכה, זכויות שימוש ומועדי מסירה."],
                ["DJ", "זהות התקליטן, שעות, ציוד גיבוי, הגברה, החלפה וביטול."],
                ["איפור ושיער", "זהות נותן השירות, ניסיון, תוספות, שעת הגעה, ליווי, ביטול והחלפה."],
                ["שמלת כלה", "רכישה מול השכרה, התאמות, מדידות, נזקים, מועדי מסירה והחזרה."],
                ["עיצוב ופרחים", "כמויות, סוגי פרחים, תחליפים, הקמה, פירוק, ציוד והשכרות."],
                ["שירותים דיגיטליים", "מה כלול בחבילה, מועד פתיחת השירות, מספר רשומות, חיובים נוספים, מועד האירוע, שינוי תאריך וביטול. תנאי ספק מסוים (כולל Invistimo) אינם מייצגים את כל השוק."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] p-5">
                  <h3 className="text-lg font-black text-[#2C241C]">{title}</h3>
                  <p className="mt-2 text-base leading-7 text-[#5C4A3A]">{text}</p>
                </div>
              ))}
            </div>
            <SectionImage src="/images/rsvp/guides/wedding-vendors/meeting.jpg" alt="פגישת תכנון ועבודה משותפת סביב שולחן" />
          </section>

          <section id="questions-before-pay" className="scroll-mt-24">
            <Eyebrow>פרק 14</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שאלות שצריך לשאול לפני שמשלמים
            </h2>
            <ol className="mt-6 space-y-2">
              {BEFORE_PAY.map((q, i) => (
                <li key={q} className="flex gap-3 rounded-2xl border border-[#EADDC8] bg-white px-4 py-3 text-sm font-semibold md:text-base">
                  <span className="font-black text-[#C7A56B]">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="keep-documents" className="scroll-mt-24">
            <Eyebrow>פרק 15</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              למה חשוב לשמור חוזים, קבלות והתכתבויות?
            </h2>
            <Prose>
              <p>
                שמרו מסמך חתום, הצעת מחיר סופית, אישורי תשלום, שינויים לאחר החתימה, התכתבויות
                מהותיות, אישור תאריך ושעות, והודעות ביטול או דחייה. תיקייה מסודרת לכל ספק חוסכת בירורים
                מאוחרים.
              </p>
            </Prose>
          </section>

          <section id="pre-sign-checklist" className="scroll-mt-24">
            <Eyebrow>פרק 16</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              צ׳קליסט לפני חתימה
            </h2>
            <div className="mt-6">
              <InteractiveChecklist
                storageKey="invistimo-vendor-presign-checklist"
                title="לפני שחותמים ומשלמים"
                items={PRE_SIGN}
              />
            </div>
          </section>

          <section id="faq" className="scroll-mt-24">
            <Eyebrow>שאלות נפוצות</Eyebrow>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
              שאלות על ספקים, חוזים וביטולים
            </h2>
            <div className="mt-8 space-y-3">
              {VENDOR_CONTRACT_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-[24px] border border-[#E6D2AA] bg-[#FFFDF8] px-5 py-4 open:bg-white">
                  <summary className="cursor-pointer list-none text-base font-black text-[#2C241C] [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-3">
                      {faq.q}
                      <span className="text-[#C7A56B] transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-base leading-8 text-[#5C4A3A]">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-[#E6D2AA] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF7] to-[#F7E8CA] p-6 md:p-10">
            <h2 className="text-2xl font-black text-[#2C241C] md:text-3xl">המשך תכנון החתונה</h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-[#5C4A3A]">
              אחרי שמבינים איך סוגרים ספקים — חזרו ללוח התכנון המלא, לאישורי הגעה ולניהול המשימות.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="/info/guides/wedding-planning" className={ctaPrimary} location={`footer_planning:${PATH}`}>
                מדריך תכנון חתונה
              </TrackedCtaLink>
              <TrackedCtaLink href="/event-management" className={ctaSecondary} location={`footer_events:${PATH}`}>
                ניהול אירוע
              </TrackedCtaLink>
              <TrackedCtaLink href="/pricing" className={ctaSecondary} location={`footer_pricing:${PATH}`}>
                חבילות Invistimo
              </TrackedCtaLink>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
