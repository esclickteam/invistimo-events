import {
  getLocationQuery,
  parseCoord,
  type NavLocation,
} from "@/lib/navigationLinks";
import {
  asMapPin,
  chooseMapPin,
  geographicQuery,
  placeSearchQuery,
  type MapPin,
} from "@/lib/mapPinChoice";

export type { MapPin };

const pinCache = new Map<string, MapPin>();

function googleMapsKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  );
}

function cacheKey(location: NavLocation) {
  const saved = asMapPin(location);
  return JSON.stringify({
    geo: geographicQuery(location),
    search: placeSearchQuery(location),
    saved,
  });
}

function readLatLng(value: any): MapPin | null {
  const lat = parseCoord(value?.lat);
  const lng = parseCoord(value?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

async function fetchGoogleJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function findPlacePins(
  query: string,
  key: string,
  bias?: MapPin | null
): Promise<MapPin[]> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
  );
  url.searchParams.set("input", query);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "geometry");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);
  if (bias) {
    url.searchParams.set(
      "locationbias",
      `circle:30000@${bias.lat},${bias.lng}`
    );
  }

  const data = await fetchGoogleJson(url.toString());
  const pin = readLatLng(data?.candidates?.[0]?.geometry?.location);
  return pin ? [pin] : [];
}

async function textSearchPins(
  query: string,
  key: string,
  bias?: MapPin | null
): Promise<MapPin[]> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json"
  );
  url.searchParams.set("query", query);
  url.searchParams.set("region", "il");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);
  if (bias) {
    url.searchParams.set("location", `${bias.lat},${bias.lng}`);
    url.searchParams.set("radius", "30000");
  }

  const data = await fetchGoogleJson(url.toString());
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .slice(0, 8)
    .map((result: any) => readLatLng(result?.geometry?.location))
    .filter(Boolean) as MapPin[];
}

async function geocodePin(query: string, key: string): Promise<MapPin | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("region", "il");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);

  const data = await fetchGoogleJson(url.toString());
  return readLatLng(data?.results?.[0]?.geometry?.location);
}

export async function resolveMapPin(
  location?: NavLocation | null
): Promise<MapPin | null> {
  if (!location) return null;

  const saved = asMapPin(location);
  const geoQuery = geographicQuery(location);
  const searchQuery = placeSearchQuery(location) || getLocationQuery(location);

  const key = cacheKey(location);
  const cached = pinCache.get(key);
  if (cached) return cached;

  const apiKey = googleMapsKey();
  if (!apiKey) {
    return chooseMapPin({ saved, hint: null, candidates: [] });
  }

  const hint =
    (geoQuery ? await geocodePin(geoQuery, apiKey) : null) ||
    (searchQuery && searchQuery !== geoQuery
      ? await geocodePin(searchQuery, apiKey)
      : null);

  const candidates = searchQuery
    ? [
        ...(await textSearchPins(searchQuery, apiKey, hint)),
        ...(await findPlacePins(searchQuery, apiKey, hint)),
      ]
    : [];

  const pin = chooseMapPin({ saved, hint, candidates });
  if (pin) pinCache.set(key, pin);
  return pin;
}

export async function withResolvedMapPin<T extends NavLocation>(
  location: T
): Promise<T & MapPin> {
  const pin = await resolveMapPin(location);
  if (!pin) {
    return {
      ...location,
      lat: parseCoord(location.lat),
      lng: parseCoord(location.lng),
    } as T & MapPin;
  }

  return {
    ...location,
    lat: pin.lat,
    lng: pin.lng,
  };
}
