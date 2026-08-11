"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate, VIDEOS } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides, useWeddingSite, isSectionEnabled } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage, SafeVideo } from "../shared/SafeMedia";
import WeddingActionBar from "../shared/WeddingActionBar";
import { getFlippedCountdownUnits } from "../shared/CountdownUnits";
import {
  useCountdownTimer,
  useFaqAccordion,
  useWeddingRsvp,
} from "../shared/useWeddingInteractions";
import ShuttleRide from "../illustrations/ShuttleRide";
import MapPinPulse from "../illustrations/MapPinPulse";
import WaveMotion from "../illustrations/WaveMotion";


const BLUE = "#3D8BBA";

const fade = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" as const },
  transition: { duration: 0.65, ease: "easeOut" as const },
};

function Wave({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`overflow-x-clip leading-none ${flip ? "rotate-180" : ""}`} aria-hidden>
      <svg viewBox="0 0 1440 64" className="block w-full" preserveAspectRatio="none">
        <path
          d="M0,32 C240,64 480,0 720,32 C960,64 1200,0 1440,32 L1440,64 L0,64 Z"
          fill="#E8F4FC"
        />
      </svg>
    </div>
  );
}

function Section({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { sections } = useWeddingSite();
  if (id !== "hero" && !isSectionEnabled(sections, id)) return null;
  return (
    <motion.section id={id} {...fade} className={`scroll-mt-24 overflow-x-clip ${className}`}>
      {children}
    </motion.section>
  );
}

export default function CoastalBreezeSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const time = useCountdownTimer(DEMO.weddingDate, DEMO.weddingTime);
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(0);
  const images = sanitizeGallery(DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages, template.galleryImages);

  return (
    <div className="wedding-website-root overflow-x-clip " data-style-preset={themeOverrides.stylePreset || ""} style={{ backgroundColor: "var(--ww-bg)", color: "var(--ww-text)", fontFamily: "var(--ww-font-body)", ["--ww-heading-scale" as any]: themeOverrides.headingScale || 1 }} dir="rtl">
      {!embed && (
        <WeddingActionBar
          accent="#3D8BBA"
          text="#FFFFFF"
          surface="rgba(240,248,255,0.94)"
          border="rgba(61,139,186,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#3D8BBA]/35 bg-white/90 px-4 py-2 text-xs font-bold text-[#3D8BBA] shadow-lg"
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — full-bleed beach video */}
      <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <SafeVideo
          src={DEMO.videoUrl || VIDEOS.beach}
          autoPlay
          muted
          loop
          playsInline
          poster={DEMO.heroImageUrl || template.heroImage}
          className="absolute inset-0 h-full w-full object-cover"
          preload="metadata"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A3A4A]/85 via-[#1A3A4A]/25 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-24 text-center text-white">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-['Montserrat'] text-[11px] font-light uppercase tracking-[0.5em] text-white/80"
          >
            Coastal Breeze
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 font-['Montserrat'] text-[clamp(2.4rem,8vw,5rem)] font-light tracking-wide"
          >
            {DEMO.coupleNames}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mx-auto mt-5 max-w-lg font-light text-white/85"
          >
            {DEMO.heroSubtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            <a href="#rsvp" className="rounded-full bg-[#3D8BBA] px-8 py-3.5 text-sm font-semibold text-white">
              אישור הגעה
            </a>
            <a href="#transportation" className="rounded-full border border-white/50 bg-white/10 px-8 py-3.5 text-sm font-semibold backdrop-blur-sm">
              הזמנת הסעה
            </a>
          </motion.div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10">
          <WaveMotion color="#9AD7F2" />
        </div>
      </section>

      <Section id="countdown" className="bg-[#E8F4FC] pb-16 pt-8">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-['Montserrat'] text-3xl font-light tracking-wide">הספירה לאחור</h2>
          <p className="mt-2 text-sm text-[#5A8499]">{formatHebrewDate(DEMO.weddingDate)}</p>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {getFlippedCountdownUnits(time).map(({ label, value }) => (
              <div key={String(label)} className="rounded-2xl bg-white/80 px-4 py-6 shadow-[0_12px_40px_rgba(26,58,74,0.06)]">
                <p className="font-['Montserrat'] text-4xl font-light text-[#3D8BBA]">{value}</p>
                <p className="mt-2 text-xs font-semibold tracking-widest text-[#5A8499]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Wave flip />

      <Section id="event-details" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Montserrat'] text-3xl font-light">פרטי האירוע</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["תאריך", formatHebrewDate(DEMO.weddingDate)],
              ["שעה", DEMO.weddingTime || "19:30"],
              ["מקום", DEMO.venueName || "האולם"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[#3D8BBA]/15 bg-white px-6 py-8 text-center shadow-[0_12px_40px_rgba(26,58,74,0.05)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#3D8BBA]">{label}</p>
                <p className="mt-3 font-['Montserrat'] text-lg font-light">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Wave />

      <Section id="location" className="bg-[#E8F4FC] py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <MapPinPulse accent={BLUE} />
          <h2 className="mt-3 font-['Montserrat'] text-3xl font-light">{DEMO.venueName || "מיקום"}</h2>
          <p className="mt-2 text-[#5A8499]">{DEMO.venueAddress}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {DEMO.wazeUrl ? (
              <a href={DEMO.wazeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#3D8BBA] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(61,139,186,0.3)]">
                ניווט ב-Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a href={DEMO.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#3D8BBA] px-7 py-3.5 text-sm font-semibold text-[#3D8BBA]">
                Google Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div className="mt-8 overflow-hidden rounded-2xl border border-[#3D8BBA]/20">
              <iframe
                title="map"
                className="aspect-[16/9] w-full border-0"
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&z=14&output=embed`}
              />
            </div>
          ) : null}
        </div>
      </Section>

      <Wave flip />

      <Section id="transportation" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-['Montserrat'] text-3xl font-light">הסעות לחוף</h2>
          <p className="mt-2 text-center text-sm text-[#5A8499]">נגיע יחד — בקצב של גל</p>
          <ShuttleRide accent={BLUE} className="my-10" />
          <div className="grid gap-4 md:grid-cols-3">
            {(DEMO.transportation.length
              ? DEMO.transportation
              : [{ title: "הגעה", description: "פרטי הגעה יתעדכנו לקראת האירוע" }]
            ).map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#3D8BBA]/15 bg-white p-5">
                <h3 className="font-['Montserrat'] text-lg font-medium text-[#3D8BBA]">{item.title}</h3>
                <p className="mt-2 text-sm text-[#5A8499]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Wave />

      <Section id="schedule" className="bg-[#E8F4FC] py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-['Montserrat'] text-3xl font-light">לוח זמנים</h2>
          <ol className="mt-10 space-y-3">
            {(DEMO.schedule.length
              ? DEMO.schedule
              : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }]
            ).map((item) => (
              <li
                key={`${item.time}-${item.title}`}
                className="grid grid-cols-[80px_1fr] gap-4 rounded-2xl bg-white px-5 py-4"
              >
                <span className="font-['Montserrat'] text-lg font-light text-[#3D8BBA]">{item.time}</span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm text-[#5A8499]">{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Wave flip />

      <Section id="gallery" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-['Montserrat'] text-3xl font-light">גלריה</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {images.slice(0, 6).map((src, i) => (
              <motion.figure
                key={src}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl"
              >
                <SafeImage src={src} alt="" className="aspect-[4/3] w-full object-cover" />
              </motion.figure>
            ))}
          </div>
        </div>
      </Section>

      <Wave />

      <Section id="rsvp" className="bg-[#E8F4FC] py-20">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center font-['Montserrat'] text-3xl font-light">אישור הגעה</h2>
          {rsvp.sent ? (
            <p className="mt-8 text-center text-lg text-[#3D8BBA]">תודה! קיבלנו את אישור ההגעה.</p>
          ) : (
            <div className="mt-8 space-y-4 rounded-2xl bg-white p-7 shadow-[0_16px_48px_rgba(26,58,74,0.07)]">
              {rsvp.guestName ? (
                <p className="text-center text-sm text-[#5A8499]">שלום {rsvp.guestName}</p>
              ) : null}
              <div className="flex gap-3">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => rsvp.setRsvp(v)}
                    className={`flex-1 rounded-full py-3 text-sm font-semibold ${
                      rsvp.rsvp === v ? "bg-[#3D8BBA] text-white" : "border border-[#3D8BBA]/35 text-[#5A8499]"
                    }`}
                  >
                    {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                  </button>
                ))}
              </div>
              {rsvp.rsvp === "yes" ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-[#5A8499]">מספר אורחים</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={rsvp.count}
                    onChange={(e) => rsvp.setCount(Number(e.target.value))}
                    className="w-20 rounded-full border border-[#3D8BBA]/35 px-3 py-2 text-center"
                  />
                </div>
              ) : null}
              {rsvp.error ? <p className="text-center text-sm font-bold text-red-600">{rsvp.error}</p> : null}
              <button
                type="button"
                disabled={!rsvp.rsvp || rsvp.saving}
                onClick={() => void rsvp.submit()}
                className="w-full rounded-full bg-[#3D8BBA] py-3.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {rsvp.saving ? "שולח..." : "שליחה"}
              </button>
            </div>
          )}
        </div>
      </Section>

      <Wave flip />

      <Section id="faq" className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Montserrat'] text-3xl font-light">שאלות נפוצות</h2>
          <div className="mt-8 space-y-3">
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className="w-full rounded-2xl border border-[#3D8BBA]/15 bg-white px-5 py-4 text-right"
              >
                <p className="font-semibold">{item.question}</p>
                {faq.open === i ? <p className="mt-2 text-sm text-[#5A8499]">{item.answer}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Wave />

      <Section id="gifts" className="bg-[#E8F4FC] py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-['Montserrat'] text-3xl font-light">מתנות</h2>
          <p className="mt-6 text-[#5A8499]">{DEMO.giftsNote || "הנוכחות שלכם היא המתנה הגדולה מכולן."}</p>
          {DEMO.giftLinks?.creditUrl ? (
            <a
              href={DEMO.giftLinks.creditUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full border border-[#3D8BBA] px-7 py-3 text-sm font-semibold text-[#3D8BBA]"
            >
              מתנה דיגיטלית
            </a>
          ) : null}
        </div>
      </Section>

      <footer id="footer" className="bg-[#1A3A4A] px-6 py-16 text-center text-white">
        <p className="font-['Montserrat'] text-2xl font-light tracking-wide">{DEMO.coupleNames}</p>
        <p className="mt-4 text-sm text-white/70">{DEMO.footerNote || "נתראה על החוף"}</p>
        <p className="mt-6 text-xs tracking-[0.3em] text-white/35">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
