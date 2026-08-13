"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent } from "../shared/WeddingSiteContext";
import { EditableText, useResolvedTone } from "../editor/EditablePrimitives";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage } from "../shared/SafeMedia";
import WeddingActionBar from "../shared/WeddingActionBar";
import { useWeddingRsvp } from "../shared/useWeddingInteractions";
import EnvelopeRsvp from "../illustrations/EnvelopeRsvp";
import MapPinPulse from "../illustrations/MapPinPulse";
import GuestIdentifyRsvp from "../shared/GuestIdentifyRsvp";
import {
  type BlockTone,
  SiteSection,
  CountdownBlock,
  DateRevealBlock,
  StoryBlock,
  CouplePhotosBlock,
  ScheduleBlock,
  LocationBlock,
  DressCodeBlock,
  TransportationBlock,
  AccommodationsBlock,
  QuoteBlock,
  GiftsBlock,
  FaqBlock,
  ContactPeopleBlock,
  FinalMomentBlock,
} from "../shared/FullLengthBlocks";

const BURGUNDY = "#4A1C2F";
const IVORY = "#F7F1E6";
const GOLD = "#C4A962";
const MUTED = "#7A5C66";

const baseTone: BlockTone = {
  accent: BURGUNDY,
  muted: MUTED,
  surface: "#FFFFFF",
  border: BURGUNDY,
  fontDisplay: "Playfair Display",
  radius: "0",
  buttonClass: "rounded-none bg-[#4A1C2F] px-6 py-3 text-sm font-bold text-[#F7F1E6]",
  outlineButtonClass:
    "rounded-none border border-[#4A1C2F] px-6 py-3 text-sm font-bold text-[#4A1C2F]",
};

