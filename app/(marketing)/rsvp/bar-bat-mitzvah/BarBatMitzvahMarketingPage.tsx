"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import { MITZVAH_FAQS } from "./mitzvahFaqs";
import {
  CHECKLIST_ITEMS,
  CHECKLIST_STORAGE_KEY,
  CLASSMATES_POINTS,
  FAQ_TOPICS,
  HOW_STEPS,
  LINKS,
  MEDIA,
  MITZVAH_H1,
  PLANNING_CARDS,
  QUOTA_EXAMPLES,
  RECORD_VS_HEADCOUNT,
  SEATING_POINTS,
  WHO_TO_INVITE,
  WHY_POINTS,
} from "./content";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-mitzvah-display",
});

const fade = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

function SectionShell({
  id,
  tone = "light",
  children,
  className = "",
}: {
  id?: string;
  tone?: "light" | "cream" | "navy" | "ivory";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    light: "bg-[#FFFDF8] text-[#1E2A3A]",
    cream: "bg-[#F3EDE2] text-[#1E2A3A]",
    ivory: "bg-[#F8F4EC] text-[#1E2A3A]",
    navy: "bg-[#152033] text-[#F3EDE2]",
  } as const;
  return (
    <section id={id} className={`${tones[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">{children}</div>
    </section>
  );
}

function CtaLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-[#C4A35A] !text-[#152033] hover:bg-[#B89345]"
      : variant === "secondary"
        ? "border border-[#D4C4A4] bg-[#F3EDE2] !text-[#152033] hover:bg-white"
        : "!text-[#C4A35A] underline-offset-4 hover:underline";
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-[15px] font-bold transition ${styles}`}
    >
      {children}
    </Link>
  );
}

function PhoneFrame({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="relative mx-auto w-[min(100%,280px)]">
      <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#152033] bg-[#152033] shadow-[0_28px_60px_rgba(21,32,51,0.28)]">
        <div className="relative aspect-[9/19] w-full overflow-hidden bg-[#F3EDE2]">
          <Image src={src} alt={alt} fill className="object-contain object-top" sizes="280px" priority={priority} />
        </div>
      </div>
    </div>
  );
}

