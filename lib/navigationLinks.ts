export type NavLocation = {
  name?: string | null;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  placeId?: string | null;
  placeName?: string | null;
  formattedAddress?: string | null;
  /** Vehicle-entrance pin used only by Waze. Google Maps keeps `lat`/`lng`. */
  wazeLat?: number | string | null;
  wazeLng?: number | string | null;
  /** Couple-pasted Waze share / live-map / permalink. Beats generic lat/lng. */
  wazeUrl?: string | null;
};

export type ResolvedEventLocation = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string;
  placeName: string;
  formattedAddress: string;
  wazeLat: number | null;
  wazeLng: number | null;
  wazeUrl: string;
};

export function parseCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function hasExactCoordinates(location?: NavLocation | null): boolean {
  return parseCoord(location?.lat) != null && parseCoord(location?.lng) != null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return text;
  }
  return "";
}

function asLocationObject(value: unknown): NavLocation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as NavLocation;
}

function firstWazeDestination(locations: NavLocation[]) {
  for (const location of locations) {
    const wazeUrl = firstText(location.wazeUrl);
    const wazeLat = parseCoord(location.wazeLat);
    const wazeLng = parseCoord(location.wazeLng);
    if (wazeUrl || (wazeLat != null && wazeLng != null)) {
      return { wazeUrl, wazeLat, wazeLng };
    }
  }
  return { wazeUrl: "", wazeLat: null as number | null, wazeLng: null as number | null };
}

/** Readable venue label for Google Maps (never raw coordinates). */
export function locationLabel(location?: NavLocation | null): string {
  if (!location) return "";
  return firstText(
    location.placeName,
    location.name,
    location.formattedAddress,
    location.address
  );
}

export function resolveEventLocation(
  invitation?: any,
  event?: any
): ResolvedEventLocation {
  const invitationLocation = asLocationObject(invitation?.location);
  const eventLocation = asLocationObject(event?.location);
  const extraLocation = asLocationObject(
    typeof invitation?.eventLocation === "object"
      ? invitation.eventLocation
      : null
  );

  const invitationCoords = hasExactCoordinates(invitationLocation)
    ? invitationLocation
    : null;
  const eventCoords = hasExactCoordinates(eventLocation) ? eventLocation : null;
  const extraCoords = hasExactCoordinates(extraLocation) ? extraLocation : null;
  const coords = invitationCoords || eventCoords || extraCoords;
  const waze = firstWazeDestination([
    invitationLocation,
    eventLocation,
    extraLocation,
  ]);

  return {
    name: firstText(
      invitationLocation.name,
      eventLocation.name,
      invitation?.venueName,
      event?.venueName,
      invitation?.hallName,
      event?.hallName,
      extraLocation.name
    ),
    address: firstText(
      invitationLocation.address,
      eventLocation.address,
      invitation?.address,
      event?.address,
      extraLocation.address
    ),
    lat: parseCoord(coords?.lat),
    lng: parseCoord(coords?.lng),
    placeId: firstText(
      invitationLocation.placeId,
      eventLocation.placeId,
      extraLocation.placeId
    ),
    placeName: firstText(
      invitationLocation.placeName,
      eventLocation.placeName,
      extraLocation.placeName
    ),
    formattedAddress: firstText(
      invitationLocation.formattedAddress,
      eventLocation.formattedAddress,
      extraLocation.formattedAddress
    ),
    wazeLat: waze.wazeLat,
    wazeLng: waze.wazeLng,
    wazeUrl: waze.wazeUrl,
  };
}

function queryFromLocation(location: NavLocation) {
  const lat = parseCoord(location.lat);
  const lng = parseCoord(location.lng);
  if (lat != null && lng != null) return `${lat},${lng}`;

  const name = firstText(location.name);
  const address = firstText(location.address);
  if (name && address && !address.includes(name) && !name.includes(address)) {
    return `${name}, ${address}`;
  }
  return address || name || null;
}

export type NavCustomLinks = {
  wazeUrl?: string | null;
  googleMapsUrl?: string | null;
};

export type NavTargetSource =
  | "custom"
  | "waze"
  | "coordinates"
  | "search"
  | "none";

export type NavTarget = {
  lat: number | null;
  lng: number | null;
  query: string;
  /** Set only when a couple's custom Waze link has no target we can share. */
  wazeUrlOnly: string;
  source: NavTargetSource;
  placeId: string;
  /** Readable place label for Google Maps titles. */
  label: string;
};

const COORD_PAIR = /(-?\d{1,3}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})/;

function coordPair(value: string): MapCoords | null {
  const match = COORD_PAIR.exec(value);
  if (!match) return null;

  const lat = parseCoord(match[1]);
  const lng = parseCoord(match[2]);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
}

type MapCoords = { lat: number; lng: number };

/**
 * Pull an explicit pin out of a Waze or Google Maps link so both buttons can
 * navigate to it. Only parameters that carry a destination are read; short
 * links such as waze.com/ul/hsv... stay opaque and return null.
 */
