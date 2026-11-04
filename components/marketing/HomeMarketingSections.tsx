"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { HOME_FAQS } from "@/lib/seo/homeIntentMap";
import { LUX_IMGS } from "@/lib/marketing/luxuryEditorial";
import LuxV2SaveTheDate from "@/components/marketing/luxury/v2/LuxV2SaveTheDate";
import LuxV2RsvpJourney from "@/components/marketing/luxury/v2/LuxV2RsvpJourney";
import LuxV2SeatingStory from "@/components/marketing/luxury/v2/LuxV2SeatingStory";
import {
  luxBtnGhostLight,
  luxBtnPlum,
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
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const jpg = src.replace(/\.webp$/i, ".jpg");
  return (
    <picture>
      <source srcSet={src} type="image/webp" />
      <img
        src={jpg}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
    </picture>
  );
}

const SERVICE_MOSAIC = [
  {
    href: "/rsvp",
    title: "אישורי הגעה",
    body: "תשובות ברורות — מי מגיע ומי עוד מתלבט.",
    image: LUX_IMGS.reception,
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    href: "/invitations/chatuna",
    title: "הזמנות דיגיטליות",
    body: "עיצוב שמספר את הסיפור שלכם.",
    image: LUX_IMGS.details,
    span: "",
  },
  {
    href: "/wedding-website",
    title: "אתר חתונה",
    body: "כל הפרטים במקום אחד לאורחים.",
    image: LUX_IMGS.couple,
    span: "",
  },
  {
    href: "/seating-explained",
    title: "סידורי הושבה",
    body: "מרשימה למפת שולחנות מסודרת.",
    image: LUX_IMGS.tablescape,
    span: "lg:col-span-2",
  },
] as const;

const SERVICE_LINKS = [
  { href: "/rsvp/save-the-date", title: "Save the Date", body: "שומרים את התאריך ביומן." },
  { href: "/info/guides/guest-list", title: "ניהול מוזמנים", body: "רשימה אחת עם סטטוסים ועדכונים." },
  { href: "/rsvp/whatsapp", title: "תזכורות והודעות", body: "שומרים על קשר גם אחרי השליחה." },
  { href: "/event-management", title: "ניהול האירוע", body: "משימות, ספקים ותקציב במקום אחד." },
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
    body: "היום המיוחד שלהם — עם המשפחה וההושבה במקום אחד.",
    image: "/marketing/invites/invite-bar-mitzvah.webp",
  },
  {
    href: "/rsvp/brit-brita",
    title: "ברית / בריתה",
    body: "משתפים את הבשורה ומזמינים את הקרובים.",
    image: "/marketing/invites/invite-brit.webp",
  },
] as const;

const WEBSITE_GALLERY = [
  { src: "/marketing/wedding-website/previews/eternal-gold-desktop.jpg", label: "Eternal Gold" },
  { src: "/marketing/wedding-website/previews/garden-bloom-desktop.jpg", label: "Garden Bloom" },
  { src: "/marketing/wedding-website/previews/midnight-velvet-desktop.jpg", label: "Midnight Velvet" },
  { src: "/marketing/wedding-website/previews/minimal-noir-desktop.jpg", label: "Minimal Noir" },
] as const;

