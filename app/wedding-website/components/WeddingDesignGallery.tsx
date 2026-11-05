"use client";

import Link from "next/link";
import WeddingLiveFrame from "./WeddingLiveFrame";
import { wwPrimary } from "./WeddingWebsiteHero";
import type { FeaturedStyle } from "./FeaturedTemplateShowcase";

function poster(templateId: string, mode: "desktop" | "phone") {
  return `/marketing/wedding-website/previews/${templateId}-${mode === "desktop" ? "desktop" : "mobile"}.jpg`;
}

function OpenSite({ href }: { href: string }) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className={wwPrimary}>
      לצפייה באתר המלא
    </Link>
  );
}

function Copy({ style, index }: { style: FeaturedStyle; index: number }) {
  return (
    <div>
      <p className="text-sm font-black tracking-[0.16em] text-[#842B4C]">
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="mt-2 font-['Cormorant_Garamond'] text-4xl font-semibold leading-none text-[#42182F] md:text-5xl">
        {style.template.name}
      </h3>
      <p className="mt-3 text-base font-semibold text-[#6B5360]">{style.hebrewLabel}</p>
      <p className="mt-4 max-w-md text-base leading-8 text-[#42182F]">{style.blurb}</p>
      <div className="mt-7">
        <OpenSite href={`/wedding-website/${style.templateId}`} />
      </div>
    </div>
  );
}

function DesktopChrome({ style, eager = false }: { style: FeaturedStyle; eager?: boolean }) {
  return (
    <div className="min-w-0 overflow-hidden border border-[#C5A582]/80 bg-[#2A0F1D] shadow-[0_18px_40px_rgba(66,24,47,0.12)] transition duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#C5A582]" />
        <span className="h-2 w-2 rounded-full bg-white/25" />
        <span className="h-2 w-2 rounded-full bg-white/25" />
        <span className="mr-2 truncate text-[11px] text-[#F5EEE8]">{style.template.name}</span>
      </div>
      <WeddingLiveFrame
        templateId={style.templateId}
        name={style.template.name}
        mode="desktop"
        poster={poster(style.templateId, "desktop")}
        eager={eager}
      />
    </div>
  );
}

function PhoneChrome({ style, light = false }: { style: FeaturedStyle; light?: boolean }) {
  return (
    <div className={`mx-auto w-[132px] overflow-hidden rounded-[36px] border-[6px] bg-[#2A0F1D] shadow-[0_16px_36px_rgba(66,24,47,0.18)] transition duration-300 hover:-translate-y-1 sm:w-[168px] ${light ? "border-[#F5EEE8]" : "border-[#42182F]"}`}>
      <WeddingLiveFrame
        templateId={style.templateId}
        name={style.template.name}
        mode="phone"
        poster={poster(style.templateId, "phone")}
      />
    </div>
  );
}

export default function WeddingDesignGallery({ styles }: { styles: FeaturedStyle[] }) {
  return (
    <div className="space-y-16 md:space-y-24">
      {styles.map((style, index) => {
        const layout =
          style.templateId === "garden-bloom"
            ? 1
            : style.templateId === "midnight-velvet"
              ? 2
              : style.templateId === "minimal-noir"
                ? 3
                : 0;
        if (layout === 1) {
          return (
            <article key={style.templateId} id={`style-${style.templateId}`} className="scroll-mt-24 bg-[#E8D9C8] p-4 sm:p-6 md:p-8">
              <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <Copy style={style} index={index} />
                <div className="grid grid-cols-[minmax(0,1fr)_108px] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <DesktopChrome style={style} />
                  <PhoneChrome style={style} />
                </div>
              </div>
            </article>
          );
        }
        if (layout === 2) {
          return (
            <article key={style.templateId} id={`style-${style.templateId}`} className="scroll-mt-24 bg-[#42182F] p-4 text-[#FFF8F0] sm:p-6 md:p-8">
              <div className="grid items-end gap-8 lg:grid-cols-[1.25fr_0.75fr]">
                <DesktopChrome style={style} />
                <div>
                  <p className="text-sm font-black tracking-[0.16em] text-[#C5A582]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 font-['Cormorant_Garamond'] text-4xl font-semibold text-[#FFF8F0] md:text-5xl">
                    {style.template.name}
                  </h3>
                  <p className="mt-3 text-[#F5EEE8]">{style.hebrewLabel}</p>
                  <p className="mt-4 max-w-md leading-8 text-[#F5EEE8]">{style.blurb}</p>
                  <div className="mt-7">
                    <Link
                      href={`/wedding-website/${style.templateId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center justify-center rounded-none bg-[#F5EEE8] px-7 py-3 text-base font-black !text-[#42182F] hover:bg-[#FFF8F0]"
                    >
                      לצפייה באתר המלא
                    </Link>
                  </div>
                  <div className="mt-6">
                    <PhoneChrome style={style} light />
                  </div>
                </div>
              </div>
            </article>
          );
        }
        if (layout === 3) {
          return (
            <article key={style.templateId} id={`style-${style.templateId}`} className="scroll-mt-24">
              <div className="grid gap-8 border border-[#42182F] bg-[#FFF8F0] p-4 sm:p-6 md:grid-cols-[220px_minmax(0,1fr)] md:p-8">
                <Copy style={style} index={index} />
                <div className="min-w-0 space-y-4">
                  <DesktopChrome style={style} />
                  <div className="flex justify-end">
                    <PhoneChrome style={style} />
                  </div>
                </div>
              </div>
            </article>
          );
        }
        return (
          <article key={style.templateId} id={`style-${style.templateId}`} className="scroll-mt-24">
            <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="grid grid-cols-[minmax(0,1fr)_96px] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <DesktopChrome style={style} eager={index === 0} />
                <PhoneChrome style={style} />
              </div>
              <Copy style={style} index={index} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
