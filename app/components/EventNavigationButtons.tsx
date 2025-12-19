"use client";

import {
  getGoogleMapsLink,
  getWazeLink,
} from "@/lib/navigationLinks";

export default function EventNavigationButtons({
  location,
}: {
  location?: {
    address?: string;
    lat?: number | null;
    lng?: number | null;
  };
}) {
  if (!location) return null;

  const googleLink = getGoogleMapsLink(location);
  const wazeLink = getWazeLink(location);

  if (!googleLink && !wazeLink) return null;

  return (
    <div className="flex gap-3 justify-center mt-6">
      {wazeLink && (
        <a
          href={wazeLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#33ccff] text-white font-semibold shadow"
        >
          🚗 Waze
        </a>
      )}

      {googleLink && (
        <a
          href={googleLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#4285F4] text-white font-semibold shadow"
        >
          🗺️ Google Maps
        </a>
      )}
    </div>
  );
}