function DemoCaption({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-center text-sm text-[#6B7A8C]">{children}</p>;
}

function Checklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checked));
    } catch {
      /* ignore */
    }
  }, [checked, ready]);

  const done = CHECKLIST_ITEMS.filter((i) => checked[i.id]).length;

  return (
    <div className="rounded-[28px] border border-[#D4C4A4] bg-white/90 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className={`text-2xl text-[#152033] ${display.className}`}>רשימת הכנה לבר / בת מצווה</h3>
          <p className="mt-2 text-sm text-[#5C6B7A]">נשמרת בדפדפן שלכם בלבד — לא בשרת.</p>
        </div>
        <p className="text-sm font-bold text-[#C4A35A]">
          {done}/{CHECKLIST_ITEMS.length} הושלמו
        </p>
      </div>
      <ul className="mt-6 space-y-3">
        {CHECKLIST_ITEMS.map((item) => {
          const on = !!checked[item.id];
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] px-4 py-3 transition hover:border-[#C4A35A]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#C4A35A]"
                  checked={on}
                  onChange={() => setChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                />
                <span className={`text-[15px] leading-7 ${on ? "text-[#6B7A8C] line-through" : "text-[#1E2A3A]"}`}>
                  {item.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FaqBlock() {
  const byId = Object.fromEntries(MITZVAH_FAQS.map((f) => [f.id, f]));
  return (
    <div className="space-y-10">
      {FAQ_TOPICS.map((topic) => (
        <div key={topic.id}>
          <h3 className={`mb-4 text-2xl text-[#152033] ${display.className}`}>{topic.title}</h3>
          <div className="divide-y divide-[#E0D4C0] rounded-[24px] border border-[#E0D4C0] bg-white/80">
            {topic.ids.map((id) => {
              const faq = byId[id];
              if (!faq) return null;
              return (
                <details key={faq.id} className="group px-5 py-4 md:px-6" open={id === topic.ids[0]}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-right marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="text-base font-bold text-[#152033] md:text-lg">{faq.q}</span>
                    <span className="mt-1 text-[#C4A35A] group-open:hidden" aria-hidden>
                      +
                    </span>
                    <span className="mt-1 hidden text-[#C4A35A] group-open:inline" aria-hidden>
                      −
                    </span>
                  </summary>
                  <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#5C6B7A]">{faq.a}</p>
                </details>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BarBatMitzvahMarketingPage() {
  const reduce = useReducedMotion();

  return (
    <div dir="rtl" className={`${display.variable} min-h-screen overflow-x-hidden bg-[#FFFDF8] text-[#1E2A3A]`}>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-[#E0D4C0]/70">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#D4C4A4_0%,transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#E8EEF5_55%,#F3EDE2_100%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-24 md:pt-14">
          <motion.div
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={fade}
            transition={{ duration: 0.55 }}
          >
            <p className="text-xs font-bold tracking-[0.22em] text-[#C4A35A]">בר מצווה · בת מצווה</p>
            <h1
              className={`mt-4 text-[2.1rem] leading-[1.18] text-[#152033] md:text-[2.75rem] md:leading-[1.15] ${display.className}`}
            >
              {MITZVAH_H1}
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-8 text-[#5C6B7A]">
              הזמנה דיגיטלית, אישורי הגעה דרך ההורים, רשימת מוזמנים אחת — וסידורי הושבה כשצריך. בלי לרדוף אחרי
              תשובות בקבוצת הכיתה, ובלי לטעון שייבאנו אנשי קשר מוואטסאפ.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaLink href={LINKS.pricing} variant="primary">
                לצפייה בחבילות
              </CtaLink>
              <CtaLink href="#how-it-works" variant="secondary">
                איך זה עובד
              </CtaLink>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <figure className="overflow-hidden rounded-[24px] border border-[#D4C4A4] bg-white shadow-[0_20px_40px_rgba(21,32,51,0.12)]">
              <div className="relative aspect-[4/5]">
                <Image
                  src={MEDIA.barInvite}
                  alt="הזמנה לדוגמה לבר מצווה — ללא זיהוי קטינים"
                  fill
                  className="object-cover"
                  sizes="(max-width:640px) 50vw, 280px"
                  priority
                />
              </div>
              <figcaption className="px-4 py-3 text-center text-sm font-bold text-[#152033]">בר מצווה</figcaption>
            </figure>
            <figure className="overflow-hidden rounded-[24px] border border-[#D4C4A4] bg-white shadow-[0_20px_40px_rgba(21,32,51,0.12)]">
              <div className="relative aspect-[4/5]">
                <Image
                  src={MEDIA.batInvite}
                  alt="הזמנה לדוגמה לבת מצווה — ללא זיהוי קטינים"
                  fill
                  className="object-cover"
                  sizes="(max-width:640px) 50vw, 280px"
                  priority
                />
              </div>
              <figcaption className="px-4 py-3 text-center text-sm font-bold text-[#152033]">בת מצווה</figcaption>
            </figure>
          </motion.div>
        </div>
      </section>

      {/* Why */}
      <SectionShell tone="ivory">
        <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
          למה בכלל צריך אישורי הגעה לבר ובת מצווה?
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C6B7A]">
          היום הגדול משלב משפחה רחבה עם חברים לכיתה — ושתי קבוצות האלה מתנהגות אחרת. בלי תהליך מסודר קשה לדעת
          כמה כיסאות להכין, כמה מנות להזמין ומי באמת מגיע. אישורי הגעה לא מבטיחים הגעה של 100%, אבל הם מחליפים
          ניחושים בתשובות.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {WHY_POINTS.map((p) => (
            <div key={p.title} className="rounded-[22px] border border-[#D4C4A4] bg-white/85 px-5 py-6">
              <h3 className={`text-xl text-[#152033] ${display.className}`}>{p.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C6B7A]">{p.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* Who to invite */}
      <SectionShell tone="cream">
        <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
          את מי מזמינים — ומי מאשר
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C6B7A]">
          רוב האירועים משלבים משפחה קרובה עם חברים לכיתה. ההזמנה יכולה להיות חגיגית; האישור עצמו — פשוט וברור
          להורים.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {WHO_TO_INVITE.map((item) => (
            <article key={item.title} className="rounded-[22px] border border-[#D4C4A4] bg-[#FFFDF8] px-5 py-6">
              <h3 className={`text-xl text-[#152033] ${display.className}`}>{item.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C6B7A]">{item.body}</p>
            </article>
          ))}
        </div>
      </SectionShell>

      {/* Classmates */}
      <SectionShell tone="light">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
              חברים לכיתה: קבוצת WhatsApp כן, סריקה אוטומטית לא
            </h2>
            <p className="mt-5 text-[16px] leading-8 text-[#5C6B7A]">
              קבוצת ההורים של הכיתה היא כלי תיאום נפוץ — אבל תשובות שם מתפזרות. ב־Invistimo בונים רשימה, שולחים
              קישור אישי, וההורים מאשרים. אין ייבוא אוטומטי של אנשי קשר מקבוצות WhatsApp.
            </p>
            <div className="mt-8 space-y-4">
              {CLASSMATES_POINTS.map((p) => (
                <div key={p.title} className="rounded-[18px] border border-[#E0D4C0] bg-[#F8F4EC] px-5 py-4">
                  <h3 className="font-bold text-[#152033]">{p.title}</h3>
                  <p className="mt-1 text-[15px] leading-7 text-[#5C6B7A]">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <figure className="overflow-hidden rounded-[24px] border border-[#D4C4A4]">
              <Image
                src={MEDIA.barClassmates}
                alt="אווירת שולחנות לבר מצווה — המחשה, ללא זיהוי קטינים"
                width={900}
                height={700}
                className="h-auto w-full object-cover"
              />
              <DemoCaption>המחשת אווירה לבר מצווה — לא צילום לקוח מזוהה</DemoCaption>
            </figure>
            <figure className="overflow-hidden rounded-[24px] border border-[#D4C4A4]">
              <Image
                src={MEDIA.batClassmates}
                alt="אווירת שולחנות לבת מצווה — המחשה, ללא זיהוי קטינים"
                width={900}
                height={700}
                className="h-auto w-full object-cover"
              />
              <DemoCaption>המחשת אווירה לבת מצווה — לא צילום לקוח מזוהה</DemoCaption>
            </figure>
          </div>
        </div>
      </SectionShell>

      {/* Quota */}
      <SectionShell tone="navy">
        <h2 className={`text-3xl leading-tight text-[#F3EDE2] md:text-4xl ${display.className}`}>
          רשומות בלי טלפון — נשארות ברשימה, לא במכסה
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#C8D0DC]">
          במכסת החבילה נספרות רק רשומות שנוצרו עם מספר טלפון. אפשר להוסיף שמות בלי טלפון לניהול פנימי ולהושבה —
          בלי לגרוע מהמכסה. חשוב: לא ניתן להוסיף טלפון אחר כך לרשומה שנוצרה בלי טלפון.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {QUOTA_EXAMPLES.map((ex) => (
            <div key={ex.title} className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-6">
              <h3 className={`text-xl text-[#E8D5A3] ${display.className}`}>{ex.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#C8D0DC]">{ex.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {RECORD_VS_HEADCOUNT.map((row) => (
            <div key={row.label} className="rounded-[20px] border border-[#C4A35A]/35 bg-[#1C2A42] px-5 py-6">
              <p className="text-xs font-bold tracking-[0.16em] text-[#C4A35A]">{row.label}</p>
              <p className="mt-2 text-[15px] leading-7 text-[#E8EEF5]">{row.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-[#A8B4C4]">
          פירוט נוסף:{" "}
          <Link href={LINKS.costGuide} className="font-bold text-[#E8D5A3] underline-offset-4 hover:underline">
            איך מחושב מחיר לפי רשומות
          </Link>
          {" · "}
          <Link href={LINKS.guestList} className="font-bold text-[#E8D5A3] underline-offset-4 hover:underline">
            מדריך רשימת מוזמנים
          </Link>
        </p>
      </SectionShell>

      {/* Product demo */}
      <SectionShell tone="ivory">
        <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
          מה רואים במערכת — עם נתוני הדגמה
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C6B7A]">
          צילומי המסך מתוך המוצר, עם נתוני דוגמה בלבד. לא מוצגים פרטים מזהים של קטינים או לקוחות אמיתיים.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <figure>
            <PhoneFrame src={MEDIA.phoneWhatsapp} alt="הודעת WhatsApp עם קישור אישי — נתוני הדגמה" />
            <DemoCaption>הודעת WhatsApp — נתוני הדגמה</DemoCaption>
          </figure>
          <figure>
            <PhoneFrame src={MEDIA.phoneRsvp} alt="טופס אישור הגעה — נתוני הדגמה" />
            <DemoCaption>טופס אישור הגעה — נתוני הדגמה</DemoCaption>
          </figure>
          <figure>
            <PhoneFrame src={MEDIA.phoneThanks} alt="מסך תודה אחרי שליחת אישור — נתוני הדגמה" />
            <DemoCaption>מסך תודה — נתוני הדגמה</DemoCaption>
          </figure>
        </div>
        <div className="mt-12 overflow-hidden rounded-[24px] border border-[#D4C4A4]">
          <Image
            src={MEDIA.dashboard}
            alt="דשבורד מוזמנים ב־Invistimo — נתוני הדגמה"
            width={1400}
            height={800}
            className="h-auto w-full"
          />
          <DemoCaption>דשבורד מוזמנים — נתוני הדגמה מהמערכת</DemoCaption>
        </div>
      </SectionShell>

      {/* Seating */}
      <SectionShell tone="cream">
        <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
          הושבה למשפחה ולחברים — בהתאם לחבילה
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C6B7A]">
          כשיש תשובות, קל יותר לשבץ שולחנות. הושבה דיגיטלית, הושבה חיה (LIVE) וצוות באולם קיימים במוצר —
          וזמינים בהתאם לחבילה ולמה שסוכם.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {SEATING_POINTS.map((p) => (
            <div key={p.title} className="rounded-[22px] border border-[#D4C4A4] bg-white px-5 py-6">
              <h3 className={`text-xl text-[#152033] ${display.className}`}>{p.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C6B7A]">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 overflow-hidden rounded-[24px] border border-[#D4C4A4]">
          <Image
            src={MEDIA.seating}
            alt="מפת הושבה במערכת — נתוני הדגמה"
            width={1400}
            height={800}
            className="h-auto w-full"
          />
          <DemoCaption>מפת הושבה — נתוני הדגמה; זמינות בהתאם לחבילה</DemoCaption>
        </div>
        <div className="mt-8">
          <CtaLink href={LINKS.seating} variant="primary">
            סידורי הושבה — הסבר מלא
          </CtaLink>
        </div>
      </SectionShell>

      {/* Planning */}
      <SectionShell tone="light">
        <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
          מקום, אוכל, בטיחות ומתי שולחים
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {PLANNING_CARDS.map((c) => (
            <article key={c.title} className="rounded-[22px] border border-[#E0D4C0] bg-[#F8F4EC] px-5 py-6">
              <h3 className={`text-xl text-[#152033] ${display.className}`}>{c.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C6B7A]">{c.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 text-[15px] text-[#5C6B7A]">
          לקריאה נוספת:{" "}
          <Link href={LINKS.whenToSend} className="font-bold text-[#9A7B2F] underline-offset-4 hover:underline">
            מתי שולחים אישורי הגעה
          </Link>
          {" · "}
          <Link
            href={LINKS.venueGuarantee}
            className="font-bold text-[#9A7B2F] underline-offset-4 hover:underline"
          >
            כמה אורחים כדאי להתחייב מול המקום
          </Link>
        </p>
      </SectionShell>

      {/* Atmosphere visuals */}
      <SectionShell tone="ivory">
        <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
          אווירה לבר — ואווירה לבת
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C6B7A]">
          אותו תהליך אישורי הגעה; ויז&apos;ואל נפרד כדי שתרגישו את שני סוגי האירוע. התמונות אטמוספריות — בלי
          חשיפת קטינים מזוהים.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <motion.figure
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-[28px] border border-[#D4C4A4]"
          >
            <div className="relative aspect-[16/11]">
              <Image
                src={MEDIA.barHero}
                alt="אווירת בר מצווה — תאורה חמה ושולחן חגיגי"
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </div>
            <figcaption className="bg-[#152033] px-5 py-4 text-sm font-bold text-[#E8D5A3]">
              בר מצווה — אווירה חגיגית מודרנית
            </figcaption>
          </motion.figure>
          <motion.figure
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="overflow-hidden rounded-[28px] border border-[#D4C4A4]"
          >
            <div className="relative aspect-[16/11]">
              <Image
                src={MEDIA.batHero}
                alt="אווירת בת מצווה — תאורה רכה ושולחן חגיגי"
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </div>
            <figcaption className="bg-[#152033] px-5 py-4 text-sm font-bold text-[#E8D5A3]">
              בת מצווה — אותה מערכת, ויז&apos;ואל משלה
            </figcaption>
          </motion.figure>
        </div>
      </SectionShell>

      {/* How it works */}
      <SectionShell id="how-it-works" tone="cream">
        <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
          איך Invistimo עובדת בבר ובת מצווה
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C6B7A]">
          בלי סנכרון אוטומטי לוואטסאפ. אתם מכינים רשימה, שולחים קישורים, והתשובות מתרכזות במקום אחד.
        </p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="rounded-[22px] border border-[#D4C4A4] bg-white/85 px-5 py-5"
            >
              <p className="text-xs font-bold tracking-[0.2em] text-[#C4A35A]">{s.n}</p>
              <h3 className={`mt-2 text-xl text-[#152033] ${display.className}`}>{s.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C6B7A]">{s.body}</p>
            </motion.li>
          ))}
        </ol>
      </SectionShell>

      {/* Checklist */}
      <SectionShell id="checklist" tone="light">
        <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
          צ&apos;ק־ליסט אינטראקטיבי להכנה
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C6B7A]">
          סמנו מה כבר מוכן. הסימונים נשמרים רק בדפדפן שלכם.
        </p>
        <div className="mt-10">
          <Checklist />
        </div>
      </SectionShell>

      {/* FAQ */}
      <SectionShell id="faq" tone="ivory">
        <h2 className={`text-3xl leading-tight text-[#152033] md:text-4xl ${display.className}`}>
          שאלות נפוצות — בר ובת מצווה
        </h2>
        <p className="mt-4 max-w-2xl text-[16px] leading-8 text-[#5C6B7A]">
          תשובות לפי מה שהמערכת באמת מאפשרת — בלי הבטחות על ייבוא מוואטסאפ או מחירים אחידים.
        </p>
        <div className="mt-10">
          <FaqBlock />
        </div>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href={LINKS.rsvp} className="font-bold text-[#9A7B2F] underline-offset-4 hover:underline">
            אישורי הגעה
          </Link>
          <Link href={LINKS.invitations} className="font-bold text-[#9A7B2F] underline-offset-4 hover:underline">
            הזמנות דיגיטליות
          </Link>
          <Link href={LINKS.pricing} className="font-bold text-[#9A7B2F] underline-offset-4 hover:underline">
            מחירים
          </Link>
          <Link href={LINKS.chatuna} className="font-bold text-[#9A7B2F] underline-offset-4 hover:underline">
            אישורי הגעה לחתונה
          </Link>
        </div>
      </SectionShell>

      {/* Final CTA */}
      <SectionShell tone="navy" className="!pb-28">
        <h2 className={`max-w-3xl text-3xl leading-tight text-[#F3EDE2] md:text-4xl ${display.className}`}>
          הבר או הבת מצווה מתקרבים. הגיע הזמן לסדר את רשימת המוזמנים.
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#C8D0DC]">
          הזמנות, אישורי הגעה דרך ההורים, מעקב תשובות והושבה בהתאם לחבילה — במקום אחד.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaLink href={LINKS.pricing} variant="primary">
            לבחירת חבילה
          </CtaLink>
          <CtaLink href={LINKS.contact} variant="secondary">
            יש לנו שאלה
          </CtaLink>
        </div>
      </SectionShell>
    </div>
  );
}
