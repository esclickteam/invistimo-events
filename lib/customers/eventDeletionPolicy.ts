import {
  evaluateEventClock,
  formatCivilDate,
  parseEventCivilDate,
  type CivilDate,
} from "@/lib/customers/eventDeletionClock";

/**
 * Pure eligibility rules. Reminder-round completion is display-only and is
 * never an input to whether the event has ended.
 */
export const LIVE_DELETION_ENABLED = false;
export const DEFAULT_MAX_DELETIONS_PER_RUN = 10;
export const DEFAULT_ANOMALY_THRESHOLD = 25;

export const CUSTOMER_ROLES = ["user", "client"] as const;

export type OpenWorkKind =
  | "thankyou_scheduled"
  | "thankyou_sending"
  | "thankyou_retry"
  | "thankyou_failed"
  | "scheduled_message"
  | "message_sending"
  | "message_retry"
  | "message_failed"
  | "worker"
  | "call"
  | "task";

export type DeletionBucket =
  | "future"
  | "active"
  | "waiting"
  | "eligible"
  | "blocked";

export type PolicyEventInput = {
  id: string;
  title?: string;
  storedDate: unknown;
  invitationDate?: unknown;
  exempt?: boolean;
  disputeOpen?: boolean;
  adminHold?: boolean;
  openTreatment?: boolean;
  failureWaived?: boolean;
  reminderRoundComplete?: boolean;
  thankYouRoundComplete?: boolean;
  openWork?: OpenWorkKind[];
  venueLinked?: boolean;
  attributionUncertain?: boolean;
};

export type PolicyUserInput = {
  id?: string;
  name?: string;
  role?: string;
  venueUser?: boolean;
  exempt?: boolean;
  disputeOpen?: boolean;
  adminHold?: boolean;
  openTreatment?: boolean;
  policyAccepted?: boolean;
  events: PolicyEventInput[];
};

export type EventAssessment = {
  eventId: string;
  eventTitle: string;
  customerName: string;
  bucket: DeletionBucket;
  eventDate: string | null;
  plannedDeletionAt: string | null;
  reminderRoundComplete: boolean;
  thankYouClear: boolean;
  openWork: OpenWorkKind[];
  reasons: string[];
  eligible: boolean;
  accountDeletable: boolean;
};

export type AccountAssessment = {
  userId: string;
  customerName: string;
  role: string;
  events: EventAssessment[];
  accountDeletable: boolean;
  reasons: string[];
};

const THANK_YOU_OPEN = new Set<OpenWorkKind>([
  "thankyou_scheduled",
  "thankyou_sending",
  "thankyou_retry",
  "thankyou_failed",
]);

const FAILURE_WORK = new Set<OpenWorkKind>([
  "thankyou_failed",
  "message_failed",
]);

export function liveDeletionPermitted() {
  return LIVE_DELETION_ENABLED;
}

