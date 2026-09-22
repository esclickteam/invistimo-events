"use client";

import { MapPin, Navigation } from "lucide-react";
import {
  getGoogleMapsLinkForTarget,
  resolveNavTarget,
  shouldShowNavButton,
  type NavCustomLinks,
  type NavLocation,
} from "@/lib/navigationLinks";
import WazeNavButton from "@/app/components/WazeNavButton";

type Props = {
  location?: NavLocation;
  custom?: NavCustomLinks;
  showWaze?: boolean | null;
  showGoogleMaps?: boolean | null;
};

export default function EventNavigationButtons({
  location,
  custom,
  showWaze,
  showGoogleMaps,
}: Props) {
  if (!location) return null;

  const allowWaze = shouldShowNavButton(showWaze);
  const allowGoogleMaps = shouldShowNavButton(showGoogleMaps);

  if (!allowWaze && !allowGoogleMaps) return null;

  const target = resolveNavTarget(location, custom);
  const googleLink = allowGoogleMaps
    ? getGoogleMapsLinkForTarget(target)
    : "";

  if (
    !googleLink &&
    !allowWaze &&
    !location.address &&
    !location.name &&
    !location.lat
  ) {
    return null;
  }

  if (!googleLink && !allowWaze) return null;

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

      {allowWaze && (
        <WazeNavButton
          location={location}
          custom={custom}
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
      )}
    </div>
  );
}
