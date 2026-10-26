"use client";

import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";

type Props = {
  src: string;
  poster?: string;
  title: string;
};

export default function SeatingDemoVideo({ src, poster, title }: Props) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#1E1814]">
      <PublicAutoplayVideo
        src={src}
        poster={poster}
        title={title}
        shellClassName="w-full"
        expandable
        frameBg="#1E1814"
      />
      <p className="px-4 py-3 text-sm font-semibold text-[#E8D1A5]">
        סרטון הדגמה — שיבוץ אורחים במפת ההושבה (נתוני דמו בלבד)
      </p>
    </div>
  );
}
