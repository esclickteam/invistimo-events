"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { EVENT_INVITATION_BODY } from "@/lib/whatsapp/approvedTemplates";
import { HOME_FAQS } from "@/lib/seo/homeIntentMap";
import { LUX_IMGS } from "@/lib/marketing/luxuryEditorial";
import {
  luxBtnGhostLight,
  luxBtnPlum,
  luxBtnPrimary,
  luxBtnPrimaryOnDark,
  luxBtnSecondary,
} from "@/lib/ui/luxuryButtonClasses";
import { cn } from "@/lib/utils";

function useInViewOnce<T extends HTMLElement>(rootMargin = "0px 0px -8% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("lux-reveal", inView && "is-in", className)}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={cn("lux-eyebrow", light && "lux-eyebrow-light")}>{children}</p>
  );
}

function LuxPicture({
  src,
  alt,
  className,
  priority = false,
  parallax = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  parallax?: boolean;
}) {
  const jpg = src.replace(/\.webp$/i, ".jpg");
  return (
    <picture>
      <source srcSet={src} type="image/webp" />
      <img
        src={jpg}
        alt={alt}
        className={cn(parallax && "lux-parallax-img", className)}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
    </picture>
  );
}

function LazyInViewVideo({
  src,
  poster,
  ariaLabel,
}: {
  src: string;
  poster: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || active) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { rootMargin: "220px 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active]);

  return (
    <div ref={ref} className="lux-frame aspect-video w-full bg-[#2A0F1D]">
      {active ? (
        <video
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-label={ariaLabel}
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={poster}
          alt={ariaLabel}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}

const FEATURED_SERVICES = [
  {
    href: "/rsvp",
    title: "אישורי הגעה",
    body: "יודעים מי מגיע, מי עדיין מתלבט וממי עוד מחכים לתשובה — לחתונה, בר/בת מצווה ואירועים נוספים.",
    cta: "איך עובדים אישורי ההגעה",
    image: LUX_IMGS.reception,
    tone: "cream" as const,
  },
  {
    href: "/invitations/chatuna",
    title: "הזמנות דיגיטליות",
    body: "הזמנה מעוצבת שמספרת את הסיפור שלכם ומגיעה ישירות לאנשים שאתם אוהבים.",
    cta: "להזמנות הדיגיטליות",
    image: LUX_IMGS.details,
    tone: "plum" as const,
  },
  {
    href: "/seating-explained",
    title: "סידורי הושבה",
    body: "מסדרים את השולחנות, משבצים אורחים ורואים את התמונה המלאה לפני האירוע.",
    cta: "סידורי הושבה לחתונה",
    image: LUX_IMGS.tablescape,
    tone: "cream" as const,
  },
] as const;

const SERVICE_LINKS = [
  { href: "/rsvp/save-the-date", title: "Save the Date", body: "שומרים את התאריך ביומן — עוד לפני ההזמנה הרשמית." },
  { href: "/wedding-website", title: "אתר חתונה", body: "מקום אחד לכל הפרטים החשובים, עם עיצוב שמתאים לאירוע." },
  { href: "/info/guides/guest-list", title: "ניהול מוזמנים", body: "רשימה אחת מסודרת, עם פרטי האורחים, סטטוסים ועדכונים." },
  { href: "/rsvp/whatsapp", title: "תזכורות והודעות", body: "מזכירים לאורחים את הפרטים החשובים ושומרים על קשר." },
  { href: "/event-management", title: "ניהול האירוע", body: "משימות, ספקים, תקציב ולוח זמנים במקום אחד." },
] as const;

const EVENTS = [
  {
    href: "/rsvp/chatuna",
    title: "חתונה",
    body: "מההזמנה הראשונה ועד ההושבה באולם.",
    image: "/marketing/invites/invite-wedding-mia-alon.webp",
  },
  {
    href: "/rsvp/hina",
    title: "חינה",
    body: "חגיגה של מסורת, משפחה ואנשים אהובים.",
    image: "/marketing/invites/invite-henna.webp",
  },
  {
    href: "/rsvp/bar-bat-mitzvah",
    title: "בר / בת מצווה",
    body: "היום המיוחד שלהם — עם המשפחה, החברים וההושבה במקום אחד.",
    image: "/marketing/invites/invite-bar-mitzvah.webp",
  },
  {
    href: "/rsvp/brit-brita",
    title: "ברית / בריתה",
    body: "משתפים את הבשורה ומזמינים את האנשים הקרובים.",
    image: "/marketing/invites/invite-brit.webp",
  },
] as const;

const WEBSITE_GALLERY = [
  {
    src: "/marketing/wedding-website/previews/eternal-gold-desktop.jpg",
    label: "Eternal Gold",
  },
  {
    src: "/marketing/wedding-website/previews/garden-bloom-desktop.jpg",
    label: "Garden Bloom",
  },
  {
    src: "/marketing/wedding-website/previews/midnight-velvet-desktop.jpg",
    label: "Midnight Velvet",
  },
  {
    src: "/marketing/wedding-website/previews/minimal-noir-desktop.jpg",
    label: "Minimal Noir",
  },
] as const;

const STD_MESSAGE = `Save The Date
מיה ואלון

אנחנו מתרגשים להזמין אתכם לשריין את התאריך
24.06.2027

פרטים נוספים יישלחו בקרוב 🤍`;

const INVITE_MESSAGE = EVENT_INVITATION_BODY.replace("{{1}}", "החתונה של מיה ואלון")
  .replace("{{2}}", "24.06.2027")
  .replace("{{3}}", "אולמי אלכסנדר");

const RSVP_MESSAGE =
  "משפחה וחברים יקרים,\n" +
  "הנכם מוזמנים לחתונה של מיה ואלון 🤍\n\n" +
  "📅 תאריך: 24.06.2027\n" +
  "📍 מיקום: אולמי אלכסנדר\n\n" +
  "לאישור הגעה לחצו על הכפתור למטה 👇\n\n" +
  "מחכים לשמוח איתכם 💖";

const JOURNEY = [
  {
    when: "3–6 חודשים לפני",
    title: "Save the Date — שומרים את התאריך",
    body: "האירוע עוד רחוק, אבל ההתרגשות כבר כאן. שולחים הודעה שמאפשרת לאורחים לשריין את היום ביומן, עוד לפני שההזמנה הרשמית מוכנה.",
    message: STD_MESSAGE,
    image: "/marketing/videos/home-save-the-date-poster.jpg",
    imageAlt: "כרטיס Save the Date — מיה ואלון",
    cta: null as string | null,
    time: "10:12",
  },
  {
    when: "חודש עד חודש וחצי לפני",
    title: "ההזמנה — משתפים את הרגע המיוחד",
    body: "זה הזמן לשלוח את ההזמנה המעוצבת עם פרטי האירוע. בשלב הזה אין צורך לבקש אישור הגעה — המטרה היא להזמין, לשתף ולתת לאורחים זמן להיערך.",
    message: INVITE_MESSAGE,
    image: "/marketing/invites/invite-wedding-mia-alon.webp",
    imageAlt: "הזמנה דיגיטלית — החתונה של מיה ואלון",
    cta: null as string | null,
    time: "18:40",
  },
  {
    when: "שבועיים עד שבועיים וחצי לפני",
    title: "אישורי הגעה — מקבלים תשובות בזמן הנכון",
    body: "כשהאירוע מתקרב, קל יותר לאורחים לדעת אם יוכלו להגיע. זה הזמן לשלוח את הקישור האישי, לקבל תשובות ולרכז את הנתונים לקראת ההושבה.",
    message: RSVP_MESSAGE,
    image: "/marketing/invites/invite-wedding-mia-alon.webp",
    imageAlt: "הזמנה עם קישור אישי לאישור הגעה",
    cta: "לאישור הגעה",
    time: "11:05",
  },
] as const;

function WhatsAppBrandIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        d="M16.02 7.2C11.08 7.2 7.08 11.2 7.08 16.14c0 1.58.42 3.12 1.2 4.48L6.9 25.4l4.96-1.3a8.9 8.9 0 0 0 4.16 1.02c4.94 0 8.94-4 8.94-8.94S20.96 7.2 16.02 7.2Z"
        fill="white"
      />
      <path
        d="M13.14 11.15C12.86 10.53 12.57 10.52 12.31 10.51C12.1 10.5 11.86 10.5 11.62 10.5C11.38 10.5 10.98 10.59 10.64 10.96C10.3 11.34 9.35 12.2 9.35 13.95C9.35 15.7 10.67 17.39 10.85 17.63C11.03 17.87 13.27 21.47 16.78 22.84C19.69 23.98 20.29 23.75 20.93 23.69C21.57 23.63 22.99 22.84 23.28 22.05C23.57 21.26 23.57 20.58 23.48 20.43C23.39 20.28 23.14 20.19 22.77 20.01C22.41 19.83 20.59 18.93 20.26 18.81C19.93 18.69 19.69 18.63 19.45 18.99C19.21 19.35 18.54 20.13 18.33 20.37C18.12 20.61 17.9 20.64 17.54 20.46C17.17 20.28 15.98 19.9 14.56 18.63C13.45 17.64 12.69 16.42 12.48 16.06C12.27 15.7 12.46 15.51 12.64 15.33C12.8 15.17 13 14.91 13.18 14.7C13.36 14.49 13.42 14.34 13.54 14.1C13.66 13.86 13.6 13.65 13.51 13.47C13.42 13.29 12.76 11.52 13.14 11.15Z"
        fill="#25D366"
      />
    </svg>
  );
}

function WhatsAppChatMock({
  message,
  image,
  imageAlt,
  cta,
  time,
}: {
  message: string;
  image?: string;
  imageAlt?: string;
  cta?: string | null;
  time: string;
}) {
  return (
    <div
      dir="rtl"
      className="overflow-hidden border border-[#C5A582]/35 bg-[#E8DFD6] shadow-[0_24px_60px_rgba(66,24,47,0.12)]"
    >
      <div className="flex items-center gap-3 bg-[#075E54] px-3.5 py-2.5 text-white">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C5A582] text-xs font-black text-[#2A0F1D]">
          IN
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">Invistimo</p>
          <p className="text-[11px] text-white/70">עסק</p>
        </div>
      </div>
      <div
        className="px-2.5 py-3"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          backgroundColor: "#E8DFD6",
        }}
      >
        <div className="mr-auto max-w-[94%] overflow-hidden rounded-xl rounded-tr-sm bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          {image ? (
            <img
              src={image}
              alt={imageAlt || ""}
              className="aspect-[4/3] w-full object-cover object-top"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className="whitespace-pre-line px-3 py-2.5 text-[13px] leading-[1.55] text-[#111B21]">
            {message}
          </div>
          {cta ? (
            <div className="border-t border-[#E9EDEF] px-3 py-2.5 text-center text-[13.5px] font-semibold text-[#027EB5]">
              {cta}
            </div>
          ) : null}
          <div className="px-3 pb-1.5 text-left text-[10px] leading-none text-[#667781]">
            {time}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeMarketingSections() {
  return (
    <>
      {/* Intro — editorial split with large still */}
      <section
        dir="rtl"
        aria-labelledby="home-intro"
        className="relative overflow-hidden bg-[#F5EEE8]"
      >
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-center px-4 py-16 max-[360px]:px-3 sm:px-6 md:px-10 md:py-24 lg:py-28">
            <Reveal>
              <Eyebrow>כל מה שצריך לאירוע שלכם</Eyebrow>
              <h2
                id="home-intro"
                className="lux-display mt-5 text-[34px] md:text-[52px] lg:text-[58px]"
              >
                אתם מתכננים את הרגעים היפים. אנחנו דואגים לכל מה שמסביב.
              </h2>
              <p className="lux-lede mt-6 max-w-xl">
                אירוע מוצלח מורכב מאלפי פרטים קטנים. רשימת המוזמנים, ההזמנות, אישורי
                ההגעה, סידורי ההושבה והעדכונים של הרגע האחרון.
              </p>
              <p className="lux-lede mt-4 max-w-xl">
                עם Invistimo הכול מתחבר לחוויה אחת מסודרת: אתם מנהלים את האירוע במקום
                אחד, והאורחים נהנים מתהליך פשוט ונעים, בלי להוריד אפליקציה ובלי להסתבך.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <TrackedCtaLink href="/pricing" location="home_intro_primary" className={luxBtnPlum}>
                  בואו נתחיל
                </TrackedCtaLink>
                <TrackedCtaLink href="/try" location="home_intro_demo" className={luxBtnSecondary}>
                  צפו בהדגמה
                </TrackedCtaLink>
              </div>
            </Reveal>
          </div>
          <Reveal delayMs={80} className="relative min-h-[420px] lg:min-h-full">
            <div className="absolute inset-0 lux-frame">
              <LuxPicture
                src={LUX_IMGS.bride}
                alt="כלה בחתונה יוקרתית באור שקיעה — השראה עריכתית ל־Invistimo"
                className="h-full w-full object-cover"
                parallax
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#F5EEE8] via-transparent to-transparent lg:from-[#F5EEE8]/95"
                aria-hidden
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Featured services — alternating full bands, not identical cards */}
      <section dir="rtl" aria-labelledby="home-services" className="bg-[#FFFBFA]">
        <div className="mx-auto max-w-[1400px] px-4 py-16 max-[360px]:px-3 sm:px-6 md:px-10 md:py-20">
          <Reveal>
            <Eyebrow>כל מה שצריך, בדיוק במקום הנכון</Eyebrow>
            <h2
              id="home-services"
              className="lux-display mt-4 max-w-3xl text-[32px] md:text-[48px]"
            >
              כל הפרטים מתחברים לאירוע אחד מושלם
            </h2>
            <p className="lux-lede mt-5 max-w-3xl">
              מהרגע שבו בוחרים תאריך ועד שהאורחים מגיעים לחגוג — בחרו את השירותים שיעזרו
              לכם להפוך את ההכנות לפשוטות, נעימות ומסודרות יותר.
            </p>
          </Reveal>
        </div>

        {FEATURED_SERVICES.map((service, i) => {
          const imageFirst = i % 2 === 1;
          const plum = service.tone === "plum";
          return (
            <div
              key={service.href}
              className={cn(
                "border-t",
                plum ? "border-[#842B4C]/25 bg-[#42182F]" : "border-[#C5A582]/25 bg-[#F5EEE8]"
              )}
            >
              <div
                className={cn(
                  "mx-auto grid max-w-[1400px] items-stretch lg:grid-cols-2",
                  imageFirst && "lg:[&>*:first-child]:order-2"
                )}
              >
                <Reveal className="flex flex-col justify-center px-4 py-14 max-[360px]:px-3 sm:px-6 md:px-10 md:py-20">
                  <p
                    className={cn(
                      "text-xs font-bold tracking-[0.2em]",
                      plum ? "text-[#C5A582]" : "text-[#842B4C]"
                    )}
                  >
                    0{i + 1}
                  </p>
                  <h3
                    className={cn(
                      "lux-display mt-4 text-[30px] md:text-[42px]",
                      plum && "lux-display-light"
                    )}
                  >
                    {service.title}
                  </h3>
                  <p className={cn("mt-5 max-w-lg text-lg leading-8", plum ? "text-[#E8D9CF]" : "lux-lede")}>
                    {service.body}
                  </p>
                  <div className="mt-8">
                    <TrackedCtaLink
                      href={service.href}
                      location={`home_service_${i}`}
                      className={plum ? luxBtnPrimaryOnDark : luxBtnPrimary}
                    >
                      {service.cta}
                      <span aria-hidden>←</span>
                    </TrackedCtaLink>
                  </div>
                </Reveal>
                <Reveal delayMs={60} className="relative min-h-[320px] md:min-h-[440px]">
                  <LuxPicture
                    src={service.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0",
                      plum
                        ? "bg-gradient-to-t from-[#42182F]/55 to-transparent"
                        : "bg-gradient-to-t from-[#F5EEE8]/20 to-transparent"
                    )}
                    aria-hidden
                  />
                </Reveal>
              </div>
            </div>
          );
        })}

        <div className="mx-auto max-w-[1100px] px-4 py-14 max-[360px]:px-3 sm:px-6 md:px-10 md:py-16">
          <Reveal>
            <ul className="divide-y divide-[#C5A582]/30 border-y border-[#C5A582]/30">
              {SERVICE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex flex-col gap-1 py-5 transition hover:bg-[#F5EEE8]/70 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-2"
                  >
                    <span className="text-lg font-extrabold text-[#42182F] transition group-hover:text-[#842B4C] md:text-xl">
                      {item.title}
                    </span>
                    <span className="max-w-xl text-[15px] leading-7 text-[#6B5360] sm:text-left">
                      {item.body}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Save the Date — cinematic band */}
      <section
        dir="rtl"
        aria-labelledby="home-std"
        className="relative overflow-hidden bg-[#2A0F1D]"
      >
        <div className="absolute inset-0">
          <LuxPicture
            src={LUX_IMGS.rings}
            alt=""
            className="h-full w-full object-cover opacity-45"
            parallax
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(105deg,rgba(42,15,29,0.92)_0%,rgba(66,24,47,0.72)_48%,rgba(42,15,29,0.55)_100%)]"
            aria-hidden
          />
        </div>
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 max-[360px]:px-3 sm:px-6 md:grid-cols-2 md:px-10 md:py-28">
          <Reveal>
            <Eyebrow light>ההתרגשות מתחילה כאן</Eyebrow>
            <h2
              id="home-std"
              className="lux-display lux-display-light mt-4 text-[32px] md:text-[48px]"
            >
              יש תאריך. עכשיו אפשר להתחיל להתרגש.
            </h2>
            <p className="lux-lede-light mt-5 max-w-xl">
              לפני ההזמנות, לפני אישורי ההגעה ולפני כל הסידורים — יש רגע אחד שבו הכול מתחיל
              להיות אמיתי.
            </p>
            <p className="lux-lede-light mt-4 max-w-xl">
              עם Save the Date אתם משתפים את האנשים החשובים לכם בתאריך הגדול, כדי שיוכלו
              לשמור אותו מראש ולהתחיל להתרגש יחד איתכם.
            </p>
            <div className="mt-8">
              <TrackedCtaLink
                href="/rsvp/save-the-date"
                location="home_std"
                className={luxBtnPrimaryOnDark}
              >
                לשריין את הרגע
              </TrackedCtaLink>
            </div>
          </Reveal>
          <Reveal delayMs={90}>
            <LazyInViewVideo
              src="/marketing/videos/home-save-the-date.webm"
              poster="/marketing/videos/home-save-the-date-poster.jpg"
              ariaLabel="אנימציית Save the Date — מיה ואלון, 24.06.2027"
            />
          </Reveal>
        </div>
      </section>

      {/* Message journey */}
      <section
        dir="rtl"
        aria-labelledby="home-journey"
        className="relative overflow-hidden bg-[#F5EEE8] px-4 py-16 max-[360px]:px-3 sm:px-6 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>לכל הודעה יש את הזמן שלה</Eyebrow>
            <h2
              id="home-journey"
              className="lux-display mt-4 max-w-3xl text-[32px] md:text-[48px]"
            >
              מההודעה הראשונה ועד לרגע שבו כולם אומרים &quot;מגיעים!&quot;
            </h2>
            <p className="lux-lede mt-5 max-w-3xl">
              לא צריך לבקש מהאורחים להתחייב חודשים מראש. כששולחים את ההודעה הנכונה בזמן
              הנכון, נותנים להם ליהנות מההתרגשות, להיערך לאירוע ולהשיב כשהתאריך כבר מתקרב.
              המועדים כאן הם המלצה לחתונה — לא כלל קשיח לכל אירוע.
            </p>
          </Reveal>

          <ol className="relative mt-14 space-y-16 md:space-y-20">
            <div
              className="pointer-events-none absolute bottom-12 top-12 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-[#C5A582] via-[#B57591]/50 to-[#C5A582] md:block"
              aria-hidden
            />

            {JOURNEY.map((step, index) => {
              const textFirst = index % 2 === 0;
              return (
                <li
                  key={step.title}
                  className="relative grid items-start gap-5 md:grid-cols-[1fr_56px_1fr] md:items-center md:gap-5"
                >
                  <div className="flex items-center gap-3 md:hidden">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#C5A582] bg-[#FFFBFA] text-sm font-black text-[#842B4C]">
                      {index + 1}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C5A582]/70" aria-hidden />
                  </div>

                  <Reveal
                    className={
                      textFirst ? "md:col-start-1 md:row-start-1" : "md:col-start-3 md:row-start-1"
                    }
                  >
                    <div className="border border-[#C5A582]/35 bg-[#FFFBFA]/90 p-5 md:p-8">
                      <span className="inline-flex border border-[#C5A582]/45 bg-[#F5EEE8] px-4 py-1.5 text-xs font-black tracking-[0.12em] text-[#842B4C]">
                        שלב {index + 1} · {step.when}
                      </span>
                      <h3 className="mt-4 text-xl font-black text-[#42182F] md:text-2xl">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-[15px] leading-7 text-[#6B5360]">{step.body}</p>
                    </div>
                  </Reveal>

                  <div className="relative z-10 hidden md:col-start-2 md:row-start-1 md:flex md:justify-center">
                    <span className="flex h-10 w-10 items-center justify-center border-2 border-[#C5A582] bg-[#F5EEE8] text-sm font-black text-[#842B4C] shadow-[0_0_0_6px_#F5EEE8]">
                      {index + 1}
                    </span>
                  </div>

                  <Reveal
                    delayMs={70}
                    className={
                      textFirst ? "md:col-start-3 md:row-start-1" : "md:col-start-1 md:row-start-1"
                    }
                  >
                    <WhatsAppChatMock
                      message={step.message}
                      image={step.image}
                      imageAlt={step.imageAlt}
                      cta={step.cta}
                      time={step.time}
                    />
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* RSVP channels — photo + rows */}
      <section dir="rtl" aria-labelledby="home-rsvp" className="bg-[#FFFBFA]">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal className="relative min-h-[380px] lg:min-h-full">
            <LuxPicture
              src={LUX_IMGS.bouquet}
              alt="זר פרחים עדין — אווירת חתונה יוקרתית"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#42182F]/70 via-transparent to-transparent"
              aria-hidden
            />
          </Reveal>
          <div className="flex flex-col justify-center px-4 py-16 max-[360px]:px-3 sm:px-6 md:px-10 md:py-24">
            <Reveal>
              <Eyebrow>פחות טלפונים, יותר תשובות</Eyebrow>
              <h2
                id="home-rsvp"
                className="lux-display mt-4 text-[32px] md:text-[44px]"
              >
                במקום לרדוף אחרי תשובות, פשוט יודעים מי מגיע.
              </h2>
              <p className="lux-lede mt-5">
                מי מגיע? מי לא יוכל להגיע? ומי עדיין לא השיב? עם Invistimo אתם רואים את
                התמונה מתבהרת, אורח אחרי אורח — והתשובות מתרכזות במערכת.
              </p>
              <ul className="mt-10 space-y-0 divide-y divide-[#C5A582]/30 border-y border-[#C5A582]/30">
                <li>
                  <Link href="/rsvp/whatsapp" className="flex items-start gap-4 py-5 transition hover:bg-[#F5EEE8]/80">
                    <WhatsAppBrandIcon size={28} />
                    <div>
                      <h3 className="text-lg font-black text-[#42182F]">WhatsApp</h3>
                      <p className="mt-1 text-[15px] leading-7 text-[#6B5360]">
                        הודעה אישית עם קישור לאישור הגעה, בדרך שנוחה ומוכרת לאורחים.
                      </p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link href="/rsvp/whatsapp" className="flex items-start gap-4 py-5 transition hover:bg-[#F5EEE8]/80">
                    <span className="flex h-7 w-10 items-center justify-center bg-[#42182F] text-[10px] font-black tracking-wide text-[#F5EEE8]">
                      SMS
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-[#42182F]">SMS</h3>
                      <p className="mt-1 text-[15px] leading-7 text-[#6B5360]">
                        תזכורות והודעות חשובות שמגיעות ישירות לטלפון.
                      </p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link href="/rsvp/calls" className="flex items-start gap-4 py-5 transition hover:bg-[#F5EEE8]/80">
                    <span className="flex h-7 w-7 items-center justify-center border border-[#C5A582] text-xs font-black text-[#842B4C]">
                      ☎
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-[#42182F]">שיחות</h3>
                      <p className="mt-1 text-[15px] leading-7 text-[#6B5360]">
                        שיחות מוקלטות, אנושיות או משולבות, בהתאם לחבילה שנבחרה, כדי להגיע גם
                        לאורחים שעדיין לא השיבו.
                      </p>
                    </div>
                  </Link>
                </li>
              </ul>
              <div className="mt-8">
                <TrackedCtaLink href="/rsvp" location="home_rsvp" className={luxBtnPlum}>
                  איך עובדים אישורי ההגעה
                </TrackedCtaLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Seating */}
      <section
        dir="rtl"
        aria-labelledby="home-seating"
        className="relative overflow-hidden bg-[#42182F] px-4 py-16 max-[360px]:px-3 sm:px-6 md:px-10 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(197,165,130,0.18),transparent_40%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Eyebrow light>לכל אורח יש מקום</Eyebrow>
            <h2
              id="home-seating"
              className="lux-display lux-display-light mt-4 text-[32px] md:text-[48px]"
            >
              הושבה חכמה מתחילה ברשימת מוזמנים מסודרת
            </h2>
            <p className="lux-lede-light mt-5">
              אחרי שמתחילות להגיע התשובות, אפשר להפוך את רשימת המוזמנים למפת הושבה ברורה —
              ליצור שולחנות, לשבץ אורחים ולבדוק תפוסה בלי ללכת לאיבוד בין קבצים.{" "}
              <Link
                href="/info/guides/wedding-seating-arrangements"
                className="font-bold text-[#C5A582] underline-offset-4 hover:underline"
              >
                מדריך לסידורי הושבה לחתונה
              </Link>{" "}
              מסביר את הסדר לפני שנכנסים למערכת, ו
              <Link
                href="/info/guides/seating-plan"
                className="font-bold text-[#C5A582] underline-offset-4 hover:underline"
              >
                מדריך הכנת ההושבה
              </Link>{" "}
              מראה איך בונים את המפה בפועל.
            </p>
            <div className="mt-8">
              <TrackedCtaLink
                href="/seating-explained"
                location="home_seating"
                className={luxBtnPrimaryOnDark}
              >
                סידורי הושבה לחתונה
              </TrackedCtaLink>
            </div>
          </Reveal>
          <Reveal delayMs={80}>
            <div className="overflow-hidden border border-[#C5A582]/30 bg-[#2A0F1D] shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
              <img
                src="/marketing/product/webp/desktop-try-seating.webp"
                alt="מפת סידורי הושבה במערכת Invistimo עם שולחנות ושיבוצי אורחים"
                className="aspect-[16/10] w-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Wedding website gallery */}
      <section
        dir="rtl"
        aria-labelledby="home-websites"
        className="bg-[#F5EEE8] px-4 py-16 max-[360px]:px-3 sm:px-6 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <Eyebrow>אתר חתונה אישי</Eyebrow>
            <h2
              id="home-websites"
              className="lux-display mt-4 max-w-3xl text-[32px] md:text-[48px]"
            >
              גלריית עיצובים שמרגישה כמו מגזין
            </h2>
            <p className="lux-lede mt-5 max-w-3xl">
              בחרו שפה עיצובית לאתר החתונה שלכם — עם לוח זמנים, גלריה ופרטים חשובים במקום
              אחד לאורחים.
            </p>
          </Reveal>

          <div className="mt-12 flex gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {WEBSITE_GALLERY.map((item, i) => (
              <Reveal key={item.src} delayMs={i * 60} className="w-[78vw] shrink-0 sm:w-[420px] md:w-[520px]">
                <Link href="/wedding-website" className="group block">
                  <div className="lux-frame aspect-[16/10] border border-[#C5A582]/30">
                    <img
                      src={item.src}
                      alt={`תבנית אתר חתונה ${item.label}`}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="mt-3 text-sm font-bold tracking-[0.14em] text-[#842B4C]">
                    {item.label}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="mt-8">
            <TrackedCtaLink href="/wedding-website" location="home_websites" className={luxBtnPlum}>
              לאתרי החתונה
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* Event types — asymmetric magazine grid */}
      <section
        dir="rtl"
        aria-labelledby="home-events"
        className="bg-[#FFFBFA] px-4 py-16 max-[360px]:px-3 sm:px-6 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>כל סיבה לחגוג</Eyebrow>
            <h2
              id="home-events"
              className="lux-display mt-4 max-w-3xl text-[32px] md:text-[48px]"
            >
              לכל חגיגה יש סיפור. אנחנו כאן כדי לעזור לכם לנהל אותו.
            </h2>
            <p className="lux-lede mt-5 max-w-3xl">
              חתונה, חינה, בר ובת מצווה או ברית ובריתה — לכל אירוע יש את האנשים שלו. עם
              Invistimo אפשר לבחור את הכלים שמתאימים לאופי האירוע.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-2 md:grid-rows-2">
            {EVENTS.map((event, i) => (
              <Reveal
                key={event.href}
                delayMs={i * 50}
                className={cn(i === 0 && "md:row-span-2")}
              >
                <Link
                  href={event.href}
                  className="group relative block h-full min-h-[260px] overflow-hidden border border-[#C5A582]/30 md:min-h-[320px]"
                >
                  <img
                    src={event.image}
                    alt={`הזמנה לדוגמה לאירוע ${event.title}`}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#2A0F1D]/85 via-[#2A0F1D]/25 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-[#F5EEE8]">
                    <h3 className="text-2xl font-black">{event.title}</h3>
                    <p className="mt-2 max-w-sm text-[15px] leading-7 text-[#E8D9CF]">
                      {event.body}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        dir="rtl"
        aria-labelledby="home-pricing"
        className="relative overflow-hidden bg-[#F5EEE8] px-4 py-16 max-[360px]:px-3 sm:px-6 md:px-10 md:py-28"
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[radial-gradient(circle_at_left,rgba(181,117,145,0.18),transparent_70%)]" aria-hidden />
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="lux-hairline mx-auto mb-8 w-24" />
            <Eyebrow>בדיוק מה שמתאים לכם</Eyebrow>
            <h2
              id="home-pricing"
              className="lux-display mt-4 text-[32px] md:text-[48px]"
            >
              האירוע שלכם מיוחד. גם החבילה שלכם יכולה להיות.
            </h2>
            <p className="lux-lede mx-auto mt-5 max-w-2xl">
              יש מי שצריכים רק הזמנה דיגיטלית, ויש מי שרוצים לנהל גם את אישורי ההגעה,
              השיחות, סידורי ההושבה ויום האירוע. ב־Invistimo תוכלו לבחור את השירותים
              שמתאימים לכם.
            </p>
            <div className="mt-10 flex justify-center">
              <TrackedCtaLink
                href="/pricing"
                location="home_pricing_section"
                className={luxBtnPlum}
              >
                לצפייה בחבילות
              </TrackedCtaLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section
        dir="rtl"
        aria-labelledby="home-faq"
        className="bg-[#FFFBFA] px-4 py-16 max-[360px]:px-3 sm:px-6 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <Eyebrow>טוב לדעת לפני שמתחילים</Eyebrow>
            <h2
              id="home-faq"
              className="lux-display mt-4 text-[32px] md:text-[40px]"
            >
              כל מה שרציתם לדעת לפני שמתחילים לתכנן
            </h2>
          </Reveal>
          <div className="mt-10 space-y-0 divide-y divide-[#C5A582]/30 border-y border-[#C5A582]/30">
            {HOME_FAQS.map((item) => (
              <details key={item.q} className="group py-4 open:bg-transparent">
                <summary className="cursor-pointer list-none text-lg font-black text-[#42182F] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-[#C5A582] transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-8 text-[#6B5360]">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8">
            <TrackedCtaLink href="/faq" location="home_faq" className={luxBtnSecondary}>
              לכל השאלות והתשובות
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        dir="rtl"
        aria-labelledby="home-final"
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0">
          <LuxPicture
            src={LUX_IMGS.ceremony}
            alt=""
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,15,29,0.72)_0%,rgba(42,15,29,0.88)_100%)]"
            aria-hidden
          />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center max-[360px]:px-3 sm:px-6 md:px-10 md:py-32">
          <Reveal>
            <h2
              id="home-final"
              className="lux-display lux-display-light text-[34px] md:text-[52px]"
            >
              אתם תתרגשו מהרגעים. אנחנו נעזור לכם לדאוג לכל השאר.
            </h2>
            <p className="lux-lede-light mx-auto mt-5 max-w-2xl">
              ההזמנות, המוזמנים, אישורי ההגעה וההושבה — כל מה שצריך כדי להגיע לאירוע שלכם
              מסודרים, מוכנים ועם הרבה יותר מקום להתרגשות.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <TrackedCtaLink
                href="/pricing"
                location="home_final_primary"
                className={luxBtnPrimaryOnDark}
              >
                בואו נתחיל
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/try"
                location="home_final_demo"
                className={luxBtnGhostLight}
              >
                נסו דמו
              </TrackedCtaLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
