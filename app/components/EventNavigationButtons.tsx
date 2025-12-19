"use client";

import { MapPin, Navigation } from "lucide-react";
import {
  getGoogleMapsLink,
  getWazeLink,
} from "@/lib/navigationLinks";

/* ======================
   Types
====================== */
type Location = {
  address?: string;
  lat?: number | null;
  lng?: number | null;
};

type Props = {
  location?: Location;
};

export default function EventNavigationButtons({ location }: Props) {
  if (!location) return null;

  const googleLink = getGoogleMapsLink(location);
  const wazeLink = getWazeLink(location);

  if (!googleLink && !wazeLink) return null;

  return (
    <div className="flex gap-3 justify-center mt-6">
      {googleLink && (
        <a
          href={googleLink}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center gap-2 px-4 py-2 rounded-full
            border border-[#d6c4a3]
            text-[#6b5b3e] font-medium
            hover:bg-[#f7f2ea] transition
          "
        >
          <MapPin size={16} />
          Google Maps
        </a>
      )}

      {wazeLink && (
        <a
          href={wazeLink}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center gap-2 px-4 py-2 rounded-full
            border border-[#d6c4a3]
            text-[#6b5b3e] font-medium
            hover:bg-[#f7f2ea] transition
          "
        >
          <Navigation size={16} />
          Waze
        </a>
      )}
    </div>
  );
}
