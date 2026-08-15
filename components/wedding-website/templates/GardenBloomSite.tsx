"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides } from "../shared/WeddingSiteContext";
import { EditableText, useResolvedTone } from "../editor/EditablePrimitives";
import HeroImageEditable from "../editor/HeroImageEditable";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import WeddingActionBar from "../shared/WeddingActionBar";
import FloatingPetals from "../illustrations/FloatingPetals";
import VineGrow from "../illustrations/VineGrow";
import PolaroidGallery from "../illustrations/PolaroidGallery";
import EnvelopeRsvp from "../illustrations/EnvelopeRsvp";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";
import RsvpCelebrate from "../illustrations/RsvpCelebrate";
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

const baseTone: BlockTone = {
  accent: GREEN,
  muted: MUTED,
  surface: "rgba(255,255,255,0.85)",
  border: "rgba(107,158,120,0.35)",
  fontDisplay: "'Libre Baskerville', serif",
  radius: "1.75rem",
  buttonClass: "ww-cta-primary rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg",
  outlineButtonClass: "ww-tint-btn-outline rounded-full border px-6 py-3 text-sm font-bold",
};

const sectionPad = "py-16 md:py-20";

function Leaf({ color = GREEN }: { color?: string }) {
  return (
    <div className="mx-auto my-5 flex items-center justify-center gap-2">
      <span className="h-px w-10" style={{ background: `${color}80` }} />
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M9 2C6 5 4 8 4 11a5 5 0 0 0 10 0c0-3-2-6-5-9Z" fill={color} fillOpacity="0.55" />
      </svg>
      <span className="h-px w-10" style={{ background: `${color}80` }} />
    </div>
  );
}

