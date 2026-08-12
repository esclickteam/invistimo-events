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
import ScrollRoute from "../illustrations/ScrollRoute";
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
} from "../shared/FullLengthBlocks";

const CYAN = "#5EEAD4";
const VIOLET = "#A78BFA";
const MUTED = "#8B97B8";

const tone: BlockTone = {
  accent: CYAN,
  muted: MUTED,
  surface: "rgba(255,255,255,0.06)",
  border: "rgba(94,234,212,0.35)",
  fontDisplay: "'Montserrat', sans-serif",
  radius: "1.5rem",
  buttonClass: "rounded-full bg-[#5EEAD4] px-6 py-3 text-sm font-bold text-[#070B14]",
  outlineButtonClass:
    "rounded-full border border-[#5EEAD4] px-6 py-3 text-sm font-bold text-[#5EEAD4]",
};

const glass =
  "rounded-3xl border border-[#5EEAD4]/20 bg-white/[0.06] shadow-[0_0_40px_rgba(94,234,212,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl";

const neonEdge =
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:border before:border-[#A78BFA]/20 before:shadow-[0_0_24px_rgba(167,139,250,0.12)]";

const sectionPad = "py-16 md:py-20";

function GlassRouteVisual() {
  return (
    <div className="relative mx-auto my-8 max-w-lg overflow-hidden rounded-2xl border border-[#5EEAD4]/25 bg-white/[0.04] p-6 backdrop-blur-md">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 50%, rgba(94,234,212,0.15), transparent 55%), radial-gradient(circle at 80% 40%, rgba(167,139,250,0.12), transparent 50%)",
        }}
      />
      <ScrollRoute accent={CYAN} className="relative h-32" />
      <div className="relative mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.25em] text-[#5EEAD4]">
        <span>יציאה</span>
        <span className="text-[#A78BFA]">← נתיב זכוכית →</span>
        <span>אולם</span>
      </div>
    </div>
  );
}

