"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Armchair,
  CalendarHeart,
  CheckCircle2,
  Gift,
  Heart,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { EVENT_INVITATION_BODY } from "@/lib/whatsapp/approvedTemplates";
import { HOME_FAQS } from "@/lib/seo/homeIntentMap";

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
      { rootMargin: "220px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active]);

  return (
    <div ref={ref} className="aspect-video w-full overflow-hidden rounded-[28px] bg-[#1C1612]">
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

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={`text-sm font-black tracking-[0.18em] ${
        light ? "text-[#D4B06A]" : "text-[#8B642B]"
      }`}
    >
      {children}
    </p>
  );
}

function GoldCta({
  href,
  children,
  dark = false,
}: {
  href: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        dark
          ? "inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full bg-[#C9A45C] px-6 sm:w-auto sm:px-8 py-3.5 text-sm font-black !text-[#1C1612] transition hover:bg-[#D4B06A]"
          : "inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full bg-[#2C241C] px-6 sm:w-auto sm:px-8 py-3.5 text-sm font-black !text-[#F7F1E8] shadow-[0_16px_36px_rgba(44,36,28,0.18)] transition hover:bg-[#3A3028]"
      }
    >
      {children}
    </Link>
  );
}

function SoftCta({
  href,
  children,
  light = false,
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        light
          ? "inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full border border-[#F7F1E8]/50 bg-[#F7F1E8] px-6 sm:w-auto sm:px-8 py-3.5 text-sm font-black !text-[#1C1612] transition hover:bg-white"
          : "inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full border border-[#2C241C]/22 bg-[#FFFDF8]/80 px-6 sm:w-auto sm:px-8 py-3.5 text-sm font-black !text-[#2C241C] transition hover:bg-white"
      }
    >
      {children}
    </Link>
  );
}

