/**
 * Human-call enforcement.
 * 20 seconds is the minimum for an unanswered attempt, never a maximum.
 * There is no automatic hangup at 20, 30, or 60 seconds.
 *
 * Retry policy (not activated in production until an explicit deploy):
 * - early hangup with no answer: cooldown 0, stay on the same guest; 3 such attempts then manager
 * - busy: wait 3 minutes, up to 3 attempts
 * - unavailable number: wait 5 minutes, up to 3 attempts
 * - technical failure: wait 2 minutes, up to 3 attempts
 * - 5 unsuccessful attempts of any of those kinds, then manager
 * A manager exception stays incomplete. It is not a completed call.
 */

export const UNANSWERED_MIN_MS = 20_000;

export const CALL_RETRY_POLICY = {
  earlyHangup: { cooldownMs: 0, maxBeforeManager: 3 },
  busy: { cooldownMs: 3 * 60 * 1000, maxBeforeManager: 3 },
  unavailable: { cooldownMs: 5 * 60 * 1000, maxBeforeManager: 3 },
  technicalFailure: { cooldownMs: 2 * 60 * 1000, maxBeforeManager: 3 },
  combinedUnsuccessful: { maxBeforeManager: 5 },
} as const;

export const GUEST_RESPONSE_STATUSES = [
  "confirmed",
  "declined",
  "undecided",
  "callback",
  "will_reply_message",
] as const;

export const DIAL_RESULT_STATUSES = [
  ...GUEST_RESPONSE_STATUSES,
  "no_answer",
  "needs_fix",
  "wrong_number",
] as const;

export type DialResultStatus = (typeof DIAL_RESULT_STATUSES)[number];

export type AttemptSnapshot = {
  id: string;
  taskId: string;
  eventIds?: string[];
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  preciseDuration: boolean;
  telnyxAnswered: boolean;
  answerType: "human" | "machine" | "unknown" | "";
  telnyxResult: string;
  sipCode: string;
  hangupCause: string;
  hangupSource: string;
  agentHangupRequestedAt: string | null;
  outcome: AttemptOutcome;
};

export type AttemptOutcome =
  | "in_progress"
  | "awaiting_provider"
  | "answered"
  | "valid_no_answer"
  | "early_hangup"
  | "busy"
  | "unavailable"
  | "technical_failure"
  | "failed";

export type TelnyxAttemptEvent = {
  eventId: string;
  eventType: string;
  occurredAt: string | null;
  callControlId: string;
  taskId: string;
  startedAt?: string | null;
  answeredAt?: string | null;
  endedAt?: string | null;
  sipCode?: string;
  hangupCause?: string;
  hangupSource?: string;
  machine?: "human" | "machine" | "unknown" | "";
};

const OPEN_TASK_STATUSES = new Set([
  "pending",
  "in_progress",
  "open",
  "assigned",
  "active",
]);

export function isOpenQueueStatus(status: string, manualHandlingRequired = false) {
  if (OPEN_TASK_STATUSES.has(status)) return true;
  return status === "callback" && manualHandlingRequired;
}

export function pickQueueHeadId(
  tasks: Array<{
    id: string;
    status: string;
    sortOrder?: number;
    createdAt?: string | null;
    manualHandlingRequired?: boolean;
  }>
) {
  const open = tasks
    .filter((task) => isOpenQueueStatus(task.status, task.manualHandlingRequired))
    .slice()
    .sort((a, b) => {
      const order = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (order !== 0) return order;
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    });
  return open[0]?.id || "";
}

export function durationMsBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = Date.parse(end) - Date.parse(start);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms;
}

export function formatDurationMs(ms: number | null, precise: boolean) {
  if (ms === null || !Number.isFinite(ms)) return "לא ניתן לאימות";
  if (!precise) {
    return `${Math.round(ms / 1000)} שניות. דיוק מילישניות: לא ניתן לאימות`;
  }
  if (ms < 1000) return `${ms} מילישניות`;
  const seconds = (ms / 1000).toFixed(3).replace(/\.?0+$/, "");
  return `${seconds} שניות`;
}

function includesToken(value: string, tokens: string[]) {
  const raw = value.toLowerCase();
  return tokens.some((token) => raw.includes(token));
}

