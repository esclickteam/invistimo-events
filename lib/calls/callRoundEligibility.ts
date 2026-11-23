/**
 * Call-round eligibility: RSVP status is separate from call result.
 *
 * RSVP: yes | no | maybe | pending
 * Call result examples: answered / no_answer / callback / wrong_number
 *
 * Round 1: RSVP pending only
 * Round 2: still pending AND (round 1 = no_answer OR round 1 = callback)
 * Round 3: RSVP maybe, OR still pending AND (
 *   no_answer in rounds 1 and 2, OR callback in round 2,
 *   OR callback in round 1 followed by no_answer in round 2
 * )
 *
 * A final attendance answer (yes / no) always wins over an older callback.
 */

/** Human phone rounds configured per event. Rounds 1–3 keep their own rules. */
export const DEFAULT_HUMAN_CALL_ROUNDS = 3;
export const MAX_CONFIGURED_HUMAN_CALL_ROUNDS = 20;

export type CallRoundNumber = number;

export function isConfiguredHumanCallRound(value: unknown): value is number {
  const n = Number(value);
  return (
    Number.isInteger(n) &&
    n >= 1 &&
    n <= MAX_CONFIGURED_HUMAN_CALL_ROUNDS
  );
}

/**
 * How many human call rounds this event is allowed to open.
 * Missing or invalid values stay at 3 so existing events do not change.
 * Rounds 1–3 callback carry still uses resolveMaxCallRounds, which never exceeds 3.
 */
export function resolveConfiguredHumanCallRounds(source: any): number {
  const raw = Number(source?.callsRounds ?? source?.allowedCallRounds);
  if (!isConfiguredHumanCallRound(raw)) return DEFAULT_HUMAN_CALL_ROUNDS;
  return raw;
}

export function isExtraHumanCallRound(round: number) {
  return Number.isInteger(round) && round >= 4;
}

/** A queued call that has not started. Completed attempts stay in history. */
export function isUntouchedPendingCallTask(task: any) {
  const status = cleanStr(task?.status).toLowerCase();
  if (status !== "pending") return false;
  if (task?.startedAt || task?.completedAt) return false;
  const attempts = Number(task?.attemptsCount || 0);
  if (Number.isFinite(attempts) && attempts > 0) return false;
  return true;
}

/**
 * Explicit 1..N is kept. A missing number still falls back only to rounds 1–3,
 * matching the previous scheduler. 0 is still treated as round 1.
 */
export function normalizeHumanCallRoundNumber(
  value: unknown,
  fallbackIndex = 0
): number | null {
  const hasExplicit =
    value !== undefined && value !== null && cleanStr(value) !== "";

  if (hasExplicit) {
    const n = Number(value);
    if (isConfiguredHumanCallRound(n)) return n;
    if (n === 0) return 1;
  }

  const fallback = fallbackIndex + 1;
  if (fallback === 1 || fallback === 2 || fallback === 3) return fallback;
  return null;
}

/** Rounds to show for an event: configured count, plus any higher round already stored. */
export function listVisibleHumanCallRounds(source: any): number[] {
  const callsType = cleanStr(source?.callsType).toLowerCase();
  if (callsType === "ivr") return [1, 2, 3];

  const explicit = Number(source?.callsRounds ?? source?.allowedCallRounds);
  const base = isConfiguredHumanCallRound(explicit)
    ? explicit
    : DEFAULT_HUMAN_CALL_ROUNDS;

  const scheduled = Array.isArray(source?.callRoundsSchedule?.rounds)
    ? source.callRoundsSchedule.rounds
        .map((round: any) => Number(round?.roundNumber || round?.round || 0))
        .filter((n: number) => isConfiguredHumanCallRound(n))
    : [];

  const top = Math.max(base, ...(scheduled.length ? scheduled : [base]));
  return Array.from({ length: top }, (_, index) => index + 1);
}

