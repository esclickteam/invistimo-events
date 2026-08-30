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

const FOREIGN_CITY_MARKERS = [
  "נתניה",
  "זכרון",
  "חיפה",
  "תל אביב",
  "ירושלים",
  "netanya",
  "zikhron",
  "haifa",
];

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

export function hintQueries(location: NavLocation) {
  const queries = [
    placeSearchQuery(location),
    geographicQuery(location),
  ].filter(Boolean);

  const address = firstText(location.address);
  if (/רמת צבי/.test(address) || /רמת צבי/.test(firstText(location.name))) {
    queries.push("מושב רמת צבי, גלבוע");
    queries.push("רמת צבי, מועצה אזורית גלבוע");
  }

  return [...new Set(queries)];
}

export function resultConflictsWithQuery(query: string, formatted = "") {
  const q = normalizeText(query);
  const f = normalizeText(formatted);
  if (!f) return false;

  return FOREIGN_CITY_MARKERS.some(
    (city) => f.includes(normalizeText(city)) && !q.includes(normalizeText(city))
  );
}

export function nameMatchScore(venueName: string, candidateName = "") {
  const venueTokens = normalizeText(venueName).split(" ").filter((t) => t.length > 1);
  const hay = normalizeText(candidateName);
  if (!venueTokens.length || !hay) return 0;
  return venueTokens.filter((token) => hay.includes(token)).length;
}

export function chooseMapPin(options: {
  saved?: MapPin | null;
  hint?: MapPin | null;
  candidates?: Array<PinCandidate | null | undefined>;
  query?: string;
  venueName?: string;
}) {
  const saved = options.saved || null;
  const hint = options.hint || null;
  const query = options.query || "";
  const venueName = options.venueName || "";
  const candidates = (options.candidates || []).filter(
    (pin): pin is PinCandidate => Boolean(pin)
  );

  const usable = candidates.filter((pin) => {
    if (resultConflictsWithQuery(query, pin.address || pin.name || "")) {
      return false;
    }
    if (hint && !pinIsNear(pin, hint)) return false;
    return true;
  });

  const scored = usable
    .map((pin) => ({
      pin,
      score:
        nameMatchScore(venueName, pin.name || "") * 10 +
        nameMatchScore(venueName, pin.address || "") * 4 -
        (hint ? distanceKm(pin, hint) : 0),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]) {
    return { lat: scored[0].pin.lat, lng: scored[0].pin.lng };
  }

  if (saved && (!hint || pinIsNear(saved, hint))) return saved;
  if (hint) return hint;
  return saved;
}

export function pickHintPin(
  results: PinCandidate[],
  query: string
): MapPin | null {
  const matches = results.filter(
    (pin) => !resultConflictsWithQuery(query, pin.address || pin.name || "")
  );
  const chosen = matches[0] || null;
  return chosen ? { lat: chosen.lat, lng: chosen.lng } : null;
}
