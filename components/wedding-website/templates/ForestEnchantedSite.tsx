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
import FloatingPetals from "../illustrations/FloatingPetals";
import VineGrow from "../illustrations/VineGrow";
import PathDrawTimeline from "../illustrations/PathDrawTimeline";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";
import ChuppahMeet from "../illustrations/ChuppahMeet";
import BuffetSpread from "../illustrations/BuffetSpread";
import DanceParty from "../illustrations/DanceParty";
import {
  type BlockTone,
  SiteSection,
  WelcomeBlock,
  ProposalBlock,
  CountdownBlock,
  LocationBlock,
  TransportationBlock,
  DressCodeBlock,
  QuoteBlock,
  FaqBlock,
  RsvpBlock,
  GiftsBlock,
  FinalMomentBlock,
  FullBleedPhoto,
  RichGalleryGrid,
} from "../shared/FullLengthBlocks";

const ACCENT = "#7CB87A";
const MUTED = "#8AA892";

const baseTone: BlockTone = {
  accent: ACCENT,
  muted: MUTED,
  surface: "#132018",
  border: "rgba(124,184,122,0.35)",
  fontDisplay: "'Libre Baskerville', serif",
  radius: "0",
  buttonClass:
    "rounded-full bg-[#7CB87A] px-6 py-3 text-sm font-bold text-[#0F1810]",
  outlineButtonClass:
    "rounded-full border border-[#7CB87A]/50 px-6 py-3 text-sm font-bold text-[#E8F0E4]",
};

function MossRule() {
  return (
    <div className="mx-auto my-5 flex max-w-[160px] items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#7CB87A] to-transparent" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#7CB87A]" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#7CB87A] to-transparent" />
    </div>
  );
}

function Chapter({
  num,
  title,
  children,
  className = "",
}: {
  num: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p
        className="text-[10px] font-bold uppercase tracking-[0.45em] text-[#7CB87A]"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {num}
      </p>
      <h3 className="mt-2 text-2xl font-normal md:text-3xl" style={{ fontFamily: "'Libre Baskerville', serif" }}>
        {title}
      </h3>
      <MossRule />
      {children}
    </div>
  );
}