const SERVICES = [
  {
    href: "/invitations/chatuna",
    title: "הזמנות דיגיטליות",
    body: "הזמנה מעוצבת שמספרת את הסיפור שלכם ומגיעה ישירות לאנשים שאתם אוהבים.",
    cta: "להזמנות הדיגיטליות",
    icon: Gift,
  },
  {
    href: "/rsvp/save-the-date",
    title: "Save the Date",
    body: "מודיעים לכולם שיש תאריך, ונותנים להם סיבה טובה לשמור אותו ביומן.",
    cta: "לשריין את הרגע",
    icon: CalendarHeart,
  },
  {
    href: "/rsvp",
    title: "אישורי הגעה",
    body: "יודעים מי מגיע, מי עדיין מתלבט וממי עוד מחכים לתשובה.",
    cta: "כך זה עובד",
    icon: CheckCircle2,
  },
  {
    href: "/seating-explained",
    title: "סידורי הושבה",
    body: "מסדרים את השולחנות, משבצים אורחים ורואים את התמונה המלאה לפני האירוע.",
    cta: "סידורי הושבה",
    icon: Armchair,
  },
  {
    href: "/wedding-website",
    title: "אתר חתונה",
    body: "מקום אחד לכל הפרטים החשובים, עם עיצוב שמתאים לאירוע שלכם.",
    cta: "לאתרי החתונה",
    icon: Heart,
  },
  {
    href: "/rsvp/guest-list",
    title: "ניהול מוזמנים",
    body: "רשימה אחת מסודרת, עם פרטי האורחים, סטטוסים ועדכונים.",
    cta: "ניהול מוזמנים",
    icon: Users,
  },
  {
    href: "/rsvp/reminders",
    title: "תזכורות והודעות",
    body: "מזכירים לאורחים את הפרטים החשובים ושומרים על קשר גם אחרי האירוע.",
    cta: "תזכורות והודעות",
    icon: Send,
  },
  {
    href: "/event-management",
    title: "ניהול יום האירוע",
    body: "עוקבים אחר הגעת האורחים ומנהלים את המתרחש בזמן אמת, בהתאם לשירותים שנבחרו.",
    cta: "ניהול יום האירוע",
    icon: Sparkles,
  },
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
    href: "/for/bar-mitzvah",
    title: "בר מצווה",
    body: "היום המיוחד שלו, עם כל המוזמנים במקום אחד.",
    image: "/marketing/invites/invite-bar-mitzvah.webp",
  },
  {
    href: "/for/bat-mitzvah",
    title: "בת מצווה",
    body: "חגיגה מרגשת שמתחילה כבר בהזמנה.",
    image: "/marketing/invites/invite-bat-mitzvah.webp",
  },
  {
    href: "/for/brit",
    title: "ברית ובריתה",
    body: "משתפים את הבשורה ומזמינים את האנשים הקרובים.",
    image: "/marketing/invites/invite-brit.webp",
  },
  {
    href: "/for/birthday",
    title: "יום הולדת",
    body: "קטן או גדול — כל אורח הוא חלק מהחגיגה.",
    image: "/marketing/invites/invite-birthday.webp",
  },
  {
    href: "/for/corporate",
    title: "אירוע חברה",
    body: "הזמנות, אישורי הגעה ורשימת משתתפים מסודרת.",
    image: "/marketing/invites/invite-corporate.webp",
  },
  {
    href: "/for/private-party",
    title: "אירוע פרטי",
    body: "כל חגיגה שחשוב לכם לתכנן כמו שצריך.",
    image: "/marketing/invites/invite-save-the-date-maya-itai.webp",
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
    cta: null,
    time: "10:12",
  },
  {
    when: "חודש עד חודש וחצי לפני",
    title: "ההזמנה — משתפים את הרגע המיוחד",
    body: "זה הזמן לשלוח את ההזמנה המעוצבת עם פרטי האירוע. בשלב הזה אין צורך לבקש אישור הגעה — המטרה היא להזמין, לשתף ולתת לאורחים זמן להיערך.",
    message: INVITE_MESSAGE,
    image: "/marketing/invites/invite-wedding-mia-alon.webp",
    imageAlt: "הזמנה דיגיטלית — החתונה של מיה ואלון",
    cta: null,
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

/** Official WhatsApp brand mark — green glyph, not a generic chat bubble. */
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

function SmsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="2.5" y="4.5" width="23" height="15.5" rx="3.5" fill="#2C241C" />
      <path d="M8.5 22.5 12 18.5H21.5a3.5 3.5 0 0 0 3.5-3.5V10" fill="#2C241C" />
      <text
        x="14"
        y="14.6"
        textAnchor="middle"
        fill="#F7F1E8"
        fontSize="8"
        fontWeight="800"
        fontFamily="Heebo, Arial, sans-serif"
        letterSpacing="0.04em"
      >
        SMS
      </text>
    </svg>
  );
}

function PhoneIconMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.2 3.8c.4-.4 1-.5 1.5-.3l2.1.8c.6.2 1 .8.9 1.4l-.3 2.2a1.4 1.4 0 0 1-.8 1.1l-1.1.5a11.3 11.3 0 0 0 4.9 4.9l.5-1.1c.2-.5.7-.7 1.1-.8l2.2-.3c.6-.1 1.2.3 1.4.9l.8 2.1c.2.5.1 1.1-.3 1.5l-1.3 1.3c-.4.4-1 .6-1.6.5C10.4 18.6 5.4 13.6 4 6.7c-.1-.6.1-1.2.5-1.6L8.2 3.8Z"
        fill="#2C241C"
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
      </div>
      <div
        className="px-2.5 py-3"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          backgroundColor: "#E5DDD5",
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
      {/* 2. Intro */}
      <section
        dir="rtl"
        aria-labelledby="home-intro"
        className="relative overflow-hidden bg-[#F7F1E8] px-4 py-16 max-[360px]:px-3 sm:px-5 md:px-10 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(201,164,92,0.18),transparent_40%),radial-gradient(circle_at_88%_78%,rgba(255,255,255,0.7),transparent_42%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Eyebrow>כל מה שצריך לאירוע שלכם</Eyebrow>
            <h2
              id="home-intro"
              className="mt-4 text-[32px] font-black leading-[1.15] tracking-[-0.03em] text-[#2C241C] md:text-5xl"
            >
              אתם מתכננים את הרגעים היפים. אנחנו דואגים לכל מה שמסביב.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5C4A3A]">
              אירוע מוצלח מורכב מאלפי פרטים קטנים. רשימת המוזמנים, ההזמנות, אישורי ההגעה,
              סידורי ההושבה והעדכונים של הרגע האחרון.
            </p>
            <p className="mt-4 max-w-xl text-lg leading-8 text-[#5C4A3A]">
              עם Invistimo הכול מתחבר לחוויה אחת מסודרת: אתם מנהלים את האירוע במקום אחד,
              והאורחים נהנים מתהליך פשוט ונעים, בלי להוריד אפליקציה ובלי להסתבך.
            </p>
          </motion.div>

          <div className="grid gap-4">
            {[
              {
                icon: Sparkles,
                title: "הכול במקום אחד",
                body: "מההזמנה הראשונה ועד יום האירוע.",
              },
              {
                icon: Heart,
                title: "חוויה אישית לכל אורח",
                body: "הזמנה וקישור אישי, עם תהליך פשוט וברור.",
              },
              {
                icon: CheckCircle2,
                title: "יותר סדר, פחות התעסקות",
                body: "כל התשובות והעדכונים מרוכזים במקום אחד.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8]/90 p-5 shadow-[0_18px_40px_rgba(44,36,28,0.06)]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2C241C] text-[#C9A45C]">
                  <item.icon size={22} />
                </span>
                <div>
                  <h3 className="text-lg font-black text-[#2C241C]">{item.title}</h3>
                  <p className="mt-1 text-[15px] leading-7 text-[#5C4A3A]">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Services — espresso */}
      <section
        dir="rtl"
        aria-labelledby="home-services"
        className="relative overflow-hidden bg-[#1C1612] px-4 py-16 max-[360px]:px-3 sm:px-5 md:px-10 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(201,164,92,0.16),transparent_36%),radial-gradient(circle_at_10%_90%,rgba(255,255,255,0.05),transparent_40%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl">
          <Eyebrow light>כל מה שצריך, בדיוק במקום הנכון</Eyebrow>
          <h2
            id="home-services"
            className="mt-4 max-w-3xl text-[32px] font-black leading-[1.15] text-[#F7F1E8] md:text-5xl"
          >
            כל הפרטים מתחברים לאירוע אחד מושלם
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#C9BDAE]">
            מהרגע שבו בוחרים תאריך ועד שהאורחים מגיעים לחגוג — בחרו את השירותים שיעזרו לכם
            להפוך את ההכנות לפשוטות, נעימות ומסודרות יותר.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.href + service.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={service.href}
                  className="group flex h-full flex-col rounded-[24px] border border-[#C9A45C]/25 bg-[#FFF9EF] p-5 text-[#2C241C] shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-[#C9A45C]/55"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2C241C] text-[#C9A45C]">
                    <service.icon size={20} />
                  </span>
                  <h3 className="text-lg font-black">{service.title}</h3>
                  <p className="mt-2 flex-1 text-[14px] leading-7 text-[#5C4A3A]">{service.body}</p>
                  <span className="mt-4 text-sm font-black text-[#8B642B] transition group-hover:text-[#2C241C]">
                    {service.cta} ←
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Save the Date experiential */}
      <section
        dir="rtl"
        aria-labelledby="home-std"
        className="relative overflow-hidden bg-[#F4F0E8] px-4 py-16 max-[360px]:px-3 sm:px-5 md:px-10 md:py-28"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>ההתרגשות מתחילה כאן</Eyebrow>
            <h2
              id="home-std"
              className="mt-4 text-[32px] font-black leading-[1.15] text-[#2C241C] md:text-5xl"
            >
              יש תאריך. עכשיו אפשר להתחיל להתרגש.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">
              לפני ההזמנות, לפני אישורי ההגעה ולפני כל הסידורים — יש רגע אחד שבו הכול מתחיל
              להיות אמיתי.
            </p>
            <p className="mt-4 text-lg leading-8 text-[#5C4A3A]">
              עם Save the Date אתם משתפים את האנשים החשובים לכם בתאריך הגדול, כדי שיוכלו
              לשמור אותו מראש ולהתחיל להתרגש יחד איתכם.
            </p>
            <div className="mt-8">
              <GoldCta href="/rsvp/save-the-date">לשריין את הרגע</GoldCta>
            </div>
          </div>
          <LazyInViewVideo
            src="/marketing/videos/home-save-the-date.webm"
            poster="/marketing/videos/home-save-the-date-poster.jpg"
            ariaLabel="אנימציית Save the Date — מיה ואלון, 24.06.2027"
          />
        </div>
      </section>

      {/* 5. Message journey timeline */}
      <section
        dir="rtl"
        aria-labelledby="home-journey"
        className="relative overflow-hidden bg-[#FFFDF8] px-4 py-16 max-[360px]:px-3 sm:px-5 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <Eyebrow>לכל הודעה יש את הזמן שלה</Eyebrow>
          <h2
            id="home-journey"
            className="mt-4 max-w-3xl text-[32px] font-black leading-[1.15] text-[#2C241C] md:text-5xl"
          >
            מההודעה הראשונה ועד לרגע שבו כולם אומרים &quot;מגיעים!&quot;
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
            לא צריך לבקש מהאורחים להתחייב חודשים מראש. כששולחים את ההודעה הנכונה בזמן הנכון,
            נותנים להם ליהנות מההתרגשות, להיערך לאירוע ולהשיב כשהתאריך כבר מתקרב. המועדים
            כאן הם המלצה לחתונה — לא כלל קשיח לכל אירוע.
          </p>

          <ol className="relative mt-14 space-y-16 md:space-y-20">
            {/* Center timeline — desktop only */}
            <div
              className="pointer-events-none absolute bottom-12 top-12 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-[#C9A45C] via-[#E0D4C2] to-[#C9A45C] md:block"
              aria-hidden
            />

            {JOURNEY.map((step, index) => {
              const textFirst = index % 2 === 0;
              return (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="relative grid items-start gap-5 md:grid-cols-[1fr_56px_1fr] md:items-center md:gap-5"
                >
                  {/* Mobile: number above the step, not over message text */}
                  <div className="flex items-center gap-3 md:hidden">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#C9A45C] bg-[#FFFDF8] text-sm font-black text-[#8B642B]">
                      {index + 1}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C9A45C]/70" aria-hidden />
                  </div>

                  <div
                    className={
                      textFirst ? "md:col-start-1 md:row-start-1" : "md:col-start-3 md:row-start-1"
                    }
                  >
                    <div className="rounded-[28px] border border-[#E7D3B0] bg-[#F7F1E8] p-5 shadow-[0_20px_44px_rgba(44,36,28,0.07)] md:p-8">
                      <span className="inline-flex rounded-full border border-[#C9A45C]/40 bg-white/70 px-4 py-1.5 text-xs font-black tracking-[0.12em] text-[#8B642B]">
                        שלב {index + 1} · {step.when}
                      </span>
                      <h3 className="mt-4 text-xl font-black text-[#2C241C] md:text-2xl">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{step.body}</p>
                    </div>
                  </div>

                  {/* Desktop number on center axis only */}
                  <div className="relative z-10 hidden md:col-start-2 md:row-start-1 md:flex md:justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#C9A45C] bg-[#FFFDF8] text-sm font-black text-[#8B642B] shadow-[0_0_0_6px_#FFFDF8]">
                      {index + 1}
                    </span>
                  </div>

                  <div
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
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* 6. RSVP channels */}
      <section
        dir="rtl"
        aria-labelledby="home-rsvp"
        className="relative bg-[#F7F1E8] px-4 py-16 max-[360px]:px-3 sm:px-5 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <Eyebrow>פחות טלפונים, יותר תשובות</Eyebrow>
          <h2
            id="home-rsvp"
            className="mt-4 max-w-3xl text-[32px] font-black leading-[1.15] text-[#2C241C] md:text-5xl"
          >
            במקום לרדוף אחרי תשובות, פשוט יודעים מי מגיע.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
            מי מגיע? מי לא יוכל להגיע? ומי עדיין לא השיב? עם Invistimo אתם רואים את התמונה
            מתבהרת, אורח אחרי אורח — והתשובות מתרכזות במערכת.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Link
              href="/rsvp/whatsapp"
              className="rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(44,36,28,0.06)] transition hover:-translate-y-1 hover:border-[#C9A45C]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF9EF] ring-1 ring-[#E7D3B0]">
                <WhatsAppBrandIcon size={28} />
              </span>
              <h3 className="mt-5 text-xl font-black text-[#2C241C]">WhatsApp</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
                הודעה אישית עם קישור לאישור הגעה, בדרך שנוחה ומוכרת לאורחים.
              </p>
            </Link>
            <Link
              href="/rsvp/sms"
              className="rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(44,36,28,0.06)] transition hover:-translate-y-1 hover:border-[#C9A45C]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF9EF] ring-1 ring-[#E7D3B0]">
                <SmsIcon />
              </span>
              <h3 className="mt-5 text-xl font-black text-[#2C241C]">SMS</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
                תזכורות והודעות חשובות שמגיעות ישירות לטלפון.
              </p>
            </Link>
            <Link
              href="/rsvp/calls"
              className="rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(44,36,28,0.06)] transition hover:-translate-y-1 hover:border-[#C9A45C]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF9EF] ring-1 ring-[#E7D3B0]">
                <PhoneIconMark />
              </span>
              <h3 className="mt-5 text-xl font-black text-[#2C241C]">שיחות</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">
                שיחות מוקלטות, אנושיות או משולבות, בהתאם לחבילה שנבחרה, כדי להגיע גם לאורחים שעדיין לא השיבו.
              </p>
            </Link>
          </div>
          <div className="mt-10">
            <GoldCta href="/rsvp">כך זה עובד</GoldCta>
          </div>
        </div>
      </section>

      {/* 7. Seating */}
      <section
        dir="rtl"
        aria-labelledby="home-seating"
        className="relative overflow-hidden bg-[#1C1612] px-4 py-16 max-[360px]:px-3 sm:px-5 md:px-10 md:py-28"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow light>לכל אורח יש מקום</Eyebrow>
            <h2
              id="home-seating"
              className="mt-4 text-[32px] font-black leading-[1.15] text-[#F7F1E8] md:text-5xl"
            >
              הושבה חכמה מתחילה ברשימת מוזמנים מסודרת
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#C9BDAE]">
              אחרי שמתחילות להגיע התשובות, אפשר להפוך את רשימת המוזמנים למפת הושבה ברורה —
              ליצור שולחנות, לשבץ אורחים ולבדוק תפוסה בלי ללכת לאיבוד בין קבצים.
            </p>
            <div className="mt-8">
              <GoldCta href="/seating-explained" dark>
                סידורי הושבה
              </GoldCta>
            </div>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-[#C9A45C]/25 bg-[#111] shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
            <img
              src="/marketing/product/webp/desktop-try-seating.webp"
              alt="מפת סידורי הושבה במערכת Invistimo עם שולחנות ושיבוצי אורחים"
              className="aspect-[16/10] w-full object-cover object-top"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* 8. Event types */}
      <section
        dir="rtl"
        aria-labelledby="home-events"
        className="relative bg-[#F4F0E8] px-4 py-16 max-[360px]:px-3 sm:px-5 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <Eyebrow>כל סיבה לחגוג</Eyebrow>
          <h2
            id="home-events"
            className="mt-4 max-w-3xl text-[32px] font-black leading-[1.15] text-[#2C241C] md:text-5xl"
          >
            לכל חגיגה יש סיפור. אנחנו כאן כדי לעזור לכם לנהל אותו.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5C4A3A]">
            חתונה גדולה, חינה מרגשת, בר מצווה משפחתית או חגיגה אינטימית — לכל אירוע יש את
            האנשים שלו. עם Invistimo אפשר לבחור את הכלים שמתאימים לאופי האירוע.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {EVENTS.map((event, i) => (
              <motion.div
                key={event.href}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={event.href}
                  className="group block overflow-hidden rounded-[24px] border border-[#E7D3B0] bg-[#FFFDF8] shadow-[0_16px_36px_rgba(44,36,28,0.08)] transition hover:-translate-y-1 hover:border-[#C9A45C]"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={event.image}
                      alt={`הזמנה לדוגמה לאירוע ${event.title}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-black text-[#2C241C]">{event.title}</h3>
                    <p className="mt-2 text-[14px] leading-7 text-[#5C4A3A]">{event.body}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Pricing CTA */}
      <section
        dir="rtl"
        aria-labelledby="home-pricing"
        className="relative overflow-hidden bg-[#241C16] px-4 py-16 max-[360px]:px-3 sm:px-5 md:px-10 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(201,164,92,0.2),transparent_40%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Eyebrow light>בדיוק מה שמתאים לכם</Eyebrow>
          <h2
            id="home-pricing"
            className="mt-4 text-[32px] font-black leading-[1.15] text-[#F7F1E8] md:text-5xl"
          >
            האירוע שלכם מיוחד. גם החבילה שלכם יכולה להיות.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#C9BDAE]">
            יש מי שצריכים רק הזמנה דיגיטלית, ויש מי שרוצים לנהל גם את אישורי ההגעה, השיחות,
            סידורי ההושבה ויום האירוע. ב־Invistimo תוכלו לבחור את השירותים שמתאימים לכם.
          </p>
          <div className="mt-10 flex justify-center">
            <GoldCta href="/pricing" dark>
              לצפייה בחבילות
            </GoldCta>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section
        dir="rtl"
        aria-labelledby="home-faq"
        className="relative bg-[#FFFDF8] px-4 py-16 max-[360px]:px-3 sm:px-5 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-3xl">
          <Eyebrow>טוב לדעת לפני שמתחילים</Eyebrow>
          <h2
            id="home-faq"
            className="mt-4 text-[32px] font-black leading-[1.15] text-[#2C241C] md:text-4xl"
          >
            כל מה שרציתם לדעת לפני שמתחילים לתכנן
          </h2>
          <div className="mt-10 space-y-3">
            {HOME_FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-[22px] border border-[#E7D3B0] bg-[#F7F1E8]/80 px-5 py-4 open:bg-white"
              >
                <summary className="cursor-pointer list-none text-lg font-black text-[#2C241C] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-[#C9A45C] transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-8 text-[#5C4A3A]">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8">
            <SoftCta href="/faq">לכל השאלות והתשובות</SoftCta>
          </div>
        </div>
      </section>

      {/* 11. Final CTA */}
      <section
        dir="rtl"
        aria-labelledby="home-final"
        className="relative overflow-hidden bg-[#1C1612] px-4 py-20 max-[360px]:px-3 sm:px-5 md:px-10 md:py-32"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,164,92,0.22),transparent_45%),radial-gradient(circle_at_20%_100%,rgba(255,255,255,0.05),transparent_35%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2
            id="home-final"
            className="text-[34px] font-black leading-[1.15] text-[#F7F1E8] md:text-5xl"
          >
            אתם תתרגשו מהרגעים. אנחנו נעזור לכם לדאוג לכל השאר.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#C9BDAE]">
            ההזמנות, המוזמנים, אישורי ההגעה וההושבה — כל מה שצריך כדי להגיע לאירוע שלכם
            מסודרים, מוכנים ועם הרבה יותר מקום להתרגשות.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <GoldCta href="/try" dark>
              בואו נתחיל
            </GoldCta>
            <SoftCta href="/pricing" light>
              לצפייה בחבילות
            </SoftCta>
          </div>
        </div>
      </section>
    </>
  );
}
