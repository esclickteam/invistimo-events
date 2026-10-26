"use client";

import LiveSiteFrame from "./LiveSiteFrame";

type Props = {
  templateId: string;
  name: string;
  posterSrc?: string;
  eager?: boolean;
  className?: string;
};

/** Desktop + mobile live frames of a real wedding website demo. */
export default function DevicePreviewPair({
  templateId,
  name,
  posterSrc,
  eager = false,
  className = "",
}: Props) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative overflow-hidden rounded-[18px] border border-[#D4C0A0]/55 bg-[#14100C] shadow-[0_40px_100px_rgba(40,28,18,0.28)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#1E1812] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#C9A962]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="mr-3 truncate text-[11px] font-semibold text-white/45">
            invistimo.com/wedding-website/{templateId}
          </span>
        </div>
        <LiveSiteFrame
          templateId={templateId}
          title={`${name} — תצוגת מחשב חיה`}
          variant="desktop"
          frameHeight={480}
          eager={eager}
          posterSrc={posterSrc}
          className="[--ww-preview-scale:0.48] md:[--ww-preview-scale:0.58]"
        />
      </div>

      <div className="pointer-events-none absolute -bottom-6 left-3 w-[38%] max-w-[190px] sm:left-6 md:-bottom-8 md:w-[34%] md:max-w-[210px]">
        <div className="overflow-hidden rounded-[1.6rem] border-[7px] border-[#1C1612] bg-[#0D0A08] shadow-[0_28px_70px_rgba(20,14,8,0.45)]">
          <div className="mx-auto mt-1.5 h-1 w-12 rounded-full bg-white/15" aria-hidden />
          <LiveSiteFrame
            templateId={templateId}
            title={`${name} — תצוגת מובייל חיה`}
            variant="mobile"
            frameHeight={340}
            eager={eager}
            posterSrc={posterSrc}
            className="[--ww-preview-scale:0.55]"
          />
        </div>
      </div>
    </div>
  );
}
