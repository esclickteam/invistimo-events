"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import GuideToolbar from "@/components/marketing/guides/GuideToolbar";
import InteractiveChecklist from "@/components/marketing/guides/InteractiveChecklist";
import StickyToc from "@/components/marketing/guides/StickyToc";
import VendorCompareTable from "@/components/marketing/guides/VendorCompareTable";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { VENDOR_CONTRACT_FAQS } from "./guideFaqs";

const PATH = "/info/guides/wedding-vendors-contracts";
const H1 = "איך בוחרים ספקים לחתונה ומה חייבים לבדוק לפני שסוגרים?";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";

const TOC = [
  { id: "which-first", label: "סדר סגירת ספקים" },
  { id: "seven-checks", label: "7 בדיקות לפני סגירה" },
  { id: "compare-quotes", label: "השוואת הצעות" },
  { id: "read-contract", label: "קריאת החוזה" },
  { id: "deposit-vs-hold", label: "מקדמה מול שריון" },
  { id: "why-hold-fee", label: "למה גובים שריון" },
  { id: "refunds", label: "החזרים" },
  { id: "cancel-policy", label: "מדיניות ביטול" },
  { id: "fourteen-days", label: "14 יום — מתי כן" },
  { id: "vendor-cancels", label: "כשהספק מבטל" },
  { id: "postpone-vs-cancel", label: "דחייה מול ביטול" },
  { id: "force-majeure", label: "כוח עליון" },
  { id: "by-vendor-type", label: "לפי סוג ספק" },
  { id: "questions-before-pay", label: "15 שאלות לפני תשלום" },
  { id: "keep-documents", label: "שמירת מסמכים" },
  { id: "pre-sign-checklist", label: "צ׳ק־ליסט לפני חתימה" },
  { id: "faq", label: "שאלות נפוצות" },
] as const;

const VENDOR_ORDER = [
  { step: "01", title: "תאריך ומקום", text: "אולם, גן או מתחם — כי בלי תאריך קשה לסגור את שאר הספקים." },
  { step: "02", title: "צילום ווידאו", text: "צלמים טובים נתפסים מוקדם; בדקו מי מגיע בפועל ומה נמסר אחרי האירוע." },
  { step: "03", title: "מוזיקה / DJ / להקה", text: "סגנון, שעות, ציוד ותיאום מול הגבלות הרעש של המקום." },
  { step: "04", title: "איפור, שיער ושמלת כלה", text: "ניסיון, מועדי מדידות/חזרות, ותנאי שינוי או ביטול." },
  { step: "05", title: "עיצוב ופרחים", text: "היקף העיצוב, התקנה ופירוק, ותיאום לוחות זמנים מול האולם." },
  { step: "06", title: "שירותים דיגיטליים", text: "הזמנות, אישורי הגעה וניהול אורחים — אחרי שיש תאריך ורשימה מתגבשת." },
] as const;

const SEVEN_CHECKS = [
  {
    title: "היקף השירות",
    text: "מה בדיוק כלול במחיר — שעות, אנשי צוות, ציוד, עריכה, התקנה — ומה נחשב תוספת בתשלום.",
    examples: "צלם: מספר שעות וצלמים. DJ: ציוד ומשך נגינה. אולם: מה כלול במנה ובחבילה.",
  },
  {
    title: "מי מבצע בפועל",
    text: "שם האדם או הצוות שמגיעים לאירוע, לא רק שם המותג בפרסום.",
    examples: "צלם שני, מאפרת מחליפה, DJ מחליף — האם מותר, ובאיזה תיאום.",
  },
  {
    title: "זמינות בתאריך",
    text: "אישור בכתב שהתאריך שמור, כולל שעת התחלה וסיום אם רלוונטי.",
    examples: "אולם: אולם/גן ספציפי. צלם: חפיפה עם אירוע אחר באותו יום.",
  },
  {
    title: "תנאי תשלום",
    text: "מקדמה או דמי שריון, יתרות, אמצעי תשלום ומועדים — בכתב.",
    examples: "30% בחתימה? יתרה שבוע לפני? קיזוז מקדמה מהמחיר הכולל?",
  },
  {
    title: "ביטול ודחייה",
    text: "מה קורה אם אתם מבטלים, אם הספק מבטל, או אם דוחים תאריך.",
    examples: "החזר חלקי לפי מועד, העברת תשלום לתאריך חדש, או קיזוז לפי ההסכם.",
  },
  {
    title: "גיבוי ותוכנית חלופית",
    text: "מה קורה במחלה, תקלה טכנית או מניעה של הספק.",
    examples: "צלם מחליף, ציוד כפול, ספק גיבוי שאושר מראש.",
  },
  {
    title: "תוצרים ולוחות זמנים",
    text: "מתי מקבלים טיוטות, גלריה, אלבום או התקנה — ומה נחשב סיום העסקה.",
    examples: "מסירת תמונות תוך X שבועות; התקנת עיצוב בבוקר האירוע.",
  },
] as const;