function Ornament() {
  return (
    <div className="mx-auto my-5 flex max-w-[200px] items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#C4A962]/70" />
      <span className="text-[10px] text-[#C4A962]">✦</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C4A962]/70" />
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

function TransportLineIllustration() {
  return (
    <svg viewBox="0 0 280 48" className="mx-auto mb-6 h-12 w-full max-w-xs opacity-70" aria-hidden>
      <path
        d="M8 32 H272 M40 32 V18 M240 32 V18 M56 18 H224"
        fill="none"
        stroke={BURGUNDY}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="40" cy="32" r="5" fill="none" stroke={GOLD} strokeWidth="1" />
      <circle cx="240" cy="32" r="5" fill="none" stroke={GOLD} strokeWidth="1" />
      <rect x="72" y="22" width="136" height="10" rx="1" fill="none" stroke={BURGUNDY} strokeWidth="1" />
    </svg>
  );
}

export default function RoyalIvorySite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  const tone = useResolvedTone(baseTone);
  const rsvp = useWeddingRsvp();
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages,
  );
  const heroImg = c.heroImageUrl || template.heroImage;
  const [envelopeTouched, setEnvelopeTouched] = useState(false);
  const envelopeOpen = Boolean(rsvp.rsvp) || envelopeTouched || rsvp.sent;
  const initials = monogramInitials(c.coupleShort || "", c.coupleNames);
  const salonImages = images.slice(0, 5);

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-[#F7F1E6] text-[#4A1C2F]"
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent={BURGUNDY}
          text="#F7F1E6"
          surface="rgba(247,241,230,0.94)"
          border="rgba(74,28,47,0.25)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-none border border-[#4A1C2F]/30 bg-[#F7F1E6]/95 px-4 py-2 text-xs font-bold shadow-lg"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          ← תבניות
        </Link>
      )}

      {/* 1 · Hero — split stationery + burgundy crest panel */}
      <section
        id="hero"
        className={`relative grid min-h-[100svh] overflow-x-clip md:grid-cols-2 ${embed ? "" : "pt-14"}`}
      >
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9 }}
          className="relative flex flex-col items-center justify-center bg-[#4A1C2F] px-8 py-16 text-[#F7F1E6] md:py-0"
        >
          <div className="absolute inset-6 border border-[#C4A962]/25" />
          <div className="absolute inset-10 border border-[#C4A962]/15" />
          <div className="relative flex h-40 w-40 items-center justify-center border border-[#C4A962]/50 bg-[#3A1526] shadow-[0_24px_60px_rgba(0,0,0,0.35)] md:h-48 md:w-48">
            <span className="absolute inset-3 border border-[#C4A962]/30" />
            <span className="text-5xl tracking-[0.2em] text-[#C4A962] md:text-6xl">{initials}</span>
          </div>
          <p
            className="relative mt-8 text-[10px] font-bold uppercase tracking-[0.45em] text-[#C4A962]/80"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Royal Ivory
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="flex flex-col justify-center px-8 py-16 text-center md:px-14 md:text-right"
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#7A5C66]"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            הזמנה לחגיגה
          </p>
          <h1 className="mt-6 text-[clamp(2.2rem,6vw,4rem)] font-medium leading-tight"><EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText></h1>
          <Ornament />
          <p className="max-w-md text-base leading-relaxed text-[#7A5C66]" style={{ fontFamily: "system-ui, sans-serif" }}>
            <EditableText field="heroSubtitle" as="span" multiline>{c.heroSubtitle}</EditableText>
          </p>
          <p className="mt-5 text-lg text-[#4A1C2F]">
            {formatHebrewDate(c.weddingDate)}
            {c.weddingTime ? ` · ${c.weddingTime}` : ""}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3 md:justify-start" style={{ fontFamily: "system-ui, sans-serif" }}>
            <a
              href="#rsvp"
              className="inline-flex bg-[#4A1C2F] px-9 py-3.5 text-sm font-bold text-[#F7F1E6] shadow-[0_12px_32px_rgba(74,28,47,0.25)]"
            >
              אישור הגעה
            </a>
            <a
              href="#transportation"
              className="inline-flex border border-[#4A1C2F]/40 bg-white/60 px-9 py-3.5 text-sm font-bold text-[#4A1C2F]"
            >
              הזמנת הסעה
            </a>
          </div>
        </motion.div>
      </section>

      {/* 2 · Formal invitation card */}
      <SiteSection id="invitation" className="py-20">
        <div className="mx-auto max-w-xl px-6">
          <div className="border border-[#4A1C2F]/25 bg-white px-10 py-14 text-center shadow-[0_20px_60px_rgba(74,28,47,0.08)]">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#C4A962]"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              הזמנה רשמית
            </p>
            <Ornament />
            <p className="text-lg leading-[2.1] text-[#7A5C66]" style={{ fontFamily: "system-ui, sans-serif" }}>
              {c.invitationText || c.welcomeText || c.heroSubtitle}
            </p>
            <div className="mx-auto mt-8 h-px w-16 bg-[#C4A962]/50" />
          </div>
        </div>
      </SiteSection>

      {/* 3 · Date reveal */}
      <DateRevealBlock tone={tone} className="border-y border-[#4A1C2F]/10 bg-white py-20" />

      {/* 4 · Countdown */}
      <CountdownBlock tone={tone} variant="editorial" className="py-20" />

      {/* 5 · Schedule */}
      <ScheduleBlock tone={tone} className="border-t border-[#4A1C2F]/10 bg-white py-20">
        <Ornament />
      </ScheduleBlock>

      {/* 6 · Dress code */}
      <DressCodeBlock tone={tone} className="py-20" />

      {/* 7 · Story */}
      <StoryBlock tone={tone} className="border-y border-[#4A1C2F]/10 bg-white py-20" />

      {/* 8 · Couple photos — framed portraits */}
      <CouplePhotosBlock images={images} tone={tone} layout="framed" className="py-20" />

      {/* 9 · Salon wall gallery — single elegant row */}
      <SiteSection id="gallery" className="border-y border-[#4A1C2F]/10 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-4xl font-medium" style={{ fontFamily: tone.fontDisplay }}>
            קיר הגלריה
          </h2>
          <p className="mt-2 text-center text-sm text-[#7A5C66]" style={{ fontFamily: "system-ui, sans-serif" }}>
            מסגרות סלון — שורה אחת אלגנטית
          </p>
          <Ornament />
          <div className="mt-10 flex flex-wrap items-end justify-center gap-4 md:flex-nowrap md:gap-5">
            {salonImages.map((src, i) => (
              <motion.figure
                key={`${src}-${i}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="w-[42%] shrink-0 border border-[#4A1C2F]/20 bg-[#F7F1E6] p-2 shadow-[0_8px_28px_rgba(74,28,47,0.08)] md:w-[18%]"
                style={{ marginBottom: i % 2 === 0 ? "0" : "12px" }}
              >
                <div className="border border-[#C4A962]/30 bg-white p-1.5">
                  <SafeImage src={src} alt="" className="aspect-[3/4] w-full object-cover" />
                </div>
                <figcaption
                  className="mt-2 text-center text-[10px] tracking-[0.2em] text-[#7A5C66]"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </SiteSection>

      {/* 10 · Location */}
      <LocationBlock tone={tone} className="py-20">
        <MapPinPulse accent={BURGUNDY} />
        <Ornament />
      </LocationBlock>

      {/* 11 · Quote */}
      <QuoteBlock tone={tone} className="border-y border-[#4A1C2F]/10 bg-[#F7F1E6] py-16" />

      {/* 12 · Transportation — refined cards only */}
      <TransportationBlock tone={tone} className="bg-white py-20">
        <TransportLineIllustration />
        <Ornament />
      </TransportationBlock>

      {/* 13 · RSVP — envelope */}
      <SiteSection id="rsvp" className="py-20">
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
            <div className="mb-6 space-y-4 border border-[#4A1C2F]/15 bg-[#F7F1E6] p-6">
              <GuestIdentifyRsvp
                accent={BURGUNDY}
                identified={rsvp.identified}
                onBind={(token, meta) => {
                  setEnvelopeTouched(true);
                  rsvp.bindToken?.(token, meta);
                }}
              />
            </div>
            {rsvp.identified ? (
              <EnvelopeRsvp accent={BURGUNDY} open={envelopeOpen || rsvp.identified}>
                <div style={{ fontFamily: "system-ui, sans-serif" }}>
                  {rsvp.sent ? (
                    <p className="py-6 text-center text-lg text-[#4A1C2F]">תודה! קיבלנו את אישור ההגעה.</p>
                  ) : (
                    <div className="space-y-4">
                      {rsvp.guestName ? (
                        <p className="text-center text-sm text-[#7A5C66]">שלום {rsvp.guestName}</p>
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
                            className={`flex-1 py-3 text-sm font-bold ${
                              rsvp.rsvp === v
                                ? "bg-[#4A1C2F] text-[#F7F1E6]"
                                : "border border-[#4A1C2F]/30 text-[#7A5C66]"
                            }`}
                          >
                            {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                          </button>
                        ))}
                      </div>
                      {rsvp.rsvp === "yes" ? (
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-sm text-[#7A5C66]">מספר אורחים</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={rsvp.count}
                            onChange={(e) => rsvp.setCount(Number(e.target.value))}
                            className="w-20 border border-[#4A1C2F]/30 px-3 py-2 text-center"
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
                        className="w-full bg-[#4A1C2F] py-3.5 text-sm font-bold text-[#F7F1E6] disabled:opacity-40"
                      >
                        {rsvp.saving ? "שולח..." : "שליחה"}
                      </button>
                    </div>
                  )}
                </div>
              </EnvelopeRsvp>
            ) : null}
          </div>
        </div>
      </SiteSection>

      {/* 14 · Accommodations */}
      <AccommodationsBlock tone={tone} className="border-t border-[#4A1C2F]/10 bg-white py-20" />

      {/* 15 · Gifts */}
      <GiftsBlock tone={tone} className="py-20" />

      {/* 16 · FAQ */}
      <FaqBlock tone={tone} className="border-y border-[#4A1C2F]/10 bg-white py-20" />

      {/* 17 · Contact */}
      <ContactPeopleBlock tone={tone} className="py-20" />

      {/* 18 · Final moment */}
      <FinalMomentBlock tone={tone} image={images[4] || heroImg} />

      <footer id="footer" className="bg-[#4A1C2F] px-6 py-12 text-center text-[#F7F1E6]">
        <p className="text-2xl font-medium"><EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText></p>
        <Ornament />
        <p className="text-xs tracking-[0.25em] text-[#F7F1E6]/40">{formatHebrewDate(c.weddingDate)}</p>
      </footer>
    </div>
  );
}