export function classifyHangup(input: {
  answered: boolean;
  durationMs: number | null;
  ended: boolean;
  sipCode?: string;
  hangupCause?: string;
  hangupSource?: string;
}): AttemptOutcome {
  if (!input.ended) return input.answered ? "answered" : "in_progress";
  if (input.answered) return "answered";

  const sip = String(input.sipCode || "");
  const cause = String(input.hangupCause || "");
  const source = String(input.hangupSource || "").toLowerCase();

  if (includesToken(`${sip} ${cause}`, ["486", "busy", "user_busy"])) return "busy";
  if (
    includesToken(`${sip} ${cause}`, [
      "404",
      "480",
      "484",
      "503",
      "unallocated",
      "unavailable",
      "not_found",
      "no_route",
      "invalid_number",
    ])
  ) {
    return "unavailable";
  }
  if (includesToken(`${sip} ${cause}`, ["failed", "error", "500", "603"])) {
    return "technical_failure";
  }

  const callingLeg =
    source === "caller" || source === "originator" || source.includes("softphone");
  const duration = input.durationMs ?? 0;
  if (callingLeg && duration < UNANSWERED_MIN_MS) return "early_hangup";
  if (duration >= UNANSWERED_MIN_MS) return "valid_no_answer";
  if (duration > 0 && duration < UNANSWERED_MIN_MS) return "early_hangup";
  return "technical_failure";
}

export function hangupInitiatorLabel(input: {
  hangupSource?: string;
  agentHangupRequestedAt?: string | null;
  outcome: AttemptOutcome;
}) {
  if (input.outcome === "busy" || input.outcome === "unavailable" || input.outcome === "technical_failure") {
    return "ספק";
  }
  if (input.agentHangupRequestedAt) return "נציגה";
  const source = String(input.hangupSource || "").toLowerCase();
  if (source === "callee" || source === "called") return "נמען";
  return "לא ניתן לקבוע";
}

export function mergeAttemptEvents(
  existing: AttemptSnapshot | null,
  event: TelnyxAttemptEvent
): AttemptSnapshot {
  const eventIds = new Set(existing?.eventIds || []);
  if (event.eventId && eventIds.has(event.eventId)) {
    return existing as AttemptSnapshot;
  }
  if (event.eventId) eventIds.add(event.eventId);

  const startedAt = existing?.startedAt || event.startedAt || event.occurredAt;
  const answeredAt =
    existing?.answeredAt ||
    event.answeredAt ||
    (event.eventType === "call.answered" ? event.occurredAt : null);
  const endedAt =
    existing?.endedAt ||
    event.endedAt ||
    (event.eventType === "call.hangup" ? event.occurredAt : null);
  const durationMs = durationMsBetween(startedAt, endedAt);
  const answered = Boolean(answeredAt);
  const outcome = classifyHangup({
    answered,
    durationMs,
    ended: Boolean(endedAt),
    sipCode: event.sipCode || existing?.sipCode,
    hangupCause: event.hangupCause || existing?.hangupCause,
    hangupSource: event.hangupSource || existing?.hangupSource,
  });

  return {
    id: existing?.id || event.callControlId,
    taskId: existing?.taskId || event.taskId,
    eventIds: Array.from(eventIds),
    startedAt,
    answeredAt,
    endedAt,
    durationMs,
    preciseDuration: durationMs !== null,
    telnyxAnswered: answered,
    answerType: event.machine || existing?.answerType || (answered ? "unknown" : ""),
    telnyxResult: telnyxResultLabel(outcome),
    sipCode: event.sipCode || existing?.sipCode || "",
    hangupCause: event.hangupCause || existing?.hangupCause || "",
    hangupSource: event.hangupSource || existing?.hangupSource || "",
    agentHangupRequestedAt: existing?.agentHangupRequestedAt || null,
    outcome,
  };
}

export function telnyxResultLabel(outcome: AttemptOutcome) {
  switch (outcome) {
    case "answered":
      return "נענה";
    case "valid_no_answer":
      return "לא נענה";
    case "busy":
      return "תפוס";
    case "unavailable":
      return "לא זמין";
    case "early_hangup":
      return "בוטל לפני מענה";
    case "technical_failure":
    case "failed":
      return "נכשל";
    case "in_progress":
      return "שיחה פעילה";
    default:
      return "ממתין לאימות ספק";
  }
}

export function canHangUpNow(attempt: AttemptSnapshot | null, nowMs: number) {
  if (!attempt?.startedAt) {
    return { allowed: false, reason: "ממתין לאימות ספק" };
  }
  if (attempt.endedAt) {
    return { allowed: false, reason: "השיחה כבר הסתיימה אצל הספק" };
  }
  if (attempt.answeredAt) return { allowed: true, reason: "" };
  const elapsed = nowMs - Date.parse(attempt.startedAt);
  if (elapsed >= UNANSWERED_MIN_MS) return { allowed: true, reason: "" };
  return {
    allowed: false,
    reason: "ניתוק נעול עד 20 שניות כל עוד אין מענה. אין ניתוק אוטומטי אחרי כן.",
  };
}

function countOutcome(attempts: AttemptSnapshot[], outcome: AttemptOutcome) {
  return attempts.filter((attempt) => attempt.outcome === outcome).length;
}

