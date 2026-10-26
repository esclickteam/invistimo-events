"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { WeddingTemplate } from "@/types/weddingWebsite";
import LiveSiteFrame from "./LiveSiteFrame";

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

export default function FeaturedTemplateShowcase({ styles }: Props) {
  return (
    <div className="space-y-20 md:space-y-28">
      {styles.map((style, index) => {
        const reverse = index % 2 === 1;
        return (
          <article
            key={style.templateId}
            id={`style-${style.templateId}`}
            className="scroll-mt-24"
          >
            <div
              className={`grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 ${
                reverse ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="relative">
                <div className="overflow-hidden rounded-[22px] border border-[#D9C7A8]/60 bg-[#16120E] shadow-[0_36px_90px_rgba(42,30,18,0.18)]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#E8D5A8]/70">
                      Live demo · {style.template.name}
                    </p>
                    <p className="text-[10px] font-semibold text-white/35">
                      #{String(index + 1).padStart(2, "0")}
                    </p>
                  </div>
                  <LiveSiteFrame
                    templateId={style.templateId}
                    title={`${style.styleName} — תצוגה חיה`}
                    variant="desktop"
                    frameHeight={560}
                    className="[--ww-preview-scale:0.52] md:[--ww-preview-scale:0.62]"
                  />
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.75rem] border-[8px] border-[#1C1612] bg-[#0D0A08] shadow-[0_24px_60px_rgba(20,14,8,0.28)] sm:absolute sm:-bottom-8 sm:left-6 sm:mt-0 sm:w-[200px]">
                  <div className="mx-auto mt-1.5 h-1 w-14 rounded-full bg-white/15" aria-hidden />
                  <LiveSiteFrame
                    templateId={style.templateId}
                    title={`${style.styleName} — מובייל`}
                    variant="mobile"
                    frameHeight={360}
                    className="[--ww-preview-scale:0.58]"
                  />
                </div>
              </div>

              <div className={reverse ? "lg:pr-2" : "lg:pl-2"}>
                <p className="text-sm font-black tracking-[0.16em] text-[#7A5530]">
                  {style.styleName}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-ww-display)] text-3xl font-semibold leading-tight text-[#2A2118] md:text-4xl">
                  {style.hebrewLabel}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[#8A7560]">
                  תבנית במערכת: {style.template.name}
                </p>
                <p className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
                  {style.blurb}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#6B5746]">
                  {style.template.description}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href={`/wedding-website/${style.templateId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2A2118] px-7 py-3.5 text-sm font-black text-[#F7F1E8] transition hover:-translate-y-0.5 hover:bg-[#3A2B22]"
                  >
                    צפייה באתר לדוגמה
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link
                    href={`/wedding-website/${style.templateId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D4C0A0] bg-white/70 px-7 py-3.5 text-sm font-black text-[#5E4735] transition hover:bg-white"
                  >
                    גלילה מלאה של האתר
                  </Link>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
