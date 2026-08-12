"use client";

import Link from "next/link";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import WeddingActionBar from "../shared/WeddingActionBar";
import WatercolorReveal from "../illustrations/WatercolorReveal";
import ShuttleRide from "../illustrations/ShuttleRide";
import MapPinPulse from "../illustrations/MapPinPulse";
import ScrollRoute from "../illustrations/ScrollRoute";
import {
  type BlockTone,
  SiteSection,
  WelcomeBlock,
  HowWeMetBlock,
  CountdownBlock,
  DateRevealBlock,
  CouplePhotosBlock,
  FullBleedPhoto,
  ScheduleBlock,
  LocationBlock,
  DressCodeBlock,
  TransportationBlock,
  AccommodationsBlock,
  QuoteBlock,
  RsvpBlock,
  GiftsBlock,
  FaqBlock,
  FinalMomentBlock,
} from "../shared/FullLengthBlocks";
import { SafeImage } from "../shared/SafeMedia";

const ROSE = "#C4705A";

const tone: BlockTone = {
  accent: ROSE,
  muted: "#9A6B5C",
  surface: "#FBF5F0",
  border: ROSE,
  fontDisplay: "Cormorant Garamond",
  radius: "0",
  buttonClass: "bg-[#C4705A] px-6 py-3 text-sm font-bold text-white",
  outlineButtonClass: "border border-[#C4705A] px-6 py-3 text-sm font-bold text-[#C4705A]",
};

function RoseBar() {
  return (
    <div
      className="mx-auto my-6 h-1 w-16 bg-[#C4705A]"
      style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
    />
  );
}

