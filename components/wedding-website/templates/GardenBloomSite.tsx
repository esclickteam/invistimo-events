"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import WeddingActionBar from "../shared/WeddingActionBar";
import FloatingPetals from "../illustrations/FloatingPetals";
import VineGrow from "../illustrations/VineGrow";
import PolaroidGallery from "../illustrations/PolaroidGallery";
import EnvelopeRsvp from "../illustrations/EnvelopeRsvp";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";
import GuestIdentifyRsvp from "../shared/GuestIdentifyRsvp";
import {
  type BlockTone,
  SiteSection,
  WelcomeBlock,
  HowWeMetBlock,
  StoryBlock,
  ProposalBlock,
  CountdownBlock,
  ScheduleBlock,
  LocationBlock,
  DressCodeBlock,
  TransportationBlock,
  QuoteBlock,
  FaqBlock,
  GiftsBlock,
  FinalMomentBlock,
  FullBleedPhoto,
} from "../shared/FullLengthBlocks";
import { useWeddingRsvp } from "../shared/useWeddingInteractions";

const GREEN = "#6B9E78";
const MUTED = "#4A6B52";

const tone: BlockTone = {
  accent: GREEN,
  muted: MUTED,
  surface: "rgba(255,255,255,0.85)",
  border: "rgba(107,158,120,0.35)",
  fontDisplay: "'Libre Baskerville', serif",
  radius: "1.75rem",
  buttonClass:
    "rounded-full bg-[#6B9E78] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_36px_rgba(107,158,120,0.3)]",
  outlineButtonClass:
    "rounded-full border border-[#6B9E78] px-6 py-3 text-sm font-bold text-[#6B9E78]",
};

const sectionPad = "py-16 md:py-20";

function Leaf() {
  return (
    <div className="mx-auto my-5 flex items-center justify-center gap-2">
      <span className="h-px w-10 bg-[#6B9E78]/50" />
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M9 2C6 5 4 8 4 11a5 5 0 0 0 10 0c0-3-2-6-5-9Z" fill="#6B9E78" fillOpacity="0.55" />
      </svg>
      <span className="h-px w-10 bg-[#6B9E78]/50" />
    </div>
  );
}