/** Guest ids that still need a task in this round. Existing tasks are never duplicated. */
export function selectNewCallTaskGuestIds(
  eligibleGuestIds: string[],
  existingGuestIds: Iterable<string>
) {
  const existing = new Set(existingGuestIds);
  const seen = new Set<string>();
  const created: string[] = [];

  for (const rawId of eligibleGuestIds) {
    const id = cleanStr(rawId);
    if (!id || existing.has(id) || seen.has(id)) continue;
    seen.add(id);
    created.push(id);
  }

  return created;
}

export function extraRoundOpenPlan(input: {
  round: number;
  eligibleGuestIds: string[];
  existingGuestIds: string[];
  employeeCount: number;
}) {
  const guestIds = selectNewCallTaskGuestIds(
    input.eligibleGuestIds,
    input.existingGuestIds
  );
  const isExtra = isExtraHumanCallRound(input.round);
  const hasAnything =
    guestIds.length > 0 || input.existingGuestIds.length > 0;

  return {
    guestIds,
    assignEmployees: input.employeeCount > 0,
    waitingForAssignment:
      isExtra && input.employeeCount === 0 && hasAnything,
    skippedAsDuplicate: guestIds.length === 0,
  };
}

export type GuestRsvpNormalized = "yes" | "no" | "maybe" | "pending";

export type CallAnswerNormalized = "answered" | "no_answer" | null;

const NO_ANSWER_TOKENS = new Set([
  "no_answer",
  "not_answered",
  "unanswered",
  "busy",
  "voicemail",
  "no_response",
  "לא ענה",
  "לא ענתה",
  "לא ענו",
  "אין מענה",
  "תא קולי",
  "עסוק",
]);

const ANSWERED_TOKENS = new Set([
  "answered",
  "answer",
  "confirmed",
  "declined",
  "yes",
  "no",
  "maybe",
  "undecided",
  "will_reply",
  "will_reply_message",
  "callback",
  "wrong_number",
  "needs_fix",
  "needs_correction",
  "ענה",
  "ענתה",
]);

const CALLBACK_TOKENS = new Set([
  "callback",
  "call_back",
  "callback_next_round",
  "callback_manual",
  "callback_manual_handling",
  "follow_up",
  "followup",
  "later",
  "חזרה בסבב הבא",
  "לחזור בסבב הבא",
  "לחזור",
  "לחזור אליו",
  "לחזור אליה",
  "להתקשר שוב",
  "ביקש לחזור אליו",
  "ביקשה לחזור אליה",
  "מעוניין בחזרה נוספת",
  "מעוניינת בחזרה נוספת",
  "לחזור אליהם",
  "לחזור אליהן",
  "חזרה",
]);

const FINAL_ATTENDANCE_TASK_TOKENS = new Set([
  "confirmed",
  "declined",
  "yes",
  "no",
  "cancelled",
  "canceled",
]);

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeToken(value: unknown) {
  return cleanStr(value).toLowerCase();
}

export function normalizeGuestRsvpForCalls(value: unknown): GuestRsvpNormalized {
  const raw = normalizeToken(value);

  if (
    raw === "yes" ||
    raw === "confirmed" ||
    raw === "attending" ||
    raw === "approved" ||
    raw === "מגיע" ||
    raw === "מגיעים" ||
    raw === "מגיעה"
  ) {
    return "yes";
  }

  if (
    raw === "no" ||
    raw === "declined" ||
    raw === "not_coming" ||
    raw === "לא מגיע" ||
    raw === "לא מגיעים" ||
    raw === "לא מגיעה"
  ) {
    return "no";
  }

  if (
    raw === "maybe" ||
    raw === "undecided" ||
    raw === "unsure" ||
    raw.includes("מתלבט") ||
    raw.includes("לא בטוח")
  ) {
    return "maybe";
  }

  if (
    raw === "pending" ||
    raw === "waiting" ||
    raw === "wait" ||
    raw === "awaiting" ||
    raw === "ממתין" ||
    raw === "בהמתנה" ||
    raw === "טרם אישר" ||
    raw === "טרם אישרו" ||
    raw === "טרם השיב"
  ) {
    return "pending";
  }

  if (raw.includes("לא מגיע")) return "no";
  if (raw.includes("מגיע") && !raw.includes("לא")) return "yes";

  // אין מענה / חזרה הם תוצאת שיחה, לא אישור או סירוב.
  if (isNoAnswerCallResult(raw) || isCallbackNextRoundValue(raw)) {
    return "pending";
  }

  return "pending";
}

