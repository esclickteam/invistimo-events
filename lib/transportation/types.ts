export const TRANSPORT_DIRECTIONS = [
  "outbound",
  "return",
  "round_trip",
] as const;

export type TransportDirection = (typeof TRANSPORT_DIRECTIONS)[number];

export const TRANSPORT_STOP_TYPES = ["pickup", "dropoff", "both"] as const;
export type TransportStopType = (typeof TRANSPORT_STOP_TYPES)[number];

export const TRANSPORT_ROUTE_STATUSES = [
  "scheduled",
  "boarding",
  "departed",
  "completed",
  "cancelled",
] as const;
export type TransportRouteStatus = (typeof TRANSPORT_ROUTE_STATUSES)[number];

export const TRANSPORT_BOARD_STATUSES = [
  "registered",
  "checked_in",
  "boarded",
  "no_show",
  "cancelled",
  "not_needed",
] as const;
export type TransportBoardStatus = (typeof TRANSPORT_BOARD_STATUSES)[number];

export const TRANSPORT_REGISTRATION_STATUSES = [
  "registered",
  "waitlisted",
  "cancelled",
  "rejected",
] as const;
export type TransportRegistrationStatus =
  (typeof TRANSPORT_REGISTRATION_STATUSES)[number];

export type TransportCapacityLevel =
  | "available"
  | "filling"
  | "almost_full"
  | "full";

/** Premium capacity bands: 0–69 available, 70–89 filling, 90–99 almost_full, 100 full */
export function getCapacityLevel(
  reserved: number,
  capacity: number
): TransportCapacityLevel {
  if (capacity <= 0) return "full";
  if (reserved >= capacity) return "full";
  const ratio = reserved / capacity;
  if (ratio >= 0.9) return "almost_full";
  if (ratio >= 0.7) return "filling";
  return "available";
}

export function capacityLabel(level: TransportCapacityLevel) {
  switch (level) {
    case "full":
      return "מלא";
    case "almost_full":
      return "כמעט מלא";
    case "filling":
      return "מתמלא";
    default:
      return "זמין";
  }
}

/** Legacy aliases used by older summary code */
export function toLegacyCapacityLevel(
  level: TransportCapacityLevel
): "ok" | "warning_80" | "warning_90" | "full" {
  if (level === "full") return "full";
  if (level === "almost_full") return "warning_90";
  if (level === "filling") return "warning_80";
  return "ok";
}