export default function ModernGlassSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  useWeddingThemeOverrides();
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages,
  );
  const gallery = images.slice(0, 9);
  const heroImg = c.heroImageUrl || template.heroImage;
  const stackImages = gallery.slice(0, 5);

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-[#070B14] text-[#F2F5FF]"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent={CYAN}
          text="#070B14"
          surface="rgba(7,11,20,0.94)"
          border="rgba(94,234,212,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#5EEAD4]/40 bg-[#070B14]/90 px-4 py-2 text-xs font-bold text-[#F2F5FF] shadow-[0_0_20px_rgba(94,234,212,0.15)]"
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
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at 15% 0%, rgba(94,234,212,0.28), transparent 50%), radial-gradient(ellipse at 85% 35%, rgba(167,139,250,0.22), transparent 45%)",
          }}
        />
        <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] max-w-6xl grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className={`${glass} ${neonEdge} relative col-span-2 flex flex-col justify-end p-6 md:row-span-2 md:p-8`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#5EEAD4]">Save the Date</p>
            <h1 className="mt-4 text-[clamp(2.4rem,6vw,4.2rem)] font-bold leading-[1.05] tracking-tight">
              {c.coupleNames}
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#8B97B8]">{c.heroSubtitle}</p>
            <p className="mt-3 text-sm font-semibold text-[#A78BFA]">
              {formatHebrewDate(c.weddingDate)}
              {c.weddingTime ? ` · ${c.weddingTime}` : ""}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#rsvp"
                className="inline-flex w-fit rounded-full bg-[#5EEAD4] px-7 py-3 text-sm font-bold text-[#070B14] shadow-[0_0_28px_rgba(94,234,212,0.35)]"
              >
                אישור הגעה
              </a>
              <a
                href="#transportation"
                className="inline-flex w-fit rounded-full border border-[#A78BFA]/50 px-7 py-3 text-sm font-bold text-[#A78BFA]"
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#070B14]/70 via-transparent to-[#A78BFA]/10" />
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
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5EEAD4]">Venue</p>
            <p className="mt-2 text-lg font-bold leading-snug">{c.venueName || "מיקום"}</p>
            <a href="#location" className="mt-4 text-xs font-bold text-[#A78BFA]">
              לניווט ←
            </a>
          </motion.div>
        </div>
      </section>

      {/* 2 — Welcome */}
      <WelcomeBlock tone={tone} className={sectionPad} />

      {/* 3 — Countdown */}
      <CountdownBlock tone={tone} className={`${sectionPad} border-y border-[#5EEAD4]/15`} variant="cards" />

      {/* 4 — Proposal story */}
      <ProposalBlock tone={tone} className={sectionPad} image={gallery[2]} />

      {/* 5 — Schedule */}
      <ScheduleBlock tone={tone} className={`${sectionPad} border-y border-[#A78BFA]/15`} />

      {/* 6 — Location + MapPinPulse */}
      <LocationBlock tone={tone} className={sectionPad}>
        <MapPinPulse accent={CYAN} />
      </LocationBlock>

      {/* 7 — Transportation — glass route visual */}
      <TransportationBlock tone={tone} className={`${sectionPad} border-y border-[#5EEAD4]/15`}>
        <GlassRouteVisual />
      </TransportationBlock>

      {/* 8 — Dress code */}
      <DressCodeBlock tone={tone} className={sectionPad} />

      {/* 9 — Overlapping glass film cards gallery */}
      <section id="gallery" className={`${sectionPad} overflow-x-clip`}>
        <div className="mx-auto max-w-5xl px-6">
          <h2
            className="text-center text-3xl font-bold tracking-tight md:text-4xl"
            style={{ fontFamily: tone.fontDisplay }}
          >
            גלריה
          </h2>
          <p className="mt-2 text-center text-sm text-[#8B97B8]">כרטיסי זכוכית — שכבות שקופות</p>
          <div className="relative mx-auto mt-14 h-[380px] max-w-3xl md:h-[420px]">
            {stackImages.map((src, i) => (
              <motion.figure
                key={`${src}-${i}`}
                initial={{ opacity: 0, y: 24, rotate: 0 }}
                whileInView={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -3 : 3 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`${glass} absolute w-[46%] overflow-hidden md:w-[38%]`}
                style={{
                  right: `${8 + i * 11}%`,
                  top: `${i * 28}px`,
                  zIndex: i + 1,
                }}
              >
                <SafeImage src={src} alt="" className="aspect-[4/5] w-full object-cover" />
                <div className="absolute inset-0 border border-[#5EEAD4]/20" />
                <GlassShimmer />
                <figcaption className="absolute bottom-3 left-3 rounded-full border border-[#A78BFA]/40 bg-[#070B14]/60 px-3 py-1 text-[10px] font-bold text-[#5EEAD4] backdrop-blur-sm">
                  {String(i + 1).padStart(2, "0")}
                </figcaption>
              </motion.figure>
            ))}
          </div>
          <div className="mt-8 flex justify-center gap-2">
            {gallery.slice(5, 9).map((src, i) => (
              <div
                key={`strip-${src}-${i}`}
                className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#5EEAD4]/25 bg-white/[0.04] p-0.5 shadow-[0_0_16px_rgba(94,234,212,0.12)]"
              >
                <SafeImage src={src} alt="" className="h-full w-full rounded-lg object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10 — Quote */}
      <QuoteBlock tone={tone} className="border-y border-[#A78BFA]/15 bg-white/[0.03]" />

      {/* 11 — Accommodations */}
      <AccommodationsBlock tone={tone} className={sectionPad} />

      {/* 12 — FAQ */}
      <FaqBlock tone={tone} className={`${sectionPad} border-y border-[#5EEAD4]/15`} />

      {/* 13 — RSVP */}
      <RsvpBlock tone={tone} className={sectionPad} />

      {/* 14 — Contact */}
      <ContactPeopleBlock tone={tone} className={sectionPad} />

      {/* 15 — Final moment */}
      <FinalMomentBlock tone={tone} image={gallery[3] || heroImg} />

      <footer id="footer" className="border-t border-[#5EEAD4]/20 px-6 py-16 text-center">
        <p className="text-2xl font-bold tracking-tight">{c.coupleNames}</p>
        <p className="mt-3 text-[#5EEAD4]">{c.footerNote || "נתראה בחגיגה"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/30">{formatHebrewDate(c.weddingDate)}</p>
      </footer>
    </div>
  );
}