/**
 * Attendance for extra rounds comes from the RSVP fields.
 * guest.status is often the separate call outcome and must not
 * turn "no_answer" or "callback" into a final yes/no.
 */
export function getStoredAttendanceRsvp(guest: any): GuestRsvpNormalized {
  const raw =
    guest?.rsvp ??
    guest?.rsvpStatus ??
    guest?.attendanceStatus ??
    guest?.finalRsvpStatus ??
    "";

  if (!cleanStr(raw)) return "pending";
  return normalizeGuestRsvpForCalls(raw);
}

function pushAttemptValues(target: unknown[], source: any) {
  if (!source || typeof source !== "object") return;

  target.push(
    source.answerStatus,
    source.resultStatus,
    source.status,
    source.result,
    source.callResult,
    source.outcome,
    source.callStatus,
    source.callAnswered,
    source.noAnswerResult,
    source.answeredResult,
    source.pendingCallStatus,
    source.pendingReason,
    source.nextRoundReason
  );

  if (source.callbackRequested === true) target.push("callback");
}

/** True when any attempt, not only the latest one, was no-answer or callback. */
export function guestHasNoAnswerOrCallbackHistory(guest: any): boolean {
  const values: unknown[] = [];

  if (Array.isArray(guest?.callRounds)) {
    for (const row of guest.callRounds) pushAttemptValues(values, row);
  }

  if (Array.isArray(guest?.callHistory)) {
    for (const row of guest.callHistory) pushAttemptValues(values, row);
  }

  for (const list of [
    guest?.callAttempts,
    guest?.attempts,
    guest?.callAttemptHistory,
  ]) {
    if (!Array.isArray(list)) continue;
    for (const row of list) pushAttemptValues(values, row);
  }

  for (let round = 1; round <= MAX_CONFIGURED_HUMAN_CALL_ROUNDS; round += 1) {
    const key = `round${round}`;
    values.push(
      guest?.[`${key}CallResult`],
      guest?.[`${key}CallStatus`],
      guest?.[`${key}AnsweredResult`],
      guest?.[`${key}NoAnswerResult`],
      guest?.[`${key}PendingCallStatus`],
      guest?.[`${key}PendingReason`]
    );
    if (guest?.[`${key}CallbackRequested`] === true) values.push("callback");
  }

  values.push(
    guest?.lastCallStatus,
    guest?.lastCallResult,
    guest?.pendingCallStatus,
    guest?.pendingReason,
    guest?.callStatus,
    guest?.callResult
  );
  if (guest?.callbackRequested === true) values.push("callback");

  return values.some(
    (value) => isNoAnswerCallResult(value) || isCallbackNextRoundValue(value)
  );
}

export function classifyCallAttempt(task: any): {
  noAnswer: boolean;
  callback: boolean;
} {
  const values: unknown[] = [];
  pushAttemptValues(values, task);

  for (const list of [task?.attempts, task?.callAttempts, task?.attemptHistory]) {
    if (!Array.isArray(list)) continue;
    for (const row of list) pushAttemptValues(values, row);
  }

  return {
    noAnswer: values.some((value) => isNoAnswerCallResult(value)),
    callback: values.some((value) => isCallbackNextRoundValue(value)),
  };
}

export function getGuestRsvpValue(guest: any): GuestRsvpNormalized {
  return normalizeGuestRsvpForCalls(
    guest?.rsvp ?? guest?.rsvpStatus ?? guest?.attendanceStatus ?? guest?.status ?? ""
  );
}

