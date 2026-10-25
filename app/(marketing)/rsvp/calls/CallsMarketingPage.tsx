"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import CallDemoPlayer from "./components/CallDemoPlayer";
import CallsHeroVisual from "./components/CallsHeroVisual";
import { CALLS_FAQS } from "./callsFaqs";
import {
  AI_BENEFITS,
  AI_STEPS,
  CALLS_PATH,
  COMBINED_STEPS,
  COMPARE_ROWS,
  DIAL_OUTCOMES,
  EVENT_TYPES,
  FLOW_PATH,
  HUMAN_CASES,
  LINKS,
  MISTAKES,
  MORE_GUIDES,
  NO_ANSWER_EXAMPLES,
  PACKAGE_BLURBS,
  REPORT_DEMO_ROWS,
  REPORT_FIELDS,
  WHY_CARDS,
} from "./content";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-calls-display",
});

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black !text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-[#FBF6EE] px-8 py-3.5 text-base font-black !text-[#2C241C] shadow-[0_12px_30px_rgba(91,63,32,0.08)] transition hover:bg-white";
const ctaGold =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220] px-8 py-3.5 text-base font-black !text-white shadow-[0_18px_38px_rgba(184,134,45,0.26)] transition hover:-translate-y-0.5";

function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <p
      className={`text-xs font-black tracking-[0.2em] ${
        onDark ? "text-[#E8C988]" : "text-[#8A642E]"
      }`}
    >
      {children}
    </p>
  );
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function ModeToggle() {
  const [mode, setMode] = useState<"ai" | "human">("ai");
  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_16px_40px_rgba(44,36,28,0.06)] md:p-7">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="סוג שיחה">
        {(
          [
            { id: "ai" as const, label: "שיחה מוקלטת עם AI" },
            { id: "human" as const, label: "שיחה אנושית" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => setMode(tab.id)}
            className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
              mode === tab.id
                ? "bg-[#2A211A] text-[#F7EDDF]"
                : "border border-[#E6D2AA] bg-white text-[#5C4A3A] hover:border-[#C9A45C]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-5" role="tabpanel">
        {mode === "ai" ? (
          <div className="space-y-3 text-[15px] leading-7 text-[#5C4A3A]">
            <p className={`text-xl text-[#2A211A] ${display.className}`}>הודעה קולית אחידה, מענה במקשים</p>
            <p>
              האורח שומע קריינות AI עם שם האירוע, ובוחר 1 / 2 / 3. מתאים לפנייה רחבה למי שעדיין לא השיב
              להודעות.
            </p>
            <ul className="grid gap-2 sm:grid-cols-3">
              {["מסר אחיד", "מענה במקלדת", "עדכון אוטומטי לרשימה"].map((t) => (
                <li key={t} className="rounded-2xl border border-[#EFE3CF] bg-[#FBF6EE] px-3 py-2.5 text-sm font-bold text-[#2A211A]">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-3 text-[15px] leading-7 text-[#5C4A3A]">
            <p className={`text-xl text-[#2A211A] ${display.className}`}>נציג אנושי, בירור גמיש</p>
            <p>
              נציג מתקשר, אוסף תשובה ומעדכן את הרשומה — כולל מספר משתתפים, מתלבט, או בקשה לחזרה בסבב
              הבא. מתאים כשצריך יותר מכן/לא.
            </p>
            <ul className="grid gap-2 sm:grid-cols-3">
              {["שיחה אישית", "בירור מספר מגיעים", "תיעוד במערכת"].map((t) => (
                <li key={t} className="rounded-2xl border border-[#EFE3CF] bg-[#FBF6EE] px-3 py-2.5 text-sm font-bold text-[#2A211A]">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportLightbox() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-white text-right shadow-[0_20px_50px_rgba(44,36,28,0.1)] transition hover:-translate-y-0.5"
        aria-haspopup="dialog"
      >
        <div className="border-b border-[#EFE3CF] bg-[#2A211A] px-4 py-3 text-[#F7EDDF]">
          <p className="text-xs font-black tracking-[0.16em] text-[#E8C988]">דוח שיחות · דמו</p>
          <p className="mt-1 text-sm font-bold">מי ענה, מי לא, ומה התעדכן</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-[#FBF6EE] text-[#7A6042]">
              <tr>
                {["שעה", "אורח", "טלפון", "סבב", "סטטוס", "נענתה", "הקשה", "תשובה"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-right font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REPORT_DEMO_ROWS.map((row) => (
                <tr key={row.guest} className="border-t border-[#F0E6D6]">
                  <td className="px-3 py-2.5 text-[#5C4A3A]">{row.time}</td>
                  <td className="px-3 py-2.5 font-bold text-[#2A211A]">{row.guest}</td>
                  <td className="px-3 py-2.5 text-[#5C4A3A] dir-ltr text-left">{row.phone}</td>
                  <td className="px-3 py-2.5 text-[#5C4A3A]">{row.round}</td>
                  <td className="px-3 py-2.5 font-semibold text-[#2A211A]">{row.status}</td>
                  <td className="px-3 py-2.5 text-[#5C4A3A]">{row.answered}</td>
                  <td className="px-3 py-2.5 text-[#5C4A3A]">{row.digit}</td>
                  <td className="px-3 py-2.5 text-[#5C4A3A]">{row.rsvp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[#EFE3CF] px-4 py-3 text-sm font-bold text-[#8A642E] group-hover:underline">
          לחצו להגדלה · שמות ומספרים פיקטיביים
        </p>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1612]/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="דוח שיחות מוגדל"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[24px] bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-black text-[#2A211A]">דוח שיחות — דוגמה להמחשה</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#E6D2AA] px-4 py-2 text-sm font-bold text-[#2A211A]"
              >
                סגירה
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="bg-[#FBF6EE] text-[#7A6042]">
                  <tr>
                    {["שעה", "אורח", "טלפון", "סבב", "סטטוס", "נענתה", "הקשה", "תשובה"].map((h) => (
                      <th key={h} className="px-3 py-3 text-right font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REPORT_DEMO_ROWS.map((row) => (
                    <tr key={`lg-${row.guest}`} className="border-t border-[#F0E6D6]">
                      <td className="px-3 py-3">{row.time}</td>
                      <td className="px-3 py-3 font-bold">{row.guest}</td>
                      <td className="px-3 py-3 dir-ltr text-left">{row.phone}</td>
                      <td className="px-3 py-3">{row.round}</td>
                      <td className="px-3 py-3 font-semibold">{row.status}</td>
                      <td className="px-3 py-3">{row.answered}</td>
                      <td className="px-3 py-3">{row.digit}</td>
                      <td className="px-3 py-3">{row.rsvp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AgentConsoleMock() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_20px_50px_rgba(44,36,28,0.1)]">
      <div className="flex items-center justify-between border-b border-[#EFE3CF] bg-[#2A211A] px-5 py-3 text-[#F7EDDF]">
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-[#E8C988]">ממשק נציגים · דמו</p>
          <p className="mt-0.5 text-sm font-bold">סבב שיחות אנושיות</p>
        </div>
        <span className="rounded-full bg-[#C9A45C]/20 px-3 py-1 text-[11px] font-bold text-[#E8C988]">
          נתוני הדגמה
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-[1fr_0.9fr]">
        <ul className="divide-y divide-[#EFE3CF]">
          {[
            { name: "נועה לוי", meta: "ממתין · סבב 1", status: "לטיפול" },
            { name: "יוסי כהן", meta: "לא ענה בסבב קודם", status: "חזרה" },
            { name: "משפחת כהן", meta: "מתלבט · מספר משתתפים", status: "בירור" },
          ].map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-black text-[#2A211A]">{row.name}</p>
                <p className="mt-0.5 text-sm text-[#7A6042]">{row.meta}</p>
              </div>
              <span className="rounded-full border border-[#E6D2AA] bg-white px-3 py-1 text-xs font-bold text-[#5C4A3A]">
                {row.status}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-[#EFE3CF] bg-[#FBF6EE] p-5 md:border-t-0 md:border-r">
          <p className="text-sm font-black text-[#2A211A]">עדכון תשובה</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["מגיע", "לא מגיע", "מתלבט", "לא ענה", "חזרה בסבב הבא"].map((s) => (
              <span
                key={s}
                className="rounded-full border border-[#E6D2AA] bg-white px-3 py-1.5 text-xs font-bold text-[#5C4A3A]"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-7 text-[#5C4A3A]">
            הנציג מעדכן סטטוס, מספר משתתפים והערות — בלי הקלטת שיחה אנושית לצפייה ללקוח בעמוד זה.
          </p>
          <p className="mt-3 text-xs leading-5 text-[#7A6042]">
            המחשה של ממשק העבודה במוקד. לא צילום צוות ואינה תמונת מוקד גנרית.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CallsMarketingPage() {
  return (
    <div dir="rtl" className={`${display.variable} min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]`}>
      {/* Breadcrumbs */}
      <nav aria-label="פירורי לחם" className="mx-auto max-w-6xl px-5 pt-5 md:px-8">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-[#7A6042]">
          <li>
            <Link href="/" className="hover:text-[#2A211A]">
              ראשי
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={LINKS.rsvp} className="hover:text-[#2A211A]">
              אישורי הגעה
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-bold text-[#2A211A]">שיחות טלפון</li>
        </ol>
      </nav>

      {/* 1. Hero */}
      <section aria-labelledby="calls-h1" className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_10%,rgba(58,43,34,0.08),transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_55%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-6 md:gap-14 md:px-8 md:pb-24 md:pt-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <p className="text-sm font-black tracking-[0.18em] text-[#8A642E]">Invistimo · אישורי הגעה</p>
            <h1
              id="calls-h1"
              className={`mt-3 max-w-2xl text-[1.85rem] font-bold leading-[1.18] tracking-[-0.02em] text-[#2C241C] md:text-[2.65rem] ${display.className}`}
            >
              אישורי הגעה בשיחות טלפון — כי לא כל אורח עונה להודעה
            </h1>
            <p className="mt-5 max-w-xl text-lg font-bold leading-8 text-[#5E4735] md:text-xl">
              שיחות אוטומטיות עם קריינות AI, שיחות ממוקד אנושי ומעקב אחרי מי שלא ענה — כדי להגיע גם
              לאורחים שלא השיבו ב־WhatsApp או ב־SMS.
            </p>
            <div className="mt-5 max-w-xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-[17px]">
              <p>
                שלחתם הזמנות, התחלתם לקבל אישורי הגעה, אבל חלק מהמוזמנים עדיין לא ענו? זה לא בהכרח
                אומר שהם לא מגיעים.
              </p>
              <p>
                יש אורחים שלא ראו את ההודעה, כאלה שדחו את המענה למועד מאוחר יותר, ואחרים שפשוט מעדיפים
                לדבר בטלפון.
              </p>
              <p>
                ב־Invistimo אפשר לשלב שיחות טלפון בתהליך אישורי ההגעה: שיחות מוקלטות עם קריינות AI
                ושיחות שמבצעים נציגים אנושיים, בהתאם לשירות ולחבילה שנבחרו. כך אפשר להתאים את אופן
                הפנייה, לעקוב אחרי התשובות ולצמצם את מספר המוזמנים שנותרו ללא מענה — בלי להבטיח שכולם
                יענו.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href={LINKS.contact} className={ctaPrimary} location={`hero_contact:${CALLS_PATH}`}>
                רוצים לשלב שיחות באישורי ההגעה?
              </TrackedCtaLink>
              <TrackedCtaLink href="#compare" className={ctaSecondary} location={`hero_compare:${CALLS_PATH}`}>
                מה ההבדל בין שיחה מוקלטת לשיחה אנושית?
              </TrackedCtaLink>
            </div>
          </Reveal>
          <Reveal>
            <CallsHeroVisual />
          </Reveal>
        </div>
      </section>

      {/* 2. Why calls */}
      <section aria-labelledby="why-calls" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>למה שיחות</Eyebrow>
            <h2 id="why-calls" className={`mt-3 max-w-3xl text-3xl font-bold leading-[1.2] text-[#2C241C] md:text-4xl ${display.className}`}>
              שלחתם WhatsApp. אז למה עדיין צריך להתקשר?
            </h2>
            <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                הודעות WhatsApp הן דרך נוחה ומהירה לפנות למוזמנים. הן מאפשרות לשלוח פרטי אירוע, קישור
                אישי לאישור הגעה ותזכורות.{" "}
                <Link href={LINKS.whatsapp} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  כך עובדים אישורי הגעה ב־WhatsApp
                </Link>
                .
              </p>
              <p>
                אבל לא כל האורחים מגיבים להודעות. חלקם עסוקים, חלקם לא פותחים הודעות ממספרים לא מוכרים,
                ויש מי שמעדיפים שיחה על פני מילוי טופס דיגיטלי.
              </p>
              <p>
                לפעמים אורח מתכנן להגיע אבל פשוט לא השלים את אישור ההגעה. במקרים אחרים הוא עדיין לא
                יודע אם יוכל להגיע, ודווקא שיחה יכולה לעזור להבין את המצב. כאן נכנסות השיחות הטלפוניות
                — פנייה נוספת למי שלא השיב, כדי לקבל תשובה ברורה יותר לפני מסירת הכמות הסופית לאולם.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {WHY_CARDS.map((card, i) => (
              <Reveal key={card.title}>
                <article className="h-full rounded-[28px] border border-[#E7D3B0] bg-[#FBF6EE] p-6 shadow-[0_14px_36px_rgba(44,36,28,0.05)] transition hover:border-[#C9A45C]">
                  <span className="text-xs font-black tracking-[0.16em] text-[#8A642E]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-xl font-black text-[#2C241C]">{card.title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{card.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-7 text-[#7A6042]">
            אין הבטחה ל־100% מענה או שכל האורחים יענו. המטרה היא תהליך מסודר יותר — לא לחץ על האורחים.
          </p>
        </div>
      </section>

      {/* 3. AI calls */}
      <section id="ai-calls" aria-labelledby="ai-title" className="scroll-mt-24 bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>שיחות מוקלטות</Eyebrow>
            <h2 id="ai-title" className={`mt-3 max-w-3xl text-3xl font-bold leading-[1.2] text-[#2C241C] md:text-4xl ${display.className}`}>
              שיחות אישורי הגעה מוקלטות עם קריינות AI — דרך יעילה לפנות למוזמנים
            </h2>
            <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                שיחות אוטומטיות מאפשרות לפנות למוזמנים באמצעות הודעה קולית מסודרת, בלי שנציג אנושי
                יצטרך לחייג לכל מספר בנפרד. במקום להסתפק בהודעת טקסט, האורח מקבל שיחה ובה פרטי האירוע
                ובקשה לאשר את הגעתו.
              </p>
              <p>
                הקריינות מבוססת AI ומאפשרת חוויית שמע ברורה ונעימה לפי תסריט מוגדר, כולל שם האירוע.
                האורח משיב באמצעות מקשי הטלפון: 1 לאישור (ואז מספר אורחים), 2 לאי־הגעה, ו־3 אם עדיין
                לא יודעים.
              </p>
            </div>
          </Reveal>

          <div className="mt-12">
            <h3 className="text-xl font-black text-[#2C241C]">איך זה עובד?</h3>
            <ol className="mt-6 grid gap-4 md:grid-cols-5">
              {AI_STEPS.map((step, i) => (
                <li key={step.title} className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5">
                  <span className="text-xs font-black text-[#8A642E]">0{i + 1}</span>
                  <h4 className="mt-2 text-base font-black text-[#2C241C]">{step.title}</h4>
                  <p className="mt-2 text-[14px] leading-7 text-[#5C4A3A]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <ul className="mt-10 flex flex-wrap gap-2">
            {AI_BENEFITS.map((b) => (
              <li
                key={b}
                className="rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
              >
                {b}
              </li>
            ))}
          </ul>

          <aside className="mt-12 rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-6 md:p-8">
            <p className={`text-2xl font-bold text-[#2C241C] ${display.className}`}>
              לא ענו לשיחה הראשונה? זה לא חייב להיות סוף התהליך.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
              כאשר שיחה אינה נענית, ניתן לשלב ניסיון נוסף בסבב הבא בהתאם להגדרות השירות, למספר
              הסבבים שנרכש ולכללי התזמון. בחבילות השיחות המוקלטות קיימים עד שלושה סבבים. אין הבטחה
              שכל אורח יקבל מספר ניסיונות קבוע, ואין חיוג חוזר ללא מגבלות.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {DIAL_OUTCOMES.map((o) => (
                <div key={o.code} className="rounded-2xl border border-[#EFE3CF] bg-[#FBF6EE] px-3 py-3">
                  <p className="text-sm font-black text-[#2A211A]">{o.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-7 text-[#7A6042]">
              המערכת מבחינה בין לא ענה, תפוס, כשל טכני, שיחה שנענתה ללא בחירה, ותשובה תקינה שנקלטה —
              ולא מסמנת אי־מענה כ«לא מגיע».
            </p>
          </aside>
        </div>
      </section>

      {/* 4. Audio demo */}
      <section id="demo" aria-labelledby="demo-title" className="scroll-mt-24 bg-[#1C1612] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow onDark>הדגמה</Eyebrow>
            <h2 id="demo-title" className={`mt-3 max-w-3xl text-3xl font-bold text-[#FFF8EF] md:text-4xl ${display.className}`}>
              כך נשמעת שיחת אישור הגעה אוטומטית
            </h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#D8CBB8]">
              האזינו לתסריט המבוסס על השיחה המוקלטת במערכת, ונסו את מקשי המענה בהדגמה. האודיו לא מופעל
              אוטומטית עם פתיחת העמוד.
            </p>
          </Reveal>
          <div className="mt-10">
            <CallDemoPlayer />
          </div>
        </div>
      </section>

      {/* 5. Human center */}
      <section id="human" aria-labelledby="human-title" className="scroll-mt-24 bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>מוקד אנושי</Eyebrow>
            <h2 id="human-title" className={`mt-3 max-w-3xl text-3xl font-bold leading-[1.2] text-[#2C241C] md:text-4xl ${display.className}`}>
              שיחות אישורי הגעה עם נציג אנושי — כשצריך יותר מתשובה של כן או לא
            </h2>
            <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                יש אורחים שמספיק להם לשמוע הודעה מוקלטת ולהקיש על מקש. אבל יש גם מצבים שבהם שיחה
                אנושית יכולה לעשות את ההבדל — אורח שלא בטוח אם יגיע, משפחה שמתלבטת לגבי מספר
                המשתתפים, או מוזמן שמתקשה עם מערכת אוטומטית.
              </p>
              <p>
                במוקד האנושי של Invistimo, נציגים מבצעים שיחות אישורי הגעה בהתאם לשירות שנרכש, אוספים
                תשובות ומעדכנים את המידע במערכת. המטרה אינה ללחוץ על האורחים להגיע, אלא לקבל תשובה
                מכבדת וברורה ככל האפשר.
              </p>
            </div>
          </Reveal>

          <h3 className="mt-12 text-xl font-black text-[#2C241C]">מתי מוקד אנושי מתאים במיוחד?</h3>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {HUMAN_CASES.map((c) => (
              <article key={c.title} className="rounded-[24px] border border-[#E7D3B0] bg-[#FBF6EE] p-5">
                <h4 className="text-lg font-black text-[#2C241C]">{c.title}</h4>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{c.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-12">
            <AgentConsoleMock />
          </div>
        </div>
      </section>

      {/* 6. Compare */}
      <section id="compare" aria-labelledby="compare-title" className="scroll-mt-24 bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>השוואה</Eyebrow>
            <h2 id="compare-title" className={`mt-3 max-w-3xl text-3xl font-bold leading-[1.2] text-[#2C241C] md:text-4xl ${display.className}`}>
              שיחות מוקלטות או מוקד אנושי — מה מתאים לאירוע שלכם?
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
              אין תשובה אחת שמתאימה לכל אירוע. שיחות מוקלטות מאפשרות לפנות בצורה אחידה ויעילה למוזמנים
              רבים. שיחות אנושיות מאפשרות גמישות רבה יותר כאשר נדרש בירור אישי. הבחירה תלויה בכמות
              המוזמנים, בסוג האורחים, בתקציב ובכמות הרשומות שעדיין לא השיבו.
            </p>
          </Reveal>

          <div className="mt-8">
            <ModeToggle />
          </div>

          <div className="mt-10 overflow-x-auto rounded-[28px] border border-[#E6D2AA] bg-white shadow-[0_16px_40px_rgba(44,36,28,0.06)]">
            <table className="min-w-[640px] w-full text-sm md:text-[15px]">
              <caption className="sr-only">השוואה בין שיחה מוקלטת עם AI למוקד אנושי</caption>
              <thead className="bg-[#2A211A] text-[#F7EDDF]">
                <tr>
                  <th className="px-4 py-4 text-right font-black">נושא</th>
                  <th className="px-4 py-4 text-right font-black">שיחה מוקלטת עם AI</th>
                  <th className="px-4 py-4 text-right font-black">מוקד אנושי</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.topic} className={i % 2 === 0 ? "bg-[#FFFDF8]" : "bg-[#FBF6EE]"}>
                    <th scope="row" className="px-4 py-3.5 text-right font-black text-[#2A211A]">
                      {row.topic}
                    </th>
                    <td className="px-4 py-3.5 leading-7 text-[#5C4A3A]">{row.ai}</td>
                    <td className="px-4 py-3.5 leading-7 text-[#5C4A3A]">{row.human}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#7A6042]">
            מחירים מוצגים במחשבון החבילות לפי מספר רשומות — לא בעמוד זה.{" "}
            <Link href={LINKS.pricing} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              למחשבון החבילות
            </Link>
          </p>

          <aside className="mt-10 rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-6 md:p-8">
            <p className={`text-2xl font-bold text-[#2C241C] ${display.className}`}>
              לרוב כדאי לשקול שילוב בין שיחות אוטומטיות למוקד אנושי — ולא לבחור בהכרח רק באחד מהם.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#5C4A3A]">
              שיחה מוקלטת יכולה להתאים לפנייה ראשונית לקבוצת אורחים שעדיין לא השיבו. מוקד אנושי יכול
              להתאים להמשך טיפול במוזמנים שלא הגיבו, או במקרים שבהם דרוש בירור אישי. זו המלצת תכנון
              אפשרית — לא הבטחה שכל חבילה כוללת את שני השירותים. במחשבון קיים גם מסלול משולב.
            </p>
          </aside>
        </div>
      </section>

      {/* 7. Combined channels */}
      <section aria-labelledby="combine-title" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>שילוב ערוצים</Eyebrow>
            <h2 id="combine-title" className={`mt-3 max-w-3xl text-3xl font-bold leading-[1.2] text-[#2C241C] md:text-4xl ${display.className}`}>
              לא כל האורחים מגיבים באותה הדרך — ולכן לא חייבים לפנות לכולם באותה הדרך
            </h2>
            <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                יש אורחים שיענו מיד להודעת WhatsApp. אחרים יעדיפו להיכנס לקישור האישי בשעה שנוחה להם.
                יש מי שיתעלמו מההודעה אבל יענו לשיחה מוקלטת. ויש מוזמנים שרק שיחה אנושית תאפשר להבין אם
                הם מתכננים להגיע.
              </p>
              <p>
                במקום להסתמך על ערוץ אחד בלבד, אפשר לבנות תהליך אישורי הגעה שמשלב כמה דרכי פנייה
                בהתאם לחבילה.
              </p>
            </div>
          </Reveal>

          <ol className="mt-12 grid gap-4 md:grid-cols-5">
            {COMBINED_STEPS.map((step, i) => (
              <li key={step.title} className="rounded-[24px] border border-[#E7D3B0] bg-[#FBF6EE] p-5">
                <span className="text-xs font-black text-[#8A642E]">שלב {i + 1}</span>
                <h3 className="mt-2 text-base font-black text-[#2C241C]">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-7 text-[#5C4A3A]">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 overflow-x-auto">
            <p className="mb-3 text-sm font-black text-[#8A642E]">מסלול לדוגמה (לא מחייב בכל חבילה)</p>
            <ol className="flex min-w-[640px] flex-col gap-3 md:min-w-0 md:flex-row md:items-stretch md:gap-2">
              {FLOW_PATH.map((label, i) => (
                <li key={label} className="flex flex-1 items-center gap-2 md:flex-col md:gap-3">
                  <span className="flex min-h-[4.5rem] flex-1 items-center justify-center rounded-2xl border border-[#E6D2AA] bg-white px-3 py-3 text-center text-sm font-black text-[#2A211A] md:w-full">
                    {label}
                  </span>
                  {i < FLOW_PATH.length - 1 ? (
                    <span className="hidden text-[#C9A45C] md:block" aria-hidden>
                      ←
                    </span>
                  ) : null}
                  {i < FLOW_PATH.length - 1 ? (
                    <span className="text-[#C9A45C] md:hidden" aria-hidden>
                      ↓
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          <ul className="mt-10 space-y-2 rounded-[24px] border border-[#E6D2AA] bg-[#FBF6EE] p-5 text-sm leading-7 text-[#5C4A3A] md:p-6">
            <li>הסדר לעיל הוא דוגמה אפשרית לתהליך משולב — לא מסלול מחייב בכל חבילה.</li>
            <li>מספר סבבי WhatsApp ושיחות נקבע לפי החבילה שנרכשה (למשל שני סבבי WhatsApp בחבילת הודעות; עד שלושה סבבי שיחות בחבילות השיחות).</li>
            <li>קיימת גם חבילת שיחות מוקלטות בלבד, ומוקד אנושי כמסלול נפרד או כחלק ממסלול משולב.</li>
            <li>לא ממשיכים להתקשר למי שכבר השיב תשובה סופית, אלא אם יש תהליך מורשה לעדכון.</li>
            <li>שומרים על שעות פנייה סבירות ונמנעים מהצפת מוזמנים בפניות חוזרות.</li>
          </ul>
        </div>
      </section>

      {/* 8. No answer */}
      <section aria-labelledby="no-answer-title" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>מי שלא ענה</Eyebrow>
            <h2 id="no-answer-title" className={`mt-3 max-w-3xl text-3xl font-bold leading-[1.2] text-[#2C241C] md:text-4xl ${display.className}`}>
              הטלפון צלצל, אבל לא הייתה תשובה. מה עושים עכשיו?
            </h2>
            <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                לא כל שיחה נענית בניסיון הראשון. אורח יכול להיות בעבודה, בנהיגה, באמצע פגישה או פשוט
                לא פנוי לדבר. לכן תהליך אישורי ההגעה לא מתייחס אוטומטית לשיחה שלא נענתה כאל סירוב
                להגיע.
              </p>
              <p>
                כאשר לא התקבלה תשובה, הרשומה נשארת במצב מתאים להמשך טיפול. בהתאם לחבילה ולהגדרות,
                אפשר לבצע ניסיון נוסף בסבב הבא או להעביר את הרשומה לטיפול בערוץ אחר.{" "}
                <Link href={LINKS.noReply} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
                  מדריך: אורחים שלא עונים
                </Link>
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NO_ANSWER_EXAMPLES.map((ex) => (
              <article key={ex.name} className="rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] p-5">
                <p className="text-lg font-black text-[#2C241C]">{ex.name}</p>
                <p className="mt-2 inline-flex rounded-full border border-[#E6D2AA] bg-[#FBF6EE] px-3 py-1 text-xs font-bold text-[#5C4A3A]">
                  {ex.status}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#5C4A3A]">{ex.detail}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm text-[#7A6042]">דוגמאות להמחשה בלבד — לא נתוני לקוחות.</p>

          <ul className="mt-10 grid gap-3 md:grid-cols-2">
            {[
              "אין שינוי ל«לא מגיע» בלי תשובה מפורשת",
              "מגבלת סבבים וניסיונות לפי החבילה",
              "תיעוד מועד ניסיון החיוג",
              "עצירה כשמתקבלת תשובה סופית",
              "Retry טכני נפרד מאי־מענה (לא יוצר שיחות כפולות מיותרות)",
              "טיפול בכשלים מתועד בדוח",
            ].map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-2xl border border-[#E7D3B0] bg-[#FFFDF8] px-4 py-3 text-[15px] leading-7 text-[#5C4A3A]"
              >
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#C9A45C]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 9. Report */}
      <section aria-labelledby="report-title" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>מעקב ודוחות</Eyebrow>
            <h2 id="report-title" className={`mt-3 max-w-3xl text-3xl font-bold leading-[1.2] text-[#2C241C] md:text-4xl ${display.className}`}>
              לדעת מי ענה, מי לא ענה ומה התעדכן ברשימת המוזמנים
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
              שיחות אישורי הגעה הן לא רק פעולת חיוג. הערך האמיתי הוא היכולת לדעת מה קרה לאחר השיחה
              ולהמשיך לנהל את האירוע בצורה מסודרת. במערכת Invistimo אפשר לעקוב אחרי תוצאות השיחות
              בהתאם לנתונים שמתקבלים ממערכת החיוג ומהנציגים.
            </p>
          </Reveal>

          <ul className="mt-8 flex flex-wrap gap-2">
            {REPORT_FIELDS.map((f) => (
              <li key={f} className="rounded-full border border-[#E6D2AA] bg-[#FBF6EE] px-3 py-1.5 text-sm font-bold text-[#5E4735]">
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <ReportLightbox />
          </div>
          <p className="mt-4 text-sm leading-7 text-[#7A6042]">
            אין בעמוד זה הצגה של הקלטות שיחות אנושיות, האזנה להקלטות או תמלול שיחות אנושיות כשירות
            ללקוח.
          </p>
        </div>
      </section>

      {/* 10. Event types */}
      <section aria-labelledby="events-title" className="bg-[#1C1612] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow onDark>סוגי אירועים</Eyebrow>
            <h2 id="events-title" className={`mt-3 max-w-3xl text-3xl font-bold text-[#FFF8EF] md:text-4xl ${display.className}`}>
              מאירוע גדול ועד חגיגה משפחתית — מתי כדאי לשלב שיחות?
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {EVENT_TYPES.map((e) => (
              <Link
                key={e.title}
                href={e.href}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#C9A45C]/50"
              >
                <h3 className="text-xl font-black text-[#FFF8EF]">{e.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#D0C2AF]">{e.text}</p>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#B8A890]">
            השירות אינו כלול אוטומטית בכל סוג אירוע או חבילה — התאמה לפי הצורך והמסלול שנבחר.
          </p>
        </div>
      </section>

      {/* 11. Timing */}
      <section aria-labelledby="timing-title" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <Eyebrow>תזמון</Eyebrow>
            <h2 id="timing-title" className={`mt-3 text-3xl font-bold leading-[1.2] text-[#2C241C] md:text-4xl ${display.className}`}>
              מתי נכון לשלב שיחות אישורי הגעה לפני האירוע?
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
              <p>
                תזמון נכון חשוב לא פחות מבחירת ערוץ הפנייה. אם מתקשרים מוקדם מדי, חלק מהמוזמנים עדיין
                לא יודעים אם יוכלו להגיע. אם מתקשרים מאוחר מדי, ייתכן שלא יישאר מספיק זמן לעדכן את
                מספר המשתתפים ולתכנן את ההושבה.
              </p>
              <p>
                לכן כדאי להתחיל את תהליך אישורי ההגעה במועד שמתאים לאירוע, ולהתאים את סבבי השיחות
                למועד שבו האולם מבקש לקבל את הכמות הסופית.
              </p>
              <p>
                לחתונות, ההמלצה הכללית של Invistimo היא להתחיל את סבב אישורי ההגעה הראשון כ־14–18 ימים
                לפני האירוע, ולא להשלים בהכרח את כל הסבבים בטווח הזה. את הסבבים הבאים יש לפרוס עד
                סמוך למועד מסירת הכמות לאולם, בהתאם לחבילה, לימי הפעילות ולזמן הדרוש לסיכום הנתונים.
              </p>
            </div>
            <TrackedCtaLink
              href={LINKS.whenToSend}
              className={`${ctaSecondary} mt-8`}
              location={`timing_guide:${CALLS_PATH}`}
            >
              קראו את המדריך: מתי כדאי לשלוח אישורי הגעה?
            </TrackedCtaLink>
          </Reveal>
        </div>
      </section>

      {/* 12. Mistakes */}
      <section aria-labelledby="mistakes-title" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>טעויות נפוצות</Eyebrow>
            <h2 id="mistakes-title" className={`mt-3 max-w-3xl text-3xl font-bold text-[#2C241C] md:text-4xl ${display.className}`}>
              חמש טעויות שכדאי להימנע מהן באישורי הגעה טלפוניים
            </h2>
          </Reveal>
          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {MISTAKES.map((m, i) => (
              <li key={m.title} className="rounded-[24px] border border-[#E7D3B0] bg-[#FBF6EE] p-6">
                <span className="text-xs font-black tracking-[0.16em] text-[#8A642E]">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-black text-[#2C241C]">{m.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{m.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 13. Packages */}
      <section aria-labelledby="packages-title" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>חבילות</Eyebrow>
            <h2 id="packages-title" className={`mt-3 max-w-3xl text-3xl font-bold text-[#2C241C] md:text-4xl ${display.className}`}>
              איך בוחרים מסלול שיחות?
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
              חבילות השיחות כוללות גם את בסיס ההודעות. המחיר לפי מספר רשומות מופיע במחשבון — לא כאן.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PACKAGE_BLURBS.map((p) => (
              <article key={p.title} className="rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6">
                <h3 className="text-xl font-black text-[#2C241C]">{p.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{p.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-10">
            <TrackedCtaLink href={LINKS.pricing} className={ctaGold} location={`packages:${CALLS_PATH}`}>
              לבדיקת חבילות ומחירים
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* 14. FAQ */}
      <section aria-labelledby="faq-title" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq-title" className={`mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl ${display.className}`}>
            שאלות על אישורי הגעה בשיחות טלפון
          </h2>
          <div className="mt-10 space-y-3">
            {CALLS_FAQS.map((faq) => (
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

      {/* 15. More guides */}
      <section aria-labelledby="guides-title" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>מדריכים נוספים</Eyebrow>
          <h2 id="guides-title" className={`mt-3 text-3xl font-bold text-[#2C241C] md:text-4xl ${display.className}`}>
            להמשיך לקרוא
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {MORE_GUIDES.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6 transition hover:-translate-y-1 hover:border-[#C9A45C]"
              >
                <h3 className="text-xl font-black text-[#2C241C]">{g.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{g.text}</p>
              </Link>
            ))}
          </div>
          <p className="mt-6">
            <Link href={LINKS.guides} className="font-bold text-[#8A642E] underline-offset-4 hover:underline">
              לכל מדריכי Invistimo
            </Link>
          </p>
        </div>
      </section>

      {/* 16. Closing CTA */}
      <section aria-labelledby="closing-title" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="closing-title" className={`text-3xl font-bold leading-[1.2] text-[#2C241C] md:text-4xl ${display.className}`}>
            רוצים לדעת מי באמת צפוי להגיע לאירוע שלכם?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#5C4A3A]">
            הודעות דיגיטליות, שיחות מוקלטות ומוקד אנושי לא חייבים להתחרות זה בזה. כאשר מתכננים נכון את
            תהליך אישורי ההגעה, אפשר לבחור את ערוצי הפנייה שמתאימים לאורחים ולאירוע שלכם. ב־Invistimo
            נעזור לכם להבין אילו שירותים מתאימים לרשימת המוזמנים ולחבילה הרצויה.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href={LINKS.contact} className={ctaPrimary} location={`closing_contact:${CALLS_PATH}`}>
              בואו נתכנן את אישורי ההגעה שלכם
            </TrackedCtaLink>
            <TrackedCtaLink href={LINKS.rsvp} className={ctaSecondary} location={`closing_rsvp:${CALLS_PATH}`}>
              לכל שירותי אישורי ההגעה
            </TrackedCtaLink>
          </div>
          <nav aria-label="קישורים קשורים" className="mt-14 flex flex-wrap justify-center gap-3">
            {[
              { href: LINKS.chatuna, label: "אישורי הגעה לחתונה" },
              { href: LINKS.whatsapp, label: "WhatsApp" },
              { href: LINKS.whatsappVsSms, label: "WhatsApp מול SMS" },
              { href: LINKS.noReply, label: "אורחים שלא עונים" },
              { href: LINKS.whenToSend, label: "מתי לשלוח" },
              { href: LINKS.guestList, label: "רשימת מוזמנים" },
              { href: LINKS.venue, label: "התחייבות לאולם" },
              { href: LINKS.seating, label: "סידורי הושבה" },
              { href: LINKS.cost, label: "תמחור רשומות" },
              { href: LINKS.pricing, label: "מחירון" },
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

      {/* Decorative brand mark — keeps first viewport brand-forward via logo wordmark above */}
      <span className="sr-only">Invistimo</span>
    </div>
  );
}
