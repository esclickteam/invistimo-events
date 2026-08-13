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
import Starfield from "../illustrations/Starfield";
import ShuttleRide from "../illustrations/ShuttleRide";
import MapPinPulse from "../illustrations/MapPinPulse";
import ScrollRoute from "../illustrations/ScrollRoute";
import FilmStripGallery from "../illustrations/FilmStripGallery";
import {
  type BlockTone,
  CountdownBlock,
  StoryBlock,
  CouplePhotosBlock,
  FullBleedPhoto,
  ScheduleBlock,
  LocationBlock,
  DressCodeBlock,
  TransportationBlock,
  QuoteBlock,
  RsvpBlock,
  GiftsBlock,
  FaqBlock,
  ContactPeopleBlock,
  FinalMomentBlock,
  RichGalleryGrid,
  DateRevealBlock,
} from "../shared/FullLengthBlocks";

const GOLD = "#D4AF37";

const baseTone: BlockTone = {
  accent: GOLD,
  muted: "#A89BB0",
  surface: "#141018",
  border: GOLD,
  fontDisplay: "Playfair Display",
  radius: "2px",
  buttonClass: "rounded-sm bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#0D0B10]",
  outlineButtonClass: "rounded-sm border border-[#D4AF37]/50 px-6 py-3 text-sm font-bold text-[#D4AF37]",
};

function GoldLine() {
  return <div className="mx-auto my-5 h-px w-24 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent" />;
}

export default function MidnightVelvetSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  const tone = useResolvedTone(baseTone);
  const themeOverrides = useWeddingThemeOverrides();
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages,
  );
  const heroImg = c.heroImageUrl || template.heroImage;

  return (
    <div
      dir="rtl"
      className="wedding-website-root overflow-x-clip"
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
          accent={GOLD}
          text="#0D0B10"
          surface="rgba(13,11,16,0.94)"
          border="rgba(212,175,55,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-sm border border-[#D4AF37]/40 bg-[#0D0B10]/90 px-4 py-2 text-xs font-bold text-[#D4AF37]"
        >
          ← תבניות
        </Link>
      )}

      {/* 1 · Hero — cinematic widescreen + Starfield */}
      <section id="hero" className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pb-16 pt-10 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1520_0%,_#0D0B10_70%)]" />
        <div className="relative z-10 w-full max-w-6xl">
          <div className="relative aspect-[2.35/1] w-full overflow-hidden rounded-sm border border-[#D4AF37]/25 shadow-[0_0_80px_rgba(212,175,55,0.12)]">
            <SafeImage src={heroImg} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/50" />
            <Starfield count={32} />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.2em" }}
                animate={{ opacity: 1, letterSpacing: "0.45em" }}
                transition={{ duration: 1.2 }}
                className="mb-3 text-[10px] font-bold uppercase text-[#D4AF37]"
              >
                Midnight Velvet
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.9 }}
                className="font-['Playfair_Display'] text-[clamp(2.4rem,7vw,5.5rem)] font-semibold leading-none"
                style={{ textShadow: "0 0 48px rgba(212,175,55,0.45)" }}
              >
                <EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-5 max-w-lg text-sm text-[#F5F0E8]/75 md:text-base"
              >
                <EditableText field="heroSubtitle" as="span" multiline>{c.heroSubtitle}</EditableText>
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 flex flex-wrap justify-center gap-3"
              >
                <a href="#rsvp" className="rounded-sm bg-[#D4AF37] px-7 py-3 text-sm font-bold text-[#0D0B10] shadow-[0_0_28px_rgba(212,175,55,0.35)]">
                  אישור הגעה
                </a>
                <a href="#transportation" className="rounded-sm border border-[#D4AF37]/50 px-7 py-3 text-sm font-bold text-[#D4AF37]">
                  הזמנת הסעה
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 · Date reveal strip */}
      <DateRevealBlock tone={tone} className="border-y border-[#D4AF37]/20 bg-[#141018] py-10" />

      {/* 3 · Countdown */}
      <CountdownBlock tone={tone} variant="glow" className="py-20" />

      {/* 4 · Photo break */}
      <FullBleedPhoto src={images[0] || heroImg} caption="תחת כוכבים — נחגוג את האהבה" />

      {/* 5 · Couple photos — overlap */}
      <CouplePhotosBlock images={images} tone={tone} layout="overlap" className="bg-[#141018] py-20" />

      {/* 6 · Story */}
      <StoryBlock tone={tone} className="py-20" />

      {/* 7 · Film strip — cinematic mid-scroll */}
      <section className="overflow-x-clip py-8">
        <FilmStripGallery images={images.slice(0, 8)} />
      </section>

      {/* 8 · Second photo break */}
      <FullBleedPhoto src={images[3] || heroImg} />

      {/* 9 · Schedule */}
      <ScheduleBlock tone={tone} className="bg-[#141018] py-20">
        <GoldLine />
      </ScheduleBlock>

      {/* 10 · Rich gallery */}
      <RichGalleryGrid images={images} tone={tone} title="גלריה" max={9} className="py-20" />

      {/* 11 · Location */}
      <LocationBlock tone={tone} className="bg-[#141018] py-20">
        <ScrollRoute accent={GOLD} />
        <MapPinPulse accent={GOLD} />
        <GoldLine />
      </LocationBlock>

      {/* 12 · Dress code */}
      <DressCodeBlock tone={tone} className="py-20" />

      {/* 13 · Transportation */}
      <TransportationBlock tone={tone} className="bg-[#141018] py-20">
        <ShuttleRide accent={GOLD} className="mb-8" />
      </TransportationBlock>

      {/* 14 · Quote */}
      <QuoteBlock tone={tone} className="bg-[#0D0B10]" />

      {/* 15 · RSVP */}
      <RsvpBlock tone={tone} className="bg-[#141018] py-20">
        <GoldLine />
      </RsvpBlock>

      {/* 16 · Gifts */}
      <GiftsBlock tone={tone} className="py-20" />

      {/* 17 · FAQ */}
      <FaqBlock tone={tone} className="bg-[#141018] py-20" />

      {/* 18 · Contact */}
      <ContactPeopleBlock tone={tone} className="py-20" />

      {/* 19 · Final moment */}
      <FinalMomentBlock tone={tone} image={images[5] || heroImg} />

      <footer id="footer" className="border-t border-[#D4AF37]/20 px-6 py-12 text-center">
        <p className="font-['Playfair_Display'] text-2xl text-[#D4AF37]"><EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText></p>
        <p className="mt-3 text-xs tracking-[0.25em] text-[#A89BB0]/50">{formatHebrewDate(c.weddingDate)}</p>
      </footer>
    </div>
  );
}
