"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  templateId: string;
  name: string;
  desktopSrc: string;
  mobileSrc: string;
  className?: string;
  priority?: boolean;
};

/**
 * Side-by-side desktop + mobile screenshots of a real wedding demo.
 * No iframes, no overlapping frames, no technical captions.
 */
export default function DevicePreviewPair({
  templateId,
  name,
  desktopSrc,
  mobileSrc,
  className = "",
  priority = false,
}: Props) {
  const href = `/wedding-website/${templateId}`;

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-end sm:gap-4">
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group min-w-0 flex-1"
          aria-label={`צפו באתר לדוגמה — ${name} במחשב`}
        >
          <div className="overflow-hidden rounded-[18px] border border-[#D4C0A0]/55 bg-[#14100C] shadow-[0_32px_80px_rgba(40,28,18,0.22)] transition group-hover:-translate-y-0.5">
            <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#1E1812] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C9A962]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="mr-3 truncate text-[11px] font-semibold text-white/45">
                {name}
              </span>
            </div>
            <Image
              src={desktopSrc}
              alt={`אתר חתונה לדוגמה — ${name} במחשב`}
              width={1440}
              height={900}
              unoptimized
              priority={priority}
              className="block h-auto w-full"
              sizes="(max-width: 1024px) 100vw, 42vw"
            />
          </div>
        </Link>

        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group mx-auto w-[158px] shrink-0 sm:mx-0 sm:w-[168px] md:w-[180px]"
          aria-label={`צפו באתר לדוגמה — ${name} בטלפון`}
        >
          <div className="overflow-hidden rounded-[1.55rem] border-[7px] border-[#1C1612] bg-[#0D0A08] shadow-[0_24px_56px_rgba(20,14,8,0.35)] transition group-hover:-translate-y-0.5">
            <div className="mx-auto mt-1.5 h-1 w-12 rounded-full bg-white/15" aria-hidden />
            <div className="relative aspect-[9/19.5] w-full overflow-hidden">
              <Image
                src={mobileSrc}
                alt={`אתר חתונה לדוגמה — ${name} במובייל`}
                fill
                unoptimized
                priority={priority}
                className="object-cover object-top"
                sizes="180px"
              />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