export default function GardenBloomSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const rsvp = useWeddingRsvp();
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages
  );
  const gallery = images.slice(0, 9);
  const heroImg = c.heroImageUrl || template.heroImage;

  return (
    <div
      className="wedding-website-root overflow-x-clip"
      data-style-preset={themeOverrides.stylePreset || ""}
      style={{
        backgroundColor: "var(--ww-bg, #F4FAF4)",
        color: "var(--ww-text, #2F4A36)",
        fontFamily: "var(--ww-font-body, 'Libre Baskerville', serif)",
        ["--ww-heading-scale" as string]: themeOverrides.headingScale || 1,
      }}
      dir="rtl"
    >
      {!embed && (
        <WeddingActionBar
          accent={GREEN}
          text="#FFFFFF"
          surface="rgba(244,250,244,0.94)"
          border="rgba(107,158,120,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#6B9E78]/40 bg-white/90 px-4 py-2 text-xs font-bold text-[#6B9E78] shadow-lg"
        >
          ← תבניות
        </Link>
      )}

      {/* 1 — Hero with petals */}
      <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImg})` }}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 14, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F4FAF4] via-[#F4FAF4]/55 to-[#2F4A36]/25" />
        <FloatingPetals color={GREEN} count={12} />
        <div className="relative z-10 w-full px-6 pb-20 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#6B9E78]">Garden Bloom</p>
          <h1
            className="mt-4 text-[clamp(2.6rem,8vw,5.2rem)] font-normal leading-tight text-[#2F4A36]"
            style={{ fontFamily: tone.fontDisplay }}
          >
            {c.coupleNames}
          </h1>
          <Leaf />
          <p className="mx-auto max-w-lg text-base text-[#4A6B52] md:text-lg">{c.heroSubtitle}</p>
          <p className="mt-4 text-lg text-[#6B9E78]" style={{ fontFamily: tone.fontDisplay }}>
            {formatHebrewDate(c.weddingDate)}
            {c.weddingTime ? ` · ${c.weddingTime}` : ""}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#rsvp" className={tone.buttonClass}>
              אישור הגעה
            </a>
            <a href="#transportation" className={tone.outlineButtonClass + " bg-white/70 backdrop-blur-sm"}>
              הזמנת הסעה
            </a>
          </div>
        </div>
      </section>

      {/* 2 — Welcome */}
      <WelcomeBlock tone={tone} className={sectionPad} title="הזמנה לגן" />

      {/* 3 — How we met */}
      <HowWeMetBlock tone={tone} className={`${sectionPad} bg-[#E8F3EA]`} image={gallery[0]} />

      {/* 4 — FullBleed garden moment */}
      {gallery[1] ? (
        <FullBleedPhoto src={gallery[1]} caption="פריחה אחת, סיפור שלם" />
      ) : null}

      {/* 5 — Story */}
      <StoryBlock tone={tone} className={sectionPad} />

      {/* 6 — Proposal */}
      <ProposalBlock tone={tone} className={`${sectionPad} bg-[#E8F3EA]`} image={gallery[2]} />

      {/* 7 — Countdown */}
      <CountdownBlock tone={tone} className={sectionPad} variant="cards" />

      {/* 8 — Schedule */}
      <ScheduleBlock tone={tone} className={`${sectionPad} bg-[#E8F3EA]`}>
        <Leaf />
      </ScheduleBlock>

      {/* 9 — Location with vine */}
      <LocationBlock tone={tone} className={sectionPad}>
        <VineGrow color={GREEN} className="mb-2" />
        <MapPinPulse accent={GREEN} />
      </LocationBlock>

      {/* 10 — Dress code */}
      <DressCodeBlock tone={tone} className={`${sectionPad} bg-[#E8F3EA]`} />

      {/* 11 — Polaroid gallery */}
      <SiteSection id="gallery" className={sectionPad}>
        <div className="mx-auto max-w-6xl px-6">
          <h2
            className="text-center text-4xl font-normal"
            style={{ fontFamily: tone.fontDisplay }}
          >
            רגעים מהגן
          </h2>
          <Leaf />
          <PolaroidGallery images={gallery.slice(0, 8)} accent={GREEN} />
        </div>
      </SiteSection>

      {/* 12 — Quote */}
      <QuoteBlock tone={tone} className="bg-[#E8F3EA]" />

      {/* 13 — Transportation */}
      <TransportationBlock tone={tone} className={sectionPad}>
        <ShuttleRide accent={GREEN} className="mb-8" />
      </TransportationBlock>

      {/* 14 — FAQ */}
      <FaqBlock tone={tone} className={`${sectionPad} bg-[#E8F3EA]`} />

      {/* 15 — RSVP with envelope */}
      <SiteSection id="rsvp" className={`${sectionPad} bg-[#E8F3EA]`}>
        <div className="mx-auto max-w-md px-6">
          <h2
            className="text-center text-4xl font-normal"
            style={{ fontFamily: tone.fontDisplay }}
          >
            אישור הגעה
          </h2>
          <Leaf />
          {c.rsvpText ? (
            <p className="mb-4 text-center text-sm text-[#4A6B52]">{c.rsvpText}</p>
          ) : null}
          <div className="mb-6 space-y-4 rounded-[1.75rem] border border-[#6B9E78]/30 bg-white/85 p-6">
            <GuestIdentifyRsvp
              accent={GREEN}
              identified={rsvp.identified}
              onBind={(token, meta) => rsvp.bindToken?.(token, meta)}
            />
          </div>
          {rsvp.identified ? (
            <EnvelopeRsvp accent={GREEN} open={rsvp.rsvp === "yes" || rsvp.sent}>
              {rsvp.sent ? (
                <p className="text-center text-lg text-[#6B9E78]">תודה! קיבלנו את אישור ההגעה.</p>
              ) : (
                <div className="space-y-4">
                  {rsvp.guestName ? (
                    <p className="text-center text-sm text-[#4A6B52]">שלום {rsvp.guestName}</p>
                  ) : null}
                  <div className="flex gap-3">
                    {(["yes", "no"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => rsvp.setRsvp(v)}
                        className={`flex-1 rounded-full py-3 text-sm font-bold ${
                          rsvp.rsvp === v
                            ? "bg-[#6B9E78] text-white"
                            : "border border-[#6B9E78]/40 text-[#4A6B52]"
                        }`}
                      >
                        {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                      </button>
                    ))}
                  </div>
                  {rsvp.rsvp === "yes" ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-sm text-[#4A6B52]">מספר אורחים</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={rsvp.count}
                        onChange={(e) => rsvp.setCount(Number(e.target.value))}
                        className="w-20 rounded-full border border-[#6B9E78]/40 px-3 py-2 text-center"
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
                    className="w-full rounded-full bg-[#6B9E78] py-3.5 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {rsvp.saving ? "שולח..." : "שליחה"}
                  </button>
                </div>
              )}
            </EnvelopeRsvp>
          ) : null}
        </div>
      </SiteSection>

      {/* 16 — Gifts */}
      <GiftsBlock tone={tone} className={sectionPad} />

      {/* Final moment */}
      <FinalMomentBlock tone={tone} image={gallery[3] || heroImg} />

      <footer id="footer" className="bg-[#2F4A36] px-6 py-16 text-center text-[#F4FAF4]">
        <p className="text-3xl" style={{ fontFamily: tone.fontDisplay }}>
          {c.coupleNames}
        </p>
        <Leaf />
        <p className="text-[#B8D4BE]">{c.footerNote || "נתראה בגן"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/35">
          {formatHebrewDate(c.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