/** Story wrapped in watercolor reveal */
function WatercolorStoryBlock({ tone: t, className = "" }: { tone: BlockTone; className?: string }) {
  const content = useWeddingContent();
  const paragraphs =
    content.storyParagraphs?.length > 0
      ? content.storyParagraphs
      : ["אנחנו שמחים לחלוק איתכם את היום המיוחד שלנו."];
  return (
    <SiteSection id="our-story" className={className}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-4xl font-light" style={{ fontFamily: t.fontDisplay }}>
          הסיפור שלנו
        </h2>
        <RoseBar />
        <WatercolorReveal className="rounded-sm">
          <div className="space-y-5 bg-[#FBF5F0]/80 px-6 py-10 text-base leading-relaxed text-[#9A6B5C] md:text-lg">
            {paragraphs.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>
        </WatercolorReveal>
      </div>
    </SiteSection>
  );
}

export default function DesertRoseSite({ template, embed, hideDemoBadge }: TemplateProps) {
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
          accent={ROSE}
          text="#FFFFFF"
          surface="rgba(251,245,240,0.94)"
          border="rgba(196,112,90,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] px-4 py-2 text-xs font-bold text-[#C4705A] shadow-lg"
          style={{
            background: "rgba(251,245,240,0.95)",
            clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)",
            border: "1px solid rgba(196,112,90,0.35)",
          }}
        >
          ← תבניות
        </Link>
      )}

      {/* 1 · Hero — diagonal clip-path */}
      <section id="hero" className="relative min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImg})`,
            clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 100%)",
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-l from-[#FBF5F0]/95 via-[#FBF5F0]/55 to-transparent"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 100%)" }}
        />
        <div className="relative z-10 flex min-h-[100svh] items-center px-6 py-24 md:px-12">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#C4705A]">Desert Rose</p>
            <h1 className="mt-4 font-['Cormorant_Garamond'] text-[clamp(3rem,9vw,5.8rem)] font-light leading-[0.95]">
              {c.coupleNames}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#9A6B5C] md:text-lg">{c.heroSubtitle}</p>
            <p className="mt-4 font-['Cormorant_Garamond'] text-xl text-[#C4705A]">
              {formatHebrewDate(c.weddingDate)}
              {c.weddingTime ? ` · ${c.weddingTime}` : ""}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="#rsvp"
                className="bg-[#C4705A] px-8 py-3.5 text-sm font-bold text-white"
                style={{ clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)" }}
              >
                אישור הגעה
              </a>
              <a
                href="#transportation"
                className="border border-[#C4705A] px-8 py-3.5 text-sm font-bold text-[#C4705A]"
                style={{ clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)" }}
              >
                הזמנת הסעה
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2 · Welcome */}
      <WelcomeBlock tone={tone} title="הזמנה חמה" className="py-20" />

      {/* 3 · How we met */}
      <HowWeMetBlock tone={tone} image={images[0]} className="bg-[#F3E8E0] py-20" />

      {/* 4 · Story — watercolor */}
      <WatercolorStoryBlock tone={tone} className="py-20" />

      {/* 5 · Date reveal */}
      <DateRevealBlock tone={tone} className="bg-[#F3E8E0] py-20" />

      {/* 6 · Visual break */}
      <FullBleedPhoto src={images[2] || heroImg} caption="שמש, חול ופרחים — כמו האהבה שלנו" />

      {/* 7 · Countdown */}
      <CountdownBlock tone={tone} variant="editorial" className="py-20" />

      {/* 8 · Schedule */}
      <ScheduleBlock tone={tone} className="bg-[#F3E8E0] py-20">
        <RoseBar />
      </ScheduleBlock>

      {/* 9 · Couple photos */}
      <CouplePhotosBlock images={images} tone={tone} layout="split" className="py-20" />

      {/* 10 · Location + route */}
      <LocationBlock tone={tone} className="bg-[#F3E8E0] py-20">
        <ScrollRoute accent={ROSE} />
        <MapPinPulse accent={ROSE} />
        <RoseBar />
      </LocationBlock>

      {/* 11 · Dress code */}
      <DressCodeBlock tone={tone} className="py-20" />

      {/* 12 · Transportation */}
      <TransportationBlock tone={tone} className="bg-[#F3E8E0] py-20">
        <ShuttleRide accent={ROSE} className="mb-8" />
      </TransportationBlock>

      {/* 13 · Gallery — watercolor frame */}
      <SiteSection id="gallery" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">גלריה</h2>
          <RoseBar />
          <WatercolorReveal>
            <div className="mt-8 columns-2 gap-3 md:columns-3">
              {images.slice(0, 9).map((src, i) => (
                <figure
                  key={`${src}-${i}`}
                  className="mb-3 break-inside-avoid overflow-hidden"
                  style={{
                    clipPath:
                      i % 2 === 0
                        ? "polygon(0 0, 100% 4%, 96% 100%, 0 96%)"
                        : "polygon(4% 0, 100% 0, 100% 96%, 0 100%)",
                  }}
                >
                  <SafeImage
                    src={src}
                    alt=""
                    className={`w-full object-cover ${i % 3 === 1 ? "aspect-[3/4]" : "aspect-square"}`}
                  />
                </figure>
              ))}
            </div>
          </WatercolorReveal>
        </div>
      </SiteSection>

      {/* 14 · Accommodations */}
      <AccommodationsBlock tone={tone} className="bg-[#F3E8E0] py-20" />

      {/* 15 · Quote */}
      <QuoteBlock tone={tone} />

      {/* 16 · RSVP */}
      <RsvpBlock tone={tone} className="py-20" />

      {/* 17 · Gifts */}
      <GiftsBlock tone={tone} className="bg-[#F3E8E0] py-20" />

      {/* 18 · FAQ */}
      <FaqBlock tone={tone} className="py-20" />

      {/* 19 · Final moment */}
      <FinalMomentBlock tone={tone} image={images[7] || heroImg} />

      <footer id="footer" className="bg-[#4A2E28] px-6 py-12 text-center text-[#FBF5F0]">
        <p className="font-['Cormorant_Garamond'] text-2xl font-light">{c.coupleNames}</p>
        <p className="mt-3 text-sm text-[#E8C4B8]">{c.footerNote || "נתראה במדבר הפורח"}</p>
        <p className="mt-4 text-xs tracking-[0.25em] text-white/35">{formatHebrewDate(c.weddingDate)}</p>
      </footer>
    </div>
  );
}