const CONTRACT_CLAUSES = [
  "זהות הצדדים ותיאור השירות המדויק",
  "מחיר כולל, מה כלול ומה בתוספת",
  "מועדי תשלום: מקדמה / דמי שריון / יתרות",
  "מדיניות ביטול מצד הלקוח ומצד הספק",
  "דחיית תאריך והעברת תשלומים",
  "מי מגיע בפועל ותנאי החלפת צוות",
  "אחריות, ביטוח וגיבוי (כשרלוונטי)",
  "מועדי מסירת תוצרים וזכויות שימוש",
  "אופן הודעות (מייל / וואטסאפ / דואר)",
  "סמכות שיפוט / בוררות — אם מופיע בהסכם",
] as const;

const DEPOSIT_COMPARE = [
  {
    label: "מקדמה",
    points: [
      "בדרך כלל חלק ממחיר העסקה",
      "לעיתים מתקזזת מהסכום הסופי",
      "השם לבדו אינו קובע אם יש החזר",
      "המשמעות בפועל — לפי ההסכם והדין",
    ],
  },
  {
    label: "דמי שריון / שמירת תאריך",
    points: [
      "לעיתים מתוארים כתשלום על שמירת זמינות",
      "לא תמיד מוצגים כחלק ממחיר השירות",
      "ייתכן קיזוז או אי־קיזוז — לפי הנוסח",
      "אין להניח מראש «לא ניתן להחזר בכל מקרה»",
    ],
  },
] as const;

const CANCEL_TIERS_EXAMPLE = [
  { window: "יותר מ־90 יום לפני", outcome: "החזר חלקי גבוה / קיזוז נמוך — לפי ההסכם" },
  { window: "60–90 יום לפני", outcome: "החזר חלקי בינוני או קיזוז מקדמה" },
  { window: "30–60 יום לפני", outcome: "החזר נמוך יותר / ייתכן קיזוז משמעותי" },
  { window: "פחות מ־30 יום", outcome: "לעיתים ללא החזר לפי ההסכם — בכפוף לדין" },
] as const;

const QUESTIONS_BEFORE_PAY = [
  "מה בדיוק כלול במחיר שצוין בהצעה?",
  "מהן התוספות הנפוצות וכמה הן עולות?",
  "מי מגיע בפועל לאירוע — שם מלא?",
  "האם התאריך מאושר בכתב ורק אחרי תשלום?",
  "התשלום הראשון הוא מקדמה או דמי שריון — ומה ההבדל אצלכם?",
  "האם התשלום הראשון מתקזז מהמחיר הכולל?",
  "מה קורה אם אנחנו מבטלים — לפי מועדים?",
  "מה קורה אם אתם מבטלים או לא יכולים לספק?",
  "האם אפשר לדחות תאריך, ובאילו תנאים?",
  "יש גיבוי לציוד / צוות מחליף?",
  "מתי משלמים את היתרה?",
  "מתי מקבלים תוצרים (תמונות, עיצוב, וכו׳)?",
  "איך מתעדים שינויים להסכם אחרי החתימה?",
  "מה פרטי החשבונית / הקבלה?",
  "למי פונים במחלוקת או בשאלה דחופה?",
] as const;

const PRE_SIGN_ITEMS = [
  "קראתי את ההסכם המלא לפני תשלום ראשון",
  "השוויתי לפחות שתי הצעות לפי היקף — לא רק מחיר",
  "רשמתי מה כלול ומה בתוספת",
  "וידאתי מי מגיע בפועל לאירוע",
  "הבנתי אם התשלום הוא מקדמה או דמי שריון לפי הנוסח",
  "בדקתי סעיפי ביטול, דחייה והחזר",
  "בדקתי מה קורה אם הספק מבטל",
  "יש לי עותק חתום / נספחים במייל או בתיקייה",
  "שמרתי קבלה או אסמכתא לתשלום",
  "לא הסתמכתי על הבטחה בעל פה שלא מופיעה בכתב",
] as const;

