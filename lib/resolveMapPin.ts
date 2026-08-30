import {
  getLocationQuery,
  parseCoord,
  type NavLocation,
} from "@/lib/navigationLinks";
import {
  asMapPin,
  chooseMapPin,
  geographicQuery,
  hintQueries,
  pickHintPin,
  placeSearchQuery,
  type MapPin,
  type PinCandidate,
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

function toCandidate(
  location: any,
  extra?: { name?: string; address?: string }
): PinCandidate | null {
  const pin = readLatLng(location);
  if (!pin) return null;
  return {
    ...pin,
    name: extra?.name || "",
    address: extra?.address || "",
  };
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
): Promise<PinCandidate[]> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
  );
  url.searchParams.set("input", query);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "geometry,name,formatted_address");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);
  if (bias) {
    url.searchParams.set(
      "locationbias",
      `circle:25000@${bias.lat},${bias.lng}`
    );
  }

  const data = await fetchGoogleJson(url.toString());
  const candidate = toCandidate(data?.candidates?.[0]?.geometry?.location, {
    name: data?.candidates?.[0]?.name,
    address: data?.candidates?.[0]?.formatted_address,
  });
  return candidate ? [candidate] : [];
}

async function textSearchPins(
  query: string,
  key: string,
  bias?: MapPin | null
): Promise<PinCandidate[]> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json"
  );
  url.searchParams.set("query", query);
  url.searchParams.set("region", "il");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);
  if (bias) {
    url.searchParams.set("location", `${bias.lat},${bias.lng}`);
    url.searchParams.set("radius", "25000");
  }

  const data = await fetchGoogleJson(url.toString());
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .slice(0, 8)
    .map((result: any) =>
      toCandidate(result?.geometry?.location, {
        name: result?.name,
        address: result?.formatted_address,
      })
    )
    .filter(Boolean) as PinCandidate[];
}

async function geocodePins(
  query: string,
  key: string
): Promise<PinCandidate[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("region", "il");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);

  const data = await fetchGoogleJson(url.toString());
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .slice(0, 5)
    .map((result: any) =>
      toCandidate(result?.geometry?.location, {
        name: result?.formatted_address,
        address: result?.formatted_address,
      })
    )
    .filter(Boolean) as PinCandidate[];
}

export async function resolveMapPin(
  location?: NavLocation | null
): Promise<MapPin | null> {
  if (!location) return null;

  const saved = asMapPin(location);
  const searchQuery = placeSearchQuery(location) || getLocationQuery(location);
  const venueName = String(location.name || "").trim();

  const key = cacheKey(location);
  const cached = pinCache.get(key);
  if (cached) return cached;

  const apiKey = googleMapsKey();
  if (!apiKey) {
    return chooseMapPin({
      saved,
      hint: null,
      candidates: [],
      query: searchQuery,
      venueName,
    });
  }

  const geoResults: PinCandidate[] = [];
  for (const query of hintQueries(location)) {
    geoResults.push(...(await geocodePins(query, apiKey)));
  }

  const hint = pickHintPin(geoResults, searchQuery);
  const candidates = [
    ...geoResults,
    ...(searchQuery ? await textSearchPins(searchQuery, apiKey, hint) : []),
    ...(searchQuery ? await findPlacePins(searchQuery, apiKey, hint) : []),
  ];

  const pin = chooseMapPin({
    saved,
    hint,
    candidates,
    query: searchQuery,
    venueName,
  });
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
