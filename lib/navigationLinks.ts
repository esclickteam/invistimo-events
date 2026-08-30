export type NavLocation = {
  name?: string | null;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

export type ResolvedEventLocation = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
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
  };
}

function queryFromLocation(location: NavLocation) {
  const lat = parseCoord(location.lat);
  const lng = parseCoord(location.lng);
  if (lat != null && lng != null) return `${lat},${lng}`;

  const address = firstText(location.address, location.name);
  return address || null;
}

export function getGoogleMapsLink(location: NavLocation) {
  const query = queryFromLocation(location);
  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

export function getLocationQuery(location: NavLocation) {
  return firstText(location.address, location.name);
}

export function getWazeLink(location: NavLocation) {
  const lat = parseCoord(location.lat);
  const lng = parseCoord(location.lng);

  // Waze search (`q=`) matches a different index than Google Maps.
  // A venue name like "שיבולים גן אירועים" can open the wrong city.
  // Always navigate by the exact pin — never by business-name search.
  if (lat == null || lng == null) return null;

  return `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function getGoogleMapsEmbedUrl(location: NavLocation, zoom = 16) {
  const query = queryFromLocation(location);
  if (!query) return null;

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;
}
