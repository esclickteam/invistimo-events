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
    <article className="group relative overflow-x-clip">
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#141414] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="relative h-[480px] overflow-hidden bg-black md:h-[560px]">
          <iframe
            src={`/wedding-website/${template.id}?embed=1`}
            title={`${template.name} preview`}
            loading="lazy"
            className="pointer-events-none absolute left-1/2 top-0 border-0"
            style={{
              width: "390px",
              height: "2800px",
              transform: "translateX(-50%) scale(0.5)",
              transformOrigin: "top center",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">
              #{String(index + 1).padStart(2, "0")} · Live Preview
            </p>
            <h2 className="mt-2 font-['Cormorant_Garamond'] text-3xl font-semibold text-white">
              {template.name}
            </h2>
            <p className="mt-1 text-sm text-white/70">{template.tagline}</p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#101010] p-5">
          <p className="line-clamp-2 text-sm leading-relaxed text-white/55">
            {template.description}
          </p>
          <Link
            href={`/wedding-website/${template.id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#C9A962] hover:text-white"
          >
            פתיחת האתר המלא
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