export default function GardenBloomSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  const tone = useResolvedTone(baseTone);
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
          accent={tone.accent}
          text="#FFFFFF"
          surface="rgba(244,250,244,0.94)"
          border={`${tone.accent}55`}
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="ww-tint-btn-outline fixed top-4 left-4 z-[55] rounded-full border bg-white/90 px-4 py-2 text-xs font-bold shadow-lg"
          style={{ borderColor: `${tone.accent}66`, color: tone.accent }}
        >
          ← תבניות
        </Link>
      )}

      {/* 1 — Hero with petals */}
      <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <HeroImageEditable
          src={heroImg}
          className="absolute inset-0 bg-cover bg-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#F4FAF4] via-[#F4FAF4]/55 to-[#2F4A36]/25" />
        <FloatingPetals color={tone.accent || GREEN} count={12} />
        <div className="relative z-10 w-full px-6 pb-20 text-center">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.4em]"
            style={{ color: tone.accent }}
          >
            Garden Bloom
          </p>
          <h1
            className="mt-4 text-[clamp(2.6rem,8vw,5.2rem)] font-normal leading-tight"
            style={{ fontFamily: tone.fontDisplay, color: tone.muted === MUTED ? "#2F4A36" : undefined }}
          >
            <EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText>
          </h1>
          <Leaf color={tone.accent} />
          <p className="mx-auto max-w-lg text-base md:text-lg" style={{ color: tone.muted }}>
            <EditableText field="heroSubtitle" as="span" multiline>
              {c.heroSubtitle}
            </EditableText>
          </p>
          <p className="mt-4 text-lg" style={{ fontFamily: tone.fontDisplay, color: tone.accent }}>
            {formatHebrewDate(c.weddingDate)}
            {c.weddingTime ? ` · ${c.weddingTime}` : ""}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#rsvp"
              className={tone.buttonClass}
              style={{ background: tone.accent, color: "#fff" }}
            >
              אישור הגעה
            </a>
            <a
              href="#transportation"
              className={tone.outlineButtonClass + " bg-white/70 backdrop-blur-sm"}
              style={{ borderColor: tone.accent, color: tone.accent }}
            >
              הזמנת הסעה
            </a>
          </div>
        </div>
      </section>

      {/* 2 — Welcome */}
      <WelcomeBlock tone={tone} className={sectionPad} title="הזמנה לגן" />

      {/* 3 — How we met */}
      <HowWeMetBlock tone={tone} className={`${sectionPad} ww-tint-alt`} image={gallery[0]} />

      {/* 4 — FullBleed garden moment */}
      {gallery[1] ? (
        <FullBleedPhoto src={gallery[1]} caption="פריחה אחת, סיפור שלם" />
      ) : null}

      {/* 5 — Story */}
      <StoryBlock tone={tone} className={sectionPad} />

      {/* 6 — Proposal */}
      <ProposalBlock tone={tone} className={`${sectionPad} ww-tint-alt`} image={gallery[2]} />

      {/* 7 — Countdown */}
      <CountdownBlock tone={tone} className={sectionPad} variant="cards" />

      {/* 8 — Schedule */}
      <ScheduleBlock tone={tone} className={`${sectionPad} ww-tint-alt`}>
        <Leaf color={tone.accent} />
      </ScheduleBlock>

      {/* 9 — Location with vine */}
      <LocationBlock tone={tone} className={sectionPad}>
        <VineGrow color={tone.accent} className="mb-2" />
        <MapPinPulse accent={tone.accent} />
      </LocationBlock>

      {/* 10 — Dress code */}
      <DressCodeBlock tone={tone} className={`${sectionPad} ww-tint-alt`} />

      {/* 11 — Polaroid gallery */}
      <SiteSection id="gallery" className={sectionPad}>
        <div className="mx-auto max-w-6xl px-6">
          <h2
            className="text-center text-4xl font-normal"
            style={{ fontFamily: tone.fontDisplay }}
          >
            רגעים מהגן
          </h2>
          <Leaf color={tone.accent} />
          <PolaroidGallery images={gallery.slice(0, 8)} accent={tone.accent} />
        </div>
      </SiteSection>

      {/* 12 — Quote */}
      <QuoteBlock tone={tone} className="ww-tint-alt" />

      {/* 13 — Transportation */}
      <TransportationBlock tone={tone} className={sectionPad}>
        <ShuttleRide accent={tone.accent} className="mb-8" />
      </TransportationBlock>

      {/* 14 — FAQ */}
      <FaqBlock tone={tone} className={`${sectionPad} ww-tint-alt`} />

      {/* 15 — RSVP with envelope */}
      <SiteSection id="rsvp" className={`${sectionPad} ww-tint-alt`}>
        <div className="mx-auto max-w-md px-6">
          <h2
            className="text-center text-4xl font-normal"
            style={{ fontFamily: tone.fontDisplay }}
          >
            אישור הגעה
          </h2>
          <Leaf color={tone.accent} />
          <EditableText
            field="rsvpText"
            as="p"
            multiline
            className="mb-4 text-center text-sm ww-tint-muted"
            placeholder="טקסט לאישור הגעה"
          >
            {c.rsvpText || ""}
          </EditableText>
          <RsvpCelebrate
            accent={tone.accent}
            active={rsvp.rsvp === "yes" || rsvp.sent}
            className="mb-2"
          />
          <div className="mb-6 space-y-4 rounded-[1.75rem] border bg-white/85 p-6" style={{ borderColor: `${tone.accent}4D` }}>
            <GuestIdentifyRsvp
              accent={tone.accent}
              identified={rsvp.identified}
              onBind={(token, meta) => rsvp.bindToken?.(token, meta)}
            />
          </div>
          {rsvp.identified ? (
            <EnvelopeRsvp accent={tone.accent} open={rsvp.rsvp === "yes" || rsvp.sent}>
              {rsvp.sent ? (
                <p className="text-center text-lg" style={{ color: tone.accent }}>תודה! קיבלנו את אישור ההגעה.</p>
              ) : (
                <div className="space-y-4">
                  {rsvp.guestName ? (
                    <p className="text-center text-sm" style={{ color: tone.muted }}>שלום {rsvp.guestName}</p>
                  ) : null}
                  <div className="flex gap-3">
                    {(["yes", "no"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => rsvp.setRsvp(v)}
                        className="flex-1 rounded-full py-3 text-sm font-bold"
                        style={
                          rsvp.rsvp === v
                            ? { background: tone.accent, color: "#fff" }
                            : { border: `1px solid ${tone.accent}66`, color: tone.muted }
                        }
                      >
                        {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                      </button>
                    ))}
                  </div>
                  {rsvp.rsvp === "yes" ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-sm" style={{ color: tone.muted }}>מספר אורחים</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={rsvp.count}
                        onChange={(e) => rsvp.setCount(Number(e.target.value))}
                        className="w-20 rounded-full border px-3 py-2 text-center"
                        style={{ borderColor: `${tone.accent}66` }}
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
                    className="w-full rounded-full py-3.5 text-sm font-bold text-white disabled:opacity-40"
                    style={{ background: tone.accent }}
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

      <footer id="footer" className="px-6 py-16 text-center text-white" style={{ background: "color-mix(in srgb, var(--ww-accent) 55%, #1a2418)" }}>
        <p className="text-3xl" style={{ fontFamily: tone.fontDisplay }}>
          <EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText>
        </p>
        <Leaf color="#fff" />
        <p className="opacity-80">{c.footerNote || "נתראה בגן"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/35">
          {formatHebrewDate(c.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
