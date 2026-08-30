export type NavLocation = {
  name?: string | null;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  placeId?: string | null;
};

export type ResolvedEventLocation = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string;
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

export type NavTargetSource = "custom" | "coordinates" | "search" | "none";

export type NavTarget = {
  lat: number | null;
  lng: number | null;
  query: string;
  /** Set only when a couple's custom Waze link has no target we can share. */
  wazeUrlOnly: string;
  source: NavTargetSource;
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

/**
 * One destination for every navigation button on a page, resolved in the order
 * the product requires: a custom link the couple entered, then the pin saved on
 * the event, and only then a text search.
 */
export function resolveNavTarget(
  location?: NavLocation | null,
  custom?: NavCustomLinks
): NavTarget {
  const empty: NavTarget = {
    lat: null,
    lng: null,
    query: "",
    wazeUrlOnly: "",
    source: "none",
  };

  const wazeUrl = isNavigationUrl(custom?.wazeUrl) ? firstText(custom?.wazeUrl) : "";
  const googleUrl = isNavigationUrl(custom?.googleMapsUrl)
    ? firstText(custom?.googleMapsUrl)
    : "";

  const customCoords =
    coordsFromNavUrl(wazeUrl) || coordsFromNavUrl(googleUrl) || null;
  if (customCoords) {
    return { ...empty, ...customCoords, source: "custom" };
  }

  const lat = parseCoord(location?.lat);
  const lng = parseCoord(location?.lng);
  if (lat != null && lng != null) {
    return { ...empty, lat, lng, source: "coordinates" };
  }

  const customQuery = queryFromNavUrl(wazeUrl) || queryFromNavUrl(googleUrl);
  if (customQuery) {
    return { ...empty, query: customQuery, source: "custom" };
  }

  const query = location ? queryFromLocation(location) : null;
  if (query) {
    return { ...empty, query, source: "search" };
  }

  // Nothing shareable. A short custom Waze link is still better than no button,
  // but only Waze can follow it, so Google Maps stays hidden.
  if (wazeUrl) return { ...empty, wazeUrlOnly: wazeUrl, source: "custom" };

  return empty;
}

function wazeUrlForTarget(
  base: "https://waze.com/ul" | "waze://",
  target: NavTarget
) {
  if (target.lat != null && target.lng != null) {
    // Never add q= next to ll — Waze treats q as a search and can open a
    // same-named venue in another city, ignoring the pin.
    return `${base}?ll=${target.lat},${target.lng}&navigate=yes`;
  }

  if (target.wazeUrlOnly) return target.wazeUrlOnly;

  // Last resort: no pin could be resolved for this event, so Waze has to
  // search. Less precise than a pin, but better than no navigation at all.
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

export function getGoogleMapsLinkForTarget(target: NavTarget) {
  const query =
    target.lat != null && target.lng != null
      ? `${target.lat},${target.lng}`
      : target.query;

  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

export function getGoogleMapsLink(
  location: NavLocation,
  custom?: NavCustomLinks
) {
  return getGoogleMapsLinkForTarget(resolveNavTarget(location, custom));
}

export function getLocationQuery(location: NavLocation) {
  return firstText(location.address, location.name);
}

export function getWazeLink(location: NavLocation, custom?: NavCustomLinks) {
  return getWazeLinkForTarget(resolveNavTarget(location, custom));
}

export function getWazeAppLink(location: NavLocation, custom?: NavCustomLinks) {
  return getWazeAppLinkForTarget(resolveNavTarget(location, custom));
}

export function getGoogleMapsEmbedUrlForTarget(target: NavTarget, zoom = 16) {
  if (target.lat != null && target.lng != null) {
    return `https://www.google.com/maps?q=${target.lat},${target.lng}&z=${zoom}&output=embed`;
  }

  if (!target.query) return null;

  return `https://www.google.com/maps?q=${encodeURIComponent(
    target.query
  )}&z=${zoom}&output=embed`;
}

export function getGoogleMapsEmbedUrl(
  location: NavLocation,
  zoom = 16,
  custom?: NavCustomLinks
) {
  return getGoogleMapsEmbedUrlForTarget(resolveNavTarget(location, custom), zoom);
}
