"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnswerFirst from "@/components/seo/AnswerFirst";
import {
  ctaOnDarkClass,
  ctaOnDarkSecondaryClass,
  ctaPrimaryClass,
  ctaSecondaryClass,
} from "@/components/marketing/brand";
import { INVITE_DESIGNS, PRODUCT_SHOTS, PRODUCT_VIDEOS } from "@/lib/seo/productVisuals";

function DemoCta({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.push("/try")} className={className}>
      {children}
    </button>
  );
}

const JOURNEY = [
  {
    n: "01",
    title: "הודעת WhatsApp",
    text: "האורח מקבל קישור אישי מתבנית ההודעה במערכת.",
    src: PRODUCT_SHOTS.whatsappRsvp,
    alt: "הדמיית הודעת WhatsApp עם קישור אישי",
  },
  {
    n: "02",
    title: "הזמנה מעוצבת",
    text: "נפתחת הזמנה אמיתית — לא מסך דשבורד.",
    src: INVITE_DESIGNS.wedding,
    alt: "הזמנה דיגיטלית מאיה ואיתי",
  },
  {
    n: "03",
    title: "אישור הגעה",
    text: "האורח מאשר, והתשובה נשמרת ברשימה.",
    src: PRODUCT_SHOTS.guestRsvpConfirm,
    alt: "מסך אישור הגעה אחרי שמירה",
  },
  {
    n: "04",
    title: "דשבורד מתעדכן",
    text: "אותו אורח, אותו אירוע — הסטטוס משתנה בזמן אמת.",
    src: PRODUCT_SHOTS.dashboardLive,
    alt: "דשבורד אחרי אישור אמיתי בדמו",
  },
] as const;

const MODULES = [
  {
    href: "/rsvp",
    title: "אישורי הגעה",
    text: "קישור אישי, סבבי וואטסאפ ומעקב סטטוסים.",
    src: PRODUCT_SHOTS.dashboardLive,
  },
  {
    href: "/invitations/chatuna",
    title: "הזמנות דיגיטליות",
    text: "עיצוב ההזמנה קודם — ואז מעבר לאישור.",
    src: INVITE_DESIGNS.wedding,
  },
  {
    href: "/wedding-website",
    title: "אתר חתונה אישי",
    text: "תבניות חיות עם סיפור, גלריה ו־RSVP.",
    src: PRODUCT_SHOTS.weddingEternal,
  },
  {
    href: "/seating-explained",
    title: "סידורי הושבה",
    text: "מפת שולחנות ושיבוץ לפי הרשימה.",
    src: PRODUCT_SHOTS.seatingLive,
  },
] as const;

const TEMPLATES = [
  { id: "eternal-gold", name: "Eternal Gold", src: PRODUCT_SHOTS.weddingEternal },
  { id: "midnight-velvet", name: "Midnight Velvet", src: PRODUCT_SHOTS.weddingMidnight },
  { id: "garden-bloom", name: "Garden Bloom", src: PRODUCT_SHOTS.weddingGarden },
  { id: "coastal-breeze", name: "Coastal Breeze", src: PRODUCT_SHOTS.weddingCoastal },
] as const;

