"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides, useWeddingSite, isSectionEnabled } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage, SafeVideo } from "../shared/SafeMedia";
import WeddingActionBar from "../shared/WeddingActionBar";
import { getFlippedCountdownUnits } from "../shared/CountdownUnits";
import { useFaqAccordion, useWeddingRsvp } from "../shared/useWeddingInteractions";
import EnvelopeRsvp from "../illustrations/EnvelopeRsvp";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";

const ACCENT = "#B8956B";

const fade = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, margin: "-70px" as const },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

function Ornament() {
  return (
    <div className="mx-auto my-5 flex max-w-[180px] items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#B8956B]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#B8956B]" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#B8956B]" />
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

function monogramInitials(short: string, names: string) {
  const fromShort = short
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("");
  if (fromShort.length >= 2) return fromShort.slice(0, 2).toUpperCase();
  const parts = names.split(/[&ו]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
  return (names.slice(0, 2) || "AB").toUpperCase();
}

export default function RoyalIvorySite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(0);
  const images = sanitizeGallery(DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages, template.galleryImages);
  const [envelopeTouched, setEnvelopeTouched] = useState(false);
  const envelopeOpen = Boolean(rsvp.rsvp) || envelopeTouched || rsvp.sent;
  const initials = monogramInitials(DEMO.coupleShort || "", DEMO.coupleNames);

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-[#FDFBF7] text-[#3A2E22]"
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent="#B8956B"
          text="#FFFFFF"
          surface="rgba(253,251,247,0.94)"
          border="rgba(184,149,107,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#B8956B]/40 bg-white/90 px-4 py-2 text-xs font-bold shadow-lg"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — monogram crest, letter invitation */}
      <section
        id="hero"
        className={`relative flex min-h-[100svh] flex-col items-center justify-center overflow-x-clip px-6 text-center ${embed ? "py-20" : "pt-16"}`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url(${DEMO.heroImageUrl || template.heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-[#B8956B] bg-white shadow-[0_20px_60px_rgba(184,149,107,0.18)] md:h-44 md:w-44"
        >
          <span className="absolute inset-2 rounded-full border border-[#B8956B]/40" />
          <span className="text-4xl tracking-[0.15em] text-[#B8956B] md:text-5xl">{initials}</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="relative mt-10 text-[clamp(2.4rem,7vw,4.5rem)] font-medium leading-tight"
        >
          {DEMO.coupleNames}
        </motion.h1>
        <Ornament />
        <p className="relative max-w-md text-base leading-relaxed text-[#9A8570]" style={{ fontFamily: "system-ui, sans-serif" }}>
          {DEMO.heroSubtitle}
        </p>
        <p className="relative mt-4 text-lg text-[#B8956B]">
          {formatHebrewDate(DEMO.weddingDate)}
          {DEMO.weddingTime ? ` · ${DEMO.weddingTime}` : ""}
        </p>
        <div className="relative mt-10 flex flex-wrap justify-center gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
          <a
            href="#rsvp"
            className="inline-flex rounded-full bg-[#B8956B] px-9 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(184,149,107,0.35)]"
          >
            אישור הגעה
          </a>
          <a
            href="#transportation"
            className="inline-flex rounded-full border border-[#B8956B] bg-white/70 px-9 py-3.5 text-sm font-bold text-[#B8956B]"
          >
            הזמנת הסעה
          </a>
        </div>
      </section>

      <Section id="invitation" className="py-20">
        <div className="mx-auto max-w-xl px-6">
          <div className="border border-[#B8956B]/40 bg-white px-8 py-12 text-center shadow-[0_24px_70px_rgba(100,75,50,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#B8956B]" style={{ fontFamily: "system-ui, sans-serif" }}>
              הזמנה
            </p>
            <Ornament />
            <p className="text-lg leading-[2] text-[#9A8570]">
              {DEMO.invitationText || DEMO.heroSubtitle}
            </p>
          </div>
        </div>
      </Section>

      <Section id="schedule" className="bg-[#F7F2EA] py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-4xl font-medium">לוח זמנים</h2>
          <Ornament />
          <ol className="mt-2 space-y-4" style={{ fontFamily: "system-ui, sans-serif" }}>
            {(DEMO.schedule.length
              ? DEMO.schedule
              : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }]
            ).map((item) => (
              <li
                key={`${item.time}-${item.title}`}
                className="flex items-start gap-5 border-b border-[#B8956B]/25 pb-4"
              >
                <span className="min-w-[64px] text-lg text-[#B8956B]">{item.time}</span>
                <div>
                  <p className="font-semibold text-[#3A2E22]">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-[#9A8570]">{item.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id="our-story" className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-4xl font-medium">הסיפור שלנו</h2>
          <Ornament />
          <div className="space-y-5 text-base leading-relaxed text-[#9A8570]" style={{ fontFamily: "system-ui, sans-serif" }}>
            {(DEMO.storyParagraphs.length
              ? DEMO.storyParagraphs
              : ["אנחנו שמחים לחלוק איתכם את היום המיוחד שלנו."]
            ).map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section id="gallery" className="bg-[#F7F2EA] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-4xl font-medium">רגעים</h2>
          <Ornament />
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
            {images.slice(0, 6).map((src, i) => (
              <motion.figure
                key={src}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="border-[3px] border-[#B8956B]/35 bg-white p-2 shadow-[0_16px_40px_rgba(100,75,50,0.08)]"
              >
                <div className="border border-[#B8956B]/25 p-1">
                  <SafeImage src={src} alt="" className="aspect-[4/5] w-full object-cover" />
                </div>
              </motion.figure>
            ))}
          </div>
        </div>
      </Section>

      <Section id="location" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <MapPinPulse accent={ACCENT} />
          <h2 className="mt-2 text-4xl font-medium">{DEMO.venueName || "מיקום"}</h2>
          <p className="mt-2 text-[#9A8570]" style={{ fontFamily: "system-ui, sans-serif" }}>
            {DEMO.venueAddress}
          </p>
          <Ornament />
          <div className="mb-6 flex flex-wrap justify-center gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            {DEMO.wazeUrl ? (
              <a href={DEMO.wazeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#B8956B] px-6 py-3 text-sm font-bold text-white">
                Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a href={DEMO.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#B8956B] px-6 py-3 text-sm font-bold text-[#B8956B]">
                Google Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div className="overflow-hidden border-2 border-[#B8956B]/35">
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

      <Section id="transportation" className="bg-[#F7F2EA] py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-4xl font-medium">הגעה והסעות</h2>
          <Ornament />
          <ShuttleRide accent={ACCENT} className="mb-8" />
          <div className="grid gap-4 md:grid-cols-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            {(DEMO.transportation.length
              ? DEMO.transportation
              : [{ title: "הגעה", description: "פרטי הגעה יתעדכנו לקראת האירוע" }]
            ).map((item) => (
              <div key={item.title} className="border border-[#B8956B]/30 bg-white p-5">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-[#9A8570]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="rsvp" className="py-20">
        <div className="mx-auto max-w-lg px-6">
          <h2 className="text-center text-4xl font-medium">אישור הגעה</h2>
          <Ornament />
          <div
            onFocus={() => setEnvelopeTouched(true)}
            onClick={() => setEnvelopeTouched(true)}
            onKeyDown={() => setEnvelopeTouched(true)}
            role="presentation"
          >
            <EnvelopeRsvp accent={ACCENT} open={envelopeOpen}>
              <div style={{ fontFamily: "system-ui, sans-serif" }}>
                {rsvp.sent ? (
                  <p className="py-6 text-center text-lg text-[#B8956B]">תודה! קיבלנו את אישור ההגעה.</p>
                ) : (
                  <div className="space-y-4">
                    {rsvp.guestName ? (
                      <p className="text-center text-sm text-[#9A8570]">שלום {rsvp.guestName}</p>
                    ) : null}
                    <div className="flex gap-3">
                      {(["yes", "no"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setEnvelopeTouched(true);
                            rsvp.setRsvp(v);
                          }}
                          className={`flex-1 rounded-full py-3 text-sm font-bold ${
                            rsvp.rsvp === v
                              ? "bg-[#B8956B] text-white"
                              : "border border-[#B8956B]/40 text-[#9A8570]"
                          }`}
                        >
                          {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                        </button>
                      ))}
                    </div>
                    {rsvp.rsvp === "yes" ? (
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-sm text-[#9A8570]">מספר אורחים</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={rsvp.count}
                          onChange={(e) => rsvp.setCount(Number(e.target.value))}
                          className="w-20 rounded-full border border-[#B8956B]/40 px-3 py-2 text-center"
                        />
                      </div>
                    ) : null}
                    {rsvp.error ? (
                      <p className="text-center text-sm font-bold text-red-600">{rsvp.error}</p>
                    ) : null}
                    <button
                      type="button"
                      disabled={!rsvp.rsvp || rsvp.saving}
                      onClick={() => void rsvp.submit()}
                      className="w-full rounded-full bg-[#B8956B] py-3.5 text-sm font-bold text-white disabled:opacity-40"
                    >
                      {rsvp.saving ? "שולח..." : "שליחה"}
                    </button>
                  </div>
                )}
              </div>
            </EnvelopeRsvp>
          </div>
        </div>
      </Section>

      <Section id="faq" className="bg-[#F7F2EA] py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-4xl font-medium">שאלות נפוצות</h2>
          <Ornament />
          <div className="space-y-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className="w-full border border-[#B8956B]/30 bg-white px-5 py-4 text-right"
              >
                <p className="font-semibold">{item.question}</p>
                {faq.open === i ? <p className="mt-2 text-sm text-[#9A8570]">{item.answer}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section id="gifts" className="py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-4xl font-medium">מתנות</h2>
          <Ornament />
          <p className="text-[#9A8570]" style={{ fontFamily: "system-ui, sans-serif" }}>
            {DEMO.giftsNote || "הנוכחות שלכם היא המתנה הגדולה מכולן."}
          </p>
          {DEMO.giftLinks?.creditUrl ? (
            <a
              href={DEMO.giftLinks.creditUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full border border-[#B8956B] px-7 py-3 text-sm font-bold text-[#B8956B]"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              מתנה דיגיטלית
            </a>
          ) : null}
        </div>
      </Section>

      <footer id="footer" className="bg-[#3A2E22] px-6 py-16 text-center text-[#FDFBF7]">
        <p className="text-3xl font-medium">{DEMO.coupleNames}</p>
        <Ornament />
        <p className="text-[#B8956B]" style={{ fontFamily: "system-ui, sans-serif" }}>
          {DEMO.footerNote || "נתראה בחגיגה"}
        </p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/35">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
