"use client";

import { MapPin } from "lucide-react";

type Props = {
  address: string;
  googleHref?: string;
  wazeHref?: string;
  className?: string;
  linkClassName?: string;
};

export default function WeddingVenueNav({
  address,
  googleHref,
  wazeHref,
  className,
  linkClassName,
}: Props) {
  const cleanAddress = String(address || "").trim();
  if (!cleanAddress) return null;

  const google =
    googleHref || `https://maps.google.com/?q=${encodeURIComponent(cleanAddress)}`;
  const waze = wazeHref || `https://waze.com/ul?q=${encodeURIComponent(cleanAddress)}`;

  return (
    <div className={className || "mt-6 flex flex-wrap items-center gap-3"}>
      <a
        href={waze}
        target="_blank"
        rel="noopener noreferrer"
        className={
          linkClassName ||
          "inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2 text-sm font-bold"
        }
      >
        <MapPin className="h-4 w-4 shrink-0" aria-hidden />
        Waze
      </a>
      <a
        href={google}
        target="_blank"
        rel="noopener noreferrer"
        className={
          linkClassName ||
          "inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2 text-sm font-bold"
        }
      >
        <MapPin className="h-4 w-4 shrink-0" aria-hidden />
        Google Maps
      </a>
    </div>
  );
}
