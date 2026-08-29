"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent } from "../shared/WeddingSiteContext";
import { EditableText, useResolvedTone } from "../editor/EditablePrimitives";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import WeddingActionBar from "../shared/WeddingActionBar";
import PolaroidGallery from "../illustrations/PolaroidGallery";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";
import {
  type BlockTone,
  SiteSection,
  WelcomeBlock,
  HowWeMetBlock,
  ProposalBlock,
  StoryBlock,
  CountdownBlock,
  CouplePhotosBlock,
  FullBleedPhoto,
  DateRevealBlock,
  ScheduleBlock,
  LocationBlock,
  DressCodeBlock,
  TransportationBlock,
  QuoteBlock,
  RsvpBlock,
  GiftsBlock,
  FaqBlock,
  FinalMomentBlock,
} from "../shared/FullLengthBlocks";

const ACCENT = "#E8788A";

const baseTone: BlockTone = {
  accent: ACCENT,
  muted: "#9A6070",
  surface: "rgba(255,255,255,0.9)",
  border: ACCENT,
  fontDisplay: "Cormorant Garamond",
  radius: "24px",
  buttonClass: "rounded-full bg-[#E8788A] px-6 py-3 text-sm font-bold text-white",
  outlineButtonClass: "rounded-full border border-[#E8788A] px-6 py-3 text-sm font-bold text-[#E8788A]",
};

export default function SunsetBlushSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  const tone = useResolvedTone(baseTone);
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages,
  );
  const heroImg = c.heroImageUrl || template.heroImage;

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-[#FFF5F7] text-[#3D1F28]"
      style={{ fontFamily: "'Cormorant Garamond', serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent={ACCENT}
          text="#FFFFFF"
          surface="rgba(255,245,247,0.94)"
          border="rgba(232,120,138,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#E8788A]/35 bg-white/90 px-4 py-2 text-xs font-bold shadow-lg"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          ← תבניות
        </Link>
      )}

      {/* 1 · Hero — soft dusk gradient */}
      <section
        id="hero"
        className={`relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 text-center ${embed ? "" : "pt-8"}`}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(165deg, #FFE8EE 0%, #FFD0DC 42%, #E8788A 100%)",
          }}
        />
        {heroImg ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-soft-light"
            style={{ backgroundImage: `url(${heroImg})` }}
          />
        ) : null}
        <div className="relative z-10 max-w-2xl py-20">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#9A6070]"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Save the Date
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="mt-6 text-[clamp(3rem,10vw,5.5rem)] font-light leading-[1.05] text-[#3D1F28]"
          >
            <EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText>
          </motion.h1>
          <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-[#9A6070]"><EditableText field="heroSubtitle" as="span" multiline>{c.heroSubtitle}</EditableText></p>
          <p className="mt-4 text-xl text-[#E8788A]">
            {formatHebrewDate(c.weddingDate)}
            {c.weddingTime ? ` · ${c.weddingTime}` : ""}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            <a href="#rsvp" className="rounded-full bg-[#E8788A] px-8 py-3.5 text-sm font-bold text-white shadow-[0_14px_36px_rgba(232,120,138,0.35)]">
              אישור הגעה
            </a>
            <a href="#transportation" className="rounded-full border border-white/70 bg-white/50 px-8 py-3.5 text-sm font-bold text-[#3D1F28] backdrop-blur-sm">
              הזמנת הסעה
            </a>
          </div>
        </div>
      </section>

      {/* 2 · Welcome */}
      <WelcomeBlock tone={tone} title="ברוכים הבאים לחגיגה שלנו" className="py-20" />

      {/* 3 · How we met — early story */}
      <HowWeMetBlock tone={tone} image={images[0]} className="bg-[#FFE8EE]/50 py-20" />

      {/* 4 · Proposal */}
      <ProposalBlock tone={tone} image={images[1]} className="py-20" />

      {/* 5 · Full story */}
      <StoryBlock tone={tone} title="הסיפור שלנו" className="bg-[#FFE8EE]/50 py-20" />

      {/* 6 · Countdown */}
      <CountdownBlock tone={tone} variant="cards" className="py-20" />

      {/* 7 · Couple photos */}
      <CouplePhotosBlock images={images} tone={tone} layout="overlap" className="bg-[#FFE8EE]/50 py-20" />

      {/* 8 · Visual break */}
      <FullBleedPhoto src={images[4] || heroImg} caption={c.romanticQuote || "אהבה היא לחייך יחד, לחלום יחד, לגדול יחד"} />

      {/* 9 · Schedule */}
      <ScheduleBlock tone={tone} className="py-20" />

      {/* 10 · Date reveal */}
      <DateRevealBlock tone={tone} className="bg-[#FFE8EE]/50 py-20" />

      {/* 11 · Location */}
      <LocationBlock tone={tone} className="py-20">
        <MapPinPulse accent={ACCENT} />
      </LocationBlock>

      {/* 12 · Dress code */}
      <DressCodeBlock tone={tone} className="bg-[#FFE8EE]/50 py-20" />

      {/* 13 · Transportation */}
      <TransportationBlock tone={tone} className="py-20">
        <ShuttleRide accent={ACCENT} className="my-8" />
      </TransportationBlock>

      {/* 14 · Polaroid gallery */}
      <SiteSection id="gallery" className="bg-[#FFE8EE]/50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-4xl font-light" style={{ fontFamily: tone.fontDisplay }}>
            רגעים
          </h2>
          <p className="mt-2 text-center text-[#9A6070]">כמו פולארוידים מהלב</p>
          <div className="mt-10">
            <PolaroidGallery images={images.slice(0, 9)} accent={ACCENT} />
          </div>
        </div>
      </SiteSection>

      {/* 15 · Quote */}
      <QuoteBlock tone={tone} />

      {/* 16 · RSVP */}
      <RsvpBlock tone={tone} className="bg-[#FFE8EE]/50 py-20" />

      {/* 17 · Gifts */}
      <GiftsBlock tone={tone} className="py-20" />

      {/* 18 · FAQ */}
      <FaqBlock tone={tone} className="bg-[#FFE8EE]/50 py-20" />

      {/* 19 · Final moment */}
      <FinalMomentBlock tone={tone} image={images[6] || heroImg} />

      <footer id="footer" className="bg-gradient-to-b from-[#E8788A] to-[#D4657A] px-6 py-12 text-center text-white">
        <p className="text-2xl font-light"><EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText></p>
        <p className="mt-3 text-sm text-white/85">{c.footerNote || "נתראה בחגיגה"}</p>
        <p className="mt-4 text-xs tracking-[0.25em] text-white/50">{formatHebrewDate(c.weddingDate)}</p>
      </footer>
    </div>
  );
}
