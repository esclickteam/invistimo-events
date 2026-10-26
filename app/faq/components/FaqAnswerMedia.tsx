"use client";

import Image from "next/image";
import MarketingVideo from "@/app/(marketing)/rsvp/components/MarketingVideo";
import type { FaqMedia } from "@/lib/seo/faq";

export default function FaqAnswerMedia({ media }: { media: FaqMedia }) {
  if (media.type === "image") {
    return (
      <figure className="mt-5 overflow-hidden rounded-2xl border border-[#EADDC8] bg-[#FFFDF8]">
        <Image
          src={media.src}
          alt={media.alt}
          width={1200}
          height={750}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 720px"
        />
        {media.caption ? (
          <figcaption className="border-t border-[#F0E4D2] px-4 py-3 text-sm leading-6 text-[#7A6042]">
            {media.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="mt-5 overflow-hidden rounded-2xl border border-[#EADDC8] bg-[#17120E]">
      <MarketingVideo
        src={media.src}
        poster={media.poster}
        title={media.title}
        className="aspect-video w-full"
      />
      {media.caption ? (
        <figcaption className="border-t border-white/10 bg-[#1C1612] px-4 py-3 text-sm leading-6 text-[#E8D5A8]">
          {media.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
