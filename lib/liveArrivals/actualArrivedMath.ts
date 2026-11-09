const ARRIVAL_ONLY_KEYS = new Set([
  "actualArrivedCount",
  "actualArrivedDelta",
  "syncSeatsToActual",
  "releaseSeatsToActual",
  "checkSeatOptionsOnly",
  "venueView",
]);

export function isArrivalOnlyPayload(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const hasArrival =
    typeof record.actualArrivedCount === "number" ||
    typeof record.actualArrivedDelta === "number";
  if (!hasArrival) return false;
  return Object.keys(record).every((key) => ARRIVAL_ONLY_KEYS.has(key));
}

export function resolveActualArrivedDelta(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

/**
 * Next count for one device action.
 * A delta is applied to the stored total. An absolute value replaces it.
 */
export function nextActualArrivedCount(input: {
  current: number;
  delta?: number | null;
  absolute?: number | null;
}) {
  if (typeof input.delta === "number" && Number.isFinite(input.delta)) {
    return Math.max(0, Math.floor(Number(input.current || 0)) + Math.trunc(input.delta));
  }
  if (typeof input.absolute === "number" && Number.isFinite(input.absolute)) {
    return Math.max(0, Math.floor(input.absolute));
  }
  return Math.max(0, Math.floor(Number(input.current || 0)));
}
