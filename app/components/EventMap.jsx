"use client";

import { getGoogleMapsEmbedUrl } from "@/lib/navigationLinks";

export default function EventMap({ location }) {
  if (!location) return null;

  const mapSrc = getGoogleMapsEmbedUrl(location, 15);

  if (!mapSrc) return null;

  return (
    <div className="w-full mt-6">
      <div className="mb-3 text-center text-sm font-medium text-[#6b5b3e]" />

      <div className="w-full rounded-2xl overflow-hidden border border-[#e6dccb] shadow-sm">
        <iframe
          src={mapSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-[220px]"
        />
      </div>
    </div>
  );
}
