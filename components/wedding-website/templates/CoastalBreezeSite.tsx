"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides } from "../shared/WeddingSiteContext";
import { EditableText, useResolvedTone } from "../editor/EditablePrimitives";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage } from "../shared/SafeMedia";
import WeddingActionBar from "../shared/WeddingActionBar";
import WaveMotion from "../illustrations/WaveMotion";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";
import ScrollRoute from "../illustrations/ScrollRoute";
import {
  type BlockTone,
  WelcomeBlock,
  AccommodationsBlock,
  CountdownBlock,
  DateRevealBlock,
  ScheduleBlock,
  LocationBlock,
  TransportationBlock,
  DressCodeBlock,
  QuoteBlock,
  FaqBlock,
  RsvpBlock,
  ContactPeopleBlock,
  FinalMomentBlock,
  FullBleedPhoto,
  RichGalleryGrid,
} from "../shared/FullLengthBlocks";

const BLUE = "#3D8BBA";
const MUTED = "#5A8499";

const baseTone: BlockTone = {
  accent: BLUE,
  muted: MUTED,
  surface: "#ffffff",
  border: "rgba(61,139,186,0.25)",
  fontDisplay: "'Montserrat', sans-serif",
  radius: "1rem",
  buttonClass:
    "rounded-full bg-[#3D8BBA] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(61,139,186,0.3)]",
  outlineButtonClass:
    "rounded-full border border-[#3D8BBA] px-7 py-3.5 text-sm font-semibold text-[#3D8BBA]",
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

export default function CoastalBreezeSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  const tone = useResolvedTone(baseTone);
  const themeOverrides = useWeddingThemeOverrides();
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
        backgroundColor: "var(--ww-bg, #F0F8FF)",
        color: "var(--ww-text, #1A3A4A)",
        fontFamily: "var(--ww-font-body, 'Montserrat', sans-serif)",
        ["--ww-heading-scale" as string]: themeOverrides.headingScale || 1,
      }}
      dir="rtl"
    >
      {!embed && (
        <WeddingActionBar
          accent={BLUE}
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

      {/* 1 — Beach hero with waves */}
      <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <SafeImage src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A3A4A]/85 via-[#1A3A4A]/25 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-24 text-center text-white">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-light uppercase tracking-[0.5em] text-white/80"
          >
            Coastal Breeze
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 text-[clamp(2.4rem,8vw,5rem)] font-light tracking-wide"
            style={{ fontFamily: tone.fontDisplay }}
          >
            <EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mx-auto mt-5 max-w-lg font-light text-white/85"
          >
            <EditableText field="heroSubtitle" as="span" multiline>{c.heroSubtitle}</EditableText>
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            <a href="#rsvp" className={tone.buttonClass}>
              אישור הגעה
            </a>
            <a
              href="#transportation"
              className="rounded-full border border-white/50 bg-white/10 px-8 py-3.5 text-sm font-semibold backdrop-blur-sm"
            >
              הזמנת הסעה
            </a>
          </motion.div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10">
          <WaveMotion color="#9AD7F2" />
        </div>
      </section>

      <Wave flip />

      {/* 2 — Welcome */}
      <WelcomeBlock tone={tone} className="bg-[#E8F4FC] py-16 md:py-20" title="ברוכים לחוף" />

      {/* 3 — Accommodations early */}
      <AccommodationsBlock tone={tone} className="py-16 md:py-20" />

      <Wave />

      {/* 4 — FullBleed coastal break */}
      {gallery[0] ? (
        <FullBleedPhoto src={gallery[0]} caption="ים, שמש, ואהבה" />
      ) : null}

      {/* 5 — Countdown */}
      <CountdownBlock tone={tone} className="bg-[#E8F4FC] py-16 md:py-20" variant="cards" />

      <Wave flip />

      {/* 6 — Date reveal */}
      <DateRevealBlock tone={tone} className="py-16 md:py-20" />

      <Wave />

      {/* 7 — Schedule */}
      <ScheduleBlock tone={tone} className="bg-[#E8F4FC] py-16 md:py-20" />

      <Wave flip />

      {/* 8 — Location */}
      <LocationBlock tone={tone} className="py-16 md:py-20">
        <ScrollRoute accent={BLUE} />
        <MapPinPulse accent={BLUE} />
      </LocationBlock>

      <Wave />

      {/* 9 — Transportation */}
      <TransportationBlock tone={tone} className="bg-[#E8F4FC] py-16 md:py-20">
        <p className="mb-2 text-center text-sm text-[#5A8499]">נגיע יחד — בקצב של גל</p>
        <ShuttleRide accent={BLUE} className="my-8" />
      </TransportationBlock>

      <Wave flip />

      {/* 10 — Dress code */}
      <DressCodeBlock tone={tone} className="py-16 md:py-20" />

      {/* 11 — Rich gallery */}
      <RichGalleryGrid
        images={gallery}
        tone={tone}
        title="רגעים על החוף"
        max={8}
        className="bg-[#E8F4FC] py-16 md:py-20"
      />

      <Wave />

      {/* 12 — Quote */}
      <QuoteBlock tone={tone} className="py-16 md:py-20" />

      <Wave flip />

      {/* 13 — FAQ */}
      <FaqBlock tone={tone} className="bg-[#E8F4FC] py-16 md:py-20" />

      <Wave />

      {/* 14 — RSVP */}
      <RsvpBlock tone={tone} className="py-16 md:py-20" />

      <Wave flip />

      {/* 15 — Contact */}
      <ContactPeopleBlock tone={tone} className="bg-[#E8F4FC] py-16 md:py-20" />

      {/* 16 — Final moment */}
      <FinalMomentBlock tone={tone} image={gallery[1] || heroImg} />

      <footer id="footer" className="bg-[#1A3A4A] px-6 py-16 text-center text-white">
        <p className="text-2xl font-light tracking-wide" style={{ fontFamily: tone.fontDisplay }}>
          <EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText>
        </p>
        <p className="mt-4 text-sm text-white/70">{c.footerNote || "נתראה על החוף"}</p>
        <p className="mt-6 text-xs tracking-[0.3em] text-white/35">
          {formatHebrewDate(c.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
