"use client";

import { useMemo, useState } from "react";
import EventNavigationButtons from "@/app/components/EventNavigationButtons";
import LocationDisplay from "@/app/components/LocationDisplay";
import PersistMissingEventPin from "@/app/components/PersistMissingEventPin";
import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsLink,
  shouldShowNavButton,
} from "@/lib/navigationLinks";

export default function EventLocationCard({
  location,
  shareId,
  showWaze,
  showGoogleMaps,
}) {
  const [resolvedPin, setResolvedPin] = useState(null);

  const pinnedLocation = useMemo(() => {
    if (!location) return null;
    if (resolvedPin) {
      return { ...location, lat: resolvedPin.lat, lng: resolvedPin.lng };
    }
    return location;
  }, [location, resolvedPin]);

  if (!pinnedLocation) return null;

  const hasAddress =
    !!pinnedLocation.address?.trim() || !!pinnedLocation.name?.trim();
  const mapUrl = getGoogleMapsLink(pinnedLocation);
  const mapEmbedUrl = getGoogleMapsEmbedUrl(pinnedLocation);
  const allowGoogleMaps = shouldShowNavButton(showGoogleMaps);
  const mapFrameClassName =
    "block w-full h-[250px] rounded-2xl overflow-hidden border border-[#e6dccb] shadow-sm mb-5";
  const mapIframe = (
    <iframe
      title="מפת מיקום האירוע"
      width="100%"
      height="100%"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={mapEmbedUrl}
      className="pointer-events-none border-0"
    />
  );

  if (!hasAddress && !mapUrl) return null;

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow p-5 mt-8">
      <PersistMissingEventPin
        shareId={shareId}
        location={location}
        onResolved={setResolvedPin}
      />

      {(hasAddress || pinnedLocation.name) && (
        <div className="text-center mb-4">
          <LocationDisplay
            name={pinnedLocation.name || "מיקום האירוע"}
            address={hasAddress ? pinnedLocation.address : ""}
            align="center"
            nameClassName="text-sm font-semibold text-[#6b5b3e]"
            addressClassName="mt-1 text-sm leading-relaxed text-[#6b5b3e]"
            iconClassName="h-4 w-4 shrink-0 text-[#6b5b3e]"
          />
        </div>
      )}

      {mapEmbedUrl &&
        (allowGoogleMaps ? (
          <a
            href={mapUrl || mapEmbedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={mapFrameClassName}
          >
            {mapIframe}
          </a>
        ) : (
          <div className={mapFrameClassName}>{mapIframe}</div>
        ))}

      {mapUrl && (
        <div className="flex justify-center gap-3">
          <EventNavigationButtons
            location={pinnedLocation}
            showWaze={showWaze}
            showGoogleMaps={showGoogleMaps}
          />
        </div>
      )}
    </div>
  );
}
