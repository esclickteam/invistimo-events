"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides, useWeddingSite, isSectionEnabled } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage } from "../shared/SafeMedia";
import WeddingActionBar from "../shared/WeddingActionBar";
import { getFlippedCountdownUnits } from "../shared/CountdownUnits";
import { useFaqAccordion, useWeddingRsvp } from "../shared/useWeddingInteractions";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";
import GlassShimmer from "../illustrations/GlassShimmer";

const ACCENT = "#7C9CFF";

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" as const },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

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

const glass =
  "rounded-3xl border border-white/15 bg-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl";

export default function ModernGlassSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(0);
  const images = sanitizeGallery(DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages, template.galleryImages);
  const heroImg = DEMO.heroImageUrl || template.heroImage;

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-[#0A0E17] text-[#F2F5FF]"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent="#7C9CFF"
          text="#0A0E17"
          surface="rgba(10,14,23,0.94)"
          border="rgba(124,156,255,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#7C9CFF]/40 bg-[#0A0E17]/90 px-4 py-2 text-xs font-bold text-[#F2F5FF] shadow-lg"
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — asymmetric glass bento */}
      <section
        id="hero"
        className={`relative overflow-x-clip px-4 md:px-8 ${embed ? "py-10" : "pb-10 pt-10"}`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(124,156,255,0.35), transparent 55%), radial-gradient(ellipse at 90% 40%, rgba(124,156,255,0.15), transparent 45%)",
          }}
        />
        <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] max-w-6xl grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className={`${glass} col-span-2 flex flex-col justify-end p-6 md:row-span-2 md:p-8`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#7C9CFF]">
              Save the Date
            </p>
            <h1 className="mt-4 text-[clamp(2.4rem,6vw,4.2rem)] font-bold leading-[1.05] tracking-tight">
              {DEMO.coupleNames}
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#8B97B8]">{DEMO.heroSubtitle}</p>
            <p className="mt-3 text-sm font-semibold text-[#7C9CFF]">
              {formatHebrewDate(DEMO.weddingDate)}
              {DEMO.weddingTime ? ` · ${DEMO.weddingTime}` : ""}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#rsvp"
                className="inline-flex w-fit rounded-full bg-[#7C9CFF] px-7 py-3 text-sm font-bold text-[#0A0E17]"
              >
                אישור הגעה
              </a>
              <a
                href="#transportation"
                className="inline-flex w-fit rounded-full border border-[#7C9CFF]/50 px-7 py-3 text-sm font-bold text-[#7C9CFF]"
              >
                הזמנת הסעה
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className={`${glass} relative col-span-2 overflow-hidden md:col-span-2`}
          >
            <SafeImage src={heroImg} alt="" className="h-full min-h-[160px] w-full object-cover md:min-h-[220px]" />
            <GlassShimmer />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
            className={`${glass} relative col-span-1 overflow-hidden`}
          >
            <SafeImage
              src={heroImg}
              alt=""
              className="h-full min-h-[140px] w-full object-cover"
            />
            <GlassShimmer />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className={`${glass} col-span-1 flex flex-col justify-center p-5`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#7C9CFF]">Venue</p>
            <p className="mt-2 text-lg font-bold leading-snug">{DEMO.venueName || "מיקום"}</p>
            <a href="#location" className="mt-4 text-xs font-bold text-[#7C9CFF]">
              לניווט ←
            </a>
          </motion.div>
        </div>
      </section>

      <Section id="event-details" className="py-16">
        <div className="mx-auto grid max-w-5xl gap-4 px-6 md:grid-cols-3">
          {[
            ["תאריך", formatHebrewDate(DEMO.weddingDate)],
            ["שעה", DEMO.weddingTime || "—"],
            ["מקום", DEMO.venueName || "—"],
          ].map(([label, value], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`${glass} p-6`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#7C9CFF]">{label}</p>
              <p className="mt-3 text-xl font-bold leading-snug">{value}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section id="gallery" className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">גלריה</h2>
          <p className="mt-2 text-center text-sm text-[#8B97B8]">פסיפס עריכתי</p>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
            {images.slice(0, 6).map((src, i) => (
              <motion.figure
                key={`${src}-${i}`}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                <SafeImage
                  src={src}
                  alt=""
                  className="aspect-[4/5] w-full object-cover"
                />
              </motion.figure>
            ))}
          </div>
        </div>
      </Section>

      <Section id="schedule" className="py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">לוח זמנים</h2>
          <ol className="mt-10 space-y-3">
            {(DEMO.schedule.length
              ? DEMO.schedule
              : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }]
            ).map((item, i) => (
              <motion.li
                key={`${item.time}-${item.title}`}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`${glass} grid grid-cols-[80px_1fr] gap-4 px-5 py-4`}
              >
                <span className="text-sm font-bold text-[#7C9CFF]">{item.time}</span>
                <div>
                  <p className="font-bold">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-[#8B97B8]">{item.description}</p>
                  ) : null}
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id="location" className="py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <MapPinPulse accent={ACCENT} />
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            {DEMO.venueName || "מיקום"}
          </h2>
          <p className="mt-2 text-[#8B97B8]">{DEMO.venueAddress}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {DEMO.wazeUrl ? (
              <a href={DEMO.wazeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#7C9CFF] px-6 py-3 text-sm font-bold text-[#0A0E17]">
                Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a href={DEMO.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#7C9CFF] px-6 py-3 text-sm font-bold text-[#7C9CFF]">
                Google Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div className={`mt-8 overflow-hidden ${glass}`}>
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

      <Section id="transportation" className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">הגעה והסעות</h2>
          <ShuttleRide accent={ACCENT} className="my-8" />
          <div className="grid gap-4 md:grid-cols-3">
            {(DEMO.transportation.length
              ? DEMO.transportation
              : [{ title: "הגעה", description: "פרטי הגעה יתעדכנו לקראת האירוע" }]
            ).map((item) => (
              <div key={item.title} className={`${glass} p-5`}>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-[#8B97B8]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="rsvp" className="py-16">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">אישור הגעה</h2>
          <div className={`${glass} mt-8 p-7`}>
            {rsvp.sent ? (
              <p className="text-center text-lg text-[#7C9CFF]">תודה! קיבלנו את אישור ההגעה.</p>
            ) : (
              <div className="space-y-4">
                {rsvp.guestName ? (
                  <p className="text-center text-sm text-[#8B97B8]">שלום {rsvp.guestName}</p>
                ) : null}
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => rsvp.setRsvp(v)}
                      className={`flex-1 rounded-full py-3 text-sm font-bold ${
                        rsvp.rsvp === v
                          ? "bg-[#7C9CFF] text-[#0A0E17]"
                          : "border border-white/20 text-[#8B97B8]"
                      }`}
                    >
                      {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                    </button>
                  ))}
                </div>
                {rsvp.rsvp === "yes" ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm text-[#8B97B8]">מספר אורחים</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rsvp.count}
                      onChange={(e) => rsvp.setCount(Number(e.target.value))}
                      className="w-20 rounded-full border border-white/20 bg-transparent px-3 py-2 text-center"
                    />
                  </div>
                ) : null}
                {rsvp.error ? (
                  <p className="text-center text-sm font-bold text-red-300">{rsvp.error}</p>
                ) : null}
                <button
                  type="button"
                  disabled={!rsvp.rsvp || rsvp.saving}
                  onClick={() => void rsvp.submit()}
                  className="w-full rounded-full bg-[#7C9CFF] py-3.5 text-sm font-bold text-[#0A0E17] disabled:opacity-40"
                >
                  {rsvp.saving ? "שולח..." : "שליחה"}
                </button>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section id="faq" className="py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">שאלות נפוצות</h2>
          <div className="mt-8 space-y-3">
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className={`${glass} w-full px-5 py-4 text-right`}
              >
                <p className="font-bold">{item.question}</p>
                {faq.open === i ? <p className="mt-2 text-sm text-[#8B97B8]">{item.answer}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <footer id="footer" className="border-t border-white/10 px-6 py-16 text-center">
        <p className="text-2xl font-bold tracking-tight">{DEMO.coupleNames}</p>
        <p className="mt-3 text-[#7C9CFF]">{DEMO.footerNote || "נתראה בחגיגה"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/30">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
