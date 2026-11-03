export type VirtualRange = {
  start: number;
  end: number;
  paddingTop: number;
  paddingBottom: number;
};

/**
 * Window a long list down to the rows that intersect the scrollport.
 * Heights are optional measured pixels; missing entries use `estimate`.
 */
export function computeVirtualRange(
  count: number,
  scrollTop: number,
  viewport: number,
  estimate: number,
  overscan = 6,
  heights?: Array<number | undefined>
): VirtualRange {
  if (count <= 0 || estimate <= 0) {
    return { start: 0, end: 0, paddingTop: 0, paddingBottom: 0 };
  }

  const safeScroll = Math.max(0, scrollTop);
  const safeViewport = Math.max(estimate, viewport);
  const offsets = new Array<number>(count);
  let total = 0;

  for (let i = 0; i < count; i++) {
    offsets[i] = total;
    const measured = heights?.[i];
    total += measured && measured > 0 ? measured : estimate;
  }

  const overscanPx = estimate * overscan;
  const viewStart = Math.max(0, safeScroll - overscanPx);
  const viewEnd = safeScroll + safeViewport + overscanPx;

  let start = 0;
  while (start < count - 1) {
    const rowHeight = heights?.[start] && heights[start]! > 0 ? heights[start]! : estimate;
    if (offsets[start] + rowHeight >= viewStart) break;
    start++;
  }

  let end = start + 1;
  while (end < count && offsets[end] < viewEnd) {
    end++;
  }

  return {
    start,
    end,
    paddingTop: offsets[start] || 0,
    paddingBottom: Math.max(0, total - (offsets[end] ?? total)),
  };
}

export function seatingTablesSignature(tables: unknown): string {
  if (!Array.isArray(tables)) return "";

  let signature = "";
  for (const table of tables) {
    const row = table as {
      _id?: unknown;
      id?: unknown;
      name?: unknown;
      tableNumber?: unknown;
      number?: unknown;
      capacity?: unknown;
      seats?: unknown;
      seatedGuests?: unknown;
    };
    const seated = Array.isArray(row?.seatedGuests) ? row.seatedGuests.length : 0;
    signature += [
      row?._id || row?.id || "",
      row?.name || "",
      row?.tableNumber || row?.number || "",
      seated,
      row?.capacity || row?.seats || "",
    ].join(":") + ";";
  }

  return signature;
}

type GuestCacheEntry = {
  at: number;
  guests: unknown[];
};

const guestCache = new Map<string, GuestCacheEntry>();
const GUEST_CACHE_TTL_MS = 20_000;

export function readFreshGuestCache<T>(invitationId: string): T[] | null {
  if (!invitationId) return null;
  const hit = guestCache.get(invitationId);
  if (!hit) return null;
  if (Date.now() - hit.at > GUEST_CACHE_TTL_MS) {
    guestCache.delete(invitationId);
    return null;
  }
  return hit.guests as T[];
}

export function writeGuestCache(invitationId: string, guests: unknown[]) {
  if (!invitationId) return;
  guestCache.set(invitationId, { at: Date.now(), guests });
}

const inflightJson = new Map<string, Promise<{ ok: boolean; data: unknown }>>();

/** Share one in-flight GET so layout and dashboard do not duplicate it. */
export function coalesceJson(
  url: string
): Promise<{ ok: boolean; data: any }> {
  const existing = inflightJson.get(url);
  if (existing) return existing;

  const task = fetch(url, {
    credentials: "include",
    cache: "no-store",
  })
    .then(async (res) => ({
      ok: res.ok,
      data: await res.json().catch(() => ({})),
    }))
    .finally(() => {
      inflightJson.delete(url);
    });

  inflightJson.set(url, task);
  return task;
}
