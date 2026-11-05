"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { WeddingTemplate } from "@/types/weddingWebsite";

export type FeaturedStyle = {
  templateId: string;
  styleName: string;
  hebrewLabel: string;
  blurb: string;
  template: WeddingTemplate;
};

type Props = {
  styles: FeaturedStyle[];
};

function previewPaths(templateId: string) {
  const desktop = `/marketing/wedding-website/previews/${templateId}-desktop.jpg`;
  const mobile =
    templateId === "midnight-velvet"
      ? desktop
      : `/marketing/wedding-website/previews/${templateId}-mobile.jpg`;
  return { desktop, mobile };
}

export default function FeaturedTemplateShowcase({ styles }: Props) {
  const [active, setActive] = useState(0);
  const style = styles[active] ?? styles[0];
  if (!style) return null;
  const shots = previewPaths(style.templateId);
  const demoHref = `/wedding-website/${style.templateId}`;

  return (
    <div>
      <style>{`
        @keyframes ww-design-in {
          from { opacity: 1; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
        .ww-design-stage { animation: ww-design-in 0.55s cubic-bezier(0.22, 1, 0.36, 1); }
        @media (prefers-reduced-motion: reduce) {
          .ww-design-stage { animation: none; }
        }
      `}</style>

      <div className="flex gap-2 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {styles.map((item, index) => {
          const on = index === active;
          return (
            <button
              key={item.templateId}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(index)}
              className={`shrink-0 border px-4 py-3 text-right transition-colors ${
                on
                  ? "border-[#2A2118] bg-[#2A2118] text-[#F7F1E8]"
                  : "border-[#D4C0A0] bg-[#FFFDF8] text-[#5E4735] hover:border-[#2A2118]"
              }`}
            >
              <span className="block text-[10px] font-bold tracking-[0.16em]">
                {item.styleName}
              </span>
              <span className="mt-1 block text-sm font-black">{item.hebrewLabel}</span>
            </button>
          );
        })}
      </div>

      <article key={style.templateId} id={`style-${style.templateId}`} className="ww-design-stage scroll-mt-24">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.45fr)_0.7fr] lg:gap-10">
          <div className="min-w-0 border border-[#D9C7A8]/70 bg-[#FFFDF8] p-3 shadow-[0_24px_60px_rgba(42,30,18,0.10)] sm:p-5">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#7A5530]">
                {style.template.name}
              </p>
              <p className="text-[10px] font-semibold text-[#8A7560]/70" dir="ltr">
                {String(active + 1).padStart(2, "0")} / {String(styles.length).padStart(2, "0")}
              </p>
            </div>

            <div className="flex items-end gap-3 sm:gap-5">
              <div className="min-w-0 flex-1 overflow-hidden border border-[#1C1612] bg-[#14100C] shadow-[0_18px_40px_rgba(42,30,18,0.16)]">
                <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#1E1812] px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-[#C9A962]/80" />
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  <span className="mr-2 truncate text-[11px] text-white/50">{style.template.name}</span>
                </div>
                <Image
                  src={shots.desktop}
                  alt={`צילום מסך אמיתי של תבנית ${style.hebrewLabel} (${style.template.name}) — מחשב`}
                  width={1440}
                  height={900}
                  unoptimized
                  className="block h-auto w-full"
                  sizes="(max-width: 1024px) 100vw, 62vw"
                  priority={active < 2}
                />
              </div>

              <div className="w-[92px] shrink-0 sm:w-[132px] md:w-[156px] lg:w-[176px]">
                <div className="overflow-hidden rounded-[1.35rem] border-[6px] border-[#1C1612] bg-[#0D0A08] shadow-[0_18px_36px_rgba(20,14,8,0.28)] sm:rounded-[1.6rem] sm:border-[8px]">
                  <div className="mx-auto mt-1.5 h-1 w-8 rounded-full bg-white/20 sm:w-10" aria-hidden />
                  <div className="relative aspect-[9/16] w-full overflow-hidden">
                    <Image
                      src={shots.mobile}
                      alt={`צילום מסך אמיתי של תבנית ${style.hebrewLabel} — מובייל`}
                      fill
                      unoptimized
                      className="object-cover object-top"
                      sizes="176px"
                    />
                  </div>
                  <div className="mx-auto mb-1.5 h-1 w-8 rounded-full bg-white/25" aria-hidden />
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-black tracking-[0.16em] text-[#7A5530]">{style.styleName}</p>
            <h3 className="mt-2 font-['Cormorant_Garamond'] text-3xl font-semibold leading-tight text-[#2A2118] md:text-[2.6rem]">
              {style.hebrewLabel}
            </h3>
            <p className="mt-2 text-sm font-semibold text-[#8A7560]">תבנית {style.template.name}</p>
            <p className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">{style.blurb}</p>
            <p className="mt-3 text-sm leading-7 text-[#6B5746]">{style.template.tagline}</p>
            <div className="mt-7 flex flex-col gap-3">
              <Link
                href={demoHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center bg-[#2A2118] px-7 py-3.5 text-sm font-black text-[#F7F1E8] transition hover:bg-[#3A2B22]"
              >
                פתיחת דמו פעיל
              </Link>
              <Link
                href={demoHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center border border-[#D4C0A0] bg-white px-7 py-3.5 text-sm font-black text-[#5E4735] transition hover:bg-[#FFFDF8]"
              >
                גלילה מלאה של העיצוב
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
