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

export type CallRoundNumber = 1 | 2 | 3;

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

  if (raw.includes("לא מגיע")) return "no";
  if (raw.includes("מגיע") && !raw.includes("לא")) return "yes";

  return "pending";
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
  return "לא ענו בסבבים 1–2 + ביקשו חזרה + מתלבטים";
}

export function getCallRoundDescription(round: CallRoundNumber) {
  if (round === 1) {
    return "סבב 1 - ממתינים שעדיין לא נתנו תשובה";
  }
  if (round === 2) {
    return "סבב 2 - לא ענו בסבב 1 + ביקשו חזרה בסבב הבא";
  }
  return "סבב 3 - לא ענו בסבבים 1–2 + ביקשו חזרה + מתלבטים";
}

export function getSourceAudienceByRound(round: CallRoundNumber) {
  if (round === 1) return "pending_rsvp" as const;
  if (round === 2) return "round_1_no_answer" as const;
  return "round_2_no_answer" as const;
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
}): boolean {
  const { guest, round, previousNoAnswerByRound, previousCallbackByRound } = input;

  if (!hasGuestPhone(guest)) return false;

  const guestId = extractGuestId(guest?._id || guest?.id);
  const rsvp = getGuestRsvpValue(guest);

  if (round === 1) {
    return rsvp === "pending";
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
  if (input.round === 1 || hasFinalAttendanceRsvp(input.guest)) return null;

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
