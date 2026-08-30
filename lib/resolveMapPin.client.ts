import {
  getLocationQuery,
  hasExactCoordinates,
  parseCoord,
  type NavLocation,
} from "@/lib/navigationLinks";
import type { MapPin } from "@/lib/resolveMapPin";

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
  if (window.google?.maps?.places) return Promise.resolve(true);

  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.google?.maps?.places) {
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

function placesTextSearch(query: string): Promise<MapPin | null> {
  return new Promise((resolve) => {
    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      service.textSearch(
        { query, region: "IL" },
        (results: unknown, status: unknown) => {
          const list = Array.isArray(results)
            ? (results as GooglePlaceResult[])
            : [];
          const pin = pinFromLocation(list[0]?.geometry?.location);
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            pin
          ) {
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

  if (hasExactCoordinates(location)) {
    return {
      lat: parseCoord(location.lat) as number,
      lng: parseCoord(location.lng) as number,
    };
  }

  const query = getLocationQuery(location);
  if (!query) return null;

  const ready = await waitForGoogleMaps();
  if (!ready) return null;

  return (await placesTextSearch(query)) || (await geocodeQuery(query));
}
