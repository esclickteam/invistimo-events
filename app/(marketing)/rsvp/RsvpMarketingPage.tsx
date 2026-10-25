"use client";

import { Frank_Ruhl_Libre } from "next/font/google";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CHANNELS,
  DASHBOARD_POINTS,
  EVENT_CARDS,
  HOW_IT_WORKS,
  HERO_VIDEO,
  PACKAGE_CARDS,
  RSVP_FAQS,
  TIMELINE,
} from "./content";
import { CHANNEL_ICONS, HOW_ICONS } from "./components/RsvpIcons";
import DashboardDemo from "./components/DashboardDemo";
import JourneyDemo from "./components/JourneyDemo";
import MarketingVideo from "./components/MarketingVideo";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-rsvp-display",
});

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

function SectionEyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={`text-sm font-bold tracking-[0.16em] ${
        light ? "text-[#E8D1A5]" : "text-[#A77A38]"
      }`}
    >
      {children}
    </p>
  );
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 py-3.5 text-base font-black !text-white shadow-[0_18px_45px_rgba(58,43,34,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(58,43,34,0.36)]"
    >
      {children}
    </Link>
  );
}

function SecondaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCC7A6] bg-[#FBF6EE] px-8 py-3.5 text-base font-black !text-[#2C241C] shadow-[0_12px_30px_rgba(91,63,32,0.08)] transition hover:-translate-y-0.5 hover:bg-white"
    >
      {children}
    </Link>
  );
}