export function isPendingRsvp(guest: any) {
  return getGuestRsvpValue(guest) === "pending";
}

export function isMaybeRsvp(guest: any) {
  return getGuestRsvpValue(guest) === "maybe";
}

export function hasFinalAttendanceRsvp(guest: any) {
  const rsvp = getGuestRsvpValue(guest);
  return rsvp === "yes" || rsvp === "no";
}

/**
 * Ceiling for the original callback carry (rounds 1–3 only).
 * A configured count of 4+ must not turn round 3 into a pass-through.
 */
export function resolveMaxCallRounds(source: any): 1 | 2 | 3 {
  const raw = Number(source?.callsRounds ?? source?.allowedCallRounds ?? 3);
  if (raw === 1 || raw === 2) return raw;
  return 3;
}

export function isCallbackNextRoundValue(value: unknown) {
  const raw = normalizeToken(value);
  if (!raw) return false;
  return CALLBACK_TOKENS.has(raw);
}

export function isCallbackCarryForwardTask(task: any) {
  const status = normalizeToken(task?.status);
  if (FINAL_ATTENDANCE_TASK_TOKENS.has(status)) return false;

  const fields = [
    task?.status,
    task?.result,
    task?.callResult,
    task?.answeredResult,
    task?.resultStatus,
    task?.outcome,
    task?.nextRoundReason,
    task?.pendingCallStatus,
    task?.pendingReason,
  ];

  return fields.some((value) => isCallbackNextRoundValue(value));
}

export function guestRequestedCallbackOnRound(guest: any, round: 1 | 2 | 3) {
  const rounds = Array.isArray(guest?.callRounds) ? guest.callRounds : [];
  const match = rounds.find(
    (row: any) => Number(row?.roundNumber || row?.round || 0) === round
  );

  if (match) {
    const matched = [
      match.resultStatus,
      match.status,
      match.result,
      match.answeredResult,
      match.pendingCallStatus,
      match.pendingReason,
      match.nextRoundReason,
    ].some((value) => isCallbackNextRoundValue(value));

    if (matched || match.callbackRequested === true) return true;
  }

  const roundKey = `round${round}`;
  const fromRoundFields = [
    guest?.[`${roundKey}CallResult`],
    guest?.[`${roundKey}CallStatus`],
    guest?.[`${roundKey}AnsweredResult`],
    guest?.[`${roundKey}PendingCallStatus`],
    guest?.[`${roundKey}PendingReason`],
  ].some((value) => isCallbackNextRoundValue(value));

  if (fromRoundFields || guest?.[`${roundKey}CallbackRequested`] === true) {
    return true;
  }

  const lastRound = Number(guest?.lastCallRound || guest?.callRound || 0);
  if (lastRound !== round) return false;

  return [
    guest?.lastCallStatus,
    guest?.lastCallResult,
    guest?.pendingCallStatus,
    guest?.pendingReason,
    guest?.callStatus,
    guest?.callResult,
  ].some((value) => isCallbackNextRoundValue(value));
}

export function hasGuestPhone(guest: any) {
  const phone = cleanStr(guest?.phone || guest?.mobile || guest?.phoneNumber);
  return phone.replace(/\D/g, "").length >= 8;
}

export function extractGuestId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  // Mongoose/BSON ObjectId: never walk `.id` (binary buffer getter) — it
  // recurses forever via extractGuestId(objectId.id).
  if (
    typeof value === "object" &&
    (value as any)._bsontype === "ObjectId"
  ) {
    return String(value);
  }

  if (typeof (value as any)?.toHexString === "function") {
    try {
      return String((value as any).toHexString());
    } catch {
      // fall through
    }
  }

  if (typeof value === "object") {
    const anyValue = value as any;
    if (anyValue.$oid) return String(anyValue.$oid);
    if (anyValue._id && anyValue._id !== value) {
      return extractGuestId(anyValue._id);
    }
  }

  return String(value || "");
}

