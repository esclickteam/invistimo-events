"use client";

import Image from "next/image";
import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import WeddingLiveFrame, { weddingLiveFrameCss } from "./WeddingLiveFrame";
import { WW_PATH } from "../content";

export const wwPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-none bg-[#42182F] px-7 py-3 text-center text-base font-black !text-[#FFF8F0] transition hover:bg-[#842B4C]";
export const wwSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-none border border-[#C5A582] bg-[#FFF8F0] px-7 py-3 text-center text-base font-black !text-[#42182F] transition hover:bg-[#F5EEE8]";
export const wwOnPlum =
  "inline-flex min-h-12 items-center justify-center rounded-none bg-[#F5EEE8] px-7 py-3 text-center text-base font-black !text-[#42182F] transition hover:bg-[#FFF8F0]";

type Props = {
  templateId: string;
  name: string;
  desktopPoster: string;
  mobilePoster: string;
};

export default function WeddingWebsiteHero({
  templateId,
  name,
  desktopPoster,
  mobilePoster,
}: Props) {
  return (
    <header className="relative isolate overflow-hidden bg-[#2A0F1D]">
      <style>{`
        ${weddingLiveFrameCss}
        @media (prefers-reduced-motion: no-preference) {
          .ww-hero-phone { animation: ww-hero-float 7s ease-in-out infinite alternate; }
        }
        @keyframes ww-hero-float {
          from { transform: translateY(0); }
          to { transform: translateY(-12px); }
        }
      `}</style>
      <Image
        src="/marketing/luxury/editorial-ceremony.webp"
        alt=""
        fill
        priority
        className="object-cover object-[center_30%]"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-l from-[#2A0F1D]/80 via-[#2A0F1D]/35 to-[#2A0F1D]/10" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-end gap-8 px-5 pb-12 pt-6 md:px-8 md:pb-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:pt-10">
        <div className="bg-[#F5EEE8]/95 p-6 shadow-[0_24px_70px_rgba(42,15,29,0.28)] sm:p-8 md:p-10">
          <p className="text-sm font-black tracking-[0.18em] text-[#842B4C]">אתרי חתונה</p>
          <h1 className="mt-4 max-w-xl font-['Cormorant_Garamond'] text-[2.35rem] font-semibold leading-[1.08] text-[#42182F] sm:text-5xl md:text-[3.35rem]">
            הסיפור שלכם, באתר שמרגיש כמו החתונה.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#6B5360] md:text-lg">
            פרטי האירוע, תמונות, לוח זמנים וניווט — במקום אחד שהאורחים פותחים מהטלפון.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="#gallery" className={wwPrimary} location={`hero_gallery:${WW_PATH}`}>
              גלו את העיצובים
            </TrackedCtaLink>
            <a href="#how" className={wwSecondary}>
              איך זה עובד?
            </a>
          </div>
        </div>

        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_88px] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_128px] sm:gap-4 md:grid-cols-[minmax(0,1fr)_150px]">
            <div className="min-w-0 border border-[#C5A582] bg-[#1C1210] shadow-[0_22px_50px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-[#C5A582]" />
                <span className="h-2 w-2 rounded-full bg-white/30" />
                <span className="h-2 w-2 rounded-full bg-white/30" />
                <span className="mr-2 truncate text-[11px] text-[#F5EEE8]">{name}</span>
              </div>
              <WeddingLiveFrame
                templateId={templateId}
                name={name}
                mode="desktop"
                poster={desktopPoster}
                eager
              />
            </div>
            <div className="ww-hero-phone min-w-0">
              <div className="overflow-hidden rounded-[36px] border-[6px] border-[#F5EEE8] bg-[#1C1210] shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                <WeddingLiveFrame
                  templateId={templateId}
                  name={name}
                  mode="phone"
                  poster={mobilePoster}
                  eager
                />
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-[#F5EEE8]">
            {name} · אתר חי לדוגמה, במחשב ובטלפון
          </p>
        </div>
      </div>
    </header>
  );
}
