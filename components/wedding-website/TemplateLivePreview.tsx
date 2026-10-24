"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { WeddingTemplate } from "@/types/weddingWebsite";

type Props = {
  template: WeddingTemplate;
  index: number;
  /** Prefer sharp desktop capture — avoid narrow mobile strip in a huge black frame. */
  previewSrc?: string;
};

export default function TemplateLivePreview({ template, index, previewSrc }: Props) {
  const shot =
    previewSrc ||
    `/marketing/product/webp/desktop-wedding-${template.id}.webp`;

  return (
    <article className="group relative">
      <div className="overflow-hidden rounded-[28px] border border-[#E8D5A8]/40 bg-[#1a1a1a] shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        <div className="relative aspect-[16/10] overflow-hidden bg-[#111]">
          <Image
            src={shot}
            alt={`תבנית ${template.name} — תצוגת מחשב`}
            fill
            className="object-cover object-top transition duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 560px"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/50">
              #{String(index + 1).padStart(2, "0")} · {template.name}
            </p>
            <h2 className="mt-1 font-['Cormorant_Garamond'] text-2xl font-semibold text-white md:text-3xl">
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
