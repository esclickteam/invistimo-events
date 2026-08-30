import {
  getLocationQuery,
  parseCoord,
  type NavLocation,
} from "@/lib/navigationLinks";
import {
  asMapPin,
  chooseMapPin,
  choosePlaceMetaNearPin,
  hintQueries,
  localityQuery,
  placeSearchQuery,
  type MapPin,
  type PinCandidate,
} from "@/lib/mapPinChoice";
import { getGoogleMapsServerKey } from "@/lib/googleMapsServerKey";

export type { MapPin };

export type MapPinFailure =
  | "NO_QUERY"
  | "NO_API_KEY"
  | "PROVIDER_REJECTED"
  | "NOT_FOUND";

export type MapPinResolution = {
  pin: MapPin | null;
  /** Where the pin came from, for logging and for the couple's warning text. */
  source: "saved" | "geocode" | "place_meta" | "none";
  failure: MapPinFailure | null;
  /** Raw Google status (REQUEST_DENIED, OVER_QUERY_LIMIT, ...) when it failed. */
  providerStatus: string;
  providerMessage: string;
};

const pinCache = new Map<string, MapPin>();
const placeMetaCache = new Map<string, MapPin | null>();

function googleMapsKey() {
  return getGoogleMapsServerKey();
}

function cacheKey(location: NavLocation) {
  const saved = asMapPin(location);
  return JSON.stringify({
    locality: localityQuery(location),
    search: placeSearchQuery(location),
    saved,
  });
}

function placeMetaCacheKey(location: NavLocation, pin: MapPin) {
  return JSON.stringify({
    lat: pin.lat,
    lng: pin.lng,
    search: placeSearchQuery(location) || getLocationQuery(location),
    name: String(location.name || "").trim(),
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
  extra?: { name?: string; address?: string; placeId?: string }
): PinCandidate | null {
  const pin = readLatLng(location);
  if (!pin) return null;
  const placeId = String(extra?.placeId || "").trim();
  return {
    ...pin,
    name: extra?.name || "",
    address: extra?.address || "",
    ...(placeId ? { placeId } : {}),
  };
}

type ProviderResult = {
  candidates: PinCandidate[];
  status: string;
  message: string;
};

const PROVIDER_OK = new Set(["OK", "ZERO_RESULTS"]);

/**
 * Google answers with HTTP 200 and a status field even when it refuses the
 * call, so a rejected key looks exactly like an address that does not exist.
 * Keep the status around: a silent empty result is what left events pinless.
 */
async function fetchGoogleJson(
  api: string,
  url: string
): Promise<{ data: any | null; status: string; message: string }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { data: null, status: `HTTP_${res.status}`, message: "" };
    }

    const data = await res.json();
    const status = String(data?.status || "");
    const message = String(data?.error_message || "");

    if (status && !PROVIDER_OK.has(status)) {
      console.error(
        `❌ Google Maps ${api} refused the request (${status}): ${
          message || "no error_message"
        }`
      );
    }

    return { data, status, message };
  } catch (error: any) {
    console.error(
      `❌ Google Maps ${api} request failed:`,
      error?.message || error
    );
    return { data: null, status: "FETCH_FAILED", message: "" };
  }
}

async function findPlacePins(
  query: string,
  key: string,
  bias?: MapPin | null
): Promise<ProviderResult> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
  );
  url.searchParams.set("input", query);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "geometry,name,formatted_address,place_id");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);
  if (bias) {
    url.searchParams.set(
      "locationbias",
      `circle:25000@${bias.lat},${bias.lng}`
    );
  }

  const { data, status, message } = await fetchGoogleJson(
    "findplacefromtext",
    url.toString()
  );
  const candidate = toCandidate(data?.candidates?.[0]?.geometry?.location, {
    name: data?.candidates?.[0]?.name,
    address: data?.candidates?.[0]?.formatted_address,
    placeId: data?.candidates?.[0]?.place_id,
  });

  return { candidates: candidate ? [candidate] : [], status, message };
}

