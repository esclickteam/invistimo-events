import { parseCoord, type NavLocation } from "@/lib/navigationLinks";

export type MapPin = {
  lat: number;
  lng: number;
};

export type PinCandidate = MapPin & {
  name?: string;
  address?: string;
};

export const MAX_PIN_HINT_KM = 30;

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return text;
  }
  return "";
}

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function asMapPin(location?: NavLocation | null): MapPin | null {
  const lat = parseCoord(location?.lat);
  const lng = parseCoord(location?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function distanceKm(a: MapPin, b: MapPin) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pinIsNear(
  pin: MapPin,
  hint: MapPin,
  maxKm = MAX_PIN_HINT_KM
) {
  return distanceKm(pin, hint) <= maxKm;
}

export function geographicQuery(location: NavLocation) {
  const name = firstText(location.name);
  const address = firstText(location.address);
  if (address && name && address !== name) return address;
  return address || name;
}

export function placeSearchQuery(location: NavLocation) {
  const name = firstText(location.name);
  const address = firstText(location.address);
  if (name && address && !address.includes(name) && !name.includes(address)) {
    return `${name}, ${address}`;
  }
  return address || name;
}

/**
 * The town/street part of the address, with the venue name removed.
 *
 * This is the anchor that keeps a venue in its own city: geocoding
 * "שיבולים גן ארועים, רמת צבי" by name can land on a same-named hall
 * anywhere in the country, while "רמת צבי" resolves to one place.
 */
export function localityQuery(location: NavLocation) {
  const address = firstText(location.address);
  const name = firstText(location.name);
  if (!address) return "";
  if (!name || address === name) return address;

  const normalizedName = normalizeText(name);
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const remaining = parts.filter((part) => {
    const normalizedPart = normalizeText(part);
    if (!normalizedPart) return false;
    return (
      !normalizedName.includes(normalizedPart) &&
      !normalizedPart.includes(normalizedName)
    );
  });

  return remaining.length ? remaining.join(", ") : address;
}

export function hintQueries(location: NavLocation) {
  return [
    localityQuery(location),
    geographicQuery(location),
    placeSearchQuery(location),
  ].filter((query, index, all) => query && all.indexOf(query) === index);
}

export function nameMatchScore(venueName: string, candidateName = "") {
  const venueTokens = normalizeText(venueName).split(" ").filter((t) => t.length > 1);
  const hay = normalizeText(candidateName);
  if (!venueTokens.length || !hay) return 0;
  return venueTokens.filter((token) => hay.includes(token)).length;
}

/**
 * Pick the pin to save for an event.
 *
 * A candidate is only trusted when it sits near the locality the address
 * resolves to. Without that anchor we return nothing rather than guessing —
 * a wrong pin sends guests to another city, while a missing one is reported
 * back to the couple so they can fix the address.
 */
export function chooseMapPin(options: {
  saved?: MapPin | null;
  hint?: MapPin | null;
  candidates?: Array<PinCandidate | null | undefined>;
  venueName?: string;
}) {
  const saved = options.saved || null;
  const hint = options.hint || null;
  const venueName = options.venueName || "";
  const candidates = (options.candidates || []).filter(
    (pin): pin is PinCandidate => Boolean(pin)
  );

  if (!hint) return saved;

  const scored = candidates
    .filter((pin) => pinIsNear(pin, hint))
    .map((pin) => ({
      pin,
      score:
        nameMatchScore(venueName, pin.name || "") * 10 +
        nameMatchScore(venueName, pin.address || "") * 4 -
        distanceKm(pin, hint),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]) {
    return { lat: scored[0].pin.lat, lng: scored[0].pin.lng };
  }

  if (saved && pinIsNear(saved, hint)) return { lat: saved.lat, lng: saved.lng };

  return { lat: hint.lat, lng: hint.lng };
}
