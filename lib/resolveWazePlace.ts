import { parseCoord } from "@/lib/navigationLinks";

export type WazePlace = {
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
};

type WazeSearchRow = {
  name?: string;
  businessName?: string;
  city?: string | null;
  street?: string | null;
  number?: string | null;
  location?: { lat?: number; lon?: number };
};

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function looksLikeShare(query: string) {
  return /^(https?:\/\/|waze:\/\/|geo:)/i.test(query.trim());
}

export function parseWazeSearchRows(rows: unknown): WazePlace[] {
  if (!Array.isArray(rows)) return [];

  const seen = new Set<string>();
  const places: WazePlace[] = [];

  for (const row of rows as WazeSearchRow[]) {
    const lat = parseCoord(row?.location?.lat);
    const lng = parseCoord(row?.location?.lon);
    const name = String(row?.businessName || row?.name || "").trim();
    if (lat == null || lng == null || !name) continue;

    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const subtitle = [row.street, row.number, row.city]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(", ");

    places.push({ name, subtitle, lat, lng });
    if (places.length >= 8) break;
  }

  return places;
}

export async function searchWazePlaces(
  query: string,
  bias?: { lat: number | null; lng: number | null } | null
): Promise<WazePlace[]> {
  const q = query.trim();
  if (!q || q.length < 2 || looksLikeShare(q)) return [];

  const biasLat = parseCoord(bias?.lat);
  const biasLng = parseCoord(bias?.lng);
  const lat = biasLat ?? 32.08;
  const lon = biasLng ?? 34.78;
  const url =
    "https://www.waze.com/il-SearchServer/mozi?" +
    new URLSearchParams({
      q,
      lang: "heb",
      lat: String(lat),
      lon: String(lon),
      origin: "livemap",
    }).toString();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Referer: "https://www.waze.com/",
        "User-Agent": "invistimo-events/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    return parseWazeSearchRows(await response.json());
  } catch {
    return [];
  }
}

/**
 * Look up a Waze venue near the Google pin so a typed place name can become
 * a routing coordinate. Failures stay silent: guests then search by that name.
 */
export async function lookupWazePlace(
  query: string,
  bias?: { lat: number | null; lng: number | null } | null
): Promise<{ lat: number; lng: number } | null> {
  const hits = await searchWazePlaces(query, bias);
  if (!hits.length) return null;

  const needle = query.replace(/\s+/g, " ").trim();
  const named = hits.filter(
    (hit) =>
      needle.includes(hit.name) ||
      hit.name.includes(needle) ||
      needle.split(/\s+/).some((part) => part.length > 2 && hit.name.includes(part))
  );
  const pool = named.length ? named : hits;

  const biasLat = parseCoord(bias?.lat);
  const biasLng = parseCoord(bias?.lng);
  if (biasLat != null && biasLng != null) {
    const nearby = pool
      .map((hit) => ({
        hit,
        km: haversineKm({ lat: biasLat, lng: biasLng }, hit),
      }))
      .sort((a, b) => a.km - b.km);
    if (nearby[0] && nearby[0].km <= 8) return nearby[0].hit;
  }

  return pool[0];
}
