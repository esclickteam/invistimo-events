"use client";

import Image from "next/image";
import Link from "next/link";

type Shot = {
  src: string;
  alt: string;
  label: string;
};

type Props = {
  templateId: string;
  shots: Shot[];
};

/**
 * Real section screenshots from a working wedding demo —
 * story, gallery, details — not a stock poster or scaled iframe.
 */
export default function SiteAnatomyPreview({ templateId, shots }: Props) {
  const href = `/wedding-website/${templateId}`;
  const [primary, ...rest] = shots;

  return (
    <div className="space-y-3">
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block overflow-hidden rounded-[22px] border border-[#D9C7A8]/70 bg-[#16120E] shadow-[0_30px_80px_rgba(42,30,18,0.14)] transition hover:-translate-y-0.5"
        aria-label="צפו באתר לדוגמה — מבנה מלא"
      >
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#1E1812] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#C9A962]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="mr-3 text-[11px] font-semibold text-white/45">
            {primary?.label || "אתר לדוגמה"}
          </span>
        </div>
        {primary ? (
          <Image
            src={primary.src}
            alt={primary.alt}
            width={1440}
            height={900}
            unoptimized
            className="block h-auto w-full"
            sizes="(max-width: 1024px) 100vw, 48vw"
          />
        ) : null}
      </Link>

      {rest.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {rest.map((shot) => (
            <Link
              key={shot.src}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-[18px] border border-[#D9C7A8]/55 bg-[#FFFDF8] shadow-[0_16px_40px_rgba(42,30,18,0.08)] transition hover:-translate-y-0.5"
            >
              <p className="border-b border-[#E8D9BF]/70 px-3 py-2 text-[11px] font-bold tracking-[0.12em] text-[#7A5530]">
                {shot.label}
              </p>
              <Image
                src={shot.src}
                alt={shot.alt}
                width={1280}
                height={800}
                unoptimized
                className="block h-auto w-full"
                sizes="(max-width: 640px) 100vw, 24vw"
              />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