const VENDOR_TYPES = [
  {
    title: "אולם / גן",
    items: [
      "מינימום מנות, מחיר למנה, רזרבות",
      "מה כלול בחבילה (בר, הגברה, עיצוב בסיסי)",
      "מועד מסירת מספר סופי",
      "ביטול/דחייה ותשלומים",
    ],
    href: "/info/guides/wedding-venue-guest-guarantee",
    linkLabel: "מדריך התחייבות לאולם",
  },
  {
    title: "צלם / וידאו",
    items: ["שעות וצוות", "זכויות שימוש", "מועד מסירה", "גיבוי וצלם מחליף"],
  },
  {
    title: "DJ / מוזיקה",
    items: ["משך נגינה", "ציוד", "הגבלות אולם", "תוספת שעה"],
  },
  {
    title: "איפור ושיער",
    items: ["ניסיון / חזרה", "שעת הגעה", "צוות מחליף", "ביטול קרוב לאירוע"],
  },
  {
    title: "שמלת כלה",
    items: ["מדידות", "תיקונים", "מקדמה מול יתרה", "מדיניות החזרה/החלפה לפי החנות"],
  },
  {
    title: "עיצוב ופרחים",
    items: ["תוכנית עיצוב", "התקנה ופירוק", "שינויים במחיר", "תיאום מול אולם"],
  },
  {
    title: "שירותים דיגיטליים",
    items: [
      "מה כלול בחבילה (הזמנות, RSVP, הושבה)",
      "תנאי שימוש וביטול של אותו ספק",
      "אל תניחו שתנאי ספק אחד = «סטנדרט השוק»",
    ],
  },
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-black tracking-[0.14em] text-[#7A5530]">{children}</p>
  );
}

