"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";
import { BRIT_FAQS } from "./britFaqs";
import {
  BRIT_H1,
  BRIT_VS_BRITA,
  CHECKLIST_ITEMS,
  CHECKLIST_STORAGE_KEY,
  COMFORT_POINTS,
  FAQ_TOPICS,
  FAST_FLOW,
  HOW_STEPS,
  LINKS,
  MEDIA,
  VENUE_CHECKS,
  WHO_TO_INVITE,
  WHY_POINTS,
} from "./content";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-brit-display",
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
  tone?: "light" | "cream" | "teal" | "ivory";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    light: "bg-[#FFFDF8] text-[#2C241C]",
    cream: "bg-[#F5EFE4] text-[#2C241C]",
    ivory: "bg-[#FAF6EF] text-[#2C241C]",
    teal: "bg-[#1F3A3A] text-[#F5EFE4]",
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
      ? "bg-[#C4A35A] !text-[#1F3A3A] hover:bg-[#B89345]"
      : variant === "secondary"
        ? "border border-[#D8C9AE] bg-[#F5EFE4] !text-[#1F3A3A] hover:bg-white"
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
      <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#2A1F18] bg-[#2A1F18] shadow-[0_28px_60px_rgba(42,31,24,0.28)]">
        <div className="relative aspect-[9/19] w-full overflow-hidden bg-[#F5EFE4]">
          <Image src={src} alt={alt} fill className="object-contain object-top" sizes="280px" priority={priority} />
        </div>
      </div>
    </div>
  );
}

