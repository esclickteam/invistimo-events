"use client";

import { useEffect } from "react";
import { repairWeddingImageUrl } from "@/lib/weddingWebsite/images";
import { loadWeddingFont } from "@/lib/weddingWebsite/fonts";
import { contrastOn } from "@/lib/weddingWebsite/styles";
import type { WeddingTemplate } from "@/types/weddingWebsite";

type Props = {
  template: WeddingTemplate;
  className?: string;
};

/**
 * Mini hero mockup for the template picker: the couple sees the actual palette,
 * type, and overlay of that template — not a leftover stock photo.
 */
export default function WeddingTemplateThumb({ template, className = "" }: Props) {
  const src = repairWeddingImageUrl(template.previewImage);
  const { theme } = template;
  const onAccent = contrastOn(theme.accent).on;
  const noir = template.id === "minimal-noir";
  const glass = template.id === "modern-glass";

  useEffect(() => {
    loadWeddingFont(theme.fontDisplay);
  }, [theme.fontDisplay]);

  return (
    <div className={`relative overflow-hidden bg-[#1a1410] ${className}`}>
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          filter: noir ? "grayscale(1) contrast(1.08)" : undefined,
          objectPosition: previewFocus(template.id),
        }}
      />
      <div className="absolute inset-0" style={{ background: theme.heroOverlay }} />
      {template.id === "garden-bloom" ? (
        <div className="absolute inset-0 bg-gradient-to-t from-[#1F3324]/45 via-transparent to-[#6B9E78]/15" />
      ) : null}
      {template.id === "sunset-blush" ? (
        <div className="absolute inset-0 bg-gradient-to-t from-[#E8788A]/35 via-transparent to-[#FFD4DC]/15" />
      ) : null}
      {template.id === "desert-rose" ? (
        <div className="absolute inset-0 bg-gradient-to-tr from-[#C4705A]/25 to-transparent" />
      ) : null}
      {template.id === "coastal-breeze" ? (
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#3D8BBA]/50 to-transparent" />
      ) : null}
      {template.id === "forest-enchanted" ? <Fireflies /> : null}
      {template.id === "midnight-velvet" ? (
        <div className="pointer-events-none absolute inset-2 rounded-[10px] border border-[#D4AF37]/35" />
      ) : null}

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-3 text-center">
        <div
          className={glass ? "rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md" : ""}
          style={{ color: "#fff" }}
        >
          <p
            className="text-[8px] font-bold uppercase tracking-[0.32em] opacity-80"
            style={{ fontFamily: theme.fontBody, letterSpacing: "0.32em" }}
          >
            {template.name}
          </p>
          <p
            className="mt-1 text-[17px] leading-tight"
            style={{
              fontFamily: theme.fontDisplay,
              fontWeight: noir ? 500 : 600,
              letterSpacing: template.id === "royal-ivory" ? "0.06em" : undefined,
            }}
          >
            עמית & בן
          </p>
          <p className="mt-0.5 text-[9px] font-semibold opacity-75" style={{ fontFamily: theme.fontBody }}>
            {template.tagline}
          </p>
          <span
            className="mt-2 inline-flex min-h-[22px] items-center px-3 text-[9px] font-black"
            style={{
              backgroundColor: theme.accent,
              color: onAccent,
              borderRadius: theme.radius,
              fontFamily: theme.fontBody,
            }}
          >
            אישור הגעה
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex h-1.5">
        {[theme.bg, theme.accent, theme.accentSoft, theme.text].map((color, index) => (
          <span key={`${color}-${index}`} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}

function previewFocus(id: string) {
  if (id === "coastal-breeze") return "50% 70%";
  if (id === "forest-enchanted") return "50% 40%";
  if (id === "modern-glass") return "50% 30%";
  if (id === "desert-rose") return "50% 60%";
  return "50% 45%";
}

function Fireflies() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {[
        ["18%", "32%"],
        ["72%", "28%"],
        ["58%", "62%"],
        ["30%", "70%"],
        ["82%", "55%"],
      ].map(([left, top], index) => (
        <span
          key={index}
          className="absolute h-1 w-1 rounded-full bg-[#7CB87A]"
          style={{ left, top, boxShadow: "0 0 8px #7CB87A" }}
        />
      ))}
    </div>
  );
}