export function isNoAnswerCallResult(value: unknown) {
  const raw = normalizeToken(value);
  if (!raw) return false;
  return NO_ANSWER_TOKENS.has(raw);
}

export function isAnsweredCallResult(value: unknown) {
  const raw = normalizeToken(value);
  if (!raw) return false;
  if (isNoAnswerCallResult(raw)) return false;
  return ANSWERED_TOKENS.has(raw);
}

/**
 * Normalize a call task / callRounds row into answered | no_answer | null.
 * RSVP values must never be treated as a call result by themselves.
 */
export function normalizeCallAnswerFromSources(input: {
  answerStatus?: unknown;
  resultStatus?: unknown;
  result?: unknown;
  callResult?: unknown;
  status?: unknown;
  outcome?: unknown;
  callStatus?: unknown;
  callAnswered?: unknown;
  noAnswerResult?: unknown;
}): CallAnswerNormalized {
  const answerStatus = normalizeToken(input.answerStatus || input.callAnswered);
  if (answerStatus === "answered" || answerStatus === "ענה" || answerStatus === "ענתה") {
    return "answered";
  }
  if (answerStatus === "no_answer" || isNoAnswerCallResult(answerStatus)) {
    return "no_answer";
  }

  const candidates = [
    input.noAnswerResult,
    input.resultStatus,
    input.result,
    input.callResult,
    input.outcome,
    input.callStatus,
    input.status,
  ];

  for (const candidate of candidates) {
    if (isNoAnswerCallResult(candidate)) return "no_answer";
  }

  for (const candidate of candidates) {
    if (isAnsweredCallResult(candidate)) return "answered";
  }

  return null;
}

export function getGuestStoredCallAnswer(
  guest: any,
  round: CallRoundNumber
): CallAnswerNormalized {
  const rounds = Array.isArray(guest?.callRounds) ? guest.callRounds : [];
  const match = rounds.find(
    (row: any) => Number(row?.roundNumber || row?.round || 0) === round
  );

  if (match) {
    return normalizeCallAnswerFromSources({
      answerStatus: match.answerStatus,
      resultStatus: match.resultStatus,
      result: match.result,
      callResult: match.callResult,
      status: match.status,
      callStatus: match.callStatus,
    });
  }

  const roundKey = `round${round}`;
  return normalizeCallAnswerFromSources({
    callAnswered: guest?.[`${roundKey}CallAnswered`],
    resultStatus: guest?.[`${roundKey}CallResult`] || guest?.[`${roundKey}CallStatus`],
    status: guest?.[`${roundKey}CallStatus`],
    noAnswerResult: guest?.[`${roundKey}NoAnswerResult`],
    answeredResult: guest?.[`${roundKey}AnsweredResult`],
  } as any);
}

export function getCallRoundAudienceLabel(round: CallRoundNumber) {
  if (round === 1) return "ממתינים שעדיין לא נתנו תשובה";
  if (round === 2) return "לא ענו בסבב 1 + ביקשו חזרה";
  if (round === 3) return "לא ענו בסבבים 1–2 + ביקשו חזרה + מתלבטים";
  return "מתלבטים + טרם אישרו + לא ענו";
}

export function getCallRoundDescription(round: CallRoundNumber) {
  if (round === 1) {
    return "סבב 1 - ממתינים שעדיין לא נתנו תשובה";
  }
  if (round === 2) {
    return "סבב 2 - לא ענו בסבב 1 + ביקשו חזרה בסבב הבא";
  }
  if (round === 3) {
    return "סבב 3 - לא ענו בסבבים 1–2 + ביקשו חזרה + מתלבטים";
  }
  return `סבב ${round} - מתלבטים, טרם אישרו, ולא ענו או ביקשו חזרה`;
}

export function getSourceAudienceByRound(round: CallRoundNumber) {
  if (round === 1) return "pending_rsvp" as const;
  if (round === 2) return "round_1_no_answer" as const;
  if (round === 3) return "round_2_no_answer" as const;
  return "open_followup" as const;
}

