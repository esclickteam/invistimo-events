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
  "cancelled",
] as const;
export type TransportRegistrationStatus =
  (typeof TRANSPORT_REGISTRATION_STATUSES)[number];

export type TransportCapacityLevel =
  | "ok"
  | "warning_80"
  | "warning_90"
  | "full";

export function getCapacityLevel(
  registered: number,
  capacity: number
): TransportCapacityLevel {
  if (capacity <= 0) return "full";
  if (registered >= capacity) return "full";
  const ratio = registered / capacity;
  if (ratio >= 0.9) return "warning_90";
  if (ratio >= 0.8) return "warning_80";
  return "ok";
}

export function capacityLabel(level: TransportCapacityLevel) {
  switch (level) {
    case "full":
      return "FULL";
    case "warning_90":
      return "90%";
    case "warning_80":
      return "80%";
    default:
      return "OK";
  }
}
