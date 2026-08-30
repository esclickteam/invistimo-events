import {
  getLocationQuery,
  type NavLocation,
} from "@/lib/navigationLinks";
import {
  asMapPin,
  chooseMapPin,
  geographicQuery,
  placeSearchQuery,
} from "@/lib/mapPinChoice";
import type { MapPin } from "@/lib/mapPinChoice";

type GoogleLatLng = {
  lat: () => number;
  lng: () => number;
};

type GooglePlaceResult = {
  geometry?: {
    location?: GoogleLatLng;
  };
};

type GoogleGeocoderResult = {
  geometry?: {
    location?: GoogleLatLng;
  };
};

function pinFromLocation(loc?: GoogleLatLng | null): MapPin | null {
  if (!loc) return null;
  return { lat: loc.lat(), lng: loc.lng() };
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
): Promise<MapPin[]> {
  return new Promise((resolve) => {
    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      const request: Record<string, unknown> = { query, region: "IL" };
      if (bias) {
        request.location = new window.google.maps.LatLng(bias.lat, bias.lng);
        request.radius = 30000;
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
              .map((result) => pinFromLocation(result?.geometry?.location))
              .filter((pin): pin is MapPin => Boolean(pin))
          );
        }
      );
    } catch {
      resolve([]);
    }
  });
}

function geocodeQuery(query: string): Promise<MapPin | null> {
  return new Promise((resolve) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { address: query, region: "IL" },
        (results: unknown, status: unknown) => {
          const list = Array.isArray(results)
            ? (results as GoogleGeocoderResult[])
            : [];
          const pin = pinFromLocation(list[0]?.geometry?.location);
          if (status === "OK" && pin) {
            resolve(pin);
            return;
          }
          resolve(null);
        }
      );
    } catch {
      resolve(null);
    }
  });
}

export async function resolveMapPinInBrowser(
  location?: NavLocation | null
): Promise<MapPin | null> {
  if (!location) return null;

  const saved = asMapPin(location);
  const geoQuery = geographicQuery(location);
  const searchQuery = placeSearchQuery(location) || getLocationQuery(location);

  const ready = await waitForGoogleMaps();
  if (!ready) return chooseMapPin({ saved, hint: null, candidates: [] });

  const hint =
    (geoQuery ? await geocodeQuery(geoQuery) : null) ||
    (searchQuery && searchQuery !== geoQuery
      ? await geocodeQuery(searchQuery)
      : null);

  const candidates = searchQuery
    ? await placesTextSearch(searchQuery, hint)
    : [];

  return chooseMapPin({ saved, hint, candidates });
}
