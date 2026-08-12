"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import WeddingActionBar from "../shared/WeddingActionBar";
import GoldScrollLine from "../illustrations/GoldScrollLine";
import ShuttleRide from "../illustrations/ShuttleRide";
import MapPinPulse from "../illustrations/MapPinPulse";
import ScrollRoute from "../illustrations/ScrollRoute";
import {
  type BlockTone,
  WelcomeBlock,
  CountdownBlock,
  StoryBlock,
  CouplePhotosBlock,
  DateRevealBlock,
  FullBleedPhoto,
  QuoteBlock,
  ScheduleBlock,
  LocationBlock,
  DressCodeBlock,
  TransportationBlock,
  RichGalleryGrid,
  FaqBlock,
  GiftsBlock,
  RsvpBlock,
  FinalMomentBlock,
} from "../shared/FullLengthBlocks";

const ACCENT = "#C9A962";

const tone: BlockTone = {
  accent: ACCENT,
  muted: "#8A7560",
  surface: "#FFFFFF",
  border: ACCENT,
  fontDisplay: "Cormorant Garamond",
  radius: "0",
  buttonClass: "rounded-full bg-[#C9A962] px-6 py-3 text-sm font-bold text-white",
  outlineButtonClass: "rounded-full border border-[#C9A962] px-6 py-3 text-sm font-bold text-[#C9A962]",
};

function Divider() {
  return (
    <div className="mx-auto my-6 flex max-w-[220px] items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A962] to-[#E8D5A8]" />
      <span className="h-2.5 w-2.5 rotate-45 border border-[#C9A962]" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A962] to-[#E8D5A8]" />
    </div>
  );
}

export default function EternalGoldSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages,
  );
  const heroImg = c.heroImageUrl || template.heroImage;

  return (
    <div
      dir="rtl"
      className="wedding-website-root overflow-x-clip bg-[#FAF7F2] text-[#2A2118]"
      data-style-preset={themeOverrides.stylePreset || ""}
      style={{
        backgroundColor: "var(--ww-bg)",
        color: "var(--ww-text)",
        fontFamily: "var(--ww-font-body)",
        ["--ww-heading-scale" as string]: themeOverrides.headingScale || 1,
      }}
    >
      {!embed && (
        <WeddingActionBar
          accent={ACCENT}
          text="#2A2118"
          surface="rgba(250,247,242,0.94)"
          border="rgba(201,169,98,0.35)"
        />
      )}
      {!embed && <GoldScrollLine />}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#C9A962]/40 bg-white/90 px-4 py-2 text-xs font-bold shadow-lg"
        >
          ← תבניות
        </Link>
      )}

      {/* 1 · Hero */}
      <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImg})` }}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 16, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2A2118]/90 via-[#2A2118]/35 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-20 text-center text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.45em] text-[#E8D5A8]">Save the Date</p>
          <h1 className="mt-4 font-['Cormorant_Garamond'] text-[clamp(3rem,10vw,6.5rem)] font-light leading-none">
            {c.coupleNames}
          </h1>
          <Divider />
          <p className="mx-auto max-w-xl text-base text-white/85 md:text-lg">{c.heroSubtitle}</p>
          <p className="mt-4 font-['Cormorant_Garamond'] text-xl text-[#E8D5A8]">
            {formatHebrewDate(c.weddingDate)}
            {c.weddingTime ? ` · ${c.weddingTime}` : ""}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href="#rsvp"
              className="rounded-full bg-[#C9A962] px-8 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(201,169,98,0.35)]"
            >
              אישור הגעה
            </a>
            <a
              href="#transportation"
              className="rounded-full border border-white/45 bg-white/10 px-8 py-3.5 text-sm font-bold backdrop-blur-sm"
            >
              הזמנת הסעה
            </a>
          </div>
        </div>
      </section>

      {/* 2 · Welcome */}
      <WelcomeBlock tone={tone} title="ברוכים הבאים" className="py-20" />

      {/* 3 · Countdown */}
      <CountdownBlock tone={tone} variant="cards" className="bg-[#F3EBE0] py-20" />

      {/* 4 · Story */}
      <StoryBlock tone={tone} className="py-20" />

      {/* 5 · Couple photos */}
      <CouplePhotosBlock images={images} tone={tone} layout="split" className="bg-[#F3EBE0] py-20" />

      {/* 6 · Date reveal */}
      <DateRevealBlock tone={tone} className="py-20" />

      {/* 7 · Visual break */}
      <FullBleedPhoto src={images[3] || heroImg} caption={c.romanticQuote || "כל רגע מוביל אותנו ליום הגדול"} />

      {/* 8 · Schedule */}
      <ScheduleBlock tone={tone} className="bg-[#F3EBE0] py-20">
        <Divider />
      </ScheduleBlock>

      {/* 9 · Location + route */}
      <LocationBlock tone={tone} className="py-20">
        <ScrollRoute accent={ACCENT} />
        <MapPinPulse accent={ACCENT} />
        <Divider />
      </LocationBlock>

      {/* 10 · Dress code */}
      <DressCodeBlock tone={tone} className="bg-[#F3EBE0] py-20" />

      {/* 11 · Transportation */}
      <TransportationBlock tone={tone} className="py-20">
        <ShuttleRide accent={ACCENT} className="mb-8" />
        <Divider />
      </TransportationBlock>

      {/* 12 · Gallery */}
      <RichGalleryGrid images={images} tone={tone} title="רגעים" max={9} className="bg-[#F3EBE0] py-20" />

      {/* 13 · Quote */}
      <QuoteBlock tone={tone} className="bg-[#FAF7F2]" />

      {/* 14 · RSVP */}
      <RsvpBlock tone={tone} className="py-20">
        <Divider />
      </RsvpBlock>

      {/* 15 · Gifts */}
      <GiftsBlock tone={tone} className="bg-[#F3EBE0] py-20" />

      {/* 16 · FAQ */}
      <FaqBlock tone={tone} className="py-20" />

      {/* 17 · Final moment */}
      <FinalMomentBlock tone={tone} image={images[5] || heroImg} />

      {/* Footer */}
      <footer id="footer" className="bg-[#2A2118] px-6 py-12 text-center text-white">
        <p className="font-['Cormorant_Garamond'] text-2xl font-light">{c.coupleNames}</p>
        <p className="mt-4 text-xs tracking-[0.25em] text-white/35">{formatHebrewDate(c.weddingDate)}</p>
      </footer>
    </div>
  );
}
