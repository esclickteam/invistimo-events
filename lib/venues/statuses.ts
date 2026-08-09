/** Venue lifecycle statuses — source of truth on VenueEvent.status */
export const VENUE_EVENT_STATUSES = [
  "lead",
  "proposal",
  "closed",
  "confirmed",
  "preparing",
  "live",
  "done",
  "cancelled",
] as const;

export type VenueEventLifecycleStatus = (typeof VENUE_EVENT_STATUSES)[number];

/** Invistimo Event.status — do not overload with venue lifecycle */
export const INVISTIMO_EVENT_STATUSES = ["active", "archived"] as const;
export type InvistimoEventStatus = (typeof INVISTIMO_EVENT_STATUSES)[number];

export const VENUE_LEAD_STATUSES = [
  "new",
  "contacted",
  "meeting",
  "proposal",
  "negotiation",
  "closed",
  "lost",
] as const;

export type VenueLeadStatus = (typeof VENUE_LEAD_STATUSES)[number];

export const VENUE_EVENT_STATUS_LABELS: Record<
  VenueEventLifecycleStatus,
  string
> = {
  lead: "ליד",
  proposal: "הצעה",
  closed: "נסגר",
  confirmed: "מאושר",
  preparing: "בהכנה",
  live: "באירוע",
  done: "הסתיים",
  cancelled: "בוטל",
};

export function isVenueEventStatus(
  value: unknown
): value is VenueEventLifecycleStatus {
  return VENUE_EVENT_STATUSES.includes(
    String(value) as VenueEventLifecycleStatus
  );
}

export function isInvistimoEventStatus(
  value: unknown
): value is InvistimoEventStatus {
  return INVISTIMO_EVENT_STATUSES.includes(
    String(value) as InvistimoEventStatus
  );
}

/** Map venue lifecycle → Invistimo Event.status for dual-write */
export function venueLifecycleToInvistimoStatus(
  status: VenueEventLifecycleStatus
): InvistimoEventStatus {
  if (status === "cancelled" || status === "done") return "archived";
  return "active";
}
