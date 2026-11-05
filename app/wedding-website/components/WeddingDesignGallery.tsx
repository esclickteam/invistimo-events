import Link from "next/link";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import WeddingLiveFrame from "./WeddingLiveFrame";
import { wwPrimary, wwSecondary } from "./wwButtons";
import type { FeaturedStyle } from "./FeaturedTemplateShowcase";
import { WW_LINKS, WW_PATH } from "../content";

function poster(templateId: string, mode: "desktop" | "phone") {
  return `/marketing/wedding-website/previews/${templateId}-${mode === "desktop" ? "desktop" : "mobile"}.jpg`;
}

function Actions({ style, onDark = false }: { style: FeaturedStyle; onDark?: boolean }) {
  const openClass = onDark
    ? "inline-flex min-h-12 items-center justify-center rounded-none bg-[#F5EEE8] px-7 py-3 text-center text-base font-black !text-[#42182F] hover:bg-[#FFF8F0]"
    : wwPrimary;
  const ownClass = onDark
    ? "inline-flex min-h-12 items-center justify-center rounded-none border border-[#C5A582] px-7 py-3 text-center text-base font-black !text-[#FFF8F0] hover:bg-white/10"
    : wwSecondary;

  return (
    <div className="mt-7 flex flex-col items-start gap-3">
      <Link
        href={`/wedding-website/${style.templateId}`}
        target="_blank"
        rel="noopener noreferrer"
        className={openClass}
      >
        לצפייה באתר המלא
      </Link>
      <TrackedCtaLink
        href={WW_LINKS.contact}
        className={ownClass}
        location={`gallery_own_${style.templateId}:${WW_PATH}`}
      >
        רוצים אתר חתונה כזה משלכם?
      </TrackedCtaLink>
    </div>
  );
}

function Copy({ style, index, onDark = false }: { style: FeaturedStyle; index: number; onDark?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-black tracking-[0.16em] ${onDark ? "text-[#C5A582]" : "text-[#842B4C]"}`}>
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3
        className={`mt-3 font-['Cormorant_Garamond'] text-4xl font-semibold leading-none md:text-5xl ${
          onDark ? "text-[#FFF8F0]" : "text-[#42182F]"
        }`}
      >
        {style.template.name}
      </h3>
      <p className={`mt-4 text-base font-semibold ${onDark ? "text-[#F5EEE8]" : "text-[#6B5360]"}`}>
        {style.hebrewLabel}
      </p>
      <p className={`mt-4 max-w-md text-base leading-8 ${onDark ? "text-[#F5EEE8]" : "text-[#42182F]"}`}>
        {style.blurb}
      </p>
      <Actions style={style} onDark={onDark} />
    </div>
  );
}

function DesktopChrome({ style }: { style: FeaturedStyle }) {
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
      />
    </div>
  );
}

function PhoneChrome({ style, light = false }: { style: FeaturedStyle; light?: boolean }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-[36px] border-[6px] bg-[#2A0F1D] shadow-[0_16px_36px_rgba(66,24,47,0.18)] transition duration-300 hover:-translate-y-1 ${
        light ? "border-[#F5EEE8]" : "border-[#42182F]"
      }`}
    >
      <WeddingLiveFrame
        templateId={style.templateId}
        name={style.template.name}
        mode="phone"
        poster={poster(style.templateId, "phone")}
      />
    </div>
  );
}

function DevicePair({ style, light = false }: { style: FeaturedStyle; light?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_132px] items-end gap-4 sm:grid-cols-[minmax(0,1fr)_176px] sm:gap-6">
      <DesktopChrome style={style} />
      <PhoneChrome style={style} light={light} />
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
            <article key={style.templateId} id={`style-${style.templateId}`} className="scroll-mt-24 bg-[#E8D9C8] p-4 sm:p-6 md:p-10">
              <div className="grid items-center gap-10 lg:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.22fr)] lg:gap-14">
                <Copy style={style} index={index} />
                <DevicePair style={style} />
              </div>
            </article>
          );
        }
        if (layout === 2) {
          return (
            <article key={style.templateId} id={`style-${style.templateId}`} className="scroll-mt-24 bg-[#42182F] p-4 sm:p-6 md:p-10">
              <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:gap-14">
                <DesktopChrome style={style} />
                <div className="flex flex-col gap-8">
                  <Copy style={style} index={index} onDark />
                  <div className="w-[132px] sm:w-[176px]">
                    <PhoneChrome style={style} light />
                  </div>
                </div>
              </div>
            </article>
          );
        }
        if (layout === 3) {
          return (
            <article key={style.templateId} id={`style-${style.templateId}`} className="scroll-mt-24 border border-[#42182F] bg-[#FFF8F0] p-4 sm:p-6 md:p-10">
              <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] lg:gap-16">
                <DevicePair style={style} />
                <Copy style={style} index={index} />
              </div>
            </article>
          );
        }
        return (
          <article key={style.templateId} id={`style-${style.templateId}`} className="scroll-mt-24">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-16 xl:gap-20">
              <DevicePair style={style} />
              <Copy style={style} index={index} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
