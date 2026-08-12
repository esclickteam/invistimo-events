"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage } from "../shared/SafeMedia";
import WeddingActionBar from "../shared/WeddingActionBar";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";
import GlassShimmer from "../illustrations/GlassShimmer";
import {
  type BlockTone,
  WelcomeBlock,
  CountdownBlock,
  ProposalBlock,
  ScheduleBlock,
  LocationBlock,
  TransportationBlock,
  DressCodeBlock,
  QuoteBlock,
  AccommodationsBlock,
  FaqBlock,
  RsvpBlock,
  ContactPeopleBlock,
  FinalMomentBlock,
  FullBleedPhoto,
} from "../shared/FullLengthBlocks";

const ACCENT = "#7C9CFF";
const MUTED = "#8B97B8";

const tone: BlockTone = {
  accent: ACCENT,
  muted: MUTED,
  surface: "rgba(255,255,255,0.08)",
  border: "rgba(124,156,255,0.35)",
  fontDisplay: "'Montserrat', sans-serif",
  radius: "1.5rem",
  buttonClass:
    "rounded-full bg-[#7C9CFF] px-6 py-3 text-sm font-bold text-[#0A0E17]",
  outlineButtonClass:
    "rounded-full border border-[#7C9CFF] px-6 py-3 text-sm font-bold text-[#7C9CFF]",
};

const glass =
  "rounded-3xl border border-white/15 bg-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl";

const sectionPad = "py-16 md:py-20";

export default function ModernGlassSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  useWeddingThemeOverrides();
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages
  );
  const gallery = images.slice(0, 9);
  const heroImg = c.heroImageUrl || template.heroImage;

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-[#0A0E17] text-[#F2F5FF]"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent={ACCENT}
          text="#0A0E17"
          surface="rgba(10,14,23,0.94)"
          border="rgba(124,156,255,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#7C9CFF]/40 bg-[#0A0E17]/90 px-4 py-2 text-xs font-bold text-[#F2F5FF] shadow-lg"
        >
          ← תבניות
        </Link>
      )}

      {/* 1 — Bento glass hero */}
      <section
        id="hero"
        className={`relative overflow-x-clip px-4 md:px-8 ${embed ? "py-10" : "pb-10 pt-10"}`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(124,156,255,0.35), transparent 55%), radial-gradient(ellipse at 90% 40%, rgba(124,156,255,0.15), transparent 45%)",
          }}
        />
        <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] max-w-6xl grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className={`${glass} col-span-2 flex flex-col justify-end p-6 md:row-span-2 md:p-8`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#7C9CFF]">
              Save the Date
            </p>
            <h1 className="mt-4 text-[clamp(2.4rem,6vw,4.2rem)] font-bold leading-[1.05] tracking-tight">
              {c.coupleNames}
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#8B97B8]">{c.heroSubtitle}</p>
            <p className="mt-3 text-sm font-semibold text-[#7C9CFF]">
              {formatHebrewDate(c.weddingDate)}
              {c.weddingTime ? ` · ${c.weddingTime}` : ""}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#rsvp"
                className="inline-flex w-fit rounded-full bg-[#7C9CFF] px-7 py-3 text-sm font-bold text-[#0A0E17]"
              >
                אישור הגעה
              </a>
              <a
                href="#transportation"
                className="inline-flex w-fit rounded-full border border-[#7C9CFF]/50 px-7 py-3 text-sm font-bold text-[#7C9CFF]"
              >
                הזמנת הסעה
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className={`${glass} relative col-span-2 overflow-hidden md:col-span-2`}
          >
            <SafeImage src={heroImg} alt="" className="h-full min-h-[160px] w-full object-cover md:min-h-[220px]" />
            <GlassShimmer />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
            className={`${glass} relative col-span-1 overflow-hidden`}
          >
            <SafeImage src={gallery[1] || heroImg} alt="" className="h-full min-h-[140px] w-full object-cover" />
            <GlassShimmer />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className={`${glass} col-span-1 flex flex-col justify-center p-5`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#7C9CFF]">Venue</p>
            <p className="mt-2 text-lg font-bold leading-snug">{c.venueName || "מיקום"}</p>
            <a href="#location" className="mt-4 text-xs font-bold text-[#7C9CFF]">
              לניווט ←
            </a>
          </motion.div>
        </div>
      </section>

      {/* 2 — Welcome */}
      <WelcomeBlock tone={tone} className={sectionPad} />

      {/* 3 — Countdown */}
      <CountdownBlock tone={tone} className={`${sectionPad} border-y border-white/10`} variant="cards" />

      {/* 4 — Proposal story */}
      <ProposalBlock tone={tone} className={sectionPad} image={gallery[2]} />

      {/* 5 — FullBleed cinematic break */}
      {gallery[0] ? <FullBleedPhoto src={gallery[0]} caption="לילה אחד, לנצח" /> : null}

      {/* 6 — Schedule */}
      <ScheduleBlock tone={tone} className={sectionPad} />

      {/* 7 — Location + MapPinPulse */}
      <LocationBlock tone={tone} className={`${sectionPad} border-y border-white/10`}>
        <MapPinPulse accent={ACCENT} />
      </LocationBlock>

      {/* 8 — Transportation + ShuttleRide */}
      <TransportationBlock tone={tone} className={sectionPad}>
        <ShuttleRide accent={ACCENT} className="my-8" />
      </TransportationBlock>

      {/* 9 — Dress code */}
      <DressCodeBlock tone={tone} className={`${sectionPad} border-y border-white/10`} />

      {/* 10 — Photo mosaic gallery */}
      <section id="gallery" className={`${sectionPad} overflow-x-clip`}>
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl" style={{ fontFamily: tone.fontDisplay }}>
            גלריה
          </h2>
          <p className="mt-2 text-center text-sm text-[#8B97B8]">פסיפס עריכתי</p>
          <div className="mt-10 grid grid-cols-4 grid-rows-3 gap-3 md:gap-4">
            {gallery.slice(0, 8).map((src, i) => {
              const spans =
                i === 0
                  ? "col-span-2 row-span-2"
                  : i === 3
                    ? "col-span-2"
                    : "col-span-1";
              return (
                <motion.figure
                  key={`${src}-${i}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`${spans} overflow-hidden rounded-2xl border border-white/10 bg-white/5`}
                >
                  <SafeImage
                    src={src}
                    alt=""
                    className={`w-full object-cover ${i === 0 ? "aspect-square h-full min-h-[200px]" : "aspect-[4/5]"}`}
                  />
                </motion.figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11 — Quote */}
      <QuoteBlock tone={tone} className="border-y border-white/10 bg-white/[0.03]" />

      {/* 12 — Accommodations */}
      <AccommodationsBlock tone={tone} className={sectionPad} />

      {/* 13 — FAQ */}
      <FaqBlock tone={tone} className={`${sectionPad} border-y border-white/10`} />

      {/* 14 — RSVP */}
      <RsvpBlock tone={tone} className={sectionPad} />

      {/* 15 — Contact */}
      <ContactPeopleBlock tone={tone} className={sectionPad} />

      {/* 16 — Final moment */}
      <FinalMomentBlock tone={tone} image={gallery[3] || heroImg} />

      <footer id="footer" className="border-t border-white/10 px-6 py-16 text-center">
        <p className="text-2xl font-bold tracking-tight">{c.coupleNames}</p>
        <p className="mt-3 text-[#7C9CFF]">{c.footerNote || "נתראה בחגיגה"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/30">
          {formatHebrewDate(c.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