export default function RSVPPage() {
  return (
    <div
      dir="rtl"
      className={`${display.variable} -mt-[64px] min-h-screen overflow-x-hidden bg-[#FBF6EE] text-[#3F3025]`}
    >
      {/* ================= HERO ================= */}
      <section className="relative isolate px-5 pb-16 pt-[105px] md:px-8 md:pb-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#E9D4AF_0%,transparent_36%),radial-gradient(circle_at_top_right,#F5E8D3_0%,transparent_34%),linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_55%,#F3E8D7_100%)]" />
        <div className="absolute right-8 top-20 -z-10 h-52 w-52 rounded-full bg-[#D8B77C]/25 blur-3xl" />
        <div className="absolute bottom-10 left-6 -z-10 h-64 w-64 rounded-full bg-[#B59668]/18 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="text-center lg:text-right"
          >
            <p className="font-[family-name:var(--font-rsvp-display)] text-5xl font-bold tracking-tight text-[#A77A38] md:text-6xl">
              Invistimo
            </p>
            <h1 className="mt-5 font-[family-name:var(--font-rsvp-display)] text-3xl font-bold leading-[1.2] text-[#35281F] md:text-5xl">
              אישורי הגעה לאירוע, בלי לרדוף אחרי האורחים
            </h1>
            <p className="mt-5 text-lg font-semibold leading-8 text-[#5C4A3A] md:text-xl md:leading-9">
              אתם מתרגשים לקראת האירוע. אנחנו עוזרים לכם לדעת מי מגיע.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <PrimaryCta href="/pricing">בואו נתחיל</PrimaryCta>
              <SecondaryCta href="#rsvp-journey">לצפייה בתהליך</SecondaryCta>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.75 }}
            className="relative mx-auto w-full max-w-[min(280px,calc((100svh-12rem)*420/760))] sm:max-w-[min(300px,calc((100svh-12rem)*420/760))] lg:max-w-[min(320px,calc((100svh-11rem)*420/760))]"
          >
            <div className="absolute -inset-5 rounded-[42px] bg-[radial-gradient(circle_at_top,#E8D4AF,transparent_60%)] blur-2xl" />
            <div className="relative rounded-[34px] border border-white/80 bg-gradient-to-br from-[#F8EFE1] via-[#FFFDF9] to-[#E7D7BF] p-2.5 shadow-[0_35px_90px_rgba(58,39,20,0.2)]">
              <div className="overflow-hidden rounded-[26px] border border-[#221811]/10 bg-[#17120E]">
                <MarketingVideo
                  src={HERO_VIDEO.src}
                  poster={HERO_VIDEO.poster}
                  title={HERO_VIDEO.title}
                  eager
                  className="aspect-[420/760] w-full"
                />
              </div>
            </div>
          </motion.div>
        </div>

        <p className="mx-auto mt-12 max-w-3xl text-center text-base leading-8 text-[#6D5B4A] md:mt-16 md:text-lg md:leading-9">
          עם Invistimo שולחים לאורחים הודעות WhatsApp עם קישור אישי לאישור הגעה, עוקבים אחרי
          התשובות בזמן אמת ומרכזים את כל המידע במקום אחד. אפשר לשלב סבבי הודעות, שיחות טלפוניות,
          תזכורות, סידורי הושבה וניהול מוזמנים — כדי להגיע ליום האירוע הרבה יותר מסודרים.
        </p>
      </section>

      <JourneyDemo />

      {/* ================= HOW IT WORKS ================= */}
      <section className="relative px-5 py-20 md:px-8 md:py-28" aria-labelledby="how-heading">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#FFFDF8_0%,#FBF6EE_100%)]" />
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>איך עובדים אישורי הגעה ב־Invistimo?</SectionEyebrow>
            <h2
              id="how-heading"
              className="mt-4 font-[family-name:var(--font-rsvp-display)] text-3xl font-bold text-[#35281F] md:text-5xl"
            >
              {HOW_IT_WORKS.title}
            </h2>
            <p className="mt-5 text-base leading-8 text-[#6D5B4A] md:text-lg">{HOW_IT_WORKS.lede}</p>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HOW_IT_WORKS.cards.map((card, index) => {
              const Icon = HOW_ICONS[card.icon];
              return (
                <motion.li
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.05, duration: 0.45 }}
                  className="rounded-[28px] border border-[#E6D2AA] bg-white/90 p-6 shadow-[0_16px_40px_rgba(151,108,49,0.08)]"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#35281F] text-[#E8D1A5]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-[#35281F]">{card.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5C4A3A] md:text-base">{card.body}</p>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ================= CHANNELS ================= */}
      <section
        className="relative isolate px-5 py-20 md:px-8 md:py-28"
        aria-labelledby="channels-heading"
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#2F241C_0%,#3F3025_50%,#2A211A_100%)]" />
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow light>הודעות WhatsApp, תזכורות ושיחות</SectionEyebrow>
            <h2
              id="channels-heading"
              className="mt-4 font-[family-name:var(--font-rsvp-display)] text-3xl font-bold text-[#FBF6EE] md:text-5xl"
            >
              {CHANNELS.title}
            </h2>
            <p className="mt-5 text-base leading-8 text-[#D9CBB8] md:text-lg">{CHANNELS.lede}</p>
          </div>

          <ul className="mt-12 grid gap-5 md:grid-cols-3">
            {CHANNELS.cards.map((card) => {
              const Icon = CHANNEL_ICONS[card.icon];
              return (
                <li
                  key={card.title}
                  className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C7A56B]/20 text-[#E8D1A5]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-[#FBF6EE]">{card.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-[#D9CBB8] md:text-base">{card.body}</p>
                  <Link
                    href={card.href}
                    className="mt-5 inline-flex min-h-11 items-center font-bold text-[#E8D1A5] underline-offset-4 hover:underline"
                  >
                    לפרטים נוספים
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ================= DASHBOARD ================= */}
      <section className="relative px-5 py-20 md:px-8 md:py-28" aria-labelledby="dash-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionEyebrow>מה רואים במערכת?</SectionEyebrow>
            <h2
              id="dash-heading"
              className="mt-4 font-[family-name:var(--font-rsvp-display)] text-3xl font-bold text-[#35281F] md:text-5xl"
            >
              כל התשובות. תמונה אחת ברורה.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#6D5B4A] md:text-lg">
              במקום לנסות להבין מי ענה בכל הודעה, תוכלו לראות את מצב אישורי ההגעה במערכת אחת.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {DASHBOARD_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-[#E6D2AA] bg-white/90 px-4 py-3 text-sm font-semibold text-[#544437]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C7A56B] text-[11px] font-black text-white">
                    ✓
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PrimaryCta href="/pricing">למחשבון החבילות</PrimaryCta>
            </div>
          </div>
          <DashboardDemo />
        </div>
      </section>

      {/* ================= TIMELINE ================= */}
      <section
        className="relative isolate px-5 py-20 md:px-8 md:py-28"
        aria-labelledby="timing-heading"
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#F3E8D7_0%,#FBF6EE_45%,#FFFDF8_100%)]" />
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>מתי כדאי להתחיל?</SectionEyebrow>
            <h2
              id="timing-heading"
              className="mt-4 font-[family-name:var(--font-rsvp-display)] text-3xl font-bold text-[#35281F] md:text-5xl"
            >
              {TIMELINE.title}
            </h2>
            <p className="mt-5 text-base leading-8 text-[#6D5B4A] md:text-lg">{TIMELINE.lede}</p>
            <p className="mt-3 text-sm font-semibold text-[#8A6B45]">{TIMELINE.note}</p>
          </div>

          <ol className="relative mt-14 space-y-6">
            <div
              className="absolute right-[1.15rem] top-3 bottom-3 w-px bg-gradient-to-b from-[#C7A56B] via-[#E6D2AA] to-transparent md:right-1/2 md:translate-x-1/2"
              aria-hidden
            />
            {TIMELINE.steps.map((item, index) => (
              <li
                key={item.title}
                className={`relative grid gap-4 md:grid-cols-2 md:gap-10 ${
                  index % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="rounded-[28px] border border-[#E6D2AA] bg-white/95 p-6 shadow-[0_16px_40px_rgba(151,108,49,0.08)]">
                  <p className="text-sm font-bold text-[#A77A38]">{item.when}</p>
                  <h3 className="mt-2 text-xl font-black text-[#35281F]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#5C4A3A] md:text-base">{item.body}</p>
                  <Link
                    href={item.href}
                    className="mt-4 inline-flex min-h-11 items-center font-bold text-[#8A642E] underline-offset-4 hover:underline"
                  >
                    למידע נוסף
                  </Link>
                </div>
                <div className="flex items-center">
                  <div className="w-full rounded-[24px] border border-dashed border-[#DCC7A6] bg-[#FFF9F0] px-5 py-6 text-center">
                    <p className="text-xs font-bold tracking-wide text-[#A77A38]">המחשת הודעה</p>
                    <p className="mt-3 text-base font-semibold leading-7 text-[#514033]">{item.sample}</p>
                  </div>
                </div>
                <span className="absolute right-3 top-6 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#C7A56B] bg-[#FBF6EE] md:right-1/2 md:translate-x-1/2" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= EVENT TYPES ================= */}
      <section className="relative px-5 py-20 md:px-8 md:py-28" aria-labelledby="events-heading">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>אישורי הגעה שמתאימים לאירוע שלכם</SectionEyebrow>
            <h2
              id="events-heading"
              className="mt-4 font-[family-name:var(--font-rsvp-display)] text-3xl font-bold text-[#35281F] md:text-5xl"
            >
              לא רק לחתונות. לכל רגע שחשוב לכם.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#6D5B4A] md:text-lg">
              בין אם אתם מתכננים חתונה גדולה או אירוע משפחתי אינטימי, אישורי הגעה מסודרים עוזרים לכם
              להבין מי צפוי להגיע ולהיערך בהתאם.
            </p>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_CARDS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex h-full flex-col rounded-[28px] border border-[#E6D2AA] bg-white/90 p-6 shadow-[0_14px_35px_rgba(151,108,49,0.08)] transition hover:-translate-y-0.5 hover:border-[#C7A56B]"
                >
                  <h3 className="text-xl font-black text-[#35281F]">{item.label}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-[#5C4A3A] md:text-base">{item.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= PACKAGES ================= */}
      <section
        id="rsvp-packages"
        className="relative isolate scroll-mt-24 px-5 py-20 md:px-8 md:py-28"
        aria-labelledby="packages-heading"
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#2C211B_0%,#3A2B22_55%,#241C17_100%)]" />
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow light>חבילות אישורי הגעה</SectionEyebrow>
            <h2
              id="packages-heading"
              className="mt-4 font-[family-name:var(--font-rsvp-display)] text-3xl font-bold text-[#FBF6EE] md:text-5xl"
            >
              בוחרים את הדרך שמתאימה לאירוע שלכם
            </h2>
            <p className="mt-5 text-base leading-8 text-[#D9CBB8] md:text-lg">
              כל אירוע שונה, ולכן אפשר לבחור את אופן ניהול אישורי ההגעה בהתאם למספר המוזמנים ולשירותים
              הרצויים.
            </p>
          </div>

          <ul className="mt-12 grid gap-5 md:grid-cols-2">
            {PACKAGE_CARDS.map((pkg) => (
              <li
                key={pkg.id}
                className={`flex h-full flex-col rounded-[30px] border p-6 md:p-7 ${
                  pkg.featured
                    ? "border-[#C7A56B] bg-gradient-to-br from-[#C7A56B]/20 via-white/[0.07] to-transparent shadow-[0_24px_60px_rgba(199,165,107,0.18)]"
                    : "border-white/10 bg-white/[0.05]"
                }`}
              >
                {pkg.featured ? (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-[#C7A56B] px-3 py-1 text-xs font-extrabold text-[#2C211B]">
                    בחירה פופולרית
                  </span>
                ) : null}
                <h3 className="text-xl font-black text-[#FBF6EE] md:text-2xl">{pkg.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#D9CBB8] md:text-base">{pkg.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm leading-6 text-[#E8DCCB]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7A56B]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={pkg.href}
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#FBF6EE] px-5 text-sm font-black text-[#35281F] transition hover:bg-white"
                >
                  לצפייה במחשבון ולבחירה
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="relative px-5 py-20 md:px-8 md:py-28" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <SectionEyebrow>שאלות ותשובות</SectionEyebrow>
          <h2
            id="faq-heading"
            className="mt-4 font-[family-name:var(--font-rsvp-display)] text-3xl font-bold text-[#35281F] md:text-5xl"
          >
            כל מה שרציתם לדעת על אישורי הגעה
          </h2>
          <p className="mt-4 text-base leading-8 text-[#6D5B4A]">
            תשובות ברורות על אישורי הגעה לחתונה ולאירועים — לפי מה שהמערכת באמת מאפשרת.
          </p>
          <div className="mt-10 space-y-3">
            {RSVP_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-[24px] border border-[#E6D2AA] bg-white px-5 py-4 shadow-[0_10px_28px_rgba(151,108,49,0.06)]"
              >
                <summary className="cursor-pointer list-none">
                  <h3 className="text-base font-black text-[#35281F] md:text-lg">{faq.q}</h3>
                </summary>
                <p className="mt-3 text-sm leading-8 text-[#5C4A3A] md:text-base">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative isolate px-5 pb-24 pt-8 md:px-8 md:pb-32">
        <div className="mx-auto max-w-4xl rounded-[36px] border border-[#E3C990] bg-gradient-to-br from-[#FFF8E8] via-[#FFFDF7] to-[#F4E3C3] px-6 py-12 text-center shadow-[0_28px_80px_rgba(151,108,49,0.16)] md:px-12">
          <h2 className="font-[family-name:var(--font-rsvp-display)] text-3xl font-bold text-[#35281F] md:text-4xl">
            מוכנים לדעת מי מגיע — בלי לרדוף אחרי תשובות?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#6D5B4A]">
            בחרו חבילה במחשבון, או צפו שוב בתהליך מהודעת WhatsApp ועד אישור ההגעה.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta href="/pricing">בואו נתחיל</PrimaryCta>
            <SecondaryCta href="#rsvp-journey">לצפייה בתהליך</SecondaryCta>
          </div>
        </div>
      </section>
    </div>
  );
}
