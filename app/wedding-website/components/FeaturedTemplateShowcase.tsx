"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
  // Midnight Velvet live mobile hero is letterboxed by the template video asset;
  // show a cover-crop of the desktop capture inside the phone frame instead.
  const mobile =
    templateId === "midnight-velvet"
      ? desktop
      : `/marketing/wedding-website/previews/${templateId}-mobile.jpg`;
  return { desktop, mobile };
}

export default function FeaturedTemplateShowcase({ styles }: Props) {
  return (
    <div className="space-y-16 md:space-y-24">
      {styles.map((style, index) => {
        const reverse = index % 2 === 1;
        const shots = previewPaths(style.templateId);
        return (
          <article
            key={style.templateId}
            id={`style-${style.templateId}`}
            className="scroll-mt-24"
          >
            <div
              className={`grid items-center gap-8 lg:gap-10 ${
                reverse
                  ? // order swap: text lands in col1, visual in col2 — so col2 must be the wide track
                    "lg:grid-cols-[0.62fr_minmax(0,1.38fr)] lg:[&>*:first-child]:order-2"
                  : "lg:grid-cols-[minmax(0,1.38fr)_0.62fr]"
              }`}
            >
              <div className="min-w-0">
                <div className="rounded-[22px] border border-[#D9C7A8]/55 bg-[#FFFDF8] p-3 shadow-[0_24px_60px_rgba(42,30,18,0.10)] sm:p-4">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#7A5530]">
                      {style.template.name}
                    </p>
                    <p className="text-[10px] font-semibold text-[#8A7560]/70">
                      #{String(index + 1).padStart(2, "0")}
                    </p>
                  </div>

                  {/* Desktop is the star; phone is a slim companion — never taller / overlapping */}
                  <div className="flex items-end gap-3 sm:gap-4">
                    <div className="min-w-0 flex-1 overflow-hidden rounded-[14px] border border-[#E6D4B4]/70 bg-[#F3EBE0] shadow-[0_10px_28px_rgba(42,30,18,0.08)]">
                      <Image
                        src={shots.desktop}
                        alt={`צילום מסך אמיתי של תבנית ${style.hebrewLabel} (${style.template.name}) — מחשב`}
                        width={1440}
                        height={900}
                        unoptimized
                        className="block h-auto w-full"
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        priority={index < 2}
                      />
                    </div>

                    <div className="hidden w-[100px] shrink-0 sm:block md:w-[112px] lg:w-[120px]">
                      <div className="overflow-hidden rounded-[1.15rem] border-[5px] border-[#1C1612] bg-[#0D0A08] shadow-[0_14px_32px_rgba(20,14,8,0.22)]">
                        <div
                          className="mx-auto mt-1 h-0.5 w-7 rounded-full bg-white/20"
                          aria-hidden
                        />
                        <div className="relative aspect-[9/16] w-full overflow-hidden">
                          <Image
                            src={shots.mobile}
                            alt={`צילום מסך אמיתי של תבנית ${style.hebrewLabel} — מובייל`}
                            fill
                            unoptimized
                            className="object-cover object-top"
                            sizes="120px"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phone under desktop on small screens only — no overlap */}
                  <div className="mt-4 flex justify-center sm:hidden">
                    <div className="w-[168px] overflow-hidden rounded-[1.35rem] border-[7px] border-[#1C1612] bg-[#0D0A08] shadow-[0_14px_32px_rgba(20,14,8,0.22)]">
                      <div
                        className="mx-auto mt-1.5 h-1 w-10 rounded-full bg-white/20"
                        aria-hidden
                      />
                      <div className="relative aspect-[9/16] w-full overflow-hidden">
                        <Image
                          src={shots.mobile}
                          alt={`צילום מסך אמיתי של תבנית ${style.hebrewLabel} — מובייל`}
                          fill
                          unoptimized
                          className="object-cover object-top"
                          sizes="168px"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={reverse ? "lg:pr-1" : "lg:pl-1"}>
                <p className="text-sm font-black tracking-[0.16em] text-[#7A5530]">
                  {style.styleName}
                </p>
                <h3 className="mt-2 font-['Cormorant_Garamond'] text-3xl font-semibold leading-tight text-[#2A2118] md:text-[2.35rem]">
                  {style.hebrewLabel}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[#8A7560]">
                  תבנית במערכת: {style.template.name}
                </p>
                <p className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
                  {style.blurb}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#6B5746]">
                  {style.template.tagline}
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
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D4C0A0] bg-white/85 px-7 py-3.5 text-sm font-black text-[#5E4735] transition hover:bg-white"
                  >
                    צפו בגלילה מלאה
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