function DemoCaption({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-center text-sm text-[#7A6A58]">{children}</p>;
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
    <div className="rounded-[28px] border border-[#D8C9AE] bg-white/90 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className={`text-2xl text-[#1F3A3A] ${display.className}`}>צ&apos;ק־ליסט קצר לברית / בריתה</h3>
          <p className="mt-2 text-sm text-[#7A6A58]">נשמר בדפדפן שלכם בלבד.</p>
        </div>
        <p className="text-sm font-bold text-[#C4A35A]">
          {done}/{CHECKLIST_ITEMS.length}
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
                <span className={`text-[15px] leading-7 ${on ? "text-[#7A6A58] line-through" : "text-[#2C241C]"}`}>
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
  const byId = Object.fromEntries(BRIT_FAQS.map((f) => [f.id, f]));
  return (
    <div className="space-y-10">
      {FAQ_TOPICS.map((topic) => (
        <div key={topic.id}>
          <h3 className={`mb-4 text-2xl text-[#1F3A3A] ${display.className}`}>{topic.title}</h3>
          <div className="divide-y divide-[#E4D7C2] rounded-[24px] border border-[#E4D7C2] bg-white/80">
            {topic.ids.map((id) => {
              const faq = byId[id];
              if (!faq) return null;
              return (
                <details key={faq.id} className="group px-5 py-4 md:px-6" open={id === topic.ids[0]}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-right marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="text-base font-bold text-[#1F3A3A] md:text-lg">{faq.q}</span>
                    <span className="mt-1 text-[#C4A35A] group-open:hidden" aria-hidden>
                      +
                    </span>
                    <span className="mt-1 hidden text-[#C4A35A] group-open:inline" aria-hidden>
                      −
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

export default function BritBritaMarketingPage() {
  const reduce = useReducedMotion();

  return (
    <div dir="rtl" className={`${display.variable} min-h-screen overflow-x-hidden bg-[#FFFDF8] text-[#2C241C]`}>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-[#E4D7C2]/80">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,#E8D5A3_0%,transparent_42%),linear-gradient(165deg,#FFFDF8_0%,#E8F0EE_48%,#F5EFE4_100%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-24 md:pt-14">
          <motion.div
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={fade}
            transition={{ duration: 0.55 }}
          >
            <p className="text-xs font-bold tracking-[0.22em] text-[#C4A35A]">ברית · בריתה</p>
            <h1
              className={`mt-4 text-[2.15rem] leading-[1.18] text-[#1F3A3A] md:text-[2.75rem] md:leading-[1.14] ${display.className}`}
            >
              {BRIT_H1}
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-8 text-[#5C4A3A]">
              הזמנה דיגיטלית מהירה, איסוף תשובות ומספר מגיעים — גם כשהזמן קצר. בברית: אל תציגו תאריך משוער
              כמחייב עד שהוא סגור באמת.
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
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.06 }}
            className="relative"
          >
            <div className="absolute -inset-8 -z-10 rounded-full bg-[#C4A35A]/20 blur-3xl" />
            <div className="overflow-hidden rounded-[28px] border border-[#D8C9AE] bg-white shadow-[0_24px_50px_rgba(31,58,58,0.14)]">
              <Image
                src={MEDIA.invite}
                alt="הזמנה לדוגמה לברית / בריתה"
                width={900}
                height={1100}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why */}
      <SectionShell tone="ivory">
        <h2 className={`text-3xl leading-tight text-[#1F3A3A] md:text-4xl ${display.className}`}>
          למה אישורי הגעה חשובים גם באירוע קטן
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          שמחה משפחתית לא צריכה להפוך לבלבול של «מי אמר שהוא בא». רשימה אחת עם תשובות ברורות עוזרת להיערך בבית,
          במסעדה או באולם קטן.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {WHY_POINTS.map((p) => (
            <div key={p.title} className="rounded-[22px] border border-[#D8C9AE] bg-white/85 px-5 py-6">
              <h3 className={`text-xl text-[#1F3A3A] ${display.className}`}>{p.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{p.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* Brit vs Brita */}
      <SectionShell tone="cream">
        <h2 className={`text-3xl leading-tight text-[#1F3A3A] md:text-4xl ${display.className}`}>
          ברית ובריתה — הבדלים עדינים, אותו סדר
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {BRIT_VS_BRITA.map((c) => (
            <article key={c.title} className="rounded-[22px] border border-[#D8C9AE] bg-[#FFFDF8] px-5 py-6">
              <h3 className={`text-xl text-[#1F3A3A] ${display.className}`}>{c.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{c.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 rounded-[18px] border border-[#C4A35A]/40 bg-[#FFF8EB] px-5 py-4 text-[15px] leading-7 text-[#5C4324]">
          הערה חשובה: בברית מילה התאריך עשוי להשתנות משיקולים רפואיים או הלכתיים. אין להציג תאריך משוער
          בהזמנה כאילו הוא מחייב.
        </p>
      </SectionShell>

      {/* Who */}
      <SectionShell tone="light">
        <h2 className={`text-3xl leading-tight text-[#1F3A3A] md:text-4xl ${display.className}`}>
          את מי מזמינים
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {WHO_TO_INVITE.map((item) => (
            <article key={item.title} className="rounded-[22px] border border-[#E4D7C2] bg-[#FAF6EF] px-5 py-6">
              <h3 className={`text-xl text-[#1F3A3A] ${display.className}`}>{item.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{item.body}</p>
            </article>
          ))}
        </div>
      </SectionShell>

      {/* Fast digital */}
      <SectionShell tone="teal">
        <h2 className={`text-3xl leading-tight text-[#F5EFE4] md:text-4xl ${display.className}`}>
          הזמנה דיגיטלית מהירה ואיסוף תשובות
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#D5E0DE]">
          כשהזמן קצר, הזמנה דיגיטלית עם קישור אישי עוזרת לאסוף מספר מגיעים בלי לפזר תשובות בצ&apos;אטים.
        </p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FAST_FLOW.map((s, i) => (
            <motion.li
              key={s.n}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-5"
            >
              <p className="text-xs font-bold tracking-[0.18em] text-[#E8D5A3]">{s.n}</p>
              <h3 className={`mt-2 text-lg text-[#F5EFE4] ${display.className}`}>{s.title}</h3>
              <p className="mt-2 text-[14px] leading-7 text-[#D5E0DE]">{s.body}</p>
            </motion.li>
          ))}
        </ol>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <figure>
            <PhoneFrame src={MEDIA.phoneWhatsapp} alt="הודעת WhatsApp — נתוני הדגמה" priority />
            <DemoCaption>הודעת WhatsApp — נתוני הדגמה</DemoCaption>
          </figure>
          <figure>
            <PhoneFrame src={MEDIA.phoneRsvp} alt="טופס אישור הגעה — נתוני הדגמה" />
            <DemoCaption>טופס אישור — נתוני הדגמה</DemoCaption>
          </figure>
        </div>
      </SectionShell>

      {/* Headcount + seating comfort */}
      <SectionShell tone="ivory">
        <h2 className={`text-3xl leading-tight text-[#1F3A3A] md:text-4xl ${display.className}`}>
          מספר מגיעים, הושבה משפחתית ונוחות
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          אחרי שיש תשובות קל יותר לסגור מול המקום. הושבה מלאה אינה חובה בכל ברית — אבל כשצריך שיבוץ משפחתי,
          היא זמינה בהתאם לחבילה.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {COMFORT_POINTS.map((p) => (
            <div key={p.title} className="rounded-[22px] border border-[#D8C9AE] bg-white px-5 py-6">
              <h3 className={`text-xl text-[#1F3A3A] ${display.className}`}>{p.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 overflow-hidden rounded-[24px] border border-[#D8C9AE]">
          <Image
            src={MEDIA.dashboard}
            alt="דשבורד מוזמנים — נתוני הדגמה"
            width={1400}
            height={800}
            className="h-auto w-full"
          />
          <DemoCaption>דשבורד מוזמנים — נתוני הדגמה מהמערכת</DemoCaption>
        </div>
        <div className="mt-8 overflow-hidden rounded-[24px] border border-[#D8C9AE] bg-[#1E1814]">
          <PublicAutoplayVideo
            src="/videos/marketing-captures/demo-seating-map.webm"
            poster="/videos/marketing-captures/demo-seating-map-poster.jpg"
            title="הקלטת מסך — מפת הושבה בדמו מבודד של Invistimo"
            shellClassName="w-full"
            className="aspect-[8/5] w-full"
            expandable
            frameBg="#1E1814"
          />
          <DemoCaption>הקלטת מסך אמיתית מדמו מבודד — מפת הושבה משובצת</DemoCaption>
        </div>
        <div className="mt-8 overflow-hidden rounded-[24px] border border-[#D8C9AE] bg-[#1E1814]">
          <PublicAutoplayVideo
            src="/videos/marketing-captures/guide-brit-brita.webm"
            poster="/videos/marketing-captures/guide-brit-brita-poster.jpg"
            title="המחשה ויזואלית — אווירת ברית ובריתה"
            shellClassName="w-full"
            className="aspect-video w-full"
            expandable
            frameBg="#1E1814"
          />
          <DemoCaption>המחשה תכנונית ייעודית לברית/בריתה — לא צילום מערכת</DemoCaption>
        </div>
        <div className="mt-8">
          <CtaLink href={LINKS.seating} variant="secondary">
            סידורי הושבה
          </CtaLink>
        </div>
      </SectionShell>

      {/* Venue checks */}
      <SectionShell tone="cream">
        <h2 className={`text-3xl leading-tight text-[#1F3A3A] md:text-4xl ${display.className}`}>
          בדיקות למקום — בית, מסעדה או אולם
        </h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {VENUE_CHECKS.map((item) => (
            <li
              key={item}
              className="rounded-[16px] border border-[#D8C9AE] bg-[#FFFDF8] px-5 py-4 text-[15px] leading-7 text-[#2C241C]"
            >
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-[15px] text-[#5C4A3A]">
          מדריכים שימושיים:{" "}
          <Link href={LINKS.whenToSend} className="font-bold text-[#8A6E2E] underline-offset-4 hover:underline">
            מתי שולחים אישורי הגעה
          </Link>
          {" · "}
          <Link href={LINKS.guestList} className="font-bold text-[#8A6E2E] underline-offset-4 hover:underline">
            רשימת מוזמנים
          </Link>
          {" · "}
          <Link
            href={LINKS.venueGuarantee}
            className="font-bold text-[#8A6E2E] underline-offset-4 hover:underline"
          >
            התחייבות מול מקום האירוע
          </Link>
        </p>
      </SectionShell>

      {/* How */}
      <SectionShell id="how-it-works" tone="light">
        <h2 className={`text-3xl leading-tight text-[#1F3A3A] md:text-4xl ${display.className}`}>
          איך Invistimo עובדת בברית ובריתה
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          בלי ייבוא אוטומטי מוואטסאפ. אתם בונים רשימה, שולחים קישורים, והתשובות מתרכזות במערכת.
        </p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_STEPS.map((s) => (
            <li key={s.n} className="rounded-[22px] border border-[#D8C9AE] bg-[#FAF6EF] px-5 py-5">
              <p className="text-xs font-bold tracking-[0.2em] text-[#C4A35A]">{s.n}</p>
              <h3 className={`mt-2 text-xl text-[#1F3A3A] ${display.className}`}>{s.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 overflow-hidden rounded-[24px] border border-[#D8C9AE]">
          <Image
            src={MEDIA.seating}
            alt="מפת הושבה — נתוני הדגמה, בהתאם לחבילה"
            width={1400}
            height={800}
            className="h-auto w-full"
          />
          <DemoCaption>הושבה — נתוני הדגמה; זמינה בהתאם לחבילה</DemoCaption>
        </div>
      </SectionShell>

      {/* Checklist */}
      <SectionShell id="checklist" tone="ivory">
        <h2 className={`text-3xl leading-tight text-[#1F3A3A] md:text-4xl ${display.className}`}>
          צ&apos;ק־ליסט קצר
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5C4A3A]">
          סמנו מה כבר סגור. הסימונים נשמרים בדפדפן בלבד.
        </p>
        <div className="mt-10">
          <Checklist />
        </div>
      </SectionShell>

      {/* FAQ */}
      <SectionShell id="faq" tone="cream">
        <h2 className={`text-3xl leading-tight text-[#1F3A3A] md:text-4xl ${display.className}`}>
          שאלות נפוצות — ברית ובריתה
        </h2>
        <div className="mt-10">
          <FaqBlock />
        </div>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href={LINKS.rsvp} className="font-bold text-[#8A6E2E] underline-offset-4 hover:underline">
            אישורי הגעה
          </Link>
          <Link href={LINKS.mitzvah} className="font-bold text-[#8A6E2E] underline-offset-4 hover:underline">
            בר ובת מצווה
          </Link>
          <Link href={LINKS.invitations} className="font-bold text-[#8A6E2E] underline-offset-4 hover:underline">
            הזמנות דיגיטליות
          </Link>
          <Link href={LINKS.pricing} className="font-bold text-[#8A6E2E] underline-offset-4 hover:underline">
            מחירים
          </Link>
          <Link href={LINKS.costGuide} className="font-bold text-[#8A6E2E] underline-offset-4 hover:underline">
            מחיר לפי רשומות
          </Link>
        </div>
      </SectionShell>

      {/* Final CTA */}
      <SectionShell tone="teal" className="!pb-28">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className={`max-w-3xl text-3xl leading-tight text-[#F5EFE4] md:text-4xl ${display.className}`}>
            השמחה קרובה. בואו נארגן את המוזמנים בלי לחץ מיותר.
          </h2>
          <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#D5E0DE]">
            הזמנה דיגיטלית, אישורי הגעה ומספר מגיעים — לברית ולבריתה, בקצב שמתאים לכם.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaLink href={LINKS.pricing} variant="primary">
              לבחירת חבילה
            </CtaLink>
            <CtaLink href={LINKS.contact} variant="secondary">
              יצירת קשר
            </CtaLink>
          </div>
        </motion.div>
      </SectionShell>
    </div>
  );
}