export function coordsFromNavUrl(url?: string | null): MapCoords | null {
  const raw = firstText(url);
  if (!raw) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // A malformed escape sequence still leaves the raw text worth scanning.
  }

  const targetParams = [
    /[?&#](?:ll|latlng)=([^&#]+)/i,
    /[?&#]to=ll\.(-?[\d.]+),(-?[\d.]+)/i,
    /(?:^|[?&#/])to=ll\.(-?[\d.]+),(-?[\d.]+)/i,
    /[?&#](?:q|query|destination|daddr|center)=([^&#]+)/i,
    /@(-?\d[\d.]*,-?\d[\d.]*)/,
    /!3d(-?[\d.]+)!4d(-?[\d.]+)/,
  ];

  for (const pattern of targetParams) {
    const match = pattern.exec(decoded);
    if (!match) continue;

    const found =
      match.length > 2 && match[2]
        ? coordPair(`${match[1]},${match[2]}`)
        : coordPair(match[1]);
    if (found) return found;
  }

  return null;
}

/** Free-text destination of a custom link, when it is not a coordinate pin. */
export function queryFromNavUrl(url?: string | null): string {
  const raw = firstText(url);
  if (!raw) return "";

  const match = /[?&#](?:q|query|destination|daddr)=([^&#]+)/i.exec(raw);
  if (!match) return "";

  let value = match[1].replace(/\+/g, " ");
  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep the raw value when it is not valid percent-encoding.
  }

  value = value.trim();
  if (!value || coordPair(value)) return "";

  return value;
}

function isNavigationUrl(url?: string | null) {
  const raw = firstText(url);
  if (!raw) return false;
  return /^(https?:\/\/|waze:\/\/|geo:)/i.test(raw);
}

export type ParsedWazeDestination = {
  wazeUrl: string;
  wazeLat: number | null;
  wazeLng: number | null;
};

/**
 * Parse a pasted Waze share link, live-map URL, or "lat, lng" pair without
 * touching the Google Maps pin.
 */
export function parseWazeDestinationInput(raw?: string | null): ParsedWazeDestination {
  const empty: ParsedWazeDestination = {
    wazeUrl: "",
    wazeLat: null,
    wazeLng: null,
  };
  const text = firstText(raw);
  if (!text) return empty;

  if (isNavigationUrl(text)) {
    const coords = coordsFromNavUrl(text);
    return {
      wazeUrl: text,
      wazeLat: coords?.lat ?? null,
      wazeLng: coords?.lng ?? null,
    };
  }

  const coords = coordPair(text);
  if (coords) {
    return { wazeUrl: "", wazeLat: coords.lat, wazeLng: coords.lng };
  }

  return { wazeUrl: text, wazeLat: null, wazeLng: null };
}

function wazeAppPermalink(url: string) {
  const match = /waze\.com\/ul\/([^/?#]+)/i.exec(url);
  if (match) return `waze://ul/${match[1]}`;
  return "";
}

function emptyNavTarget(): NavTarget {
  return {
    lat: null,
    lng: null,
    query: "",
    wazeUrlOnly: "",
    source: "none",
    placeId: "",
    label: "",
  };
}

function labelFromLocation(location?: NavLocation | null) {
  return locationLabel(location);
}

/**
 * Google Maps destination. Never uses a Waze entrance pin or a pasted Waze
 * URL — those can sit on a different road than the venue itself.
 */
export function resolveGoogleNavTarget(
  location?: NavLocation | null,
  custom?: NavCustomLinks
): NavTarget {
  const empty = emptyNavTarget();
  const googleUrl = isNavigationUrl(custom?.googleMapsUrl)
    ? firstText(custom?.googleMapsUrl)
    : "";

  const locationLabelText = labelFromLocation(location);
  const locationPlaceId = firstText(location?.placeId);

  const customCoords = coordsFromNavUrl(googleUrl);
  if (customCoords) {
    return {
      ...empty,
      ...customCoords,
      source: "custom",
      label: locationLabelText,
    };
  }

  const lat = parseCoord(location?.lat);
  const lng = parseCoord(location?.lng);
  if (lat != null && lng != null) {
    return {
      ...empty,
      lat,
      lng,
      source: "coordinates",
      placeId: locationPlaceId,
      label: locationLabelText,
    };
  }

  const customQuery = queryFromNavUrl(googleUrl);
  if (customQuery) {
    return { ...empty, query: customQuery, source: "custom", label: customQuery };
  }

  const query = location ? queryFromLocation(location) : null;
  if (query) {
    return {
      ...empty,
      query,
      source: "search",
      placeId: locationPlaceId,
      label: locationLabelText || query,
    };
  }

  return empty;
}

/**
 * Waze destination, in this order:
 * 1. pasted Waze URL
 * 2. saved Waze lat/lng
 * 3. typed Waze place name (search)
 * 4. Google pin
 * 5. event address search
 */
export function resolveWazeNavTarget(
  location?: NavLocation | null,
  custom?: NavCustomLinks
): NavTarget {
  const empty = emptyNavTarget();
  const locationLabelText = labelFromLocation(location);
  const override = firstText(custom?.wazeUrl) || firstText(location?.wazeUrl);

  if (isNavigationUrl(override)) {
    const coords = coordsFromNavUrl(override);
    return {
      ...empty,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      wazeUrlOnly: override,
      source: "custom",
      label: locationLabelText,
    };
  }

  const wazeLat = parseCoord(location?.wazeLat);
  const wazeLng = parseCoord(location?.wazeLng);
  if (wazeLat != null && wazeLng != null) {
    return {
      ...empty,
      lat: wazeLat,
      lng: wazeLng,
      source: "waze",
      label: locationLabelText,
    };
  }

  if (override) {
    return {
      ...empty,
      query: override,
      source: "custom",
      label: locationLabelText || override,
    };
  }

  const lat = parseCoord(location?.lat);
  const lng = parseCoord(location?.lng);
  if (lat != null && lng != null) {
    return {
      ...empty,
      lat,
      lng,
      source: "coordinates",
      label: locationLabelText,
    };
  }

  const query = location ? queryFromLocation(location) : null;
  if (query) {
    return {
      ...empty,
      query,
      source: "search",
      label: locationLabelText || query,
    };
  }

  return empty;
}

/**
 * @deprecated Prefer resolveGoogleNavTarget / resolveWazeNavTarget.
 * Kept as the Google Maps destination so existing callers keep a map pin.
 */
export function resolveNavTarget(
  location?: NavLocation | null,
  custom?: NavCustomLinks
): NavTarget {
  return resolveGoogleNavTarget(location, custom);
}

function wazeUrlForTarget(
  base: "https://waze.com/ul" | "waze://",
  target: NavTarget
) {
  if (target.wazeUrlOnly) {
    if (base === "waze://") {
      if (target.lat != null && target.lng != null) {
        return `${base}?ll=${target.lat},${target.lng}&navigate=yes`;
      }
      return wazeAppPermalink(target.wazeUrlOnly) || target.wazeUrlOnly;
    }
    return target.wazeUrlOnly;
  }

  if (target.lat != null && target.lng != null) {
    // Never add q= next to ll — Waze treats q as a search and can open a
    // same-named venue in another city, ignoring the pin.
    return `${base}?ll=${target.lat},${target.lng}&navigate=yes`;
  }

  if (target.query) {
    return `${base}?q=${encodeURIComponent(target.query)}&navigate=yes`;
  }

  return null;
}

export function getWazeLinkForTarget(target: NavTarget) {
  return wazeUrlForTarget("https://waze.com/ul", target);
}

export function getWazeAppLinkForTarget(target: NavTarget) {
  return wazeUrlForTarget("waze://", target);
}

/**
 * Google Maps link that prefers a readable place title while keeping the
 * Google pin. Waze may navigate to a separate vehicle entrance.
 */
export function getGoogleMapsLinkForTarget(target: NavTarget) {
  const label = firstText(target.label, target.query);
  const placeId = firstText(target.placeId);

  if (placeId && label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      label
    )}&query_place_id=${encodeURIComponent(placeId)}`;
  }

  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      placeId
    )}&query_place_id=${encodeURIComponent(placeId)}`;
  }

  if (label && target.lat != null && target.lng != null) {
    // Place path keeps the exact pin via /@lat,lng while the path segment is
    // the human-readable title shown in Maps.
    return `https://www.google.com/maps/place/${encodeURIComponent(label)}/@${
      target.lat
    },${target.lng},17z`;
  }

  if (target.lat != null && target.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${target.lat},${target.lng}`
    )}`;
  }

  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      label
    )}`;
  }

  return null;
}

export function getGoogleMapsLink(
  location: NavLocation,
  custom?: NavCustomLinks
) {
  return getGoogleMapsLinkForTarget(resolveGoogleNavTarget(location, custom));
}

export function getLocationQuery(location: NavLocation) {
  return firstText(location.address, location.name);
}

export function getWazeLink(location: NavLocation, custom?: NavCustomLinks) {
  return getWazeLinkForTarget(resolveWazeNavTarget(location, custom));
}

export function getWazeAppLink(location: NavLocation, custom?: NavCustomLinks) {
  return getWazeAppLinkForTarget(resolveWazeNavTarget(location, custom));
}

export function getGoogleMapsEmbedUrlForTarget(target: NavTarget, zoom = 16) {
  // Iframes only render the classic maps URL with output=embed. Search API
  // links (query_place_id) and /place/ paths show a broken frame — keep those
  // for the Google Maps button, not the embedded preview.
  if (target.lat != null && target.lng != null) {
    return `https://www.google.com/maps?q=${target.lat},${target.lng}&z=${zoom}&output=embed`;
  }

  const label = firstText(target.label, target.query);
  if (!label) return null;

  return `https://www.google.com/maps?q=${encodeURIComponent(
    label
  )}&z=${zoom}&output=embed`;
}

export function getGoogleMapsEmbedUrl(
  location: NavLocation,
  zoom = 16,
  custom?: NavCustomLinks
) {
  return getGoogleMapsEmbedUrlForTarget(
    resolveGoogleNavTarget(location, custom),
    zoom
  );
}
