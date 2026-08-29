"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { WeddingTemplate } from "@/types/weddingWebsite";
import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";

type Props = {
  template: WeddingTemplate;
  index: number;
};

/**
 * Premium light card that shows a live miniature of the template's real Hero
 * (same site as /wedding-website/[id]?embed=1) — not a generic thumbnail.
 */
export default function TemplateHeroCard({ template, index }: Props) {
  const names = WEDDING_DEMO_CONTENT.coupleNames;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(index * 0.04, 0.28), duration: 0.55 }}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E8DFD2] bg-white shadow-[0_18px_50px_rgba(60,45,30,0.08)]"
    >
      {/* Real hero miniature */}
      <div className="relative aspect-[16/11] overflow-hidden bg-[#F7F1E8]">
        <iframe
          src={`/wedding-website/${template.id}?embed=1`}
          title={`${template.name} hero preview`}
          loading="lazy"
          className="pointer-events-none absolute left-1/2 top-0 border-0"
          style={{
            width: "1280px",
            height: "900px",
            transform: "translateX(-50%) scale(0.42)",
            transformOrigin: "top center",
          }}
        />
        {/* Soft bottom fade only — keep hero readable */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/70 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-[#8A7560] shadow-sm backdrop-blur">
          #{String(index + 1).padStart(2, "0")}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.28em]"
          style={{ color: template.theme.accent }}
        >
          {template.mood}
        </p>
        <h2
          className="mt-2 text-[1.75rem] font-light leading-tight text-[#2A2118]"
          style={{ fontFamily: template.theme.fontDisplay }}
        >
          {template.name}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#8A7560]">{template.tagline}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#6E6256]">
          {template.description}
        </p>
        <p className="mt-3 text-xs font-semibold text-[#A09080]">
          Hero לדוגמה · {names}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <Link
            href={`/wedding-website/${template.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-full px-5 py-3 text-sm font-black text-white transition hover:opacity-95"
            style={{ backgroundColor: template.theme.accent }}
          >
            תצוגה מקדימה
          </Link>
          <Link
            href={`/wedding-website/${template.id}`}
            className="inline-flex items-center justify-center rounded-full border border-[#E0D4C4] bg-[#FBF7F1] px-5 py-3 text-sm font-black text-[#5C4A3A] transition hover:border-[#D4AF7A]"
          >
            פתיחה מלאה
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
