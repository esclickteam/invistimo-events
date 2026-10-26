"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  templateId: string;
  name: string;
  src: string;
};

/** Natural phone frame with a real mobile screenshot — no iframe scrollbars. */
export default function MobileShowcasePreview({ templateId, name, src }: Props) {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <Link
        href={`/wedding-website/${templateId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
        aria-label={`צפו באתר לדוגמה — ${name} במובייל`}
      >
        <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#0D0A08] shadow-[0_36px_80px_rgba(28,22,18,0.28)] transition group-hover:-translate-y-1">
          <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-white/20" aria-hidden />
          <div className="relative aspect-[9/19] w-full overflow-hidden">
            <Image
              src={src}
              alt={`אתר חתונה לדוגמה — ${name} במובייל`}
              fill
              unoptimized
              className="object-cover object-top"
              sizes="280px"
            />
          </div>
        </div>
      </Link>
      <p className="mt-4 text-center text-sm font-semibold text-[#7A6042]">
        תבנית {name} · אתר לדוגמה
      </p>
    </div>
  );
}