function LegalNote({ className = "" }: { className?: string }) {
  return (
    <aside
      role="note"
      className={`rounded-[22px] border border-[#E7D3B0] bg-[#FFF8EA] px-5 py-4 text-sm leading-7 text-[#5C4A3A] ${className}`}
    >
      <p className="font-bold text-[#2C241C]">
        המדריך הוא מידע כללי בלבד ואינו תחליף לייעוץ משפטי פרטני. הדין עשוי להשתנות; בדקו מקורות
        רשמיים.
      </p>
      <p className="mt-2 text-[#7A6042]">תאריך סקירה משפטית־כללית: 26 באוקטובר 2026 (Asia/Jerusalem).</p>
    </aside>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  children,
  tone = "cream",
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  tone?: "cream" | "paper";
}) {
  const bg = tone === "cream" ? "bg-[#FBF6EE]" : "bg-[#FFFDF8]";
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-28 ${bg} px-0 py-12 md:py-16`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={`${id}-title`} className="mt-3 text-3xl font-black leading-tight text-[#2C241C] md:text-4xl">
        {title}
      </h2>
      <div className="mt-6 space-y-5 text-base leading-8 text-[#5C4A3A] md:text-lg">{children}</div>
    </section>
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
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-10 pt-6 md:gap-12 md:px-8 md:pb-14 md:pt-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">מדריך · Invistimo</p>
            <p className="mt-3 text-sm font-black tracking-[0.08em] text-[#8A642E]">
              בוחרים נכון. חותמים בביטחון.
            </p>
            <h1 className="mt-3 max-w-2xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.03em] text-[#2C241C] md:text-[2.55rem]">
              {H1}
            </h1>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                בחירת ספקים לחתונה היא לא רק «מי הכי יפה באינסטגרם» — זו סדרת החלטות על כסף, תאריך
                והתחייבויות כתובות.
              </p>
              <p>
                במדריך תמצאו סדר סגירה מומלץ, איך משווים הצעות בלי ליפול במחיר הנמוך בלבד, מה לבדוק
                לפני מקדמה, ומה ההבדל בין מקדמה לדמי שריון — בשפה זהירה, בלי הבטחות משפטיות.
              </p>
              <p>
                גם תנאי ביטול, דחייה והחזר משתנים בין ספקים. המטרה כאן: לעזור לכם לשאול שאלות נכונות
                ולשמור מסמכים — לפני שסוגרים.
              </p>
            </div>
            <div className="mt-6">
              <GuideToolbar title={H1} path={PATH} readingMinutes={30} />
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="#compare-quotes" className={ctaPrimary} location={`hero_compare:${PATH}`}>
                להשוואת הצעות מחיר
              </TrackedCtaLink>
              <TrackedCtaLink
                href="#pre-sign-checklist"
                className={ctaSecondary}
                location={`hero_checklist:${PATH}`}
              >
                לצ׳ק־ליסט לפני חתימה
              </TrackedCtaLink>
            </div>
          </div>

          <div className="relative">
            <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_28px_70px_rgba(58,39,20,0.12)]">
              <Image
                src="/images/rsvp/guides/wedding-vendors/contract.jpg"
                alt="מסמכים ועט על שולחן — המחשה לקריאת חוזה לפני חתימה עם ספק חתונה"
                width={1280}
                height={860}
                className="h-auto w-full object-cover"
                priority
                sizes="(max-width:1024px) 100vw, 46vw"
              />
            </figure>
            {!reduce ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-center text-sm font-semibold text-[#7A6042]"
              >
                קוראים לפני שמקדמים — לא אחרי
              </motion.p>
            ) : (
              <p className="mt-4 text-center text-sm font-semibold text-[#7A6042]">
                קוראים לפני שמקדמים — לא אחרי
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <LegalNote className="mb-4" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,15.5rem)_minmax(0,1fr)] lg:items-start">
          <StickyToc items={[...TOC]} title="במדריך" />

          <div className="min-w-0">
            {/* 1 which-first */}
            <SectionShell id="which-first" eyebrow="סדר עבודה" title="באיזה סדר סוגרים ספקים?" tone="paper">
              <p>
                רוב הזוגות מתחילים במקום ובתאריך — כי בלי נקודת עיגון קשה לסגור צילום, מוזיקה ועיצוב.
                אחרי שהתאריך ברור, סוגרים את הספקים שהזמינות שלהם מוגבלת, ורק אז משלימים שירותים
                דיגיטליים ותוספות.
              </p>
              <ol className="grid gap-3 sm:grid-cols-2">
                {VENDOR_ORDER.map((item) => (
                  <li
                    key={item.step}
                    className="rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-5"
                  >
                    <p className="text-xs font-black tracking-[0.14em] text-[#8A642E]">{item.step}</p>
                    <p className="mt-2 text-lg font-black text-[#2C241C]">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">{item.text}</p>
                  </li>
                ))}
              </ol>
              <p>
                לפירוט לוחות זמנים ותכנון כללי ראו את{" "}
                <Link
                  href="/info/guides/wedding-planning"
                  className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                >
                  מדריך תכנון החתונה
                </Link>
                .
              </p>
              <div className="pt-2">
                <TrackedCtaLink
                  href="/info/guides/wedding-planning"
                  className={ctaSecondary}
                  location={`planning:${PATH}`}
                >
                  למדריך תכנון חתונה
                </TrackedCtaLink>
              </div>
            </SectionShell>

            {/* 2 seven-checks */}
            <SectionShell
              id="seven-checks"
              eyebrow="לפני שסוגרים"
              title="7 בדיקות שחוסכות כאב ראש"
              tone="cream"
            >
              <p>
                לפני שמשווים מחירים — ודאו שאתם משווים את אותו דבר. שבע הבדיקות האלה מתאימות כמעט לכל
                סוג ספק, עם דוגמאות לפי תחום.
              </p>
              <ol className="space-y-4">
                {SEVEN_CHECKS.map((check, i) => (
                  <li
                    key={check.title}
                    className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] px-5 py-5"
                  >
                    <div className="flex gap-4">
                      <span className="text-sm font-black tracking-[0.12em] text-[#8A642E]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-lg font-black text-[#2C241C]">{check.title}</h3>
                        <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{check.text}</p>
                        <p className="mt-3 rounded-2xl bg-[#FBF6EE] px-4 py-3 text-sm leading-7 text-[#7A6042]">
                          <span className="font-bold text-[#5E4735]">דוגמאות: </span>
                          {check.examples}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA]">
                <Image
                  src="/images/rsvp/guides/wedding-vendors/meeting.jpg"
                  alt="פגישת תכנון — שיחה על הצעות מחיר ותיאום ציפיות עם ספק"
                  width={1400}
                  height={900}
                  className="h-auto w-full object-cover"
                  sizes="(max-width:1024px) 100vw, 720px"
                />
              </figure>
            </SectionShell>

            {/* 3 compare-quotes */}
            <SectionShell
              id="compare-quotes"
              eyebrow="השוואה"
              title="למה לא בוחרים רק לפי המחיר הנמוך?"
              tone="paper"
            >
              <p>
                הצעה זולה יותר עלולה לכלול פחות שעות, צוות קטן יותר, בלי עריכה, בלי גיבוי או עם תנאי
                ביטול מחמירים. הצעה יקרה יותר עשויה לכלול תוצרים שאתם בכלל לא צריכים.
              </p>
              <p>
                השוו לפי היקף השירות, תנאי תשלום וביטול, זמינות ומי מגיע בפועל. השתמשו בטבלה למטה —
                אפשר גם להוריד תבנית CSV ריקה או את הטבלה שמילאתם.
              </p>
              <VendorCompareTable />
            </SectionShell>

            {/* 4 read-contract */}
            <SectionShell
              id="read-contract"
              eyebrow="הסכם"
              title="למה קוראים את החוזה לפני המקדמה?"
              tone="cream"
            >
              <LegalNote />
              <p>
                תשלום ראשון יוצר מחויבות מעשית — ולעיתים גם חוזית — עוד לפני שהספקתם «לסגור בראש». לכן
                עדיף לקרוא את המסמך המלא לפני ההעברה, לא אחרי.
              </p>
              <p className="font-bold text-[#2C241C]">סעיפים שכדאי לחפש בהסכם:</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {CONTRACT_CLAUSES.map((clause) => (
                  <li
                    key={clause}
                    className="rounded-[18px] border border-[#E7D3B0] bg-[#FFFDF8] px-4 py-3 text-[15px] font-semibold leading-7 text-[#2C241C]"
                  >
                    {clause}
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-7 text-[#7A6042]">
                אם סעיף לא ברור — בקשו הבהרה בכתב לפני החתימה. אל תסתמכו על «ככה זה אצל כולם».
              </p>
            </SectionShell>

            {/* 5 deposit-vs-hold */}
            <SectionShell
              id="deposit-vs-hold"
              eyebrow="תשלום ראשון"
              title="מקדמה מול דמי שריון — מה ההבדל?"
              tone="paper"
            >
              <LegalNote />
              <p>
                בשיחות יומיומיות הזוגות והספקים משתמשים לפעמים באותן מילים למשמעויות שונות. מה שקובע
                אינו הכותרת במסרון — אלא מה כתוב בהסכם, מהות התשלום והדין החל.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {DEPOSIT_COMPARE.map((col) => (
                  <div
                    key={col.label}
                    className="rounded-[24px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-5"
                  >
                    <h3 className="text-xl font-black text-[#2C241C]">{col.label}</h3>
                    <ul className="mt-4 space-y-2.5">
                      {col.points.map((p) => (
                        <li key={p} className="text-[15px] leading-7 text-[#5C4A3A]">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8]">
                <table className="w-full min-w-[520px] text-right text-[15px]">
                  <caption className="sr-only">השוואה כללית בין מקדמה לדמי שריון</caption>
                  <thead className="bg-[#F7EFE0] text-sm font-black text-[#5E4735]">
                    <tr>
                      <th scope="col" className="px-5 py-3">
                        שאלה
                      </th>
                      <th scope="col" className="px-5 py-3">
                        מקדמה (בדרך כלל)
                      </th>
                      <th scope="col" className="px-5 py-3">
                        דמי שריון (לעיתים)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["קשר למחיר הכולל", "מתקזזת מהמחיר", "ייתכן שלא תוצג כקיזוז"],
                      ["מטרה מדוברת", "פתיחת עסקה", "שמירת תאריך/זמינות"],
                      ["החזר בביטול", "לפי הסכם ודין — לא אוטומטי", "לפי הסכם ודין — לא אוטומטי"],
                      ["מה לבדוק", "אחוז, מועד, קיזוז", "הגדרה בכתב + קיזוז/אי־קיזוז"],
                    ].map((row) => (
                      <tr key={row[0]} className="border-t border-[#EFE2CC]">
                        <th scope="row" className="px-5 py-3.5 font-bold text-[#2C241C]">
                          {row[0]}
                        </th>
                        <td className="px-5 py-3.5 text-[#5C4A3A]">{row[1]}</td>
                        <td className="px-5 py-3.5 text-[#5C4A3A]">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm leading-7 text-[#7A6042]">
                הטבלה היא כלי התמצאות בלבד. אין בה קביעה שכל מקדמה או כל דמי שריון ניתנים או אינם
                ניתנים להחזר.
              </p>
            </SectionShell>

            {/* 6 why-hold-fee */}
            <SectionShell
              id="why-hold-fee"
              eyebrow="מבט עסקי"
              title="למה בכלל גובים דמי שריון?"
              tone="cream"
            >
              <p>
                מצד הספק, שמירת תאריך פירושה לעיתים להפסיק לשווק אותו לאחרים, לתאם צוות, ולהיערך
                להוצאות מוקדמות. תשלום ראשוני מפחית סיכון עסקי כשהלקוח משנה תאריך או מבטל ברגע האחרון.
              </p>
              <p>
                מצד הזוג, חשוב להבין שההסבר העסקי אינו זהה לקביעה משפטית על זכות ההחזר. גם אם ברור
                למה הספק מבקש שריון — עדיין שואלים בכתב: האם מתקזז? מה קורה בביטול? מה קורה בדחייה?
              </p>
              <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA]">
                <Image
                  src="/images/rsvp/guides/wedding-vendors/handshake.jpg"
                  alt="לחיצת יד עסקית — המחשה להסכמה הדדית אחרי הבנת תנאי התשלום"
                  width={1400}
                  height={900}
                  className="h-auto w-full object-cover"
                  sizes="(max-width:1024px) 100vw, 720px"
                />
              </figure>
            </SectionShell>

            {/* 7 refunds */}
            <SectionShell
              id="refunds"
              eyebrow="החזרים"
              title="החזר כספי — לא תמיד, ולא אוטומטית"
              tone="paper"
            >
              <LegalNote />
              <p>
                אין כלל שאומר שכל תשלום ראשון חוזר במלואו, ואין גם כלל שאומר ששום תשלום לא חוזר לעולם.
                התוצאה תלויה בגורמים כמו מועד הביטול, מה כבר בוצע, נוסח ההסכם, סיבת הביטול והדין החל.
              </p>
              <p className="rounded-[22px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-4 font-bold text-[#2C241C]">
                אין כאן «מנצח» קבוע מראש בין הזוג לספק — ואין במדריך הבטחת תוצאה משפטית.
              </p>
              <p>
                <span className="font-bold text-[#2C241C]">דוגמה להמחשה בלבד: </span>
                זוג ביטל 70 יום לפני האירוע אחרי מקדמה שמתקזזת מהמחיר. לפי הסכם מסוים ייתכן החזר
                חלקי; לפי הסכם אחר — קיזוז מלא של המקדמה. אותה סיטואציה, תוצאות שונות — לכן קוראים את
                הנוסח שלכם.
              </p>
            </SectionShell>

            {/* 8 cancel-policy */}
            <SectionShell
              id="cancel-policy"
              eyebrow="ביטול"
              title="מה כוללת מדיניות ביטול טובה?"
              tone="cream"
            >
              <LegalNote />
              <p>
                מדיניות ברורה חוסכת ויכוחים: מועדים, אחוזים או סכומים, דחייה מול ביטול, ומה קורה אם
                הספק הוא זה שמבטל. אם ההסכם מעורפל — בקשו ניסוח מדויק לפני התשלום.
              </p>
              <p className="text-sm font-bold leading-7 text-[#8A642E]">
                הטבלה הבאה היא דוגמת המחשה בלבד — לא תקן חוק, לא «מקובל בשוק», ולא המלצה לנוסח.
              </p>
              <div className="overflow-x-auto rounded-[24px] border border-dashed border-[#C9A45C] bg-[#FFFDF8]">
                <table className="w-full min-w-[480px] text-right text-[15px]">
                  <caption className="px-5 py-3 text-right text-xs font-black tracking-[0.12em] text-[#8A642E]">
                    דוגמת מדרגות להמחשה בלבד — לא דין ולא סטנדרט מחייב
                  </caption>
                  <thead className="bg-[#F7EFE0] text-sm font-black text-[#5E4735]">
                    <tr>
                      <th scope="col" className="px-5 py-3">
                        חלון זמן (המחשה)
                      </th>
                      <th scope="col" className="px-5 py-3">
                        תוצאה אפשרית בהסכם (המחשה)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CANCEL_TIERS_EXAMPLE.map((row) => (
                      <tr key={row.window} className="border-t border-[#EFE2CC]">
                        <td className="px-5 py-3.5 font-semibold text-[#2C241C]">{row.window}</td>
                        <td className="px-5 py-3.5 text-[#5C4A3A]">{row.outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionShell>

            {/* 9 fourteen-days */}
            <SectionShell
              id="fourteen-days"
              eyebrow="זכויות צרכן"
              title="האם תמיד אפשר לבטל תוך 14 יום?"
              tone="paper"
            >
              <LegalNote />
              <p>
                <span className="font-bold text-[#2C241C]">לא. </span>
                אין כלל אוניברסלי של «14 יום לכל ספקי החתונה». זכות ביטול בעסקאות מרחוק
                (אינטרנט/טלפון) קיימת במצבים מסוימים לפי דיני הגנת הצרכן — אך אינה חלה אוטומטית על כל
                התקשרות שנעשתה בפגישה באולם או אצל הספק.
              </p>
              <p>
                גם כשמדובר בעסקה מרחוק, יש חריגים ותנאים. לגבי חוזי אולמות אירועים, מועצת הצרכנים
                ציינה בהקשרים כלליים כי תקנות הביטול לא בהכרח חלות באותו אופן כמו על קניות מרחוק —
                זו הנחיה כללית בלבד, לא פסיקה על המקרה שלכם.
              </p>
              <ul className="space-y-2 text-[15px] leading-7">
                <li>
                  <a
                    href="https://www.gov.il/he/pages/returns"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                  >
                    gov.il — מידע על החזרות וביטולים
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.kolzchut.org.il/he/%D7%91%D7%99%D7%98%D7%95%D7%9C_%D7%A2%D7%A1%D7%A7%D7%94_%D7%A9%D7%A0%D7%A2%D7%A9%D7%AA%D7%94_%D7%91%D7%90%D7%99%D7%A0%D7%98%D7%A8%D7%A0%D7%98_%D7%90%D7%95_%D7%91%D7%98%D7%9C%D7%A4%D7%95%D7%9F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                  >
                    כל־זכות — ביטול עסקה שנעשתה באינטרנט או בטלפון
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.consumers.org.il/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#8A642E] underline-offset-4 hover:underline"
                  >
                    מועצת הצרכנים — מידע כללי לצרכנים
                  </a>
                </li>
              </ul>
            </SectionShell>

            {/* 10 vendor-cancels */}
            <SectionShell
              id="vendor-cancels"
              eyebrow="מצד הספק"
              title="מה אם הספק מבטל?"
              tone="cream"
            >
              <p>
                הסכם טוב מגדיר גם את המסלול ההפוך: הספק לא יכול לספק. האפשרויות הנפוצות בהסכמים כוללות
                החזר תשלומים, הצעת ספק מחליף בתיאום, או שילוב של השניים — אך אין תוצאה אחידה לכל
                המקרים.
              </p>
              <p>
                בקשו הודעת ביטול בכתב, שמרו תיעוד, ואל תמהרו לשלם לספק מחליף לפני שברור מה קורה עם
                התשלומים הקודמים. במחלוקת מהותית — ייעוץ פרטני עדיף על הנחות מהרשת.
              </p>
              <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA]">
                <Image
                  src="/images/rsvp/guides/wedding-vendors/photographer.jpg"
                  alt="צלם בעבודה באירוע — המחשה לחשיבות גיבוי וצוות מחליף"
                  width={1400}
                  height={900}
                  className="h-auto w-full object-cover"
                  sizes="(max-width:1024px) 100vw, 720px"
                />
              </figure>
            </SectionShell>

            {/* 11 postpone-vs-cancel */}
            <SectionShell
              id="postpone-vs-cancel"
              eyebrow="שינוי תאריך"
              title="לדחות או לבטל — מה בודקים קודם?"
              tone="paper"
            >
              <p>
                דחייה שומרת לעיתים על חלק מהתשלומים ועל הקשר עם הספק — אם יש תאריך חלופי פנוי. ביטול
                מפעיל את סעיפי ההחזר או הקיזוז. לפעמים דחייה יקרה פחות מביטול; לפעמים אין תאריך פנוי
                והביטול הוא האפשרות היחידה.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "האם יש תאריך חלופי אצל אותו ספק?",
                  "האם המקדמה/שריון עוברים לתאריך החדש?",
                  "האם המחיר משתנה בתאריך החדש?",
                  "מה קורה אם הדחייה נכשלת אחר כך?",
                ].map((q) => (
                  <li
                    key={q}
                    className="rounded-[18px] border border-[#E7D3B0] bg-[#FBF6EE] px-4 py-3 text-[15px] font-semibold leading-7 text-[#2C241C]"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            </SectionShell>

            {/* 12 force-majeure */}
            <SectionShell
              id="force-majeure"
              eyebrow="חירום"
              title="כוח עליון ומצבי חירום — בלי הבטחת החזר אוטומטי"
              tone="cream"
            >
              <LegalNote />
              <p>
                סעיף כוח עליון (או ניסוחים דומים) עוסק במצבים חריגים שמקשים על קיום ההסכם. גם כשהוא
                קיים, הוא לא תמיד מבטיח החזר מלא, ביטול ללא עלות, או דחייה אוטומטית ללא תנאים.
              </p>
              <p>
                קראו מה מוגדר כאירוע מזכה, מי מודיע למי, ומה קורה לתשלומים. אין במדריך הבטחה ש«בחירום
                תמיד מקבלים את הכסף בחזרה».
              </p>
            </SectionShell>

            {/* 13 by-vendor-type */}
            <SectionShell
              id="by-vendor-type"
              eyebrow="לפי תחום"
              title="נקודות לבדיקה לפי סוג ספק"
              tone="paper"
            >
              <p>
                כל תחום מדגיש סעיפים אחרים. שימו לב: תנאי Invistimo חלים על שירותי Invistimo בלבד —
                לא מציגים אותם כאן כ«תנאי השוק» לכל הספקים.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {VENDOR_TYPES.map((v) => (
                  <div
                    key={v.title}
                    className="rounded-[24px] border border-[#E7D3B0] bg-[#FBF6EE] px-5 py-5"
                  >
                    <h3 className="text-lg font-black text-[#2C241C]">{v.title}</h3>
                    <ul className="mt-3 space-y-2">
                      {v.items.map((item) => (
                        <li key={item} className="text-[15px] leading-7 text-[#5C4A3A]">
                          {item}
                        </li>
                      ))}
                    </ul>
                    {"href" in v && v.href ? (
                      <Link
                        href={v.href}
                        className="mt-4 inline-flex text-sm font-black text-[#8A642E] underline-offset-4 hover:underline"
                      >
                        {v.linkLabel} ←
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
              <figure className="overflow-hidden rounded-[28px] border border-[#E6D2AA]">
                <Image
                  src="/images/rsvp/guides/wedding-vendors/dj.jpg"
                  alt="אווירת מוזיקה באירוע — המחשה לבדיקת חוזה DJ והגבלות אולם"
                  width={1400}
                  height={900}
                  className="h-auto w-full object-cover"
                  sizes="(max-width:1024px) 100vw, 720px"
                />
              </figure>
              <div className="flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink
                  href="/event-management"
                  className={ctaSecondary}
                  location={`em:${PATH}`}
                >
                  לניהול אירוע
                </TrackedCtaLink>
                <TrackedCtaLink href="/pricing" className={ctaSecondary} location={`pricing:${PATH}`}>
                  לחבילות ומחירים
                </TrackedCtaLink>
              </div>
            </SectionShell>

            {/* 14 questions-before-pay */}
            <SectionShell
              id="questions-before-pay"
              eyebrow="לפני העברה"
              title="15 שאלות לפני שמשלמים"
              tone="cream"
            >
              <ol className="grid gap-3 md:grid-cols-2">
                {QUESTIONS_BEFORE_PAY.map((q, i) => (
                  <li
                    key={q}
                    className="flex gap-3 rounded-[20px] border border-[#E7D3B0] bg-[#FFFDF8] px-4 py-4"
                  >
                    <span className="text-sm font-black tracking-[0.1em] text-[#8A642E]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[15px] font-bold leading-7 text-[#2C241C]">{q}</span>
                  </li>
                ))}
              </ol>
            </SectionShell>

            {/* 15 keep-documents */}
            <SectionShell
              id="keep-documents"
              eyebrow="תיעוד"
              title="אילו מסמכים שומרים?"
              tone="paper"
            >
              <p>
                תיקייה אחת לכל ספק — דיגיטלית או מודפסת — חוסכת חיפושים ביום לחץ. שמרו גם התכתבויות
                שבהן אושרו שינויים מהותיים.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "הצעת מחיר / מפרט",
                  "חוזה ונספחים חתומים",
                  "קבלות ואסמכתאות תשלום",
                  "אישור תאריך בכתב",
                  "שינויים שאושרו אחרי החתימה",
                  "הודעות ביטול או דחייה",
                ].map((item) => (
                  <li
                    key={item}
                    className="rounded-[18px] border border-[#E7D3B0] bg-[#FBF6EE] px-4 py-3 text-[15px] font-semibold text-[#2C241C]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </SectionShell>

            {/* 16 pre-sign checklist */}
            <SectionShell
              id="pre-sign-checklist"
              eyebrow="סיכום מעשי"
              title="צ׳ק־ליסט לפני חתימה ותשלום"
              tone="cream"
            >
              <p>סמנו את מה שכבר עשיתם. הסימונים נשמרים במכשיר זה בלבד.</p>
              <InteractiveChecklist
                id="vendor-pre-sign-list"
                storageKey="invistimo-vendor-contract-checklist-v1"
                title="לפני שסוגרים עם ספק"
                items={[...PRE_SIGN_ITEMS]}
              />
            </SectionShell>

            {/* 17 faq */}
            <SectionShell id="faq" eyebrow="שאלות נפוצות" title="שאלות על ספקים, חוזים והחזרים" tone="paper">
              <LegalNote />
              <div className="space-y-3">
                {VENDOR_CONTRACT_FAQS.map((item) => (
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
            </SectionShell>

            <section className="mb-16 overflow-hidden rounded-[32px] border border-[#E3C990] bg-gradient-to-l from-[#FFF8EA] via-white to-[#F7E8CA] p-7 md:p-10">
              <h2 className="text-3xl font-black text-[#35281F]">רוצים סדר גם בניהול האורחים?</h2>
              <p className="mt-3 max-w-2xl leading-8 text-[#5C4A3A]">
                אחרי שסוגרים ספקים — אישורי הגעה וניהול האירוע עוזרים לעדכן מספרים מול האולם בזמן.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink
                  href="/info/guides/wedding-planning"
                  className={ctaPrimary}
                  location={`footer_planning:${PATH}`}
                >
                  מדריך תכנון חתונה
                </TrackedCtaLink>
                <TrackedCtaLink
                  href="/event-management"
                  className={ctaSecondary}
                  location={`footer_em:${PATH}`}
                >
                  ניהול אירוע
                </TrackedCtaLink>
                <TrackedCtaLink
                  href="/pricing"
                  className={ctaSecondary}
                  location={`footer_pricing:${PATH}`}
                >
                  מחירים
                </TrackedCtaLink>
              </div>
              <nav aria-label="מדריכים קשורים" className="mt-8 flex flex-wrap gap-3 text-sm">
                {[
                  { href: "/info/guides/wedding-venue-guest-guarantee", label: "התחייבות לאולם" },
                  { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים RSVP" },
                  { href: "/info/guides/cost-rsvp-wedding", label: "עלויות אישורי הגעה" },
                  { href: "/info/guides", label: "כל המדריכים" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-full border border-[#E6D2AA] bg-white/80 px-4 py-2 font-semibold text-[#5E4735] underline-offset-4 hover:underline"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}
