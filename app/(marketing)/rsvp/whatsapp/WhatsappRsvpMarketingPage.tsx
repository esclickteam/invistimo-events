"use client";

import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Link2, ListChecks, RefreshCw, Send } from "lucide-react";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import { WHATSAPP_RSVP_FAQS } from "./whatsappFaqs";

const PATH = "/rsvp/whatsapp";

const ctaPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_40px_rgba(58,39,20,0.22)] transition hover:-translate-y-0.5";
const ctaSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-white/85 px-8 py-3.5 text-base font-black text-[#5E4735] backdrop-blur transition hover:bg-white";
const ctaGold =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#B8862D] via-[#C9A45C] to-[#8B6220] px-8 py-3.5 text-base font-black text-white shadow-[0_18px_38px_rgba(184,134,45,0.26)] transition hover:-translate-y-0.5";

/** Product dashboard preview text for rsvp_invitation_media (button opens personal link). */
const RSVP_WA_BODY =
  "משפחה וחברים יקרים,\n" +
  "הנכם מוזמנים לחתונה של מיה ואלון 🤍\n\n" +
  "📅 תאריך: 24.06.2027\n" +
  "📍 מיקום: אולמי אלכסנדר\n\n" +
  "לאישור הגעה לחצו על הכפתור למטה 👇\n\n" +
  "מחכים לשמוח איתכם 💖";

const JOURNEY_CAPTIONS = [
  { start: 0, end: 5, text: "הודעה אישית שמגיעה ישירות לאורח" },
  { start: 5, end: 10, text: "קישור שמוביל להזמנה שלו" },
  { start: 10, end: 17, text: "כל פרטי האירוע במקום אחד" },
  { start: 17, end: 24, text: "אישור הגעה בכמה לחיצות" },
  { start: 24, end: 30, text: "התשובה נשלחה — בלי שיחת טלפון" },
  { start: 30, end: 90, text: "ואתם רואים את התמונה מתעדכנת" },
] as const;

const WHY_CARDS = [
  {
    icon: Link2,
    title: "קישור אישי לכל אורח",
    text: "כל הודעה מובילה להזמנה ולאפשרות אישור הגעה המשויכת לרשומה המתאימה.",
  },
  {
    icon: ListChecks,
    title: "תשובות במקום אחד",
    text: "אפשר לראות מי אישר, מי לא מגיע וממי עדיין מחכים לתשובה.",
  },
  {
    icon: RefreshCw,
    title: "סבבי הודעות מסודרים",
    text: "בחבילת ההודעות קיימים שני סבבי WhatsApp לאישורי הגעה — סבב ראשון לרשימה וסבב שני למי שעדיין לא ענה.",
  },
  {
    icon: Send,
    title: "פחות מעקב ידני",
    text: "לא צריך לעבור על שיחות אישיות כדי להבין את מצב אישורי ההגעה.",
  },
] as const;

const CHANNELS = [
  {
    title: "WhatsApp — אישורי הגעה",
    text: "הודעות עם קישור אישי שמאפשר לאורחים להשיב בצורה נוחה ומסודרת. בחבילת ההודעות: שני סבבים.",
    href: "/rsvp/whatsapp",
  },
  {
    title: "SMS — תזכורות והודעות תודה",
    text: "בחבילת ההודעות: תזכורת SMS לקראת האירוע (כולל מספר שולחן כשיש הושבה) והודעת תודה אחריו.",
    href: "/pricing",
  },
  {
    title: "שיחות — כשצריך להשלים תשובות",
    text: "מסלולי שיחות מוקלטות, אנושיות או משולבות — חבילות נפרדות, לא כלולות אוטומטית בהודעות בלבד.",
    href: "/pricing",
  },
] as const;

const EVENTS = [
  {
    title: "חתונות",
    text: "רשימות מוזמנים גדולות, אישורי הגעה, מספר מגיעים והמשך לתכנון הושבה.",
    href: "/rsvp/chatuna",
  },
  {
    title: "בר ובת מצווה",
    text: "משפחה, חברים ומוזמנים ממעגלים שונים — עם מעקב מסודר אחרי התשובות.",
    href: "/rsvp",
  },
  {
    title: "בריתות ובריתות לבנות",
    text: "אירועים עם לוחות זמנים קצרים יותר, שבהם חשוב לרכז את התשובות במהירות.",
    href: "/rsvp",
  },
  {
    title: "חינה ואירועים משפחתיים",
    text: "הזמנה אישית ומעקב אחרי מוזמנים.",
    href: "/invitations/chatuna",
  },
  {
    title: "אירועים עסקיים",
    text: "איסוף תשובות ומעקב אחרי רשימות משתתפים.",
    href: "/rsvp",
  },
  {
    title: "ימי הולדת ואירועים פרטיים",
    text: "ניהול נוח של הזמנות ואישורים.",
    href: "/rsvp",
  },
] as const;

const PACKAGES = [
  {
    title: "אישורי הגעה בהודעות",
    text: "הזמנה דיגיטלית, שני סבבי WhatsApp לאישור הגעה, תזכורת SMS עם מספר שולחן כשיש הושבה, והודעת תודה ב־SMS.",
  },
  {
    title: "שיחות מוקלטות",
    text: "אותו בסיס הודעות + שלושה סבבי שיחה מוקלטת למי שעדיין לא ענה.",
  },
  {
    title: "שיחות אנושיות",
    text: "אותו בסיס הודעות + שלושה סבבים במוקד אנושי.",
  },
  {
    title: "מסלול משולב",
    text: "אותו בסיס הודעות + שני סבבים מוקלטים וסבב אנושי אחד.",
  },
] as const;

function WhatsAppIcon({ size = 22 }: { size?: number }) {
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

function WhatsAppMock({
  message,
  image,
  imageAlt,
  cta,
}: {
  message: string;
  image?: string;
  imageAlt?: string;
  cta?: string;
}) {
  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-[22px] border border-[#D8CCB8] bg-[#E5DDD5] shadow-[0_18px_40px_rgba(44,36,28,0.1)]"
    >
      <div className="flex items-center gap-3 bg-[#075E54] px-3.5 py-2.5 text-white">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A45C] text-xs font-black text-[#1C1612]">
          IN
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">Invistimo</p>
          <p className="text-[11px] text-white/70">עסק</p>
        </div>
        <WhatsAppIcon size={20} />
      </div>
      <div
        className="px-2.5 py-3"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          backgroundColor: "#E5DDD5",
        }}
      >
        <div className="mr-auto max-w-[94%] overflow-hidden rounded-xl rounded-tr-sm bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
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
          <div className="px-3 pb-1.5 text-left text-[10px] text-[#667781]">11:05</div>
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[300px]">
      <div
        className="absolute -inset-5 rounded-[42px] bg-[radial-gradient(circle_at_top,#E8D4AF_0%,transparent_55%)] opacity-90 blur-2xl"
        aria-hidden
      />
      <div className="relative rounded-[36px] border border-white/80 bg-gradient-to-br from-[#F8EFE1] via-[#FFFDF9] to-[#E7D7BF] p-[9px] shadow-[0_35px_95px_rgba(58,39,20,0.22)]">
        <div className="rounded-[28px] border border-[#221811]/10 bg-[#17120E] p-[7px]">
          <div className="aspect-[9/16] overflow-hidden rounded-[22px] bg-black">{children}</div>
        </div>
      </div>
    </div>
  );
}