function hadNoAnswerOnRound(input: {
  guest: any;
  guestId: string;
  round: 1 | 2;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
}) {
  if (input.previousNoAnswerByRound?.[input.round]?.has(input.guestId) === true) {
    return true;
  }

  return getGuestStoredCallAnswer(input.guest, input.round) === "no_answer";
}

function requestedCallbackOnRound(input: {
  guest: any;
  guestId: string;
  round: 1 | 2;
  previousCallbackByRound?: Partial<Record<1 | 2, Set<string>>>;
}) {
  if (input.previousCallbackByRound?.[input.round]?.has(input.guestId) === true) {
    return true;
  }

  return guestRequestedCallbackOnRound(input.guest, input.round);
}

/**
 * Previous-round no-answer and callback sets are optional.
 * Guest call history is enough when the sets are not loaded.
 */
export function isGuestEligibleForCallRound(input: {
  guest: any;
  round: CallRoundNumber;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
  previousCallbackByRound?: Partial<Record<1 | 2, Set<string>>>;
  earlierNoAnswerGuestIds?: Set<string>;
  earlierCallbackGuestIds?: Set<string>;
}): boolean {
  const { guest, round, previousNoAnswerByRound, previousCallbackByRound } = input;

  if (!hasGuestPhone(guest)) return false;

  const guestId = extractGuestId(guest?._id || guest?.id);
  const rsvp = getGuestRsvpValue(guest);

  if (round === 1) {
    return rsvp === "pending";
  }

  // Rounds 4–20: current RSVP yes/no excludes. Call-status on guest.status does not.
  // maybe, waiting/pending, or any earlier no-answer / callback attempt are included.
  if (round >= 4) {
    if (round > MAX_CONFIGURED_HUMAN_CALL_ROUNDS) return false;

    const attendance = getStoredAttendanceRsvp(guest);
    if (attendance === "yes" || attendance === "no") return false;
    if (attendance === "maybe" || attendance === "pending") return true;
    if (guestHasNoAnswerOrCallbackHistory(guest)) return true;
    if (guestId && input.earlierNoAnswerGuestIds?.has(guestId)) return true;
    if (guestId && input.earlierCallbackGuestIds?.has(guestId)) return true;
    return false;
  }

  if (hasFinalAttendanceRsvp(guest)) return false;

  if (round === 2) {
    if (rsvp !== "pending") return false;

    return (
      hadNoAnswerOnRound({
        guest,
        guestId,
        round: 1,
        previousNoAnswerByRound,
      }) ||
      requestedCallbackOnRound({
        guest,
        guestId,
        round: 1,
        previousCallbackByRound,
      })
    );
  }

  // Round 3
  // A) current RSVP maybe / מתלבט
  // B) pending + no_answer in rounds 1 and 2
  // C) pending + callback in round 2
  // D) pending + callback in round 1 and no_answer in round 2
  if (rsvp === "maybe") return true;

  if (rsvp !== "pending") return false;

  const callbackRound2 = requestedCallbackOnRound({
    guest,
    guestId,
    round: 2,
    previousCallbackByRound,
  });
  if (callbackRound2) return true;

  const noAnswerRound2 = hadNoAnswerOnRound({
    guest,
    guestId,
    round: 2,
    previousNoAnswerByRound,
  });
  const callbackRound1 = requestedCallbackOnRound({
    guest,
    guestId,
    round: 1,
    previousCallbackByRound,
  });

  if (callbackRound1 && noAnswerRound2) return true;

  const noAnswerRound1 = hadNoAnswerOnRound({
    guest,
    guestId,
    round: 1,
    previousNoAnswerByRound,
  });

  return noAnswerRound1 && noAnswerRound2;
}

