"use client";

import WeddingMedia from "./editable/WeddingMedia";

type Props = {
  src?: string;
  alt?: string;
  className?: string;
  slot?: string;
};

export default function WeddingCoverImage({ src, alt = "", className = "", slot = "hero" }: Props) {
  if (!src) return <WeddingMedia slot={slot} alt={alt} className={className} />;

  return <WeddingMedia slot={slot} src={src} alt={alt} className={`h-full w-full object-cover object-center ${className}`.trim()} />;
}
