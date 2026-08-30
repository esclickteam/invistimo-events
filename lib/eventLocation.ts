import { parseCoord, type NavLocation } from "@/lib/navigationLinks";
import {
  enrichPlaceMetaNearPin,
  resolveMapPinDetailed,
  type MapPinFailure,
} from "@/lib/resolveMapPin";

export type EventLocation = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string;
  placeName: string;
  formattedAddress: string;
};

export type EventLocationWarning = {
  code: MapPinFailure;
  message: string;
  providerStatus: string;
};

export type PreparedEventLocation = {
  location: EventLocation;
  /** True when the venue text differs from what is stored today. */
  textChanged: boolean;
  pinSource: "client" | "kept" | "geocode" | "none";
  warning: EventLocationWarning | null;
};

const WARNING_TEXT: Record<MapPinFailure, string> = {
  NO_QUERY: "לא הוזן מיקום לאירוע.",
  NO_API_KEY:
    "לא הצלחנו לאתר את המיקום על המפה כרגע (שירות המפות אינו זמין בשרת). האורחים ינווטו לפי חיפוש טקסט, שעלול להוביל ליעד שגוי.",
  PROVIDER_REJECTED:
    "לא הצלחנו לאתר את המיקום על המפה כרגע (שירות המפות דחה את הבקשה). האורחים ינווטו לפי חיפוש טקסט, שעלול להוביל ליעד שגוי.",
  NOT_FOUND:
    "לא מצאנו את המיקום הזה על המפה. בחרו את האולם מרשימת ההצעות כדי שהניווט של האורחים יגיע לנקודה המדויקת.",
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeForCompare(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function emptyEventLocation(): EventLocation {
  return {
    name: "",
    address: "",
    lat: null,
    lng: null,
    placeId: "",
    placeName: "",
    formattedAddress: "",
  };
}

export function toEventLocation(input: unknown): EventLocation {
  if (typeof input === "string") {
    const address = cleanText(input);
    return { ...emptyEventLocation(), name: address, address };
  }

  if (!input || typeof input !== "object") return emptyEventLocation();

  const raw = input as NavLocation;

  return {
    name: cleanText(raw.name),
    address: cleanText(raw.address),
    lat: parseCoord(raw.lat),
    lng: parseCoord(raw.lng),
    placeId: cleanText(raw.placeId),
    placeName: cleanText(raw.placeName),
    formattedAddress: cleanText(raw.formattedAddress),
  };
}

export function hasLocationText(location: EventLocation) {
  return Boolean(location.name || location.address);
}

/**
 * Did the couple point at a different place than the one we have coordinates
 * for? Any change to the venue text or the Google place invalidates the pin.
 */
export function locationTextChanged(
  next: EventLocation,
  previous?: EventLocation | null
) {
  if (!previous) return hasLocationText(next);

  const placeChanged = Boolean(
    next.placeId && previous.placeId && next.placeId !== previous.placeId
  );

  return (
    normalizeForCompare(next.name) !== normalizeForCompare(previous.name) ||
    normalizeForCompare(next.address) !==
      normalizeForCompare(previous.address) ||
    placeChanged
  );
}

/**
 * Normalize a submitted location and make sure it carries coordinates.
 *
 * Coordinates are what Waze and Google Maps navigate by, so they are resolved
 * on every write rather than left to a later read: the client sends them when
 * a place was picked from autocomplete, an unchanged venue keeps the pin it
 * already has, and anything else is geocoded here. When that fails the caller
 * gets a warning to show instead of a silently pinless event.
 */
export async function prepareEventLocation(options: {
  input: unknown;
  previous?: unknown;
  geocode?: boolean;
}): Promise<PreparedEventLocation> {
  let location = toEventLocation(options.input);
  const previous = options.previous ? toEventLocation(options.previous) : null;
  const textChanged = locationTextChanged(location, previous);

  if (!hasLocationText(location)) {
    return {
      location: { ...location, lat: null, lng: null },
      textChanged,
      pinSource: "none",
      warning: null,
    };
  }

  const incomingMatchesPreviousPin =
    Boolean(textChanged) &&
    previous?.lat != null &&
    previous?.lng != null &&
    location.lat === previous.lat &&
    location.lng === previous.lng;

  // An address change that still carries the previous pin is a stale leftover
  // from a form that only edited the text. Drop those coordinates so we geocode
  // the new venue instead of sending guests to the old one.
  if (incomingMatchesPreviousPin) {
    location = { ...location, lat: null, lng: null, placeId: "" };
  }

  if (location.lat != null && location.lng != null) {
    if (location.placeId) {
      return { location, textChanged, pinSource: "client", warning: null };
    }

    // Client sent exact coords (or kept them) without a place card — try to
    // attach placeId so Google Maps can show the venue name.
    const enriched = await enrichPlaceMetaNearPin(location);
    if (enriched.pin?.placeId) {
      return {
        location: {
          ...location,
          placeId: enriched.pin.placeId,
          placeName: enriched.pin.placeName || location.placeName,
          formattedAddress:
            enriched.pin.formattedAddress || location.formattedAddress,
        },
        textChanged,
        pinSource: "client",
        warning: null,
      };
    }

    return { location, textChanged, pinSource: "client", warning: null };
  }

  if (!textChanged && previous?.lat != null && previous?.lng != null) {
    return {
      location: {
        ...location,
        lat: previous.lat,
        lng: previous.lng,
        placeId: location.placeId || previous.placeId,
        placeName: location.placeName || previous.placeName,
        formattedAddress:
          location.formattedAddress || previous.formattedAddress,
      },
      textChanged,
      pinSource: "kept",
      warning: null,
    };
  }

  if (options.geocode === false) {
    return { location, textChanged, pinSource: "none", warning: null };
  }

  const resolved = await resolveMapPinDetailed(location);

  if (resolved.pin) {
    return {
      location: {
        ...location,
        lat: resolved.pin.lat,
        lng: resolved.pin.lng,
        placeId: resolved.pin.placeId || location.placeId,
        placeName: resolved.pin.placeName || location.placeName,
        formattedAddress:
          resolved.pin.formattedAddress || location.formattedAddress,
      },
      textChanged,
      pinSource: "geocode",
      warning: null,
    };
  }

  const code = resolved.failure || "NOT_FOUND";
  console.error(
    `❌ No map pin for "${location.address || location.name}" (${code}${
      resolved.providerStatus ? `/${resolved.providerStatus}` : ""
    }). Guests will navigate by text search.`
  );

  return {
    location,
    textChanged,
    pinSource: "none",
    warning: {
      code,
      message: WARNING_TEXT[code],
      providerStatus: resolved.providerStatus,
    },
  };
}