export function callbackCarryFromRound(input: {
  guest: any;
  round: CallRoundNumber;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
  previousCallbackByRound?: Partial<Record<1 | 2, Set<string>>>;
}): 1 | 2 | null {
  if (
    input.round === 1 ||
    input.round >= 4 ||
    hasFinalAttendanceRsvp(input.guest)
  ) {
    return null;
  }

  const guestId = extractGuestId(input.guest?._id || input.guest?.id);

  if (input.round === 2) {
    return requestedCallbackOnRound({
      guest: input.guest,
      guestId,
      round: 1,
      previousCallbackByRound: input.previousCallbackByRound,
    })
      ? 1
      : null;
  }

  if (
    requestedCallbackOnRound({
      guest: input.guest,
      guestId,
      round: 2,
      previousCallbackByRound: input.previousCallbackByRound,
    })
  ) {
    return 2;
  }

  const callbackRound1 = requestedCallbackOnRound({
    guest: input.guest,
    guestId,
    round: 1,
    previousCallbackByRound: input.previousCallbackByRound,
  });
  const noAnswerRound2 = hadNoAnswerOnRound({
    guest: input.guest,
    guestId,
    round: 2,
    previousNoAnswerByRound: input.previousNoAnswerByRound,
  });

  return callbackRound1 && noAnswerRound2 ? 1 : null;
}

export function annotateCallbackCarryForward(input: {
  guests: any[];
  round: CallRoundNumber;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
  previousCallbackByRound?: Partial<Record<1 | 2, Set<string>>>;
}) {
  for (const guest of input.guests) {
    const fromRound = callbackCarryFromRound({
      guest,
      round: input.round,
      previousNoAnswerByRound: input.previousNoAnswerByRound,
      previousCallbackByRound: input.previousCallbackByRound,
    });

    if (fromRound) guest.__callbackCarryFromRound = fromRound;
    else delete guest.__callbackCarryFromRound;
  }

  return input.guests;
}

export function callbackCarryTaskPatch(guest: any): {
  callbackFromRound?: 1 | 2;
  inclusionReason?: string;
  movedFromRound?: 1 | 2;
  adminNote?: string;
  priority?: number;
} {
  const from = Number(guest?.__callbackCarryFromRound || 0);
  if (from !== 1 && from !== 2) return {};

  return {
    callbackFromRound: from as 1 | 2,
    inclusionReason: "callback_next_round",
    movedFromRound: from as 1 | 2,
    adminNote: `הועבר מסבב ${from} כי האורח ביקש שיחזרו אליו בסבב הבא`,
    priority: 1,
  };
}

export function filterGuestsForCallRound(input: {
  guests: any[];
  round: CallRoundNumber;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
  previousCallbackByRound?: Partial<Record<1 | 2, Set<string>>>;
  earlierNoAnswerGuestIds?: Set<string>;
  earlierCallbackGuestIds?: Set<string>;
}) {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const guest of input.guests) {
    if (
      !isGuestEligibleForCallRound({
        guest,
        round: input.round,
        previousNoAnswerByRound: input.previousNoAnswerByRound,
        previousCallbackByRound: input.previousCallbackByRound,
        earlierNoAnswerGuestIds: input.earlierNoAnswerGuestIds,
        earlierCallbackGuestIds: input.earlierCallbackGuestIds,
      })
    ) {
      continue;
    }

    const guestId = extractGuestId(guest?._id || guest?.id) || cleanStr(guest?.phone);
    if (!guestId || seen.has(guestId)) continue;

    seen.add(guestId);
    result.push(guest);
  }

  return result;
}

export function summarizeCallRoundGuests(guests: any[], round: CallRoundNumber) {
  let answered = 0;
  let noAnswer = 0;
  let remaining = 0;

  for (const guest of guests) {
    const callAnswer = getGuestStoredCallAnswer(guest, round);

    if (callAnswer === "answered") {
      answered += 1;
      continue;
    }

    if (callAnswer === "no_answer") {
      noAnswer += 1;
      continue;
    }

    remaining += 1;
  }

  return {
    total: guests.length,
    answered,
    noAnswer,
    remaining,
  };
}
