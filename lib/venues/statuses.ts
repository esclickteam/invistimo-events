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

/** Shared chip/badge styles for venue lifecycle statuses */
export const VENUE_EVENT_STATUS_STYLES: Record<
  VenueEventLifecycleStatus,
  { bg: string; text: string; border: string }
> = {
  lead: {
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
  },
  proposal: {
    bg: "bg-violet-50",
    text: "text-violet-800",
    border: "border-violet-200",
  },
  closed: {
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
  },
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  preparing: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  live: {
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
  },
  done: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  cancelled: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
};

export function getVenueEventStatusStyle(status: unknown) {
  if (isVenueEventStatus(status)) {
    return VENUE_EVENT_STATUS_STYLES[status];
  }
  return {
    bg: "bg-stone-50",
    text: "text-stone-700",
    border: "border-stone-200",
  };
}

export const VENUE_LEAD_STATUS_LABELS: Record<VenueLeadStatus, string> = {
  new: "חדש",
  contacted: "נוצר קשר",
  meeting: "פגישה",
  proposal: "הצעה",
  negotiation: "משא ומתן",
  closed: "נסגר",
  lost: "אבוד",
};

export function isVenueLeadStatus(value: unknown): value is VenueLeadStatus {
  return VENUE_LEAD_STATUSES.includes(String(value) as VenueLeadStatus);
}

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
