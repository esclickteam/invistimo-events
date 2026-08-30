"use client";

import { useEffect, useRef } from "react";
import { hasExactCoordinates, type NavLocation } from "@/lib/navigationLinks";
import { resolveMapPinInBrowser } from "@/lib/resolveMapPin.client";

type Props = {
  shareId?: string | null;
  location?: NavLocation | null;
  onResolved?: (pin: { lat: number; lng: number }) => void;
};

/**
 * When an invitation has an address but no saved pin, resolve it in the
 * browser (where the referrer-restricted Maps key works) and persist it.
 * The next guest then gets Waze and Google Maps from the same coordinates.
 */
export default function PersistMissingEventPin({
  shareId,
  location,
  onResolved,
}: Props) {
  const started = useRef(false);

  useEffect(() => {
    if (!shareId || !location || hasExactCoordinates(location)) return;
    if (!location.name && !location.address) return;
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    (async () => {
      const pin = await resolveMapPinInBrowser(location);
      if (!pin || cancelled) return;

      const res = await fetch(`/api/invite/${encodeURIComponent(shareId)}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pin),
      });
      if (!res.ok || cancelled) return;

      onResolved?.(pin);
    })().catch((error) => {
      console.error("Could not persist a missing event pin:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [shareId, location, onResolved]);

  return null;
}
