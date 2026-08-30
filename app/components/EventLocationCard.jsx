"use client";

import EventNavigationButtons from "@/app/components/EventNavigationButtons";
import LocationDisplay from "@/app/components/LocationDisplay";
import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsLink,
} from "@/lib/navigationLinks";

export default function EventLocationCard({ location }) {
  if (!location) return null;

  const hasAddress = !!location.address?.trim() || !!location.name?.trim();
  const mapUrl = getGoogleMapsLink(location);
  const mapEmbedUrl = getGoogleMapsEmbedUrl(location);

  if (!hasAddress && !mapUrl) return null;

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow p-5 mt-8">
      {(hasAddress || location.name) && (
        <div className="text-center mb-4">
          <LocationDisplay
            name={location.name || "מיקום האירוע"}
            address={hasAddress ? location.address : ""}
            align="center"
            nameClassName="text-sm font-semibold text-[#6b5b3e]"
            addressClassName="mt-1 text-sm leading-relaxed text-[#6b5b3e]"
            iconClassName="h-4 w-4 shrink-0 text-[#6b5b3e]"
          />
        </div>
      )}

      {mapEmbedUrl && (
        <a
          href={mapUrl || mapEmbedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-[250px] rounded-2xl overflow-hidden border border-[#e6dccb] shadow-sm mb-5"
        >
          <iframe
            title="מפת מיקום האירוע"
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={mapEmbedUrl}
            className="pointer-events-none border-0"
          />
        </a>
      )}

      {mapUrl && (
        <div className="flex justify-center gap-3">
          <EventNavigationButtons location={location} />
        </div>
      )}
    </div>
  );
}
