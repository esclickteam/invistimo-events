"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Noto_Serif_Hebrew } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import { HINA_FAQS } from "./hinaFaqs";
import {
  CONTENT_UPDATED_LABEL,
  DEMO_GUEST_ROWS,
  DEMO_TABLE,
  EXAMPLE_RECORDS,
  FAMILY_CONSIDERATIONS,
  FAQ_TOPICS,
  LINKS,
  MEDIA,
  PACKAGE_CARDS,
  PLANNING_TIPS,
  RSVP_BENEFITS,
  RSVP_SEND_POINTS,
  SEATING_CAPABILITIES,
  SEATING_VIDEO,
  WORKFLOW_STEPS,
} from "./content";

const display = Noto_Serif_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-hina-display",
});

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

/** Subtle Moroccan diamond wash — always behind content (z-0), never above text. */
function MoroccanPattern({
  className = "",
  opacity = 0.08,
  patternId = "hina-geo",
}: {
  className?: string;
  /** Visual strength; keep ~0.06–0.12 so pattern stays atmospheric. */
  opacity?: number;
  patternId?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
      aria-hidden
      style={{ opacity }}
    >
      <svg className="h-full w-full" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={patternId} width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M20 2 L38 20 L20 38 L2 20 Z M20 10 L30 20 L20 30 L10 20 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
            />
          </pattern>
        </defs>
        <rect width="120" height="120" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}

function TipIcon({ tipId }: { tipId: (typeof PLANNING_TIPS)[number]["id"] }) {
  const common = "h-9 w-9";
  if (tipId === "guest-list") {
    return (
      <svg className={common} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="6" y="4" width="20" height="24" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 11h10M11 16h10M11 21h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (tipId === "venue") {
    return (
      <svg className={common} viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M6 26V14l10-8 10 8v12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M13 26v-8h6v8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tipId === "evening") {
    return (
      <svg className={common} viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 10v6l4 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="9" r="1.4" fill="currentColor" />
      <circle cx="22" cy="13" r="1.4" fill="currentColor" />
      <circle cx="22" cy="19" r="1.4" fill="currentColor" />
      <circle cx="16" cy="23" r="1.4" fill="currentColor" />
      <circle cx="10" cy="19" r="1.4" fill="currentColor" />
      <circle cx="10" cy="13" r="1.4" fill="currentColor" />
    </svg>
  );
}

function ArchFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-10 rounded-t-[999px] border-x-2 border-t-2 border-[#A67C3D]/45"
        aria-hidden
      />
      {children}
    </div>
  );
}

function SectionShell({
  id,
  tone = "cream",
  children,
  className = "",
}: {
  id?: string;
  tone?: "cream" | "champagne" | "burgundy" | "sand";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    cream: "bg-[#FBF5EB] text-[#3A2A1F]",
    champagne: "bg-[#F3E6D0] text-[#3A2A1F]",
    sand: "bg-[#F7EBDC] text-[#3A2A1F]",
    burgundy: "bg-[#4A1520] text-[#F7E8D2]",
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
  variant?: "primary" | "secondary" | "ghost" | "light";
}) {
  const styles =
    variant === "primary"
      ? "bg-[#6B1F2A] !text-[#FBF5EB] hover:bg-[#5C1A24]"
      : variant === "secondary"
        ? "border border-[#A67C3D]/55 bg-[#FBF5EB]/90 !text-[#4A1520] hover:bg-white"
        : variant === "light"
          ? "bg-[#F3E6D0] !text-[#4A1520] hover:bg-[#FBF5EB]"
          : "!text-[#A67C3D] underline-offset-4 hover:underline";
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-sm px-6 py-3 text-[15px] font-bold transition ${styles}`}
    >
      {children}
    </Link>
  );
}

function PhoneFrame({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative mx-auto w-[min(100%,260px)]">
      <div className="overflow-hidden rounded-[1.75rem] border-[8px] border-[#2A1814] bg-[#2A1814] shadow-[0_24px_50px_rgba(74,21,32,0.28)]">
        <div className="relative aspect-[9/19] w-full overflow-hidden bg-[#FBF5EB]">
          <Image src={src} alt={alt} fill className="object-contain object-top" sizes="260px" priority={priority} />
        </div>
      </div>
    </div>
  );
}

function SeatingDemoCard() {
  const pct = Math.round((DEMO_TABLE.seated / DEMO_TABLE.capacity) * 100);
  return (
    <div className="rounded-[28px] border border-[#D4B483]/70 bg-white/90 p-6 shadow-[0_18px_40px_rgba(74,21,32,0.08)]">
      <p className="text-xs font-bold tracking-[0.16em] text-[#A67C3D]">המחשת מערכת · נתוני דמו</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-3xl text-[#4A1520] ${display.className}`}>{DEMO_TABLE.label}</p>
          <p className="mt-1 text-sm text-[#5C4A3A]">{DEMO_TABLE.note}</p>
        </div>
        <p
          dir="ltr"
          className={`text-4xl font-bold text-[#6B1F2A] ${display.className}`}
        >
          {DEMO_TABLE.seated}
          <span className="text-xl text-[#A67C3D]"> / {DEMO_TABLE.capacity}</span>
        </p>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#F3E6D0]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-[#6B1F2A] via-[#A67C3D] to-[#2F4F3E]"
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </div>
      <div className="mt-5 grid grid-cols-5 gap-2" aria-hidden>
        {Array.from({ length: DEMO_TABLE.capacity }).map((_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-full border ${
              i < DEMO_TABLE.seated
                ? "border-[#6B1F2A] bg-[#6B1F2A]/85"
                : "border-[#D4B483] bg-[#FBF5EB]"
            }`}
          />
        ))}
      </div>
      <p className="mt-5 rounded-2xl border border-[#E8D5B5] bg-[#FBF5EB] px-4 py-3 text-sm leading-6 text-[#5C4A3A]">
        {DEMO_TABLE.family} — המחשה של משפחה שמשובצת יחד באותו שולחן, עם מקומות פנויים שעדיין נשארו.
      </p>
    </div>
  );
}

function PlanningTipCard({ tip }: { tip: (typeof PLANNING_TIPS)[number] }) {
  const lightTop = tip.id === "evening" || tip.id === "seating";
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#D4B483]/60 bg-white/90 shadow-[0_14px_36px_rgba(74,21,32,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(74,21,32,0.12)]">
      <div
        className={`relative flex h-28 shrink-0 items-center justify-center ${lightTop ? "text-[#6B1F2A]" : "text-[#FBF5EB]"}`}
        style={{
          background: `linear-gradient(145deg, ${tip.palette[0]} 0%, ${tip.palette[1]} 55%, ${tip.palette[2]} 100%)`,
        }}
      >
        <div className="absolute inset-3 rounded-[18px] border border-white/25" />
        <MoroccanPattern
          patternId={`tip-geo-${tip.id}`}
          opacity={0.07}
          className={lightTop ? "text-[#4A1520]" : "text-white"}
        />
        <div className="relative z-10">
          <TipIcon tipId={tip.id} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#A67C3D]">{tip.eyebrow}</p>
        <h3 className={`mt-2 text-xl leading-8 text-[#4A1520] ${display.className}`}>{tip.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-7 text-[#5C4A3A]">{tip.body}</p>
        {tip.href && tip.linkLabel ? (
          <Link
            href={tip.href}
            className="mt-4 inline-flex text-sm font-bold text-[#6B1F2A] underline-offset-2 transition hover:underline"
          >
            {tip.linkLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function FaqBlock() {
  const byId = Object.fromEntries(HINA_FAQS.map((f) => [f.id, f]));

  return (
    <div className="space-y-10">
      {FAQ_TOPICS.map((topic) => (
        <div key={topic.id}>
          <h3 className={`mb-4 text-2xl text-[#4A1520] ${display.className}`}>{topic.title}</h3>
          <div className="divide-y divide-[#E8D5B5] rounded-[24px] border border-[#E8D5B5] bg-white/85">
            {topic.ids.map((id) => {
              const faq = byId[id];
              if (!faq) return null;
              return (
                <details key={faq.id} className="group px-5 py-4 md:px-6" open={id === topic.ids[0]}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-right marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="text-base font-bold text-[#3A2A1F] md:text-lg">{faq.q}</span>
                    <span className="mt-1 text-[#A67C3D] group-open:hidden" aria-hidden>
                      +
                    </span>
                    <span className="mt-1 hidden text-[#A67C3D] group-open:inline" aria-hidden>
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

function SeatingVideo() {
  const ref = useRef<HTMLVideoElement | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#D4B483]/70 bg-[#2A1814] shadow-[0_24px_50px_rgba(74,21,32,0.18)]">
      <video
        ref={ref}
        src={SEATING_VIDEO.src}
        poster={SEATING_VIDEO.poster}
        title={SEATING_VIDEO.title}
        muted
        loop
        playsInline
        preload="none"
        className="aspect-video w-full object-cover"
      />
    </div>
  );
}

export default function HinaMarketingPage() {
  const reduce = useReducedMotion();

  return (
    <div
      dir="rtl"
      className={`${display.variable} min-h-screen overflow-x-hidden bg-[#FBF5EB] text-[#3A2A1F]`}
      style={
        {
          "--hina-cream": "#FBF5EB",
          "--hina-champagne": "#F3E6D0",
          "--hina-gold": "#A67C3D",
          "--hina-burgundy": "#6B1F2A",
          "--hina-terracotta": "#C45C3A",
          "--hina-green": "#2F4F3E",
        } as CSSProperties
      }
    >
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <Image
            src={MEDIA.heroAtmosphere}
            alt="אווירת חינה חגיגית — שולחנות מעוצבים, אור חם ועיטורים מסורתיים"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(251,245,235,0.96)_0%,rgba(251,245,235,0.92)_42%,rgba(74,21,32,0.55)_100%)]" />
        </div>
        <MoroccanPattern patternId="hina-hero-geo" opacity={0.07} className="text-[#A67C3D]" />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-24 md:pt-16">
          <motion.div
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={fade}
            transition={{ duration: 0.7 }}
            className="rounded-[28px] bg-[#FBF5EB]/55 p-1 md:bg-transparent md:p-0"
          >
            <p className={`text-4xl font-bold tracking-tight text-[#6B1F2A] md:text-5xl ${display.className}`}>
              Invistimo
            </p>
            <p className="mt-3 text-sm font-bold tracking-[0.18em] text-[#A67C3D]">חינה · הזמנות · אישורי הגעה · הושבה</p>
            <h1 className={`mt-5 text-3xl font-bold leading-[1.25] text-[#3A2A1F] md:text-[2.55rem] ${display.className}`}>
              אישורי הגעה לחינה וסידורי הושבה — כדי שתוכלו פשוט ליהנות מהשמחה
            </h1>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-[#5C4A3A]">
              מההזמנה הראשונה ועד שהאורח האחרון מוצא את מקומו — מנהלים את המוזמנים לחינה בצורה
              מסודרת, אישית ונוחה.
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#5C4A3A]">
              חינה היא חגיגה של משפחה, מסורת ואנשים אהובים. גם כשהאירוע קטן ואינטימי, יש לא מעט
              דברים שצריך לתכנן: מי מגיע, כמה בני משפחה יצטרפו, כמה מקומות להכין ואיפה כולם יישבו.
              עם Invistimo אפשר לנהל הזמנות דיגיטליות, אישורי הגעה וסידורי הושבה במקום אחד — כדי
              שאתם והמשפחה תוכלו להתרכז בחגיגה.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <CtaLink href={LINKS.pricing}>לתכנון החינה שלכם</CtaLink>
              <CtaLink href="#why-seating" variant="secondary">
                למה צריך סידורי הושבה גם בחינה קטנה?
              </CtaLink>
            </div>
            <p className="mt-6 text-xs font-semibold text-[#8A7358]">{CONTENT_UPDATED_LABEL}</p>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.75 }}
            className="relative mx-auto grid w-full max-w-md grid-cols-[0.9fr_1fr] items-end gap-3"
          >
            <ArchFrame className="relative aspect-[3/4] overflow-hidden rounded-[28px] border border-[#D4B483]/70 bg-[#F3E6D0] shadow-[0_28px_60px_rgba(74,21,32,0.22)]">
              <Image
                src={MEDIA.inviteHenna}
                alt="הזמנה דיגיטלית לחינה מתוך Invistimo — עיצוב מרוקאי חגיגי"
                fill
                className="object-cover object-top"
                sizes="220px"
                priority
              />
            </ArchFrame>
            <div className="mb-4">
              <PhoneFrame
                src={MEDIA.phoneRsvp}
                alt="מסך אישור הגעה אישי במערכת Invistimo — נתוני דמו"
                priority
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why RSVP */}
      <SectionShell id="why-rsvp" tone="champagne">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.16em] text-[#A67C3D]">אישורי הגעה לחינה</p>
          <h2 className={`mt-3 text-3xl md:text-4xl ${display.className}`}>
            גם כשמזמינים את האנשים הכי קרובים, חשוב לדעת כמה באמת מגיעים
          </h2>
        </div>
        <div className="mx-auto mt-10 max-w-3xl space-y-5 text-[16px] leading-8 text-[#5C4A3A]">
          <p>
            בחינה אנחנו בדרך כלל מזמינים משפחה, חברים קרובים ואנשים שאנחנו מכירים היטב. לכן קל
            לחשוב שאין צורך באישורי הגעה מסודרים — הרי כולם מכירים את כולם.
          </p>
          <p>
            אבל גם באירוע משפחתי יש שינויים. משפחה שהוזמנה עם הילדים עשויה להגיע רק עם חלק מהם. זוג
            שאמר שיגיע יכול להודיע על שינוי. ויש אורחים שמתכננים להגיע, אבל עדיין לא מסרו תשובה
            ברורה.
          </p>
          <p>
            כשמסתמכים רק על שיחות והודעות אישיות, לא תמיד פשוט לזכור מי אישר וכמה אנשים מגיעים מכל
            משפחה. אישורי הגעה מאפשרים לקבל תמונה מסודרת של מספר המשתתפים הצפוי, במקום להסתמך על
            הערכות בלבד.
          </p>
        </div>
        <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RSVP_BENEFITS.map((item, i) => (
            <motion.li
              key={item}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="rounded-[20px] border border-[#D4B483]/55 bg-[#FBF5EB]/90 px-5 py-4 text-sm font-semibold leading-6 text-[#3A2A1F]"
            >
              <span className="ml-2 text-[#2F4F3E]" aria-hidden>
                ✓
              </span>
              {item}
            </motion.li>
          ))}
        </ul>
        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-7 text-[#8A7358]">
          אין הבטחה שכל מוזמן ישיב או שכל המאשרים יגיעו בפועל — אישור הגעה הוא כלי תכנון, לא התחייבות
          מוחלטת לנוכחות.
        </p>
      </SectionShell>

      {/* Why seating — key section */}
      <SectionShell id="why-seating" tone="cream" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-10 top-20 h-64 w-64 rounded-full bg-[#C45C3A]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 bottom-10 h-72 w-72 rounded-full bg-[#6B1F2A]/08 blur-3xl" />
        <div className="relative grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#C45C3A]">סידורי הושבה לחינה</p>
            <h2 className={`mt-3 text-3xl leading-[1.3] md:text-4xl ${display.className}`}>
              החינה אולי קטנה יותר מחתונה — אבל אף אורח לא רוצה לחכות שיחפשו לו כיסא
            </h2>
            <div className="mt-6 space-y-5 text-[16px] leading-8 text-[#5C4A3A]">
              <p>
                יש זוגות שחושבים שסידורי הושבה מתאימים רק לחתונות גדולות. אבל דווקא באירוע משפחתי,
                שבו כולם רוצים לשבת עם האנשים הקרובים אליהם, תכנון המקומות יכול להיות חשוב מאוד.
              </p>
              <p>
                תארו לעצמכם שסבא וסבתא מגיעים לחינה, והם צריכים לעמוד ולהמתין בזמן שמחפשים להם שולחן
                מתאים. או שמשפחה של שישה מגיעה יחד, אבל המקומות הפנויים מפוזרים בין כמה שולחנות.
              </p>
              <p className={`text-xl leading-9 text-[#4A1520] ${display.className}`}>
                גם באירוע קטן, קבלת פנים נעימה מתחילה בכך שכל אורח יודע שמחכה לו מקום.
              </p>
              <p>
                עם סידורי הושבה מתוכננים מראש, אפשר לדאוג שבני משפחה יישבו יחד, להתחשב במבוגרים
                ובאורחים עם צרכי נגישות, ולחלק את המקומות בצורה מסודרת — במקום לפתור בעיות ישיבה
                בזמן החינה.
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-[#D4B483]/60 shadow-[0_20px_45px_rgba(74,21,32,0.12)]">
              <Image
                src={MEDIA.reception}
                alt="קבלת פנים חגיגית לחינה — כניסה מוארת באור חם"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 480px"
              />
            </div>
            <div className="rounded-[24px] border border-[#6B1F2A]/20 bg-[#4A1520] p-6 text-[#F7E8D2]">
              <p className="text-sm font-bold tracking-[0.14em] text-[#D4B483]">המחשה</p>
              <p className="mt-3 text-[15px] leading-7">
                משפחה של 6 אורחים מגיעה לחינה של 120 משתתפים. באולם יש 6 מקומות פנויים — אבל הם
                מפוזרים בשלושה שולחנות. הבעיה היא לא שאין מספיק כיסאות. הבעיה היא שאין מספיק מקומות
                יחד.
              </p>
              <p className="mt-4 text-[15px] font-semibold leading-7 text-[#F3E6D0]">
                עם סידורי הושבה מראש, אפשר להיערך לכך טוב יותר.
              </p>
            </div>
          </div>
        </div>
        <p className="relative mx-auto mt-10 max-w-3xl rounded-[20px] border border-[#D4B483]/50 bg-white/70 px-5 py-4 text-center text-sm leading-7 text-[#5C4A3A]">
          באירוע קטן מאוד עם מקומות בשפע, הושבה חופשית יכולה להתאים. המטרה כאן אינה להציג אותה
          כטעות — אלא להסביר מתי תכנון מוקדם מועיל. לפרטים על הכלי:{" "}
          <Link href={LINKS.seating} className="font-bold text-[#6B1F2A] underline-offset-2 hover:underline">
            סידורי הושבה ב־Invistimo
          </Link>
          .
        </p>
      </SectionShell>

      {/* How seating works */}
      <SectionShell id="seating-system" tone="sand">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.16em] text-[#A67C3D]">מפת הושבה דיגיטלית</p>
          <h2 className={`mt-3 text-3xl md:text-4xl ${display.className}`}>יודעים מראש מי יושב איפה</h2>
          <p className="mt-5 text-[16px] leading-8 text-[#5C4A3A]">
            מערכת סידורי ההושבה הדיגיטלית של Invistimo מאפשרת לתכנן את השולחנות ואת חלוקת המוזמנים
            לפני האירוע — לראות מצב שולחנות, לשבץ אורחים ולעקוב אחר מספר המקומות המשובצים והפנויים.
          </p>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[28px] border border-[#D4B483]/70 bg-white shadow-[0_20px_45px_rgba(74,21,32,0.1)]">
              <Image
                src={MEDIA.dashboardSeating}
                alt="צילום מסך אמיתי של מפת הושבה במערכת Invistimo — נתוני דמו"
                width={1280}
                height={800}
                className="h-auto w-full"
              />
            </div>
            <SeatingVideo />
          </div>
          <div className="space-y-6">
            <SeatingDemoCard />
            <ul className="space-y-3">
              {SEATING_CAPABILITIES.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#D4B483]/45 bg-[#FBF5EB] px-4 py-3 text-sm font-semibold text-[#3A2A1F]"
                >
                  <span className="ml-2 text-[#A67C3D]" aria-hidden>
                    ◆
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <CtaLink href={LINKS.seating} variant="secondary">
              להסבר המלא על סידורי הושבה
            </CtaLink>
          </div>
        </div>
      </SectionShell>

      {/* What matters in hina seating */}
      <SectionShell id="family-seating" tone="cream">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`text-3xl md:text-4xl ${display.className}`}>
            משפחה, קרבה ונוחות — לא רק מספרי שולחנות
          </h2>
          <p className="mt-5 text-[16px] leading-8 text-[#5C4A3A]">
            בחינה יש לעיתים חשיבות מיוחדת לקרבה המשפחתית ולחלוקת הישיבה בין קבוצות שונות. הסידור
            צריך להתאים למשפחה ולאופי האירוע — בלי להניח שכל חינה מחייבת הפרדה או סידור מסורתי מסוים.
          </p>
        </div>
        <ul className="mt-12 grid gap-3 sm:grid-cols-2">
          {FAMILY_CONSIDERATIONS.map((item) => (
            <li
              key={item}
              className="rounded-[18px] border border-[#E8D5B5] bg-white/80 px-5 py-4 text-sm font-semibold leading-6 text-[#3A2A1F]"
            >
              {item}
            </li>
          ))}
        </ul>
      </SectionShell>

      {/* Planning tips — same card chrome, new content */}
      <SectionShell id="planning-tips" tone="burgundy" className="relative isolate overflow-hidden">
        <MoroccanPattern patternId="hina-tips-geo" opacity={0.08} className="text-[#D4B483]" />
        <div className="relative z-10">
          <div className="mx-auto max-w-3xl rounded-[28px] bg-[#4A1520]/55 px-4 py-2 text-center backdrop-blur-[1px] md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-0">
            <p className="text-sm font-bold tracking-[0.16em] text-[#D4B483]">מתכננים את החינה</p>
            <h2 className={`mt-3 text-3xl text-[#FBF5EB] md:text-4xl ${display.className}`}>
              ארבעה דברים שעושים חינה בלתי נשכחת
            </h2>
            <p className="mt-5 text-[16px] leading-8 text-[#E8D5B5]">
              מהאווירה ועד הפרטים הקטנים — כך יוצרים חגיגה שמחה, אישית ומסודרת.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:auto-rows-fr">
            {PLANNING_TIPS.map((tip) => (
              <PlanningTipCard key={tip.id} tip={tip} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <CtaLink href={LINKS.invitations} variant="light">
              להזמנות דיגיטליות ב־Invistimo
            </CtaLink>
          </div>
        </div>
      </SectionShell>

      {/* How to send RSVP */}
      <SectionShell id="how-rsvp" tone="champagne">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#A67C3D]">שליחת אישורי הגעה</p>
            <h2 className={`mt-3 text-3xl md:text-4xl ${display.className}`}>
              במקום לשאול כל משפחה בנפרד — מרכזים את התשובות
            </h2>
            <p className="mt-5 text-[16px] leading-8 text-[#5C4A3A]">
              אפשר להכין{" "}
              <Link href={LINKS.guestList} className="font-bold text-[#6B1F2A] underline-offset-2 hover:underline">
                רשימת מוזמנים
              </Link>{" "}
              מסודרת ולנהל את תהליך אישורי ההגעה בהתאם לחבילה שנבחרה. כאשר אורחים מקבלים פנייה, הם
              מעדכנים אם הם מתכננים להגיע וכמה משתתפים יגיעו במסגרת הרשומה שלהם — דרך קישור אישי,
              לא דרך כפתור בתוך הודעת WhatsApp.
            </p>
            <ul className="mt-8 space-y-3">
              {RSVP_SEND_POINTS.map((item) => (
                <li key={item} className="flex gap-3 text-sm font-semibold leading-6 text-[#3A2A1F]">
                  <span className="mt-1 text-[#2F4F3E]" aria-hidden>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaLink href={LINKS.whatsapp}>אישורי הגעה ב־WhatsApp</CtaLink>
              <CtaLink href={LINKS.rsvp} variant="secondary">
                לעמוד אישורי ההגעה
              </CtaLink>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <PhoneFrame src={MEDIA.phoneWhatsapp} alt="הודעת WhatsApp עם קישור אישי — צילום מערכת דמו" />
            <div className="space-y-4 self-center">
              <div className="overflow-hidden rounded-[22px] border border-[#D4B483]/60 bg-white shadow-lg">
                <Image
                  src={MEDIA.rsvpDashboardPoster}
                  alt="מסך ניהול אישורי הגעה במערכת Invistimo — נתוני דמו"
                  width={840}
                  height={1520}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Record vs participants */}
      <SectionShell id="records" tone="cream">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden rounded-[28px] border border-[#D4B483]/60 bg-white shadow-[0_18px_40px_rgba(74,21,32,0.1)]">
            <Image
              src={MEDIA.dashboardGuests}
              alt="צילום מסך של רשימת מוזמנים ודשבורד במערכת Invistimo — נתוני דמו"
              width={1280}
              height={800}
              className="h-auto w-full"
            />
          </div>
          <div>
            <h2 className={`text-3xl md:text-4xl ${display.className}`}>
              הזמנתם משפחה של חמישה, אבל מגיעים רק שלושה?
            </h2>
            <div className="mt-6 space-y-4 text-[16px] leading-8 text-[#5C4A3A]">
              <p>
                גם בחינה משפחתית חשוב להבחין בין מספר הרשומות לבין מספר האנשים. רשומה אחת יכולה
                לייצג משפחה שלמה.
              </p>
              <p>
                אם משפחה של חמישה מודיעה שרק שלושה מגיעים, התכנון צריך להתבסס על מספר המשתתפים
                המעודכן — כך אפשר להיערך בצורה מדויקת יותר מבחינת מקומות ישיבה.
              </p>
              <p className="text-sm leading-7 text-[#8A7358]">
                המערכת אינה משנה שיבוצים באופן אוטומטי כשמספר המשתתפים מתעדכן; מעדכנים את התכנון
                וההושבה לפי המידע החדש.
              </p>
            </div>
            <div className="mt-8 overflow-hidden rounded-[22px] border border-[#E8D5B5] bg-white/90">
              <table className="w-full text-right text-sm">
                <thead className="bg-[#F3E6D0] text-[#4A1520]">
                  <tr>
                    <th className="px-4 py-3 font-bold">רשומה (דמו)</th>
                    <th className="px-4 py-3 font-bold">קבוצה</th>
                    <th className="px-4 py-3 font-bold">סטטוס</th>
                    <th className="px-4 py-3 font-bold">מגיעים</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_GUEST_ROWS.map((row) => (
                    <tr key={row.name} className="border-t border-[#E8D5B5]">
                      <td className="px-4 py-3 font-semibold">{row.name}</td>
                      <td className="px-4 py-3 text-[#5C4A3A]">{row.group}</td>
                      <td className="px-4 py-3 text-[#5C4A3A]">{row.status}</td>
                      <td className="px-4 py-3 font-bold text-[#6B1F2A]">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* LIVE */}
      <SectionShell id="live" tone="burgundy">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#D4B483]">הושבה LIVE ביום החינה</p>
            <h2 className={`mt-3 text-3xl text-[#FBF5EB] md:text-4xl ${display.className}`}>
              גם ביום החינה אפשר להישאר מעודכנים
            </h2>
            <div className="mt-6 space-y-4 text-[16px] leading-8 text-[#E8D5B5]">
              <p>
                ביום האירוע, מספר המשתתפים בפועל עשוי להיות שונה ממספר המאשרים. כאשר משתמשים בשירות
                LIVE המתאים, ניתן לעקוב אחר הגעת האורחים ולנהל את תמונת המצב בזמן אמת.
              </p>
              <p>
                למשל, אם משפחה אישרה ארבעה משתתפים אך הגיעו שניים, יש לברר אם השניים הנוספים
                מתעכבים או שלא יגיעו. רק לאחר שמתקבל מידע אמין שהם לא יגיעו, אפשר לשקול לשחרר את
                המקומות שלהם בהתאם לתהליך המערכת.
              </p>
              <p className={`text-xl leading-9 text-[#F3E6D0] ${display.className}`}>
                לא צריך לחכות לסיום קבלת הפנים כדי להתחיל לזהות שינויים — אפשר להיערך כבר כשהאורחים
                מגיעים.
              </p>
              <p className="text-sm leading-7 text-[#D4B483]">
                לא משחררים מקומות רק כי אורח עדיין לא הגיע. LIVE הוא שירות בהתאם לחבילה — לא חלק
                אוטומטי מכל שירות הושבה.
              </p>
            </div>
            <div className="mt-8">
              <CtaLink href={LINKS.eventManagement} variant="light">
                לניהול יום האירוע
              </CtaLink>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-[#D4B483]/40 shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
            <Image
              src={MEDIA.reception}
              alt="אווירת קבלת פנים בחינה — מעקב הגעה ביום האירוע"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 520px"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#4A1520]/90 to-transparent p-6">
              <p className={`text-lg text-[#FBF5EB] ${display.className}`}>יום החינה · תמונת מצב חיה</p>
              <p className="mt-1 text-sm text-[#E8D5B5]">בהתאם לשירות LIVE שנבחר בחבילה</p>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Staff */}
      <SectionShell id="staff" tone="cream">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`text-3xl md:text-4xl ${display.className}`}>
            מי יקבל את האורחים ויעזור להם למצוא את המקום?
          </h2>
          <div className="mt-6 space-y-4 text-[16px] leading-8 text-[#5C4A3A]">
            <p>
              באירוע קטן, לעיתים בן משפחה או אחראי מטעם האירוע יכולים לסייע בהכוונת האורחים. באירוע
              גדול או מורכב יותר, אנשי צוות הושבה יכולים לעזור בקבלת הפנים, באיתור שמות ובהכוונה
              לשולחנות.
            </p>
            <p>
              הבחירה תלויה במספר המשתתפים, במבנה האולם ובאופי האירוע. שירות אנשי צוות מוצג רק כשהוא
              זמין וסוכם במסגרת החבילה — אינו כלול אוטומטית בכל מסלול הושבה.
            </p>
          </div>
          <div className="mt-8">
            <CtaLink href={LINKS.contact} variant="secondary">
              לשיחה על התאמת שירות
            </CtaLink>
          </div>
        </div>
      </SectionShell>

      {/* Timing */}
      <SectionShell id="timing" tone="sand">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`text-3xl md:text-4xl ${display.className}`}>מתי כדאי להתחיל לאסוף תשובות?</h2>
          <p className="mt-5 text-[16px] leading-8 text-[#5C4A3A]">
            מועד שליחת אישורי ההגעה תלוי בתאריך האירוע, במועד שבו האולם מבקש מספר משתתפים סופי
            ובמספר הסבבים שנבחרו. כדאי לתכנן כך שיישאר זמן לאסוף תשובות, לבצע בירורים ולעדכן את
            ההושבה לפני האירוע.
          </p>
          <p className="mt-4 text-sm leading-7 text-[#8A7358]">
            אין כלל קשיח של 14–18 ימים לכל חינה. זהו טווח תכנון שניתן לבחון בהתאם לנסיבות — לא
            התחייבות לתזמון אחיד.
          </p>
          <div className="mt-8">
            <CtaLink href={LINKS.whenToSend}>למדריך התזמון המלא</CtaLink>
          </div>
        </div>
      </SectionShell>

      {/* Pricing */}
      <SectionShell id="pricing" tone="champagne">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`text-3xl md:text-4xl ${display.className}`}>
            בוחרים את השירותים שמתאימים לגודל האירוע
          </h2>
          <p className="mt-5 text-[16px] leading-8 text-[#5C4A3A]">
            לא כל חינה זקוקה לאותה רמת שירות. יש משפחות שצריכות בעיקר אישורי הגעה, אחרות רוצות גם
            מפת הושבה, ויש אירועים שבהם נדרש ניהול LIVE או סיוע של אנשי צוות. מספר רשומות אינו
            בהכרח מספר המשתתפים; רשומות ללא מספר טלפון נשארות ברשימה ואינן נגרעות ממכסת הרשומות
            בתשלום.
          </p>
          <p className="mt-3 text-sm font-semibold text-[#8A7358]">
            דוגמת מחיר להמחשה ל־{EXAMPLE_RECORDS} רשומות — הסכום העדכני רק במחשבון
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PACKAGE_CARDS.map((pkg) => (
            <article
              key={pkg.id}
              className="flex flex-col rounded-[24px] border border-[#D4B483]/60 bg-[#FBF5EB] p-6 shadow-[0_14px_36px_rgba(74,21,32,0.06)]"
            >
              <p className="text-xs font-bold tracking-[0.14em] text-[#A67C3D]">{pkg.badge}</p>
              <h3 className={`mt-2 text-2xl text-[#4A1520] ${display.className}`}>{pkg.hebrewName}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C4A3A]">{pkg.description}</p>
              <p className={`mt-5 text-3xl font-bold text-[#6B1F2A] ${display.className}`}>
                ₪{pkg.examplePriceIls}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm leading-6 text-[#5C4A3A]">
                <li>{pkg.waRounds}</li>
                <li>{pkg.callRounds}</li>
                <li>{pkg.seating}</li>
              </ul>
              <div className="mt-6">
                <CtaLink href={`${LINKS.pricing}?records=${EXAMPLE_RECORDS}&package=${pkg.id}`}>
                  לחישוב מדויק
                </CtaLink>
              </div>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-7 text-[#8A7358]">
          הושבה דיגיטלית היא תוספת נפרדת. LIVE וצוות הושבה — רק אם נבחרו וסוכמו. להשוואה לחתונה:{" "}
          <Link href={LINKS.chatuna} className="font-bold text-[#6B1F2A] underline-offset-2 hover:underline">
            אישורי הגעה לחתונה
          </Link>
          .
        </p>
      </SectionShell>

      {/* Workflow timeline */}
      <SectionShell id="workflow" tone="cream">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`text-3xl md:text-4xl ${display.className}`}>מההזמנה ועד החינה</h2>
          <p className="mt-4 text-[16px] leading-8 text-[#5C4A3A]">
            ציר עבודה ברור — כדי שהמשפחה תתמקד בשמחה ולא בלוגיסטיקה.
          </p>
        </div>
        <ol className="relative mx-auto mt-12 max-w-3xl space-y-4">
          {WORKFLOW_STEPS.map((step, i) => (
            <motion.li
              key={step.n}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-4 rounded-[22px] border border-[#E8D5B5] bg-white/85 p-5"
            >
              <span className={`text-2xl font-bold text-[#A67C3D] ${display.className}`}>{step.n}</span>
              <div>
                <h3 className={`text-xl text-[#4A1520] ${display.className}`}>{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#5C4A3A]">{step.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </SectionShell>

      {/* FAQ */}
      <SectionShell id="faq" tone="sand">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.16em] text-[#A67C3D]">שאלות נפוצות</p>
          <h2 className={`mt-3 text-3xl md:text-4xl ${display.className}`}>
            כל מה שכדאי לדעת על אישורי הגעה והושבה לחינה
          </h2>
        </div>
        <FaqBlock />
      </SectionShell>

      {/* Internal links + final CTA */}
      <SectionShell tone="burgundy">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`text-3xl text-[#FBF5EB] md:text-4xl ${display.className}`}>
            מוכנים לתכנן את החינה בשקט?
          </h2>
          <p className="mt-5 text-[16px] leading-8 text-[#E8D5B5]">
            בוחרים חבילה, מכינים רשימה, שולחים אישורים — ומתפנים לשמחה.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaLink href={LINKS.pricing} variant="light">
              לתכנון החינה שלכם
            </CtaLink>
            <CtaLink href={LINKS.contact} variant="ghost">
              דברו איתנו
            </CtaLink>
          </div>
          <ul className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm">
            {[
              { href: LINKS.rsvp, label: "אישורי הגעה" },
              { href: LINKS.chatuna, label: "אישורי הגעה לחתונה" },
              { href: LINKS.guestList, label: "רשימת מוזמנים" },
              { href: LINKS.whenToSend, label: "מתי שולחים" },
              { href: LINKS.seating, label: "סידורי הושבה" },
              { href: LINKS.invitations, label: "הזמנות דיגיטליות" },
              { href: LINKS.pricing, label: "מחירים" },
              { href: LINKS.guides, label: "מדריכים" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex rounded-sm border border-[#D4B483]/45 bg-[#4A1520]/50 px-4 py-2 font-bold text-[#F3E6D0] transition hover:bg-[#5C1A24]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-[#D4B483]">{CONTENT_UPDATED_LABEL}</p>
        </div>
      </SectionShell>
    </div>
  );
}