export default function HomePageClient() {
  return (
    <main dir="rtl" className="overflow-x-hidden bg-[#F2F4F7] text-[#1A222D]">
      {/* ===== HERO — full-bleed invitation plane, brand-first, no phone ===== */}
      <section className="relative isolate min-h-[92svh] overflow-hidden bg-[#0B0E13] text-white">
        <img
          src={INVITE_DESIGNS.wedding}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center opacity-45"
        />
        <div
          className="absolute inset-0 bg-gradient-to-l from-[#0B0E13] via-[#0B0E13]/88 to-[#0B0E13]/35"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(15,118,110,0.28),transparent_45%)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:px-8 md:pb-20 md:pt-32">
          <p className="mkt-reveal font-display text-5xl font-medium tracking-[0.08em] text-white md:text-7xl lg:text-8xl">
            Invistimo
          </p>
          <h1 className="mkt-reveal-delay mt-6 max-w-2xl font-display text-3xl font-medium leading-[1.15] text-white md:text-5xl">
            אישורי הגעה, הזמנות ואתר חתונה — במערכת אחת
          </h1>
          <p className="mkt-reveal-delay-2 mt-5 max-w-xl text-base font-medium leading-8 text-white/80 md:text-lg">
            מהודעת WhatsApp ועד דשבורד חי — אותו אירוע, אותם אורחים, בלי גיליונות נפרדים.
          </p>
          <div className="mkt-reveal-delay-2 mt-8 flex flex-wrap gap-3">
            <DemoCta className={ctaOnDarkClass}>התנסות בדמו</DemoCta>
            <Link href="/pricing" className={ctaOnDarkSecondaryClass}>
              חבילות ומחירים
            </Link>
          </div>
        </div>
      </section>

      <AnswerFirst path="/" />

      {/* ===== PRODUCT STRIP — three contact points ===== */}
      <section className="border-b border-[#D5DBE3] bg-white px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F766E]">המוצר</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-medium leading-tight text-[#0B0E13] md:text-5xl">
            שלוש נקודות מגע. תהליך אחד.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#3D4754] md:text-lg">
            הודעה לאורח, הזמנה מעוצבת, ודשבורד שמציג את התשובה — בלי לערבב את שלושתם באותו מסך.
          </p>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {[
              {
                label: "WhatsApp",
                title: "הקישור האישי יוצא מהודעה",
                src: PRODUCT_SHOTS.whatsappRsvp,
                alt: "הודעת WhatsApp",
              },
              {
                label: "הזמנה",
                title: "האורח רואה עיצוב, לא טבלה",
                src: INVITE_DESIGNS.wedding,
                alt: "הזמנה מעוצבת",
              },
              {
                label: "דשבורד",
                title: "הסטטוס מתעדכן אחרי השמירה",
                src: PRODUCT_SHOTS.dashboardLive,
                alt: "דשבורד חי",
              },
            ].map((item, i) => (
              <motion.figure
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.08, duration: 0.55 }}
                className="overflow-hidden border border-[#D5DBE3] bg-[#F2F4F7]"
              >
                <div className="aspect-[4/5] overflow-hidden bg-[#0B0E13]">
                  <img src={item.src} alt={item.alt} className="h-full w-full object-cover object-top" />
                </div>
                <figcaption className="border-t border-[#D5DBE3] bg-white px-5 py-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0F766E]">{item.label}</p>
                  <p className="mt-2 font-display text-xl text-[#0B0E13]">{item.title}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GUEST JOURNEY — numbered editorial, not floating phones ===== */}
      <section className="bg-[#0B0E13] px-5 py-20 text-white md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#7DD3C8]">מסע האורח</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-medium md:text-5xl">
            מאיה ואיתי — דוגמה אחת מקצה לקצה
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            אותו אירוע בדיוני, אותם אורחים — מהודעה ועד עדכון בדשבורד. בלי אנימציית מספרים מזויפת.
          </p>

          <ol className="mt-14 space-y-10 md:space-y-0">
            {JOURNEY.map((step, index) => (
              <li
                key={step.n}
                className={`grid items-center gap-8 border-t border-white/10 py-10 md:grid-cols-2 ${
                  index % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <p className="font-display text-5xl text-[#0F766E] md:text-6xl">{step.n}</p>
                  <h3 className="mt-3 font-display text-2xl md:text-3xl">{step.title}</h3>
                  <p className="mt-3 max-w-md text-base leading-8 text-white/70">{step.text}</p>
                </div>
                <div className="overflow-hidden border border-white/15 bg-[#141A22]">
                  <img
                    src={step.src}
                    alt={step.alt}
                    className="aspect-[16/10] h-full w-full object-cover object-top"
                  />
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6">
            <DemoCta className={ctaOnDarkClass}>לפתוח את הדמו של מאיה ואיתי</DemoCta>
          </div>
        </div>
      </section>

      {/* ===== DASHBOARD — wide browser plane ===== */}
      <section className="bg-[#F2F4F7] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F766E]">שליטה</p>
              <h2 className="mt-3 font-display text-3xl font-medium text-[#0B0E13] md:text-5xl">
                דשבורד חי — לא מצגת
              </h2>
              <p className="mt-4 text-base leading-8 text-[#3D4754] md:text-lg">
                רואים מי אישר, מי פתוח ומי קיבל תזכורת. הנתונים מגיעים מפעולות אורח אמיתיות בסביבת הדמו.
              </p>
              <Link href="/rsvp" className={`${ctaPrimaryClass} mt-8`}>
                לאישורי הגעה
              </Link>
            </div>
            <div className="overflow-hidden border border-[#D5DBE3] bg-white shadow-[0_40px_80px_rgba(11,14,19,0.08)]">
              <div className="flex items-center gap-2 border-b border-[#D5DBE3] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D5DBE3]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#D5DBE3]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#0F766E]/50" />
                <span className="mr-auto text-xs font-semibold text-[#6B7583]">invistimo.com/try</span>
              </div>
              <video
                className="aspect-[16/10] w-full object-cover object-top"
                autoPlay
                muted
                loop
                playsInline
                poster={PRODUCT_SHOTS.dashboardLive}
              >
                <source src={PRODUCT_VIDEOS.dashboardLive} type="video/webm" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ===== INVITE GALLERY ===== */}
      <section className="bg-white px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F766E]">הזמנות</p>
              <h2 className="mt-3 font-display text-3xl font-medium text-[#0B0E13] md:text-5xl">
                עיצובים לפי סוג אירוע
              </h2>
            </div>
            <Link href="/invitations/chatuna" className={ctaSecondaryClass}>
              לכל ההזמנות
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {[
              { src: INVITE_DESIGNS.wedding, name: "חתונה" },
              { src: INVITE_DESIGNS.saveTheDate, name: "Save the Date" },
              { src: INVITE_DESIGNS.henna, name: "חינה" },
              { src: INVITE_DESIGNS.barMitzvah, name: "בר מצווה" },
            ].map((item) => (
              <figure key={item.name} className="group overflow-hidden border border-[#D5DBE3]">
                <img
                  src={item.src}
                  alt={item.name}
                  className="aspect-[3/4] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                />
                <figcaption className="border-t border-[#D5DBE3] bg-[#F2F4F7] px-3 py-3 text-sm font-bold text-[#1A222D]">
                  {item.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MODULES — asymmetric service grid ===== */}
      <section className="border-y border-[#D5DBE3] bg-[#F2F4F7] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-xl font-display text-3xl font-medium text-[#0B0E13] md:text-5xl">
            מודולים לפי הצורך של האירוע
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {MODULES.map((mod, i) => (
              <Link
                key={mod.href}
                href={mod.href}
                className={`group relative overflow-hidden border border-[#D5DBE3] bg-white ${
                  i === 0 ? "md:row-span-2 min-h-[420px]" : "min-h-[220px]"
                }`}
              >
                <img
                  src={mod.src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-30 transition duration-700 group-hover:scale-105 group-hover:opacity-40"
                />
                <div className="relative z-10 flex h-full flex-col justify-end p-6 md:p-8">
                  <h3 className="font-display text-2xl text-[#0B0E13] md:text-3xl">{mod.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-7 text-[#3D4754] md:text-base">{mod.text}</p>
                  <span className="mt-4 text-sm font-bold text-[#0F766E]">לפרטים ←</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WEDDING WEBSITES ===== */}
      <section className="bg-[#0B0E13] px-5 py-20 text-white md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#7DD3C8]">אתר חתונה</p>
              <h2 className="mt-3 font-display text-3xl font-medium md:text-5xl">תבניות חיות — לא תמונת תצוגה</h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-white/70">
                כל תבנית נפתחת כאתר מלא. זה לא קישור אישי לאורח — זה אתר האירוע.
              </p>
            </div>
            <Link href="/wedding-website" className={ctaOnDarkClass}>
              לכל התבניות
            </Link>
          </div>
          <div className="mt-12 flex gap-4 overflow-x-auto pb-4">
            {TEMPLATES.map((t) => (
              <Link
                key={t.id}
                href={`/wedding-website/${t.id}`}
                className="w-[280px] shrink-0 overflow-hidden border border-white/15 bg-[#141A22] md:w-[320px]"
              >
                <img src={t.src} alt={t.name} className="aspect-[16/11] w-full object-cover object-top" />
                <div className="px-4 py-4">
                  <p className="font-display text-lg">{t.name}</p>
                  <p className="mt-1 text-sm text-white/55">פתיחת דוגמה חיה</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SEATING SPLIT ===== */}
      <section className="grid lg:grid-cols-2">
        <div className="flex flex-col justify-center bg-white px-5 py-16 md:px-12 md:py-24">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F766E]">הושבה</p>
          <h2 className="mt-3 font-display text-3xl font-medium text-[#0B0E13] md:text-4xl">
            מפת שולחנות מתוך הרשימה
          </h2>
          <p className="mt-4 max-w-md text-base leading-8 text-[#3D4754]">
            משבצים אורחים לפי סטטוס אישור, ושולחים מספר שולחן כשהתוספת פעילה בחבילה.
          </p>
          <Link href="/seating-explained" className={`${ctaPrimaryClass} mt-8 self-start`}>
            לסידורי הושבה
          </Link>
        </div>
        <div className="min-h-[320px] overflow-hidden bg-[#141A22] lg:min-h-[480px]">
          <img
            src={PRODUCT_SHOTS.seatingLive}
            alt="מפת הושבה באירוע הדוגמה"
            className="h-full w-full object-cover object-top"
          />
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="bg-[#0F766E] px-5 py-20 text-white md:px-8 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl font-medium md:text-5xl">מוכנים לראות את המערכת?</h2>
            <p className="mt-3 max-w-xl text-base leading-8 text-white/85">
              הדמו של מאיה ואיתי פתוח בלי התחייבות. המחיר נקבע לפי רשומות וחבילה במחשבון.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <DemoCta className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#0B0E13] px-8 py-3 text-base font-bold text-white transition hover:bg-black">
              התנסות בדמו
            </DemoCta>
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/40 px-8 py-3 text-base font-bold text-white transition hover:bg-white/10"
            >
              יצירת קשר
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
