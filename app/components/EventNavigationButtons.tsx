"use client";

import { MapPin, Navigation } from "lucide-react";
import { getGoogleMapsLink, type NavLocation } from "@/lib/navigationLinks";
import WazeNavButton from "@/app/components/WazeNavButton";

type Props = {
  location?: NavLocation;
};

export default function EventNavigationButtons({ location }: Props) {
  if (!location) return null;

  const googleLink = getGoogleMapsLink(location);

  if (!googleLink && !location.address && !location.name && !location.lat) {
    return null;
  }

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

      <WazeNavButton
        location={location}
        className="
          flex items-center gap-2 px-4 py-2 rounded-full
          border border-[#d6c4a3]
          text-[#6b5b3e] font-medium
          hover:bg-[#f7f2ea] transition
        "
      >
        <Navigation size={16} />
        Waze
      </WazeNavButton>
    </div>
  );
}