export function retryDecision(attempts: AttemptSnapshot[], nowMs: number) {
  const unsuccessful = attempts.filter((attempt) =>
    ["early_hangup", "busy", "unavailable", "technical_failure", "failed"].includes(
      attempt.outcome
    )
  );
  const latest = [...attempts].reverse().find((attempt) => attempt.endedAt) || null;
  let cooldownMs = 0;
  if (latest?.outcome === "busy") cooldownMs = CALL_RETRY_POLICY.busy.cooldownMs;
  if (latest?.outcome === "unavailable") cooldownMs = CALL_RETRY_POLICY.unavailable.cooldownMs;
  if (latest?.outcome === "technical_failure" || latest?.outcome === "failed") {
    cooldownMs = CALL_RETRY_POLICY.technicalFailure.cooldownMs;
  }
  const retryAt = latest?.endedAt ? Date.parse(latest.endedAt) + cooldownMs : 0;
  const waiting = Boolean(retryAt && nowMs < retryAt);

  const manager =
    countOutcome(attempts, "early_hangup") >= CALL_RETRY_POLICY.earlyHangup.maxBeforeManager ||
    countOutcome(attempts, "busy") >= CALL_RETRY_POLICY.busy.maxBeforeManager ||
    countOutcome(attempts, "unavailable") >= CALL_RETRY_POLICY.unavailable.maxBeforeManager ||
    countOutcome(attempts, "technical_failure") + countOutcome(attempts, "failed") >=
      CALL_RETRY_POLICY.technicalFailure.maxBeforeManager ||
    unsuccessful.length >= CALL_RETRY_POLICY.combinedUnsuccessful.maxBeforeManager;

  return {
    manager,
    waiting,
    retryAt: retryAt || null,
    reason: manager
      ? "כשל מתמשך. המשימה ממתינה למנהל ולא הושלמה."
      : waiting
        ? "נדרשת המתנה לפני ניסיון חוזר לאותו אורח."
        : "",
  };
}

export function evaluateResultSave(input: {
  status: string;
  attempts: AttemptSnapshot[];
  isQueueHead: boolean;
  managerException?: boolean;
  nowMs?: number;
}) {
  if (!DIAL_RESULT_STATUSES.includes(input.status as DialResultStatus)) {
    return { ok: true, message: "" };
  }
  if (!input.isQueueHead) {
    return { ok: false, message: "אי אפשר לדלג לאורח אחר לפני השלמת המשימה הנוכחית." };
  }
  if (input.managerException) {
    return { ok: false, message: "המשימה ממתינה למנהל. הנציגה לא יכולה לסגור אותה." };
  }

  const attempts = input.attempts.filter((attempt) => attempt.taskId);
  const verified = attempts.filter((attempt) => attempt.startedAt && attempt.id);
  if (!verified.length) {
    return { ok: false, message: "אי אפשר לשמור תוצאה בלי ניסיון חיוג מאומת של Telnyx." };
  }

  const decision = retryDecision(attempts, input.nowMs || Date.now());
  if (decision.manager) {
    return { ok: false, message: decision.reason };
  }

  const answered = attempts.filter((attempt) => attempt.telnyxAnswered);
  const humanOrUnknown = answered.filter((attempt) => attempt.answerType !== "machine");
  const machine = answered.some((attempt) => attempt.answerType === "machine");

  if (GUEST_RESPONSE_STATUSES.includes(input.status as (typeof GUEST_RESPONSE_STATUSES)[number])) {
    if (!humanOrUnknown.length || machine) {
      return {
        ok: false,
        message: machine
          ? "המענה זוהה כתא קולי. אי אפשר לסמן תשובת אורח."
          : "תוצאה של תשובת אורח דורשת מענה מאומת של Telnyx.",
      };
    }
    return { ok: true, message: "" };
  }

  if (input.status === "no_answer") {
    if (answered.length) {
      return {
        ok: false,
        message: "Telnyx רשם מענה. אי אפשר לסמן לא ענה.",
      };
    }
    const valid = attempts.some((attempt) => attempt.outcome === "valid_no_answer");
    if (!valid) {
      return {
        ok: false,
        message: "הניסיון לא הושלם. יש לחייג שוב לאותו אורח.",
      };
    }
    return { ok: true, message: "" };
  }

  const providerFailure = attempts.some((attempt) =>
    ["unavailable", "technical_failure", "failed", "busy"].includes(attempt.outcome)
  );
  if (!providerFailure) {
    return { ok: false, message: "סימון מספר שגוי דורש ניסיון חיוג מאומת." };
  }
  return { ok: true, message: "" };
}

export function canCompleteWorkOrder(input: {
  openTaskCount: number;
  missingDialableCount: number;
  status?: string;
}) {
  if (["completed", "cancelled", "expired"].includes(String(input.status || ""))) {
    return false;
  }
  return input.openTaskCount === 0 && input.missingDialableCount === 0;
}
