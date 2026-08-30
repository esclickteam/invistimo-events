/**
 * Server-only Google Maps key.
 *
 * Do not read the public browser key here. That value is shipped to the
 * client with an HTTP-referrer restriction and is refused by the
 * Geocoding / Places REST APIs. Set GOOGLE_MAPS_API_KEY on the server
 * (Vercel Production / Preview / Staging) with:
 *   - no HTTP-referrer restriction
 *   - IP restriction or no application restriction
 *   - Geocoding API + Places API enabled
 */
export function getGoogleMapsServerKey() {
  return String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
}

export function hasGoogleMapsServerKey() {
  return Boolean(getGoogleMapsServerKey());
}
