import { parseCoord } from "@/lib/navigationLinks";
import { pinIsNear, type MapPin } from "@/lib/mapPinChoice";

/** Reject the null island default and values that are not real coordinates. */
export function isValidWorldPin(lat: unknown, lng: unknown): MapPin | null {
  const parsedLat = parseCoord(lat);
  const parsedLng = parseCoord(lng);
  if (parsedLat == null || parsedLng == null) return null;
  if (Math.abs(parsedLat) > 90 || Math.abs(parsedLng) > 180) return null;
  if (parsedLat === 0 && parsedLng === 0) return null;
  return { lat: parsedLat, lng: parsedLng };
}

/**
 * Guest-submitted pins are only plausible for this product inside a padded
 * Israel box. A hall in Netanya is inside the box; a random point in
 * another country is not.
 */
export function isPlausibleGuestEventPin(pin: MapPin) {
  return pin.lat >= 29.2 && pin.lat <= 33.8 && pin.lng >= 33.8 && pin.lng <= 36.6;
}

export type MissingPinDecision =
  | { action: "keep"; pin: MapPin }
  | { action: "fill"; pin: MapPin }
  | { action: "reject"; error: "ALREADY_SAVED" | "INVALID_PIN" | "NO_SERVER_PIN" };

/**
 * Decide what a public "fill missing pin" request is allowed to write.
 *
 * An existing pin is never overwritten. A guest cannot supply the
 * coordinates that get stored — only a server geocode of the event
 * address can. Guest lat/lng are accepted only as a sanity check that
 * they sit near that server pin; they are otherwise ignored.
 */
export function decideMissingPinWrite(options: {
  existing?: MapPin | null;
  guest?: MapPin | null;
  server?: MapPin | null;
}): MissingPinDecision {
  if (options.existing) {
    return { action: "keep", pin: options.existing };
  }

  if (!options.server) {
    return { action: "reject", error: "NO_SERVER_PIN" };
  }

  if (options.guest && !pinIsNear(options.guest, options.server)) {
    return { action: "fill", pin: options.server };
  }

  return { action: "fill", pin: options.server };
}