export function isCustomerRole(role: unknown, venueUser?: boolean) {
  if (venueUser) return false;
  return CUSTOMER_ROLES.includes(String(role || "") as (typeof CUSTOMER_ROLES)[number]);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function thankYouBlocks(openWork: OpenWorkKind[], failureWaived: boolean) {
  return openWork.filter((kind) => {
    if (!THANK_YOU_OPEN.has(kind) && kind !== "message_failed") return false;
    if (failureWaived && FAILURE_WORK.has(kind)) return false;
    return THANK_YOU_OPEN.has(kind) || kind === "message_failed";
  });
}

function otherOpenWork(openWork: OpenWorkKind[], failureWaived: boolean) {
  return openWork.filter((kind) => {
    if (THANK_YOU_OPEN.has(kind)) return false;
    if (failureWaived && FAILURE_WORK.has(kind)) return false;
    return true;
  });
}

function invitationMismatches(invitationDate: unknown, eventIso: string) {
  if (invitationDate == null || invitationDate === "") return false;
  const invitation = parseEventCivilDate(invitationDate);
  if (!invitation) return true;
  return formatCivilDate(invitation) !== eventIso;
}

function assessOneEvent(
  user: PolicyUserInput,
  event: PolicyEventInput,
  now: Date
): EventAssessment {
  const openWork = Array.isArray(event.openWork) ? event.openWork : [];
  const reminderRoundComplete = event.reminderRoundComplete === true;
  const clock = evaluateEventClock(event.storedDate, now);
  const base = {
    eventId: event.id,
    eventTitle: String(event.title || "").trim() || "אירוע",
    customerName: String(user.name || "").trim(),
    reminderRoundComplete,
    thankYouClear:
      event.thankYouRoundComplete === true &&
      !openWork.some((kind) => THANK_YOU_OPEN.has(kind)),
    openWork,
    accountDeletable: false,
  };

  if (!isCustomerRole(user.role, user.venueUser)) {
    return {
      ...base,
      bucket: "blocked",
      eventDate: clock.ok ? clock.isoDate : null,
      plannedDeletionAt: clock.ok ? clock.eligibleAt.toISOString() : null,
      reasons: ["NOT_CUSTOMER"],
      eligible: false,
      thankYouClear: false,
    };
  }

  if (!clock.ok) {
    return {
      ...base,
      bucket: "blocked",
      eventDate: null,
      plannedDeletionAt: null,
      reasons: [clock.reason],
      eligible: false,
    };
  }

  const plannedDeletionAt = clock.eligibleAt.toISOString();
  const reasons: string[] = [];

  if (clock.relation === "future") reasons.push("FUTURE_EVENT");
  else if (clock.relation === "today") reasons.push("EVENT_TODAY");
  else if (!clock.sevenFullDaysElapsed) reasons.push("RETENTION_NOT_ELAPSED");

  if (invitationMismatches(event.invitationDate, clock.isoDate)) {
    reasons.push("DATE_MISMATCH");
  }
  if (event.attributionUncertain) reasons.push("ACCOUNT_ATTRIBUTION_UNCERTAIN");
  if (event.venueLinked) reasons.push("VENUE_LINKED");
  if (user.exempt || event.exempt) reasons.push("AUTO_DELETE_EXEMPT");
  if (user.disputeOpen || event.disputeOpen || user.openTreatment || event.openTreatment) {
    reasons.push("DISPUTE_OR_TREATMENT");
  }
  if (user.adminHold || event.adminHold) reasons.push("ADMIN_HOLD");

  const thankYou = thankYouBlocks(openWork, event.failureWaived === true);
  const other = otherOpenWork(openWork, event.failureWaived === true);
  if (thankYou.includes("thankyou_scheduled")) reasons.push("THANK_YOU_SCHEDULED");
  if (thankYou.includes("thankyou_sending")) reasons.push("THANK_YOU_SENDING");
  if (thankYou.includes("thankyou_retry")) reasons.push("THANK_YOU_RETRY");
  if (thankYou.includes("thankyou_failed")) reasons.push("THANK_YOU_FINAL_FAILURE");
  if (other.some((kind) => kind === "scheduled_message" || kind === "message_retry" || kind === "thankyou_retry")) {
    reasons.push("OPEN_SCHEDULED_WORK");
  }
  if (other.some((kind) => kind === "message_sending" || kind === "worker" || kind === "call")) {
    reasons.push("OPEN_WORKER");
  }
  if (other.includes("message_retry")) reasons.push("OPEN_RETRY");
  if (other.includes("message_failed")) reasons.push("FINAL_FAILURE_NEEDS_DECISION");
  if (other.includes("task")) reasons.push("OPEN_TASK");

  const dateBlocked = reasons.some((reason) =>
    ["FUTURE_EVENT", "EVENT_TODAY", "RETENTION_NOT_ELAPSED"].includes(reason)
  );
  const hardBlocked = reasons.some((reason) =>
    [
      "DATE_MISMATCH",
      "ACCOUNT_ATTRIBUTION_UNCERTAIN",
      "VENUE_LINKED",
      "AUTO_DELETE_EXEMPT",
      "DISPUTE_OR_TREATMENT",
      "ADMIN_HOLD",
    ].includes(reason)
  );
  const waiting = reasons.some((reason) =>
    [
      "THANK_YOU_SCHEDULED",
      "THANK_YOU_SENDING",
      "THANK_YOU_RETRY",
      "THANK_YOU_FINAL_FAILURE",
      "OPEN_SCHEDULED_WORK",
      "OPEN_WORKER",
      "OPEN_RETRY",
      "FINAL_FAILURE_NEEDS_DECISION",
      "OPEN_TASK",
    ].includes(reason)
  );

  let bucket: DeletionBucket = "eligible";
  if (reasons.includes("FUTURE_EVENT")) bucket = "future";
  else if (dateBlocked) bucket = "active";
  else if (hardBlocked) bucket = "blocked";
  else if (waiting) bucket = "waiting";

  const eligible = bucket === "eligible";
  return {
    ...base,
    bucket,
    eventDate: clock.isoDate,
    plannedDeletionAt,
    reasons: unique(reasons),
    eligible,
    thankYouClear: eligible || (base.thankYouClear && !thankYou.length),
  };
}

export function assessAccount(user: PolicyUserInput, now: Date): AccountAssessment {
  const events = (user.events || []).map((event) => assessOneEvent(user, event, now));
  const reasons: string[] = [];

  if (!isCustomerRole(user.role, user.venueUser)) reasons.push("NOT_CUSTOMER");
  if (!events.length) reasons.push("MISSING_EVENT_DATE");

  const futureOrActive = events.filter((event) => event.bucket === "future" || event.bucket === "active");
  const notEligible = events.filter((event) => !event.eligible);
  if (events.some((event) => event.reasons.includes("FUTURE_EVENT"))) {
    reasons.push("OTHER_FUTURE_EVENT");
  }
  if (futureOrActive.length && events.length > 1) reasons.push("ACCOUNT_HAS_UNFINISHED_EVENT");
  if (notEligible.length) reasons.push("NOT_ALL_EVENTS_ELIGIBLE");
  if (!user.policyAccepted) reasons.push("RETROACTIVE_HOLD");

  const everyEventEligible = events.length > 0 && events.every((event) => event.eligible);
  const accountDeletable =
    everyEventEligible &&
    isCustomerRole(user.role, user.venueUser) &&
    user.policyAccepted === true &&
    !reasons.includes("OTHER_FUTURE_EVENT");

  return {
    userId: String(user.id || ""),
    customerName: String(user.name || "").trim(),
    role: String(user.role || ""),
    events: events.map((event) => ({ ...event, accountDeletable })),
    accountDeletable,
    reasons: unique(reasons),
  };
}

export function planDeletionBatch(
  accountIds: string[],
  options?: { maxPerRun?: number; anomalyThreshold?: number; emergencyStop?: boolean }
) {
  const maxPerRun = options?.maxPerRun ?? DEFAULT_MAX_DELETIONS_PER_RUN;
  const anomalyThreshold = options?.anomalyThreshold ?? DEFAULT_ANOMALY_THRESHOLD;
  const uniqueIds = unique(accountIds);
  if (options?.emergencyStop) {
    return { executeIds: [] as string[], anomaly: false, emergencyStop: true, held: uniqueIds.length };
  }
  if (uniqueIds.length > anomalyThreshold) {
    return { executeIds: [] as string[], anomaly: true, emergencyStop: false, held: uniqueIds.length };
  }
  return {
    executeIds: uniqueIds.slice(0, Math.max(0, maxPerRun)),
    anomaly: false,
    emergencyStop: false,
    held: Math.max(0, uniqueIds.length - maxPerRun),
  };
}

export function plannedDeletionLabel(isoDate: string | null) {
  if (!isoDate) return null;
  const clock = evaluateEventClock(isoDate, new Date("2100-01-01T00:00:00.000Z"));
  if (!clock.ok) return null;
  return clock.eligibleAt.toISOString();
}

export function civilDateOrNull(value: unknown): CivilDate | null {
  const clock = evaluateEventClock(value, new Date());
  return clock.ok ? clock.civilDate : null;
}

export function assertSafeAssessments(accounts: AccountAssessment[]) {
  for (const account of accounts) {
    for (const event of account.events) {
      if (event.bucket === "future" && event.eligible) {
        throw new Error("FUTURE_EVENT_MARKED_ELIGIBLE");
      }
      if (event.reasons.includes("FUTURE_EVENT") && event.eligible) {
        throw new Error("FUTURE_EVENT_MARKED_ELIGIBLE");
      }
      if (event.reasons.includes("EVENT_TODAY") && event.eligible) {
        throw new Error("TODAY_EVENT_MARKED_ELIGIBLE");
      }
    }
    if (account.events.some((event) => event.reasons.includes("FUTURE_EVENT")) && account.accountDeletable) {
      throw new Error("FUTURE_EVENT_ACCOUNT_DELETABLE");
    }
  }
}

export function eventDateIso(value: unknown) {
  const clock = evaluateEventClock(value, new Date());
  return clock.ok ? formatCivilDate(clock.civilDate) : null;
}

const LOG_FIELDS = [
  "userId",
  "customerName",
  "eventId",
  "eventTitle",
  "eventDate",
  "plannedDeletionAt",
  "bucket",
  "reasons",
  "reminderRoundComplete",
  "thankYouClear",
  "openWorkCount",
  "outcome",
] as const;

/** Drops guest names, phones, and message bodies before anything is stored. */
export function sanitizeDeletionLog(entry: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const field of LOG_FIELDS) {
    if (entry[field] !== undefined) clean[field] = entry[field];
  }
  return clean;
}