async function textSearchPins(
  query: string,
  key: string,
  bias?: MapPin | null
): Promise<ProviderResult> {
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

  const { data, status, message } = await fetchGoogleJson(
    "textsearch",
    url.toString()
  );
  const results = Array.isArray(data?.results) ? data.results : [];

  return {
    candidates: results
      .slice(0, 8)
      .map((result: any) =>
        toCandidate(result?.geometry?.location, {
          name: result?.name,
          address: result?.formatted_address,
          placeId: result?.place_id,
        })
      )
      .filter(Boolean) as PinCandidate[],
    status,
    message,
  };
}

async function nearbyPlacePins(
  pin: MapPin,
  keyword: string,
  key: string
): Promise<ProviderResult> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
  );
  url.searchParams.set("location", `${pin.lat},${pin.lng}`);
  url.searchParams.set("radius", "200");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);
  if (keyword) url.searchParams.set("keyword", keyword);

  const { data, status, message } = await fetchGoogleJson(
    "nearbysearch",
    url.toString()
  );
  const results = Array.isArray(data?.results) ? data.results : [];

  return {
    candidates: results
      .slice(0, 8)
      .map((result: any) =>
        toCandidate(result?.geometry?.location, {
          name: result?.name,
          address: result?.vicinity || result?.formatted_address,
          placeId: result?.place_id,
        })
      )
      .filter(Boolean) as PinCandidate[],
    status,
    message,
  };
}

async function geocodePins(query: string, key: string): Promise<ProviderResult> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("region", "il");
  url.searchParams.set("language", "he");
  url.searchParams.set("key", key);

  const { data, status, message } = await fetchGoogleJson(
    "geocode",
    url.toString()
  );
  const results = Array.isArray(data?.results) ? data.results : [];

  return {
    candidates: results
      .slice(0, 5)
      .map((result: any) =>
        toCandidate(result?.geometry?.location, {
          name: result?.formatted_address,
          address: result?.formatted_address,
          placeId: result?.place_id,
        })
      )
      .filter(Boolean) as PinCandidate[],
    status,
    message,
  };
}

function failureFromStatuses(statuses: string[]): MapPinFailure {
  const rejected = statuses.find(
    (status) => status && !PROVIDER_OK.has(status)
  );
  return rejected ? "PROVIDER_REJECTED" : "NOT_FOUND";
}

/**
 * Look up a Google Place card for an already-saved pin.
 * Keeps the exact lat/lng (for Waze) and only fills placeId / place labels.
 */
export async function enrichPlaceMetaNearPin(
  location?: NavLocation | null
): Promise<MapPinResolution> {
  const empty: MapPinResolution = {
    pin: null,
    source: "none",
    failure: "NO_QUERY",
    providerStatus: "",
    providerMessage: "",
  };

  if (!location) return empty;

  const saved = asMapPin(location);
  if (!saved) return empty;

  const existingPlaceId = String(location.placeId || "").trim();
  if (existingPlaceId) {
    return {
      ...empty,
      pin: {
        ...saved,
        placeId: existingPlaceId,
        placeName: String(location.placeName || "").trim() || undefined,
        formattedAddress:
          String(location.formattedAddress || "").trim() || undefined,
      },
      source: "saved",
      failure: null,
    };
  }

  const searchQuery = placeSearchQuery(location) || getLocationQuery(location);
  const venueName = String(location.name || location.placeName || "").trim();
  if (!searchQuery && !venueName) {
    return { ...empty, failure: "NO_QUERY" };
  }

  const cacheKeyValue = placeMetaCacheKey(location, saved);
  if (placeMetaCache.has(cacheKeyValue)) {
    const cached = placeMetaCache.get(cacheKeyValue) || null;
    return cached
      ? { ...empty, pin: cached, source: "place_meta", failure: null }
      : { ...empty, failure: "NOT_FOUND" };
  }

  const apiKey = googleMapsKey();
  if (!apiKey) {
    return { ...empty, failure: "NO_API_KEY" };
  }

  const keyword = venueName || searchQuery;
  const statuses: string[] = [];
  let providerMessage = "";

  const searches = await Promise.all([
    nearbyPlacePins(saved, keyword, apiKey),
    textSearchPins(searchQuery || keyword, apiKey, saved),
    findPlacePins(searchQuery || keyword, apiKey, saved),
  ]);

  for (const result of searches) {
    statuses.push(result.status);
    providerMessage = providerMessage || result.message;
  }

  const candidates = searches.flatMap((result) => result.candidates);
  const enriched = choosePlaceMetaNearPin({
    pin: saved,
    candidates,
    venueName: venueName || searchQuery,
  });

  placeMetaCache.set(cacheKeyValue, enriched);

  if (!enriched?.placeId) {
    return {
      ...empty,
      failure: failureFromStatuses(statuses),
      providerStatus:
        statuses.find((status) => status && !PROVIDER_OK.has(status)) || "",
      providerMessage,
    };
  }

  return {
    pin: enriched,
    source: "place_meta",
    failure: null,
    providerStatus: "",
    providerMessage: "",
  };
}