export default function ForestEnchantedSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const c = useWeddingContent();
  const tone = useResolvedTone(baseTone);
  useWeddingThemeOverrides();
  const images = sanitizeGallery(
    c.galleryUrls?.length ? c.galleryUrls : template.galleryImages,
    template.galleryImages
  );
  const gallery = images.slice(0, 9);
  const heroImg = c.heroImageUrl || template.heroImage;
  const schedule =
    c.schedule.length > 0
      ? c.schedule
      : [{ time: c.weddingTime || "19:30", title: "תחילת האירוע", description: "" }];

  return (
    <div
      dir="rtl"
      className="wedding-website-root relative min-h-screen overflow-x-clip bg-[#0F1810] text-[#E8F0E4]"
      style={{ fontFamily: "'Libre Baskerville', serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent={ACCENT}
          text="#0F1810"
          surface="rgba(15,24,16,0.94)"
          border="rgba(124,184,122,0.35)"
        />
      )}
      {!embed && <FloatingPetals color={ACCENT} count={8} />}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#7CB87A]/40 bg-[#0F1810]/90 px-4 py-2 text-xs font-bold text-[#E8F0E4] shadow-lg"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          ← תבניות
        </Link>
      )}

      {/* 1 — Forest hero */}
      <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImg})` }}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 18, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1810] via-[#0F1810]/55 to-[#0F1810]/25" />
        <div className="relative z-10 w-full px-6 pb-20 text-center">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#7CB87A]"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Under the Trees
          </p>
          <h1 className="mt-4 text-[clamp(2.6rem,8vw,5rem)] font-normal leading-tight">
            <EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText>
          </h1>
          <MossRule />
          <p className="mx-auto max-w-lg text-base text-[#8AA892] md:text-lg"><EditableText field="heroSubtitle" as="span" multiline>{c.heroSubtitle}</EditableText></p>
          <p className="mt-4 text-lg text-[#7CB87A]">
            {formatHebrewDate(c.weddingDate)}
            {c.weddingTime ? ` · ${c.weddingTime}` : ""}
          </p>
          <div
            className="mt-10 flex flex-wrap justify-center gap-3"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            <a href="#rsvp" className={tone.buttonClass}>
              אישור הגעה
            </a>
            <a href="#transportation" className={tone.outlineButtonClass}>
              הזמנת הסעה
            </a>
          </div>
        </div>
      </section>

      {/* 2 — Welcome prologue */}
      <WelcomeBlock tone={tone} className="py-16 md:py-20" title="פתיחה" />

      {/* 3 — Chapter I: How we met */}
      <SiteSection id="how-we-met" className="relative bg-[#132018] py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <Chapter num="פרק א׳" title="איך נפגשנו">
            <p className="text-base leading-[1.9] text-[#8AA892] md:text-lg">
              {c.howWeMet || "הסיפור שלנו התחיל במבט אחד — ומאז לא הפסקנו לחייך."}
            </p>
          </Chapter>
          {gallery[0] ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 overflow-hidden border border-[#7CB87A]/25"
            >
              <SafeImage src={gallery[0]} alt="" className="aspect-[16/9] w-full object-cover" />
            </motion.div>
          ) : null}
        </div>
      </SiteSection>

      {/* 4 — FullBleed forest path */}
      {gallery[1] ? (
        <FullBleedPhoto src={gallery[1]} caption="שביל אל החגיגה" />
      ) : null}

      {/* 5 — Chapter II: Story */}
      <SiteSection id="our-story" className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Chapter num="פרק ב׳" title="הסיפור שלנו">
            <div className="space-y-5 text-base leading-relaxed text-[#8AA892] md:text-lg">
              {(c.storyParagraphs.length
                ? c.storyParagraphs
                : ["אנחנו שמחים לחלוק איתכם את היום המיוחד שלנו."]
              ).map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
          </Chapter>
        </div>
      </SiteSection>

      {/* 6 — Chapter III: Proposal */}
      <ProposalBlock tone={tone} className="bg-[#132018] py-16 md:py-20" image={gallery[2]} />

      {/* 7 — PathDraw timeline schedule */}
      <SiteSection id="schedule" className="relative py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-6">
          <Chapter num="פרק ד׳" title="לוח זמנים">
            <p className="mb-8 text-center text-sm text-[#8AA892]">השביל אל החגיגה</p>
          </Chapter>
          <PathDrawTimeline items={schedule} accent={ACCENT} text="#E8F0E4" muted={MUTED} />
          <ChuppahMeet accent={ACCENT} className="mt-6" />
          <BuffetSpread accent={ACCENT} className="mt-2" />
          <DanceParty accent={ACCENT} className="mt-2" />
        </div>
      </SiteSection>

      {/* 8 — Countdown */}
      <CountdownBlock tone={tone} className="bg-[#132018] py-16 md:py-20" variant="glow" />

      {/* 9 — Location with vine */}
      <LocationBlock tone={tone} className="py-16 md:py-20">
        <VineGrow color={ACCENT} className="mb-2" />
        <MapPinPulse accent={ACCENT} />
      </LocationBlock>

      {/* 10 — Transportation */}
      <TransportationBlock tone={tone} className="bg-[#132018] py-16 md:py-20">
        <ShuttleRide accent={ACCENT} className="mb-8" />
      </TransportationBlock>

      {/* 11 — Dress code */}
      <DressCodeBlock tone={tone} className="py-16 md:py-20" />

      {/* 12 — Gallery */}
      <RichGalleryGrid
        images={gallery}
        tone={tone}
        title="רגעים ביער"
        max={8}
        className="bg-[#132018] py-16 md:py-20"
      />

      {/* 13 — Quote interlude */}
      <QuoteBlock tone={tone} className="border-y border-[#7CB87A]/20 py-16 md:py-20" />

      {/* 14 — FAQ */}
      <FaqBlock tone={tone} className="py-16 md:py-20" />

      {/* 15 — RSVP */}
      <RsvpBlock tone={tone} className="bg-[#132018] py-16 md:py-20" />

      {/* 16 — Gifts epilogue */}
      <GiftsBlock tone={tone} className="py-16 md:py-20" />

      {/* Final moment */}
      <FinalMomentBlock tone={tone} image={gallery[3] || heroImg} />

      <footer id="footer" className="relative border-t border-[#7CB87A]/20 px-6 py-16 text-center">
        <p className="text-3xl font-normal"><EditableText field="coupleNames" as="span">{c.coupleNames}</EditableText></p>
        <MossRule />
        <p className="text-[#7CB87A]">{c.footerNote || "נתראה ביער"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-[#8AA892]/60">
          {formatHebrewDate(c.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
