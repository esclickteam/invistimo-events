"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { WeddingTemplate } from "@/types/weddingWebsite";

type Props = {
  template: WeddingTemplate;
  index: number;
};

export default function TemplateLivePreview({ template, index }: Props) {
  return (
    <article className="group relative">
      <div className="overflow-hidden rounded-[28px] border border-[#E8D5A8]/40 bg-[#1a1a1a] shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        {/* Live website iframe — scaled mobile preview */}
        <div className="relative h-[520px] overflow-hidden bg-black md:h-[580px]">
          <iframe
            src={`/wedding-website/${template.id}?embed=1`}
            title={`${template.name} preview`}
            loading="lazy"
            className="pointer-events-none absolute left-1/2 top-0 border-0"
            style={{
              width: "390px",
              height: "2800px",
              transform: "translateX(-50%) scale(0.52)",
              transformOrigin: "top center",
            }}
          />

          {/* Gradient overlay + CTA */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/50">
              #{String(index + 1).padStart(2, "0")} · Live Preview
            </p>
            <h2
              className="mt-1 font-['Cormorant_Garamond'] text-3xl font-semibold text-white"
            >
              {template.name}
            </h2>
            <p className="mt-1 text-sm text-white/75">{template.tagline}</p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#111] p-5">
          <p className="line-clamp-2 text-sm text-white/60">{template.description}</p>
          <Link
            href={`/wedding-website/${template.id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:scale-105"
          >
            פתיחת האתר המלא
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