export async function resolveMapPinDetailed(
  location?: NavLocation | null
): Promise<MapPinResolution> {
  const empty: MapPinResolution = {
    pin: null,
    source: "none",
    failure: "NO_QUERY",
    providerStatus: "",
    providerMessage: "",
  };

  if (!location) return empty;

  const saved = asMapPin(location);
  if (saved) {
    const existingPlaceId = String(location.placeId || "").trim();
    if (existingPlaceId) {
      return {
        ...empty,
        pin: {
          ...saved,
          placeId: existingPlaceId,
          placeName: String(location.placeName || "").trim() || undefined,
          formattedAddress:
            String(location.formattedAddress || "").trim() || undefined,
        },
        source: "saved",
        failure: null,
      };
    }

    // Coords exist but the Google place card is missing — look it up without
    // moving the pin so Maps can open the venue by placeId.
    const enriched = await enrichPlaceMetaNearPin(location);
    if (enriched.pin?.placeId) return enriched;

    return { ...empty, pin: saved, source: "saved", failure: null };
  }

  const searchQuery = placeSearchQuery(location) || getLocationQuery(location);
  const venueName = String(location.name || "").trim();
  if (!searchQuery) return empty;

  const key = cacheKey(location);
  const cached = pinCache.get(key);
  if (cached) {
    return { ...empty, pin: cached, source: "geocode", failure: null };
  }

  const apiKey = googleMapsKey();
  if (!apiKey) {
    console.error(
      "❌ Cannot resolve an event pin: GOOGLE_MAPS_API_KEY is not configured."
    );
    return { ...empty, failure: "NO_API_KEY" };
  }

  const statuses: string[] = [];
  let providerMessage = "";
  const geoResults: PinCandidate[] = [];
  let hint: MapPin | null = null;

  // The locality is resolved first and anchors everything else: a venue name
  // alone can match a hall with the same name in another city.
  for (const query of hintQueries(location)) {
    const result = await geocodePins(query, apiKey);
    statuses.push(result.status);
    providerMessage = providerMessage || result.message;
    geoResults.push(...result.candidates);

    if (!hint && result.candidates[0]) {
      hint = { lat: result.candidates[0].lat, lng: result.candidates[0].lng };
    }
  }

  const searches = await Promise.all([
    textSearchPins(searchQuery, apiKey, hint),
    findPlacePins(searchQuery, apiKey, hint),
  ]);
  for (const result of searches) {
    statuses.push(result.status);
    providerMessage = providerMessage || result.message;
  }

  const candidates = [
    ...geoResults,
    ...searches.flatMap((result) => result.candidates),
  ];

  const pin = chooseMapPin({ saved, hint, candidates, venueName });
  const providerStatus =
    statuses.find((status) => status && !PROVIDER_OK.has(status)) || "";

  if (!pin) {
    return {
      ...empty,
      failure: failureFromStatuses(statuses),
      providerStatus,
      providerMessage,
    };
  }

  pinCache.set(key, pin);

  return {
    pin,
    source: "geocode",
    failure: null,
    providerStatus,
    providerMessage,
  };
}

export async function resolveMapPin(
  location?: NavLocation | null
): Promise<MapPin | null> {
  const { pin } = await resolveMapPinDetailed(location);
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
  } as T & MapPin;
}
