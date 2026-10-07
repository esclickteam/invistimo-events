/**
 * Scheduled message audience resolution.
 *
 * Contract (all channels, all rounds):
 *   schedule time → store criteria only (type / round / filter / channel / when)
 *   send time     → fresh DB query from those criteria
 *   mid-run       → use the in-memory guest list from that query (locked for the run)
 *
 * Never use ScheduledMessage.guestIds as the audience source of truth.
 */

export type ScheduledAudienceType =
  | "rsvp"
  | "reminder"
  | "thankyou"
  | "table"
  | "custom"
  | "save_the_date"
  | "invitation_only";

export type ScheduledAudienceFilter =
  | "all"
  | "pending"
  | "withTable"
  | "never_invited"
  | "failed"
  | "not_sent";

export const DYNAMIC_SCHEDULE_TYPES: readonly ScheduledAudienceType[] = [
  "rsvp",
  "reminder",
  "thankyou",
  "table",
  "custom",
  "save_the_date",
  "invitation_only",
] as const;

/**
 * Per-type matrix: when audience is resolved.
 *
 * | type              | channel   | schedule stores | send-time query                          |
 * |-------------------|-----------|-----------------|------------------------------------------|
 * | invitation_only   | whatsapp  | filter only     | all guests (+ never_invited/failed/not_sent post-filter) |
 * | save_the_date     | whatsapp  | filter=all      | all guests                               |
 * | rsvp round 1      | wa / sms  | filter=all      | all guests                               |
 * | rsvp round 2/3    | wa / sms  | filter=pending  | rsvp === "pending"                       |
 * | reminder / table  | wa / sms  | filter criteria | rsvp === "yes" (+ withTable if set)      |
 * | thankyou / custom | wa / sms  | filter criteria | rsvp === "yes" (+ withTable if set)      |
 */

export function isDynamicScheduleType(
  type: unknown
): type is ScheduledAudienceType {
  return DYNAMIC_SCHEDULE_TYPES.includes(String(type || "") as ScheduledAudienceType);
}

/** Always empty — schedules must not snapshot recipient IDs. */
export function emptyScheduleGuestIds(): never[] {
  return [];
}

export function normalizeScheduleAudienceType(
  value: unknown
): ScheduledAudienceType {
  const type = String(value || "").trim();
  if (isDynamicScheduleType(type)) return type;
  return "custom";
}

export function normalizeScheduleAudienceFilter(
  value: unknown
): ScheduledAudienceFilter {
  const filter = String(value || "").trim();
  if (
    filter === "pending" ||
    filter === "withTable" ||
    filter === "never_invited" ||
    filter === "failed" ||
    filter === "not_sent"
  ) {
    return filter;
  }
  return "all";
}

export function normalizeScheduleRound(value: unknown): 1 | 2 | 3 {
  const n = Number(value);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

function withTableClause() {
  return {
    $or: [
      { tableName: { $exists: true, $ne: "" } },
      { tableNumber: { $ne: null } },
    ],
  };
}

/**
 * Mongo query for InvitationGuest at SEND time.
 * Ignores any guestIds stored on the schedule document.
 */
export function buildScheduledGuestsQuery({
  schedule,
  invitationId,
}: {
  schedule: {
    type?: unknown;
    templateKey?: unknown;
    round?: unknown;
    roundNumber?: unknown;
    filter?: unknown;
    guestIds?: unknown;
  };
  invitationId: unknown;
}): Record<string, unknown> {
  const type = normalizeScheduleAudienceType(
    schedule.type || schedule.templateKey
  );
  const round = normalizeScheduleRound(
    schedule.round ?? schedule.roundNumber
  );
  const filter = normalizeScheduleAudienceFilter(schedule.filter);

  if (type === "rsvp") {
    if (round === 1) {
      return { invitationId };
    }
    return {
      invitationId,
      rsvp: "pending",
    };
  }

  if (
    type === "reminder" ||
    type === "table" ||
    type === "thankyou" ||
    type === "custom"
  ) {
    const query: Record<string, unknown> = {
      invitationId,
      rsvp: "yes",
    };

    if (filter === "withTable") {
      Object.assign(query, withTableClause());
    }

    return query;
  }

  // invitation_only / save_the_date — all guests; never_invited applied after query.
  const query: Record<string, unknown> = { invitationId };

  if (filter === "pending") {
    query.rsvp = "pending";
  }

  if (filter === "withTable") {
    Object.assign(query, withTableClause());
  }

  return query;
}

export function needsNeverInvitedPostFilter(schedule: {
  type?: unknown;
  templateKey?: unknown;
  filter?: unknown;
}): boolean {
  const type = normalizeScheduleAudienceType(
    schedule.type || schedule.templateKey
  );
  const filter = normalizeScheduleAudienceFilter(schedule.filter);
  return type === "invitation_only" && filter === "never_invited";
}

/** invitation_only failed / not_sent — resolved from RoundGuestDelivery at send time. */
export function needsInvitationDeliveryStatusPostFilter(schedule: {
  type?: unknown;
  templateKey?: unknown;
  filter?: unknown;
}): "failed" | "not_sent" | null {
  const type = normalizeScheduleAudienceType(
    schedule.type || schedule.templateKey
  );
  const filter = normalizeScheduleAudienceFilter(schedule.filter);
  if (type !== "invitation_only") return null;
  if (filter === "failed" || filter === "not_sent") return filter;
  return null;
}

/**
 * Explicit single-recipient / hand-picked schedules may store guestIds.
 * Eligibility-based schedules must not — they re-query at send time.
 */
export function scheduleUsesExplicitGuestIds(schedule: {
  type?: unknown;
  templateKey?: unknown;
  filter?: unknown;
  guestIds?: unknown;
}): boolean {
  const ids = Array.isArray(schedule.guestIds) ? schedule.guestIds : [];
  if (!ids.length) return false;
  // Only honor stored IDs when filter is not a live eligibility criterion.
  const filter = normalizeScheduleAudienceFilter(schedule.filter);
  return (
    filter !== "pending" &&
    filter !== "withTable" &&
    filter !== "never_invited" &&
    filter !== "failed" &&
    filter !== "not_sent"
  );
}