function QuietVideo({
  src,
  poster,
  className,
  onTime,
}: {
  src: string;
  poster?: string;
  className?: string;
  onTime?: (t: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };
    const t = window.setTimeout(enable, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [reduceMotion]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready || reduceMotion) return;
    el.play().catch(() => undefined);
    if (!onTime) return;
    const handler = () => onTime(el.currentTime);
    el.addEventListener("timeupdate", handler);
    return () => el.removeEventListener("timeupdate", handler);
  }, [ready, reduceMotion, onTime]);

  if (reduceMotion && poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt="" className={className} loading="lazy" />
    );
  }

  return (
    <video
      ref={ref}
      src={ready ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      className={className}
      aria-label="הדגמת אישור הגעה ב־WhatsApp מתוך Invistimo"
    />
  );
}

function Eyebrow({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p className={`text-sm font-black tracking-[0.14em] ${onDark ? "text-[#E8C988]" : "text-[#7A5530]"}`}>
      {children}
    </p>
  );
}

function SyncedJourney() {
  const [t, setT] = useState(0);
  const active = JOURNEY_CAPTIONS.find((c) => t >= c.start && t < c.end) || JOURNEY_CAPTIONS[0];

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="aspect-video">
          <QuietVideo
            src="/marketing/videos/hero-guest-journey.webm"
            poster="/marketing/videos/hero-guest-journey-poster.jpg"
            className="h-full w-full object-cover object-top"
            onTime={setT}
          />
        </div>
        <p className="sr-only">
          סרטון: הודעת WhatsApp, פתיחת קישור אישי, הזמנה דיגיטלית, אישור הגעה ומסך תודה. האישור מתבצע
          בעמוד שנפתח מהקישור.
        </p>
      </div>
      <ol className="grid gap-3">
        {JOURNEY_CAPTIONS.map((c, i) => {
          const isActive = c.text === active.text;
          return (
            <li
              key={c.text}
              className={`rounded-[22px] border px-5 py-4 transition ${
                isActive
                  ? "border-[#C9A45C] bg-[#C9A45C]/15 text-[#FFF8EF]"
                  : "border-white/10 bg-white/[0.04] text-[#D0C2AF]"
              }`}
            >
              <span className="text-xs font-black text-[#E8C988]">0{i + 1}</span>
              <p className={`mt-1 text-base font-bold ${isActive ? "text-[#FFF8EF]" : ""}`}>{c.text}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function WhatsappRsvpMarketingPage() {
  return (
    <div dir="rtl" className="min-h-screen overflow-hidden bg-[#FBF6EE] text-[#3F3025]">
      {/* 1. Hero */}
      <section aria-labelledby="wa-h1" className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(201,164,92,0.22),transparent_42%),radial-gradient(circle_at_88%_10%,rgba(58,43,34,0.08),transparent_40%),linear-gradient(180deg,#FFFDF8_0%,#F7EFE0_55%,#FBF6EE_100%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:gap-12 md:px-8 md:pb-20 md:pt-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1
              id="wa-h1"
              className="max-w-2xl text-[2rem] font-black leading-[1.12] tracking-[-0.03em] text-[#2C241C] md:text-5xl"
            >
              אישורי הגעה ב־WhatsApp,{" "}
              <span className="bg-gradient-to-l from-[#B48A4A] via-[#D3B47C] to-[#84613A] bg-clip-text text-transparent">
                בלי לרדוף אחרי כל תשובה
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-xl font-bold leading-9 text-[#5E4735] md:text-2xl">
              ההודעה מגיעה לאורחים. התשובות מגיעות אליכם.
            </p>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#5C4A3A] md:text-lg">
              רשימת המוזמנים מוכנה, האירוע מתקרב, ועכשיו צריך לדעת מי באמת מגיע. עם Invistimo שולחים
              הודעות אישיות ב־WhatsApp, מאפשרים לאורחים לאשר הגעה בקישור נוח ומקבלים תמונה מסודרת של
              התשובות במקום אחד. בלי לחפש אישורים בין שיחות ובלי לעדכן רשימות ידנית אחרי כל הודעה.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink href="/pricing" className={ctaPrimary} location={`hero_pricing:${PATH}`}>
                לצפייה בחבילות
              </TrackedCtaLink>
              <TrackedCtaLink href="#guest-journey" className={ctaSecondary} location={`hero_how:${PATH}`}>
                כך זה עובד
              </TrackedCtaLink>
            </div>
          </div>

          <div>
            <PhoneFrame>
              <QuietVideo
                src="/videos/rsvp1.mp4"
                className="h-full w-full object-cover object-top"
              />
            </PhoneFrame>
            <p className="mt-4 text-center text-sm font-semibold text-[#7A6042]">
              תהליך האישור בעמוד שנפתח מהקישור האישי
            </p>
          </div>
        </div>
      </section>

      {/* 2. Guest journey video */}
      <section
        id="guest-journey"
        aria-labelledby="journey-title"
        className="scroll-mt-24 bg-[#1C1612] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <Eyebrow onDark>מסע האורח</Eyebrow>
          <h2 id="journey-title" className="mt-3 max-w-3xl text-3xl font-black leading-[1.15] text-[#FFF8EF] md:text-4xl">
            הודעה אחת. כמה רגעים. והתשובה כבר אצלכם.
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#D8CBB8]">
            מבחינת האורחים, זה פשוט: פותחים הודעה, נכנסים להזמנה, בוחרים אם מגיעים ושולחים תשובה.
            מבחינתכם, כל אישור הופך לחלק מרשימת מוזמנים מסודרת שאפשר לעקוב אחריה לאורך ההכנות.
          </p>
          <div className="mt-12">
            <SyncedJourney />
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-[#B8A890]">
            ההודעה נשלחת ב־WhatsApp; כפתורי אישור ההגעה נמצאים בעמוד שנפתח מהקישור האישי — לא כבחירה
            בתוך גוף ההודעה עצמה.
          </p>
        </div>
      </section>

      {/* 3. Why WhatsApp */}
      <section aria-labelledby="why-wa" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>למה WhatsApp</Eyebrow>
          <h2 id="why-wa" className="mt-3 max-w-3xl text-3xl font-black leading-[1.15] text-[#2C241C] md:text-4xl">
            כי האורחים כבר שם. עכשיו גם האישורים יכולים להיות מסודרים.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
            WhatsApp הוא ערוץ תקשורת מוכר ונוח עבור אורחים רבים. במקום לבקש מכולם לחזור בהודעה חופשית,
            שולחים קישור אישי שמוביל לתהליך אישור ברור. האורח יודע מה לעשות, ואתם לא צריכים לפענח מי
            כתב &quot;מגיעים&quot;, כמה אנשים הוא התכוון להביא ואם כבר עדכנתם את הרשימה.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {WHY_CARDS.map((c) => (
              <div
                key={c.title}
                className="rounded-[28px] border border-[#E7D3B0] bg-[#FBF6EE] p-6 shadow-[0_14px_36px_rgba(44,36,28,0.05)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2C241C] text-[#C9A45C]">
                  <c.icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-black text-[#2C241C]">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. What the guest gets */}
      <section aria-labelledby="guest-gets" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>מה מקבל האורח</Eyebrow>
          <h2 id="guest-gets" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            לא עוד הודעה כללית שנעלמת בתוך הצ׳אט
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
            האורח מקבל הודעה עם פרטי האירוע וקישור אישי. כשהוא פותח את הקישור, הוא מגיע להזמנה
            הדיגיטלית ולאזור אישור ההגעה. כך פרטי האירוע והתשובה נמצאים בתהליך אחד ברור.
          </p>
          <div className="mt-12 grid items-start gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-black text-[#8A642E]">א. הודעת WhatsApp</p>
              <WhatsAppMock
                message={RSVP_WA_BODY}
                image="/marketing/invites/invite-wedding-mia-alon.webp"
                imageAlt="כותרת תמונה בהודעת אישור הגעה — הזמנת מיה ואלון"
                cta="לאישור הגעה"
              />
            </div>
            <div>
              <p className="mb-3 text-sm font-black text-[#8A642E]">ב. הזמנה וטופס אישור</p>
              <PhoneFrame>
                <QuietVideo src="/videos/rsvp1.mp4" className="h-full w-full object-cover object-top" />
              </PhoneFrame>
            </div>
          </div>
          <p className="mt-8 text-center text-lg font-black text-[#2C241C]">
            מההודעה להזמנה, ומההזמנה לאישור.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-7 text-[#7A6042]">
            כפתורי אישור ההגעה נמצאים בעמוד שנפתח מהקישור, ולא בתוך גוף הודעת WhatsApp עצמה.
          </p>
        </div>
      </section>

      {/* 5. After first round */}
      <section aria-labelledby="after-first" className="bg-[#2C241C] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow onDark>המשך התהליך</Eyebrow>
          <h2 id="after-first" className="mt-3 max-w-3xl text-3xl font-black text-[#FFF8EF] md:text-4xl">
            לא כולם עונים מיד. בשביל זה יש המשך לתהליך.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#D8CBB8]">
            יש אורחים שמאשרים ברגע שההודעה מגיעה. אחרים צריכים לבדוק עבודה, סידור לילדים או תוכניות
            משפחתיות. במקום להתחיל מחדש, ממשיכים לפי מצב התשובות שכבר התקבלו.
          </p>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              { t: "סבב ראשון", d: "שליחת הודעת אישור הגעה לאורחים הרלוונטיים." },
              { t: "מעקב", d: "בדיקת התשובות וזיהוי אורחים שעדיין לא השיבו." },
              { t: "סבב שני", d: "פנייה נוספת למי שעדיין ממתינים לתשובתו, בהתאם להגדרות השירות." },
              {
                t: "השלמת תשובות",
                d: "אפשרות לשלב שיחות מוקלטות, אנושיות או משולבות — רק אם נבחרה חבילת השיחות.",
              },
            ].map((s, i) => (
              <li key={s.t} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <span className="text-xs font-black text-[#E8C988]">0{i + 1}</span>
                <h3 className="mt-2 text-lg font-black text-[#FFF8EF]">{s.t}</h3>
                <p className="mt-2 text-[14px] leading-7 text-[#D0C2AF]">{s.d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-[#B8A890]">
            שיחות אינן כלולות אוטומטית בכל חבילת WhatsApp — הן מסלולים נפרדים במחשבון.
          </p>
        </div>
      </section>

      {/* 6. Channels */}
      <section aria-labelledby="channels" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>ערוצים</Eyebrow>
          <h2 id="channels" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            כל ערוץ מתאים לרגע אחר בהכנות
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {CHANNELS.map((c) => (
              <Link
                key={c.title}
                href={c.href}
                className="rounded-[28px] border border-[#E7D3B0] bg-[#FBF6EE] p-6 transition hover:-translate-y-1 hover:border-[#C9A45C]"
              >
                <h3 className="text-xl font-black text-[#2C241C]">{c.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{c.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Message example */}
      <section aria-labelledby="example" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>דוגמה</Eyebrow>
            <h2 id="example" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
              איך נראית הודעת אישור הגעה לאירוע?
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">
              הודעת אישור הגעה טובה צריכה להיות קצרה, ברורה ואישית. חשוב שהאורח יזהה לאיזה אירוע
              הוזמן, מתי הוא מתקיים ולאן מוביל הקישור. אין צורך להעמיס בהסברים — הפעולה עצמה צריכה
              להיות פשוטה.
            </p>
            <p className="mt-4 text-sm leading-7 text-[#7A6042]">
              ההמחשה מבוססת על תצוגת התבנית לסבבי האישור במערכת. הכפתור בהודעה פותח את הקישור האישי —
              האישור עצמו מתבצע בעמוד שנפתח.
            </p>
          </div>
          <WhatsAppMock
            message={RSVP_WA_BODY}
            image="/marketing/invites/invite-wedding-mia-alon.webp"
            imageAlt="תצוגת הודעת אישור הגעה ב־WhatsApp עם תמונת הזמנה"
            cta="לאישור הגעה"
          />
        </div>
      </section>

      {/* 8. Event types */}
      <section aria-labelledby="events" className="bg-[#1C1612] px-5 py-20 text-[#F7F1E8] md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow onDark>לכל סוג אירוע</Eyebrow>
          <h2 id="events" className="mt-3 max-w-3xl text-3xl font-black text-[#FFF8EF] md:text-4xl">
            לכל אירוע שבו חשוב לדעת מי מגיע
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENTS.map((e) => (
              <Link
                key={e.title}
                href={e.href}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#C9A45C]/50"
              >
                <h3 className="text-lg font-black text-[#FFF8EF]">{e.title}</h3>
                <p className="mt-2 text-[14px] leading-7 text-[#D0C2AF]">{e.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Pricing */}
      <section aria-labelledby="pricing" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>חבילות</Eyebrow>
          <h2 id="pricing" className="mt-3 max-w-3xl text-3xl font-black text-[#2C241C] md:text-4xl">
            בוחרים את השירות שמתאים לרשימת המוזמנים שלכם
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
            העלות תלויה בהיקף רשימת המוזמנים ובשירותים שבוחרים לשלב. יש מי שמעדיפים אישורי הגעה
            בהודעות בלבד, ויש מי שרוצים גם שיחות להשלמת תשובות או שירותי הושבה. כדי לבחור נכון, כדאי
            להשוות לא רק את המחיר אלא גם את מספר סבבי הפנייה ואת השירותים הכלולים בכל מסלול. הסכום
            מוצג במחשבון לפי מספר רשומות — בלי מחיר אחיד מומצא.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {PACKAGES.map((p) => (
              <div key={p.title} className="rounded-[28px] border border-[#E7D3B0] bg-[#FBF6EE] p-6">
                <h3 className="text-xl font-black text-[#2C241C]">{p.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{p.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <TrackedCtaLink href="/pricing" className={ctaGold} location={`pricing_cta:${PATH}`}>
              לבדיקת חבילות ומחירים
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section aria-labelledby="faq" className="bg-[#FBF6EE] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>שאלות נפוצות</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">
            שאלות שכדאי לשאול לפני ששולחים אישורי הגעה
          </h2>
          <div className="mt-10 space-y-3">
            {WHATSAPP_RSVP_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-4"
              >
                <summary className="cursor-pointer list-none">
                  <h3 className="text-lg font-black text-[#35281F]">{faq.q}</h3>
                </summary>
                <p className="mt-3 text-[15px] leading-8 text-[#5C4A3A]">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Closing */}
      <section aria-labelledby="closing" className="bg-[#FFFDF8] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="closing" className="text-3xl font-black leading-[1.2] text-[#2C241C] md:text-4xl">
            פחות הודעות של &quot;נו, אתם מגיעים?&quot; יותר זמן להתרגש מהאירוע.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#5C4A3A]">
            אתם בוחרים את האנשים שתרצו סביבכם ביום המיוחד. Invistimo עוזרת לכם לרכז את התשובות, לעקוב
            אחרי ההתקדמות ולהגיע לאירוע עם רשימה מסודרת יותר.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCtaLink href="/try" className={ctaPrimary} location={`closing:${PATH}`}>
              בואו נתחיל
            </TrackedCtaLink>
            <TrackedCtaLink href="/pricing" className={ctaSecondary} location={`closing_pricing:${PATH}`}>
              לצפייה בחבילות
            </TrackedCtaLink>
          </div>
          <nav aria-label="קישורים קשורים" className="mt-14 flex flex-wrap justify-center gap-3">
            {[
              { href: "/rsvp", label: "אישורי הגעה" },
              { href: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
              { href: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
              { href: "/seating-explained", label: "סידורי הושבה" },
              { href: "/pricing", label: "מחירים" },
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
    </div>
  );
}
