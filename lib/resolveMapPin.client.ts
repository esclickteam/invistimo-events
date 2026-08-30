import {
  getLocationQuery,
  type NavLocation,
} from "@/lib/navigationLinks";
import {
  asMapPin,
  chooseMapPin,
  hintQueries,
  placeSearchQuery,
} from "@/lib/mapPinChoice";
import type { MapPin, PinCandidate } from "@/lib/mapPinChoice";

type GoogleLatLng = {
  lat: () => number;
  lng: () => number;
};

type GooglePlaceResult = {
  name?: string;
  formatted_address?: string;
  geometry?: {
    location?: GoogleLatLng;
  };
};

type GoogleGeocoderResult = {
  formatted_address?: string;
  geometry?: {
    location?: GoogleLatLng;
  };
};

function pinFromLocation(loc?: GoogleLatLng | null): MapPin | null {
  if (!loc) return null;
  return { lat: loc.lat(), lng: loc.lng() };
}

function toCandidate(
  loc: GoogleLatLng | null | undefined,
  extra?: { name?: string; address?: string }
): PinCandidate | null {
  const pin = pinFromLocation(loc);
  if (!pin) return null;
  return {
    ...pin,
    name: extra?.name || "",
    address: extra?.address || "",
  };
}

function waitForGoogleMaps(timeoutMs = 4000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.maps?.places && window.google?.maps?.Geocoder) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.google?.maps?.places && window.google?.maps?.Geocoder) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 80);
  });
}

function placesTextSearch(
  query: string,
  bias?: MapPin | null
): Promise<PinCandidate[]> {
  return new Promise((resolve) => {
    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      const request: Record<string, unknown> = { query, region: "IL" };
      if (bias) {
        request.location = new window.google.maps.LatLng(bias.lat, bias.lng);
        request.radius = 25000;
      }
      service.textSearch(
        request,
        (results: unknown, status: unknown) => {
          const list = Array.isArray(results)
            ? (results as GooglePlaceResult[])
            : [];
          if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
            resolve([]);
            return;
          }
          resolve(
            list
              .slice(0, 8)
              .map((result) =>
                toCandidate(result?.geometry?.location, {
                  name: result?.name,
                  address: result?.formatted_address,
                })
              )
              .filter((pin): pin is PinCandidate => Boolean(pin))
          );
        }
      );
    } catch {
      resolve([]);
    }
  });
}

function geocodePins(query: string): Promise<PinCandidate[]> {
  return new Promise((resolve) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { address: query, region: "IL" },
        (results: unknown, status: unknown) => {
          const list = Array.isArray(results)
            ? (results as GoogleGeocoderResult[])
            : [];
          if (status !== "OK") {
            resolve([]);
            return;
          }
          resolve(
            list
              .slice(0, 5)
              .map((result) =>
                toCandidate(result?.geometry?.location, {
                  name: result?.formatted_address,
                  address: result?.formatted_address,
                })
              )
              .filter((pin): pin is PinCandidate => Boolean(pin))
          );
        }
      );
    } catch {
      resolve([]);
    }
  });
}

export async function resolveMapPinInBrowser(
  location?: NavLocation | null
): Promise<MapPin | null> {
  if (!location) return null;

  const saved = asMapPin(location);
  if (saved) return saved;

  const searchQuery = placeSearchQuery(location) || getLocationQuery(location);
  const venueName = String(location.name || "").trim();

  const ready = await waitForGoogleMaps();
  if (!ready) return null;

  const geoResults: PinCandidate[] = [];
  let hint: MapPin | null = null;

  // Same order as the server resolver: the locality anchors the search so a
  // venue name cannot pull the pin into another city.
  for (const query of hintQueries(location)) {
    const results = await geocodePins(query);
    geoResults.push(...results);
    if (!hint && results[0]) {
      hint = { lat: results[0].lat, lng: results[0].lng };
    }
  }

  const candidates = [
    ...geoResults,
    ...(searchQuery ? await placesTextSearch(searchQuery, hint) : []),
  ];

  return chooseMapPin({ saved, hint, candidates, venueName });
}
