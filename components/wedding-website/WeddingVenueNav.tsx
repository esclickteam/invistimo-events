"use client";

import { MapPin } from "lucide-react";
import { getGoogleMapsLink, getWazeLink } from "@/lib/navigationLinks";
import { DEMO } from "./shared/weddingUtils";

type Props = {
  address?: string;
  lat?: number | null;
  lng?: number | null;
  googleHref?: string;
  wazeHref?: string;
  className?: string;
  linkClassName?: string;
};

export default function WeddingVenueNav({
  address,
  lat,
  lng,
  googleHref,
  wazeHref,
  className,
  linkClassName,
}: Props) {
  const location = {
    address: String(address || DEMO.venueAddress || "").trim(),
    lat: lat ?? DEMO.venueLat ?? null,
    lng: lng ?? DEMO.venueLng ?? null,
  };

  const google = googleHref || getGoogleMapsLink(location);
  const waze = wazeHref || getWazeLink(location);

  if (!google && !waze) return null;

  return (
    <div className={className || "mt-6 flex flex-wrap items-center gap-3"}>
      {waze && (
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
      )}
      {google && (
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
      )}
    </div>
  );
}
