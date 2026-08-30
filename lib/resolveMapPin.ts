import {
  getLocationQuery,
  hasExactCoordinates,
  parseCoord,
  type NavLocation,
} from "@/lib/navigationLinks";

export type MapPin = {
  lat: number;
  lng: number;
};

const pinCache = new Map<string, MapPin>();

function googleMapsKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  );
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

async function findPlacePin(query: string, key: string): Promise<MapPin | null> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
  );
  url.searchParams.set("input", query);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "geometry");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);

  const data = await fetchGoogleJson(url.toString());
  return readLatLng(data?.candidates?.[0]?.geometry?.location);
}

async function textSearchPin(query: string, key: string): Promise<MapPin | null> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json"
  );
  url.searchParams.set("query", query);
  url.searchParams.set("region", "il");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);

  const data = await fetchGoogleJson(url.toString());
  return readLatLng(data?.results?.[0]?.geometry?.location);
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

  if (hasExactCoordinates(location)) {
    return {
      lat: parseCoord(location.lat) as number,
      lng: parseCoord(location.lng) as number,
    };
  }

  const query = getLocationQuery(location);
  if (!query) return null;

  const cached = pinCache.get(query);
  if (cached) return cached;

  const key = googleMapsKey();
  if (!key) return null;

  const pin =
    (await findPlacePin(query, key)) ||
    (await textSearchPin(query, key)) ||
    (await geocodePin(query, key));

  if (pin) pinCache.set(query, pin);
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
