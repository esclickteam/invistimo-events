"use client";

import WeddingLiveFrame from "./WeddingLiveFrame";

type Props = {
  templateId: string;
  name: string;
  desktopPoster: string;
  mobilePoster: string;
};

export default function HeroDevices({ templateId, name, desktopPoster, mobilePoster }: Props) {
  return (
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
  );
}
