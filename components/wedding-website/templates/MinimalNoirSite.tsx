"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides, useWeddingSite, isSectionEnabled } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage, SafeVideo } from "../shared/SafeMedia";
import FilmStripGallery from "../illustrations/FilmStripGallery";
import WeddingSmartNav from "../shared/WeddingSmartNav";
import { useFaqAccordion, useWeddingRsvp } from "../shared/useWeddingInteractions";

const NAV = {
  bg: "rgba(255,255,255,0.96)",
  text: "#111111",
  muted: "#666666",
  accent: "#111111",
  border: "rgba(0,0,0,0.12)",
  fontDisplay: "'Montserrat', sans-serif",
};

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" as const },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

function Rule({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-black ${className}`} />;
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

function splitNames(names: string) {
  if (names.includes("&")) {
    const [a, b] = names.split("&").map((s) => s.trim());
    return [a || names, b || ""];
  }
  if (names.includes(" ו")) {
    const [a, b] = names.split(" ו").map((s) => s.trim());
    return [a || names, b || ""];
  }
  const parts = names.trim().split(/\s+/);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(" ")];
  return [names, ""];
}

export default function MinimalNoirSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(null);
  const images = sanitizeGallery(DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages, template.galleryImages);
  const { scrollYProgress } = useScroll();
  const lineWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const [nameA, nameB] = splitNames(DEMO.coupleNames);

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-white text-[#111] selection:bg-black selection:text-white"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {!embed && (
        <motion.div
          style={{ width: lineWidth }}
          className="fixed left-0 top-0 z-[60] h-px bg-black"
        />
      )}
      {!embed && (
        <WeddingSmartNav theme={NAV} hideDemoLink={hideDemoBadge} mode="fixed" />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed bottom-4 left-4 z-[55] border border-black bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em]"
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — typography only, split names */}
      <section
        id="hero"
        className={`relative flex min-h-[100svh] flex-col justify-center overflow-x-clip px-6 md:px-12 lg:px-16 ${embed ? "py-16" : "pt-20"}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-neutral-500">
          Save the Date
        </p>
        <div className="mt-8 grid gap-2 md:grid-cols-2 md:gap-8">
          <motion.h1
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-[clamp(3.2rem,12vw,9rem)] font-black leading-[0.85] tracking-[-0.04em]"
          >
            {nameA}
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-[clamp(3.2rem,12vw,9rem)] font-black leading-[0.85] tracking-[-0.04em] md:self-end md:text-left"
          >
            {nameB ? (DEMO.coupleNames.includes("&") ? `& ${nameB}` : `ו${nameB}`) : ""}
          </motion.h1>
        </div>
        <Rule className="my-8 max-w-md" />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-md text-sm leading-relaxed text-neutral-600"
        >
          {DEMO.heroSubtitle}
        </motion.p>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.3em]">
          {formatHebrewDate(DEMO.weddingDate)}
          {DEMO.weddingTime ? ` — ${DEMO.weddingTime}` : ""}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <a href="#rsvp" className="bg-black px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
            אישור הגעה
          </a>
          <a href="#event-details" className="border border-black px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em]">
            פרטים
          </a>
        </div>
      </section>

      <Section id="event-details" className="border-t border-black py-16">
        <div className="mx-auto grid max-w-5xl gap-0 px-6 md:grid-cols-3">
          {[
            ["תאריך", formatHebrewDate(DEMO.weddingDate)],
            ["שעה", DEMO.weddingTime || "—"],
            ["מקום", DEMO.venueName || "—"],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={`py-6 md:px-8 ${i > 0 ? "border-t border-black md:border-t-0 md:border-r" : ""}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-500">{label}</p>
              <p className="mt-3 text-xl font-bold leading-snug">{value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="schedule" className="border-t border-black py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.4em]">לוח זמנים</h2>
          <Rule className="mt-4 mb-10" />
          <ol className="space-y-0">
            {(DEMO.schedule.length
              ? DEMO.schedule
              : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }]
            ).map((item) => (
              <li
                key={`${item.time}-${item.title}`}
                className="grid grid-cols-[72px_1fr] gap-4 border-b border-black/20 py-5"
              >
                <span className="text-sm font-bold tabular-nums">{item.time}</span>
                <div>
                  <p className="font-bold">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id="location" className="border-t border-black py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-xs font-bold uppercase tracking-[0.4em]">מיקום</h2>
          <Rule className="mx-auto mt-4 mb-8 max-w-[120px]" />
          <p className="text-3xl font-black tracking-tight">{DEMO.venueName || "מיקום"}</p>
          <p className="mt-2 text-sm text-neutral-500">{DEMO.venueAddress}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {DEMO.wazeUrl ? (
              <a href={DEMO.wazeUrl} target="_blank" rel="noreferrer" className="bg-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white">
                Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a href={DEMO.mapsUrl} target="_blank" rel="noreferrer" className="border border-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em]">
                Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div className="mt-8 overflow-hidden border border-black">
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

      <Section id="rsvp" className="border-t border-black bg-black py-20 text-white">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.4em]">אישור הגעה</h2>
          <Rule className="mx-auto mt-4 mb-10 max-w-[80px] bg-white" />
          {rsvp.sent ? (
            <p className="text-center text-lg">תודה. קיבלנו את האישור.</p>
          ) : (
            <div className="space-y-4">
              {rsvp.guestName ? (
                <p className="text-center text-sm text-white/60">שלום {rsvp.guestName}</p>
              ) : null}
              <div className="flex gap-3">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => rsvp.setRsvp(v)}
                    className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-[0.15em] ${
                      rsvp.rsvp === v ? "bg-white text-black" : "border border-white/40 text-white"
                    }`}
                  >
                    {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                  </button>
                ))}
              </div>
              {rsvp.rsvp === "yes" ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/60">אורחים</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={rsvp.count}
                    onChange={(e) => rsvp.setCount(Number(e.target.value))}
                    className="w-20 border border-white/40 bg-transparent px-3 py-2 text-center"
                  />
                </div>
              ) : null}
              {rsvp.error ? <p className="text-center text-sm text-red-300">{rsvp.error}</p> : null}
              <button
                type="button"
                disabled={!rsvp.rsvp || rsvp.saving}
                onClick={() => void rsvp.submit()}
                className="w-full bg-white py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-black disabled:opacity-40"
              >
                {rsvp.saving ? "שולח..." : "שליחה"}
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section id="gallery" className="border-t border-black py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.4em]">גלריה</h2>
          <Rule className="mx-auto mt-4 mb-10 max-w-[80px]" />
        </div>
        <FilmStripGallery images={images.slice(0, 6)} />
      </Section>

      <Section id="faq" className="border-t border-black py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.4em]">שאלות</h2>
          <Rule className="mx-auto mt-4 mb-10 max-w-[80px]" />
          <div className="space-y-0">
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className="w-full border-b border-black/20 py-5 text-right"
              >
                <p className="font-bold">{item.question}</p>
                {faq.open === i ? (
                  <p className="mt-2 text-sm text-neutral-500">{item.answer}</p>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <footer id="footer" className="border-t border-black px-6 py-16 text-center">
        <p className="text-2xl font-black tracking-tight">{DEMO.coupleNames}</p>
        <Rule className="mx-auto my-6 max-w-[60px]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-500">
          {DEMO.footerNote || "נתראה"}
        </p>
        <p className="mt-4 text-[10px] tracking-[0.25em] text-neutral-400">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
