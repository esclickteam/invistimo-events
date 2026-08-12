"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import FilmStripGallery from "../illustrations/FilmStripGallery";
import WeddingActionBar from "../shared/WeddingActionBar";
import {
  type BlockTone,
  WelcomeBlock,
  StoryBlock,
  DateRevealBlock,
  CountdownBlock,
  ScheduleBlock,
  LocationBlock,
  DressCodeBlock,
  TransportationBlock,
  QuoteBlock,
  FaqBlock,
  RsvpBlock,
  ContactPeopleBlock,
  FinalMomentBlock,
  FullBleedPhoto,
  ScrollProgressLine,
} from "../shared/FullLengthBlocks";

const tone: BlockTone = {
  accent: "#111111",
  muted: "#666666",
  surface: "#ffffff",
  border: "#111111",
  fontDisplay: "'Montserrat', sans-serif",
  radius: "0",
  buttonClass:
    "bg-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white",
  outlineButtonClass:
    "border border-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em]",
};

const sectionPad = "border-t border-black py-16 md:py-20";

function Rule({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-black ${className}`} />;
}

function splitNames(names: string) {
  if (names.includes("&")) {
    const [a, b] = names.split("&").map((s) => s.trim());
    return [a || names, b || ""];
  }
  if (names.includes(" ו")) {
    const [a, b] = names.split(" ו").map((s) => s.trim());
    return [a || names, b || ""];
  }
  const parts = names.trim().split(/\s+/);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(" ")];
  return [names, ""];
}

export default function MinimalNoirSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  useWeddingThemeOverrides();
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages
  );
  const gallery = images.slice(0, 9);
  const [nameA, nameB] = splitNames(c.coupleNames);

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-white text-[#111] selection:bg-black selection:text-white"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent="#111111"
          text="#FFFFFF"
          surface="rgba(255,255,255,0.94)"
          border="rgba(0,0,0,0.2)"
        />
      )}
      {!embed && <ScrollProgressLine color="#111" />}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] border border-black bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em]"
        >
          ← תבניות
        </Link>
      )}

      {/* 1 — Hero typography */}
      <section
        id="hero"
        className={`relative flex min-h-[100svh] flex-col justify-center overflow-x-clip px-6 md:px-12 lg:px-16 ${embed ? "py-16" : "pt-10"}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-neutral-500">
          Save the Date
        </p>
        <div className="mt-8 grid gap-2 md:grid-cols-2 md:gap-8">
          <motion.h1
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-[clamp(3.2rem,12vw,9rem)] font-black leading-[0.85] tracking-[-0.04em]"
          >
            {nameA}
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-[clamp(3.2rem,12vw,9rem)] font-black leading-[0.85] tracking-[-0.04em] md:self-end md:text-left"
          >
            {nameB ? (c.coupleNames.includes("&") ? `& ${nameB}` : `ו${nameB}`) : ""}
          </motion.h1>
        </div>
        <Rule className="my-8 max-w-md" />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-md text-sm leading-relaxed text-neutral-600"
        >
          {c.heroSubtitle}
        </motion.p>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.3em]">
          {formatHebrewDate(c.weddingDate)}
          {c.weddingTime ? ` — ${c.weddingTime}` : ""}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="#rsvp"
            className="bg-black px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white"
          >
            אישור הגעה
          </a>
          <a
            href="#transportation"
            className="border border-black px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em]"
          >
            הזמנת הסעה
          </a>
        </div>
      </section>

      {/* 2 — Welcome */}
      <WelcomeBlock
        tone={tone}
        className={sectionPad}
        title="ברוכים הבאים"
      />

      {/* 3 — FullBleed break */}
      {gallery[0] ? (
        <FullBleedPhoto src={gallery[0]} caption={c.romanticQuote || undefined} />
      ) : null}

      {/* 4 — Story sparse */}
      <StoryBlock tone={tone} className={`${sectionPad} max-w-2xl mx-auto`} title="הסיפור שלנו" />

      {/* 5 — Date reveal */}
      <DateRevealBlock tone={tone} className={sectionPad} />

      {/* 6 — Countdown */}
      <CountdownBlock tone={tone} className={`${sectionPad} bg-neutral-50`} variant="editorial" />

      {/* 7 — Schedule */}
      <ScheduleBlock tone={tone} className={sectionPad}>
        <Rule className="mx-auto mt-4 mb-8 max-w-[120px]" />
      </ScheduleBlock>

      {/* 8 — Location */}
      <LocationBlock tone={tone} className={`${sectionPad} bg-neutral-50`}>
        <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-500">
          Venue
        </p>
      </LocationBlock>

      {/* 9 — Dress code */}
      <DressCodeBlock tone={tone} className={sectionPad} />

      {/* 10 — Transportation */}
      <TransportationBlock tone={tone} className={`${sectionPad} bg-neutral-50`} />

      {/* 11 — Film strip gallery */}
      <section id="gallery" className={`${sectionPad} overflow-x-clip px-0`}>
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.4em]">גלריה</h2>
          <Rule className="mx-auto mt-4 mb-10 max-w-[80px]" />
        </div>
        <FilmStripGallery images={gallery.slice(0, 8)} />
      </section>

      {/* 12 — Quote */}
      <QuoteBlock tone={tone} className="border-t border-black" />

      {/* 13 — FAQ */}
      <FaqBlock tone={tone} className={sectionPad} />

      {/* 14 — RSVP */}
      <RsvpBlock tone={tone} className={`${sectionPad} bg-neutral-50`} />

      {/* 15 — Contact */}
      <ContactPeopleBlock tone={tone} className={sectionPad} />

      {/* 16 — Final moment */}
      {gallery[1] ? (
        <FinalMomentBlock tone={tone} image={gallery[1]} />
      ) : (
        <FinalMomentBlock tone={tone} className="border-t border-black" />
      )}

      {/* Footer */}
      <footer id="footer" className="border-t border-black px-6 py-16 text-center">
        <p className="text-2xl font-black tracking-tight">{c.coupleNames}</p>
        <Rule className="mx-auto my-6 max-w-[60px]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-500">
          {c.footerNote || "נתראה"}
        </p>
        <p className="mt-4 text-[10px] tracking-[0.25em] text-neutral-400">
          {formatHebrewDate(c.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
