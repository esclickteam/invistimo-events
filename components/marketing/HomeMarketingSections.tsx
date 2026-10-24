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
  MessageCircle,
  MessagesSquare,
  Phone,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
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
          ? "inline-flex min-h-12 items-center justify-center rounded-full bg-[#C9A45C] px-8 py-3.5 text-sm font-black text-[#1C1612] transition hover:bg-[#D4B06A]"
          : "inline-flex min-h-12 items-center justify-center rounded-full bg-[#2C241C] px-8 py-3.5 text-sm font-black text-[#F7F1E8] shadow-[0_16px_36px_rgba(44,36,28,0.18)] transition hover:bg-[#3A3028]"
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
          ? "inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-8 py-3.5 text-sm font-black text-[#F7F1E8] transition hover:bg-white/10"
          : "inline-flex min-h-12 items-center justify-center rounded-full border border-[#2C241C]/22 bg-[#FFFDF8]/80 px-8 py-3.5 text-sm font-black text-[#2C241C] transition hover:bg-white"
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
    icon: Gift,
  },
  {
    href: "/rsvp/save-the-date",
    title: "Save the Date",
    body: "מודיעים לכולם שיש תאריך, ונותנים להם סיבה טובה לשמור אותו ביומן.",
    icon: CalendarHeart,
  },
  {
    href: "/rsvp",
    title: "אישורי הגעה",
    body: "יודעים מי מגיע, מי עדיין מתלבט וממי עוד מחכים לתשובה.",
    icon: CheckCircle2,
  },
  {
    href: "/seating-explained",
    title: "סידורי הושבה",
    body: "מסדרים את השולחנות, משבצים אורחים ורואים את התמונה המלאה לפני האירוע.",
    icon: Armchair,
  },
  {
    href: "/wedding-website",
    title: "אתר חתונה",
    body: "מקום אחד לכל הפרטים החשובים, עם עיצוב שמתאים לאירוע שלכם.",
    icon: Heart,
  },
  {
    href: "/rsvp/guest-list",
    title: "ניהול מוזמנים",
    body: "רשימה אחת מסודרת, עם פרטי האורחים, סטטוסים ועדכונים.",
    icon: Users,
  },
  {
    href: "/rsvp/reminders",
    title: "תזכורות והודעות",
    body: "מזכירים לאורחים את הפרטים החשובים ושומרים על קשר גם אחרי האירוע.",
    icon: Send,
  },
  {
    href: "/event-management",
    title: "ניהול יום האירוע",
    body: "עוקבים אחר הגעת האורחים ומנהלים את המתרחש בזמן אמת, בהתאם לשירותים שנבחרו.",
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
    href: "/for/henna",
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

const JOURNEY = [
  {
    when: "3–6 חודשים לפני",
    title: "Save the Date — שומרים את התאריך",
    body: "האירוע עוד רחוק, אבל ההתרגשות כבר כאן. שולחים הודעה שמאפשרת לאורחים לשריין את היום ביומן, עוד לפני שההזמנה הרשמית מוכנה.",
    message: [
      "Save The Date",
      "מיה ואלון",
      "",
      "אנחנו מתרגשים להזמין אתכם לשריין את התאריך",
      "24.06.2027",
      "",
      "פרטים נוספים יישלחו בקרוב 🤍",
    ],
    tone: "cream" as const,
  },
  {
    when: "חודש עד חודש וחצי לפני",
    title: "ההזמנה — משתפים את הרגע המיוחד",
    body: "זה הזמן לשלוח את ההזמנה המעוצבת עם פרטי האירוע. בשלב הזה אין צורך לבקש אישור הגעה — המטרה היא להזמין, לשתף ולתת לאורחים זמן להיערך.",
    message: [
      "מיה ואלון מתרגשים להזמין אתכם לחגוג איתם!",
      "24.06.2027",
      "אולמי אלכסנדר",
      "מחכים לשמוח יחד איתכם.",
    ],
    tone: "gold" as const,
  },
  {
    when: "שבועיים עד שבועיים וחצי לפני",
    title: "אישורי הגעה — מקבלים תשובות בזמן הנכון",
    body: "כשהאירוע מתקרב, קל יותר לאורחים לדעת אם יוכלו להגיע. זה הזמן לשלוח את הקישור האישי, לקבל תשובות ולרכז את הנתונים לקראת ההושבה.",
    message: [
      "החתונה של מיה ואלון מתקרבת!",
      "נשמח לדעת אם תגיעו לחגוג איתנו ❤️",
    ],
    tone: "espresso" as const,
    showRsvp: true,
  },
] as const;

export default function HomeMarketingSections() {
  return (
    <>
      {/* 2. Intro */}
      <section
        dir="rtl"
        aria-labelledby="home-intro"
        className="relative overflow-hidden bg-[#F7F1E8] px-5 py-20 md:px-10 md:py-28"
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
        className="relative overflow-hidden bg-[#1C1612] px-5 py-20 md:px-10 md:py-28"
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
                    לפרטים ←
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
        className="relative overflow-hidden bg-[#F4F0E8] px-5 py-20 md:px-10 md:py-28"
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
              <GoldCta href="/rsvp/save-the-date">לגלות את Save the Date</GoldCta>
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
        className="relative overflow-hidden bg-[#FFFDF8] px-5 py-20 md:px-10 md:py-28"
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

          <ol className="relative mt-14 space-y-8">
            <div
              className="pointer-events-none absolute bottom-8 top-8 right-[1.35rem] w-px bg-gradient-to-b from-[#C9A45C] via-[#E0D4C2] to-[#C9A45C] md:right-1/2 md:translate-x-1/2"
              aria-hidden
            />
            {JOURNEY.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`relative grid gap-6 md:grid-cols-2 md:items-center ${
                  index % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="rounded-[28px] border border-[#E7D3B0] bg-[#F7F1E8] p-6 shadow-[0_20px_44px_rgba(44,36,28,0.07)] md:p-8">
                  <span className="inline-flex rounded-full border border-[#C9A45C]/40 bg-white/70 px-4 py-1.5 text-xs font-black tracking-[0.12em] text-[#8B642B]">
                    שלב {index + 1} · {step.when}
                  </span>
                  <h3 className="mt-4 text-2xl font-black text-[#2C241C]">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">{step.body}</p>
                </div>
                <div className="relative">
                  <span className="absolute -right-1 top-8 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#C9A45C] bg-[#FFFDF8] text-xs font-black text-[#8B642B] md:left-1/2 md:right-auto md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2">
                    {index + 1}
                  </span>
                  <div
                    className={`rounded-[28px] p-5 shadow-[0_24px_50px_rgba(44,36,28,0.14)] ${
                      step.tone === "espresso"
                        ? "bg-[#1C1612] text-[#F7F1E8]"
                        : step.tone === "gold"
                          ? "bg-[#2C241C] text-[#F7F1E8]"
                          : "bg-[#ECE5DD] text-[#111B21]"
                    }`}
                  >
                    <div
                      className={`rounded-2xl p-4 text-[14px] leading-7 ${
                        step.tone === "cream" ? "bg-[#DCF8C6]" : "bg-white/10"
                      }`}
                    >
                      {step.message.map((line, li) =>
                        line ? (
                          <p key={li} className={li === 0 ? "font-black" : ""}>
                            {line}
                          </p>
                        ) : (
                          <br key={li} />
                        ),
                      )}
                      {"showRsvp" in step && step.showRsvp ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {["מגיע/ה", "לא מגיע/ה", "עדיין לא בטוח/ה"].map((label) => (
                            <span
                              key={label}
                              className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. RSVP channels */}
      <section
        dir="rtl"
        aria-labelledby="home-rsvp"
        className="relative bg-[#F7F1E8] px-5 py-20 md:px-10 md:py-28"
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
            {[
              {
                href: "/rsvp/whatsapp",
                title: "WhatsApp",
                body: "הודעה אישית עם קישור לאישור הגעה, בדרך שנוחה ומוכרת לאורחים.",
                icon: MessageCircle,
              },
              {
                href: "/rsvp/sms",
                title: "SMS",
                body: "תזכורות והודעות חשובות שמגיעות ישירות לטלפון.",
                icon: MessagesSquare,
              },
              {
                href: "/rsvp/calls",
                title: "שיחות",
                body: "שיחות מוקלטות, אנושיות או משולבות, בהתאם לחבילה שנבחרה, כדי להגיע גם לאורחים שעדיין לא השיבו.",
                icon: Phone,
              },
            ].map((channel) => (
              <Link
                key={channel.href}
                href={channel.href}
                className="rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6 shadow-[0_18px_40px_rgba(44,36,28,0.06)] transition hover:-translate-y-1 hover:border-[#C9A45C]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#128C7E]">
                  <channel.icon size={22} />
                </span>
                <h3 className="mt-5 text-xl font-black text-[#2C241C]">{channel.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#5C4A3A]">{channel.body}</p>
              </Link>
            ))}
          </div>
          <div className="mt-10">
            <GoldCta href="/rsvp">לגלות את אישורי ההגעה</GoldCta>
          </div>
        </div>
      </section>

      {/* 7. Seating */}
      <section
        dir="rtl"
        aria-labelledby="home-seating"
        className="relative overflow-hidden bg-[#1C1612] px-5 py-20 md:px-10 md:py-28"
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
                לגלות את סידורי ההושבה
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
        className="relative bg-[#F4F0E8] px-5 py-20 md:px-10 md:py-28"
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
        className="relative overflow-hidden bg-[#241C16] px-5 py-20 md:px-10 md:py-28"
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
              לצפייה בחבילות ובמחירים
            </GoldCta>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section
        dir="rtl"
        aria-labelledby="home-faq"
        className="relative bg-[#FFFDF8] px-5 py-20 md:px-10 md:py-28"
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
        className="relative overflow-hidden bg-[#1C1612] px-5 py-24 md:px-10 md:py-32"
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
