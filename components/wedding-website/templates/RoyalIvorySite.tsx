"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import WeddingActionBar from "../shared/WeddingActionBar";
import { useWeddingRsvp } from "../shared/useWeddingInteractions";
import EnvelopeRsvp from "../illustrations/EnvelopeRsvp";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";
import {
  type BlockTone,
  SiteSection,
  CountdownBlock,
  DateRevealBlock,
  StoryBlock,
  CouplePhotosBlock,
  FullBleedPhoto,
  ScheduleBlock,
  LocationBlock,
  DressCodeBlock,
  TransportationBlock,
  AccommodationsBlock,
  RichGalleryGrid,
  GiftsBlock,
  FaqBlock,
  ContactPeopleBlock,
  FinalMomentBlock,
} from "../shared/FullLengthBlocks";

const ACCENT = "#B8956B";

const tone: BlockTone = {
  accent: ACCENT,
  muted: "#9A8570",
  surface: "#FFFFFF",
  border: ACCENT,
  fontDisplay: "Playfair Display",
  radius: "0",
  buttonClass: "rounded-full bg-[#B8956B] px-6 py-3 text-sm font-bold text-white",
  outlineButtonClass: "rounded-full border border-[#B8956B] px-6 py-3 text-sm font-bold text-[#B8956B]",
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
  const c = useWeddingContent();
  const rsvp = useWeddingRsvp();
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages,
  );
  const heroImg = c.heroImageUrl || template.heroImage;
  const [envelopeTouched, setEnvelopeTouched] = useState(false);
  const envelopeOpen = Boolean(rsvp.rsvp) || envelopeTouched || rsvp.sent;
  const initials = monogramInitials(c.coupleShort || "", c.coupleNames);

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-[#FDFBF7] text-[#3A2E22]"
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent={ACCENT}
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

      {/* 1 · Hero — monogram crest */}
      <section
        id="hero"
        className={`relative flex min-h-[100svh] flex-col items-center justify-center overflow-x-clip px-6 text-center ${embed ? "py-20" : "pt-16"}`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url(${heroImg})`,
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
          {c.coupleNames}
        </motion.h1>
        <Ornament />
        <p className="relative max-w-md text-base leading-relaxed text-[#9A8570]" style={{ fontFamily: "system-ui, sans-serif" }}>
          {c.heroSubtitle}
        </p>
        <p className="relative mt-4 text-lg text-[#B8956B]">
          {formatHebrewDate(c.weddingDate)}
          {c.weddingTime ? ` · ${c.weddingTime}` : ""}
        </p>
        <div className="relative mt-10 flex flex-wrap justify-center gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
          <a href="#rsvp" className="inline-flex rounded-full bg-[#B8956B] px-9 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(184,149,107,0.35)]">
            אישור הגעה
          </a>
          <a href="#transportation" className="inline-flex rounded-full border border-[#B8956B] bg-white/70 px-9 py-3.5 text-sm font-bold text-[#B8956B]">
            הזמנת הסעה
          </a>
        </div>
      </section>

      {/* 2 · Formal invitation card */}
      <SiteSection id="invitation" className="py-20">
        <div className="mx-auto max-w-xl px-6">
          <div className="border border-[#B8956B]/40 bg-white px-8 py-12 text-center shadow-[0_24px_70px_rgba(100,75,50,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#B8956B]" style={{ fontFamily: "system-ui, sans-serif" }}>
              הזמנה רשמית
            </p>
            <Ornament />
            <p className="text-lg leading-[2] text-[#9A8570]" style={{ fontFamily: "system-ui, sans-serif" }}>
              {c.invitationText || c.welcomeText || c.heroSubtitle}
            </p>
          </div>
        </div>
      </SiteSection>

      {/* 3 · Date reveal */}
      <DateRevealBlock tone={tone} className="bg-[#F7F2EA] py-20" />

      {/* 4 · Countdown */}
      <CountdownBlock tone={tone} variant="editorial" className="py-20" />

      {/* 5 · Schedule */}
      <ScheduleBlock tone={tone} className="bg-[#F7F2EA] py-20">
        <Ornament />
      </ScheduleBlock>

      {/* 6 · Dress code */}
      <DressCodeBlock tone={tone} className="py-20" />

      {/* 7 · Location */}
      <LocationBlock tone={tone} className="bg-[#F7F2EA] py-20">
        <MapPinPulse accent={ACCENT} />
        <Ornament />
      </LocationBlock>

      {/* 8 · Story */}
      <StoryBlock tone={tone} className="py-20" />

      {/* 9 · Couple photos */}
      <CouplePhotosBlock images={images} tone={tone} layout="framed" className="bg-[#F7F2EA] py-20" />

      {/* 10 · Visual break */}
      <FullBleedPhoto src={images[2] || heroImg} caption="באהבה ובשמחה — נתראה בחגיגה" />

      {/* 11 · Gallery */}
      <RichGalleryGrid images={images} tone={tone} title="רגעים" max={9} className="py-20" />

      {/* 12 · Accommodations */}
      <AccommodationsBlock tone={tone} className="bg-[#F7F2EA] py-20" />

      {/* 13 · Transportation */}
      <TransportationBlock tone={tone} className="py-20">
        <ShuttleRide accent={ACCENT} className="mb-8" />
        <Ornament />
      </TransportationBlock>

      {/* 14 · RSVP — envelope */}
      <SiteSection id="rsvp" className="bg-[#F7F2EA] py-20">
        <div className="mx-auto max-w-lg px-6">
          <h2 className="text-center text-4xl font-medium" style={{ fontFamily: tone.fontDisplay }}>
            אישור הגעה
          </h2>
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
      </SiteSection>

      {/* 15 · Gifts */}
      <GiftsBlock tone={tone} className="py-20" />

      {/* 16 · FAQ */}
      <FaqBlock tone={tone} className="bg-[#F7F2EA] py-20" />

      {/* 17 · Contact */}
      <ContactPeopleBlock tone={tone} className="py-20" />

      {/* 18 · Final moment */}
      <FinalMomentBlock tone={tone} image={images[4] || heroImg} />

      <footer id="footer" className="bg-[#3A2E22] px-6 py-12 text-center text-[#FDFBF7]">
        <p className="text-2xl font-medium">{c.coupleNames}</p>
        <Ornament />
        <p className="text-xs tracking-[0.25em] text-white/35">{formatHebrewDate(c.weddingDate)}</p>
      </footer>
    </div>
  );
}
