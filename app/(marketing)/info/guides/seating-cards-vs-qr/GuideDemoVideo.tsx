"use client";

import MarketingVideo from "@/app/(marketing)/rsvp/components/MarketingVideo";

type Props = {
  src: string;
  poster?: string;
  title: string;
  caption: string;
};

/** Guide embed of the shared public MarketingVideo: muted autoplay loop + accessible pause via controls. */
export default function GuideDemoVideo({ src, poster, title, caption }: Props) {
  return (
    <figure className="overflow-hidden rounded-[24px] border border-[#E6D2AA] bg-[#1E1814]">
      <MarketingVideo
        src={src}
        poster={poster}
        title={title}
        objectFit="contain"
        className="aspect-video w-full"
      />
      <figcaption className="px-4 py-3 text-sm font-semibold text-[#E8D1A5]">
        {caption}
      </figcaption>
    </figure>
  );
}
