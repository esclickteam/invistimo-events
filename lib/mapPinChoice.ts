import { parseCoord, type NavLocation } from "@/lib/navigationLinks";

export type MapPin = {
  lat: number;
  lng: number;
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

export function chooseMapPin(options: {
  saved?: MapPin | null;
  hint?: MapPin | null;
  candidates?: Array<MapPin | null | undefined>;
}) {
  const saved = options.saved || null;
  const hint = options.hint || null;
  const candidates = (options.candidates || []).filter(
    (pin): pin is MapPin => Boolean(pin)
  );

  if (saved && (!hint || pinIsNear(saved, hint))) return saved;

  const nearby = hint
    ? candidates.filter((pin) => pinIsNear(pin, hint))
    : candidates;

  if (nearby.length && hint) {
    return [...nearby].sort(
      (a, b) => distanceKm(a, hint) - distanceKm(b, hint)
    )[0];
  }

  if (nearby[0]) return nearby[0];
  if (hint) return hint;
  return null;
}