function WebsiteGalleryMotion() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const reduceRef = useRef(false);
  const inViewRef = useRef(false);

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = sectionRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        inViewRef.current = entries.some((e) => e.isIntersecting && e.intersectionRatio > 0.35);
      },
      { threshold: [0, 0.35, 0.6] }
    );
    io.observe(root);

    if (reduceRef.current) {
      return () => io.disconnect();
    }

    const id = window.setInterval(() => {
      // Only auto-advance while the gallery is actually on screen — never yank the page.
      if (!inViewRef.current) return;
      setActive((i) => (i + 1) % WEBSITE_GALLERY.length);
    }, 4200);

    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[active] as HTMLElement | undefined;
    if (!child) return;
    // Horizontal delta only — avoids scrollIntoView, which can move the document vertically.
    const delta =
      child.getBoundingClientRect().left -
      track.getBoundingClientRect().left -
      (track.clientWidth - child.clientWidth) / 2;
    if (Math.abs(delta) < 1) return;
    if (reduceRef.current) {
      track.scrollLeft += delta;
      return;
    }
    track.scrollBy({ left: delta, behavior: "smooth" });
  }, [active]);

  return (
    <div ref={sectionRef}>
      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto overscroll-x-contain pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {WEBSITE_GALLERY.map((item, i) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "w-[78vw] shrink-0 text-right transition sm:w-[420px] md:w-[520px]",
              i === active ? "opacity-100" : "opacity-70"
            )}
          >
            <div
              className={cn(
                "lux-frame aspect-[16/10] border",
                i === active ? "border-[#842B4C]" : "border-[#C5A582]/30"
              )}
            >
              <img
                src={item.src}
                alt={`תבנית אתר חתונה ${item.label}`}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="mt-3 text-sm font-bold tracking-[0.14em] text-[#842B4C]">{item.label}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-2" aria-hidden>
        {WEBSITE_GALLERY.map((item, i) => (
          <span
            key={item.src}
            className={cn("h-1 w-8", i === active ? "bg-[#842B4C]" : "bg-[#C5A582]/40")}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomeMarketingSections() {
  return (
    <>
      {/* Intro — full-bleed editorial with overlay type */}
      <section
        dir="rtl"
        aria-labelledby="home-intro"
        className="relative min-h-[88svh] overflow-hidden bg-[#F5EEE8]"
      >
        <div className="absolute inset-0">
          <LuxPicture
            src={LUX_IMGS.bride}
            alt=""
            className="h-full w-full object-cover"
            priority
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(100deg,rgba(245,238,232,0.94)_0%,rgba(245,238,232,0.72)_42%,rgba(66,24,47,0.35)_100%)]"
            aria-hidden
          />
        </div>
        <div className="relative z-10 mx-auto flex min-h-[88svh] max-w-[1180px] flex-col justify-center px-4 py-20 sm:px-6 md:px-10">
          <Reveal>
            <Eyebrow>כל מה שצריך לאירוע שלכם</Eyebrow>
            <h2
              id="home-intro"
              className="lux-display mt-5 max-w-[16ch] text-[40px] text-[#42182F] md:text-[64px]"
            >
              אתם מתכננים את הרגעים היפים. אנחנו דואגים לכל מה שמסביב.
            </h2>
            <p className="lux-lede mt-6 max-w-xl text-[#42182F]/85">
              אירוע מוצלח מורכב מאלפי פרטים קטנים. רשימת המוזמנים, ההזמנות, אישורי ההגעה,
              סידורי ההושבה והעדכונים של הרגע האחרון — עם Invistimo הכול במקום אחד.
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
      </section>

      {/* Services — champagne mosaic, not identical cards */}
      <section
        dir="rtl"
        aria-labelledby="home-services"
        className="relative overflow-hidden bg-[#E8D9C8] px-4 py-16 sm:px-6 md:px-10 md:py-24"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(181,117,145,0.22),transparent_40%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-[1400px]">
          <Reveal>
            <Eyebrow>כל מה שצריך, בדיוק במקום הנכון</Eyebrow>
            <h2
              id="home-services"
              className="lux-display mt-4 max-w-3xl text-[32px] text-[#42182F] md:text-[48px]"
            >
              כל הפרטים מתחברים לאירוע אחד מושלם
            </h2>
            <p className="lux-lede mt-5 max-w-3xl">
              מהרגע שבו בוחרים תאריך ועד שהאורחים מגיעים לחגוג — בחרו את השירותים שמתאימים
              לכם. למטה תראו איך Save the Date, אישורי ההגעה וההושבה עובדים בפועל.
            </p>
          </Reveal>

          <div className="mt-12 grid auto-rows-[180px] gap-4 md:auto-rows-[220px] md:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[200px]">
            {SERVICE_MOSAIC.map((item, i) => (
              <Reveal key={item.href} delayMs={i * 50} className={cn("min-h-[180px]", item.span)}>
                <Link
                  href={item.href}
                  className="group relative block h-full overflow-hidden border border-[#C5A582]/40"
                >
                  <LuxPicture
                    src={item.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#42182F]/85 via-[#42182F]/25 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-[#F5EEE8]">
                    <h3 className="text-xl font-black md:text-2xl">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#E8D9CF]">{item.body}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10">
            <ul className="divide-y divide-[#842B4C]/15 border-y border-[#842B4C]/15">
              {SERVICE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex flex-col gap-1 py-4 transition hover:bg-[#F5EEE8]/45 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                  >
                    <span className="text-lg font-extrabold text-[#42182F] group-hover:text-[#842B4C]">
                      {item.title}
                    </span>
                    <span className="text-[15px] leading-7 text-[#6B5360]">{item.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <LuxV2SaveTheDate />
      <LuxV2RsvpJourney />
      <LuxV2SeatingStory />

      {/* Wedding websites — dusty-rose band + auto gallery */}
      <section
        dir="rtl"
        aria-labelledby="home-websites"
        className="relative overflow-hidden px-4 py-16 sm:px-6 md:px-10 md:py-24"
        style={{
          background:
            "linear-gradient(180deg, #F5EEE8 0%, #E8CFD8 45%, #F5EEE8 100%)",
        }}
      >
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <Eyebrow>אתר חתונה אישי</Eyebrow>
            <h2
              id="home-websites"
              className="lux-display mt-4 max-w-3xl text-[32px] text-[#42182F] md:text-[48px]"
            >
              גלריית עיצובים שמרגישה כמו מגזין
            </h2>
            <p className="lux-lede mt-5 max-w-3xl">
              בחרו שפה עיצובית לאתר החתונה — עם לוח זמנים, גלריה ופרטים חשובים במקום אחד
              לאורחים.
            </p>
          </Reveal>
          <div className="mt-12">
            <WebsiteGalleryMotion />
          </div>
          <div className="mt-8">
            <TrackedCtaLink href="/wedding-website" location="home_websites" className={luxBtnPlum}>
              לאתרי החתונה
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* Events — cream editorial strip */}
      <section
        dir="rtl"
        aria-labelledby="home-events"
        className="bg-[#F5EEE8] px-4 py-16 sm:px-6 md:px-10 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow>כל סיבה לחגוג</Eyebrow>
            <h2
              id="home-events"
              className="lux-display mt-4 max-w-3xl text-[32px] text-[#42182F] md:text-[48px]"
            >
              לכל חגיגה יש סיפור. אנחנו כאן כדי לעזור לכם לנהל אותו.
            </h2>
            <p className="lux-lede mt-5 max-w-3xl">
              חתונה, חינה, בר ובת מצווה או ברית ובריתה — לכל אירוע יש את האנשים שלו.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-12">
            {EVENTS.map((event, i) => (
              <Reveal
                key={event.href}
                delayMs={i * 40}
                className={cn(
                  i === 0 && "md:col-span-7 md:row-span-2",
                  i === 1 && "md:col-span-5",
                  i === 2 && "md:col-span-5",
                  i === 3 && "md:col-span-7"
                )}
              >
                <Link
                  href={event.href}
                  className="group relative block min-h-[240px] overflow-hidden border border-[#C5A582]/35 md:min-h-[280px]"
                >
                  <img
                    src={event.image}
                    alt={`הזמנה לדוגמה לאירוע ${event.title}`}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#42182F]/80 via-[#42182F]/2 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-[#F5EEE8]">
                    <h3 className="text-2xl font-black">{event.title}</h3>
                    <p className="mt-2 max-w-sm text-[15px] leading-7 text-[#E8D9CF]">{event.body}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — bright, clear */}
      <section
        dir="rtl"
        aria-labelledby="home-pricing"
        className="relative overflow-hidden bg-[#FFFBFA] px-4 py-16 sm:px-6 md:px-10 md:py-24"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-l from-[#C5A582] via-[#B57591] to-[#842B4C]" aria-hidden />
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>בדיוק מה שמתאים לכם</Eyebrow>
            <h2
              id="home-pricing"
              className="lux-display mt-4 text-[32px] text-[#42182F] md:text-[48px]"
            >
              האירוע שלכם מיוחד. גם החבילה שלכם יכולה להיות.
            </h2>
            <p className="lux-lede mx-auto mt-5 max-w-2xl">
              יש מי שצריכים רק הזמנה דיגיטלית, ויש מי שרוצים גם אישורי הגעה, שיחות, הושבה
              ויום האירוע. בחרו את השירותים שמתאימים לכם — המחירים בעמוד החבילות.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <TrackedCtaLink href="/pricing" location="home_pricing_section" className={luxBtnPlum}>
                לצפייה בחבילות
              </TrackedCtaLink>
              <TrackedCtaLink href="/contact" location="home_pricing_contact" className={luxBtnSecondary}>
                דברו איתנו
              </TrackedCtaLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section
        dir="rtl"
        aria-labelledby="home-faq"
        className="bg-[#F5EEE8] px-4 py-16 sm:px-6 md:px-10 md:py-24"
      >
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <Eyebrow>טוב לדעת לפני שמתחילים</Eyebrow>
            <h2
              id="home-faq"
              className="lux-display mt-4 text-[32px] text-[#42182F] md:text-[40px]"
            >
              כל מה שרציתם לדעת לפני שמתחילים לתכנן
            </h2>
          </Reveal>
          <div className="mt-10 divide-y divide-[#C5A582]/30 border-y border-[#C5A582]/30">
            {HOME_FAQS.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="cursor-pointer list-none text-lg font-black text-[#42182F] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-[#B57591] transition group-open:rotate-45">+</span>
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

      {/* Final cinematic CTA */}
      <section dir="rtl" aria-labelledby="home-final" className="relative overflow-hidden">
        <div className="absolute inset-0">
          <LuxPicture src={LUX_IMGS.ceremony} alt="" className="h-full w-full object-cover" />
          <div
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(66,24,47,0.55)_0%,rgba(42,15,29,0.88)_100%)]"
            aria-hidden
          />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 md:px-10 md:py-28">
          <Reveal>
            <h2
              id="home-final"
              className="lux-display lux-display-light text-[34px] md:text-[52px]"
            >
              אתם תתרגשו מהרגעים. אנחנו נעזור לכם לדאוג לכל השאר.
            </h2>
            <p className="lux-lede-light mx-auto mt-5 max-w-2xl">
              ההזמנות, המוזמנים, אישורי ההגעה וההושבה — מסודרים, מוכנים, ועם יותר מקום
              להתרגשות.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <TrackedCtaLink
                href="/pricing"
                location="home_final_primary"
                className={luxBtnPrimaryOnDark}
              >
                בואו נתחיל
              </TrackedCtaLink>
              <TrackedCtaLink href="/try" location="home_final_demo" className={luxBtnGhostLight}>
                נסו דמו
              </TrackedCtaLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
