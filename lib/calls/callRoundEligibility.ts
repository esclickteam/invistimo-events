/**
 * Call-round eligibility: RSVP attendance is separate from call result.
 *
 * Attendance (RSVP): yes | no | maybe | pending
 * Call result examples: answered / no_answer / callback / needs_fix / wrong_number
 *
 * There are exactly 3 phone rounds. Audience is computed at OPEN time
 * from current guest data — never from the list that existed at schedule time.
 *
 * Round 1: RSVP pending
 * Round 2: still pending + round-1 callback + round-1 needs_fix (without a final RSVP)
 * Round 3: still pending + maybe + any callback without a final RSVP
 *          + needs_fix without a final RSVP. No round 4 — round-3 callbacks stay in 3.
 */

export type CallRoundNumber = 1 | 2 | 3;

export type GuestRsvpNormalized = "yes" | "no" | "maybe" | "pending";

export type CallAnswerNormalized = "answered" | "no_answer" | null;

export type CallFollowUpKind = "callback" | "needs_fix";

export type GuestRoundFollowUp = {
  kind: CallFollowUpKind;
  note: string;
  guestNote: string;
};

export type PreviousFollowUpByRound = Partial<
  Record<CallRoundNumber, Map<string, GuestRoundFollowUp>>
>;

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
  "call_later",
  "follow_up",
  "followup",
  "later",
  "callback_next_round",
  "next_round_callback",
  "חזרה",
  "חזרה בסבב הבא",
  "לחזור בסבב הבא",
  "לחזור",
  "לחזור אליו",
  "לחזור אליה",
  "לחזור אליהם",
  "להתקשר שוב",
  "ביקש לחזור אליו",
  "ביקשה לחזור אליה",
  "מעוניין בחזרה נוספת",
  "מעוניינת בחזרה נוספת",
]);

const NEEDS_FIX_TOKENS = new Set([
  "needs_fix",
  "need_fix",
  "needs_correction",
  "requires_correction",
  "wrong_number",
  "invalid_phone",
  "bad_number",
  "fix",
  "correction",
  "דורש תיקון",
  "דורשת תיקון",
  "צריך תיקון",
  "מספר שגוי",
  "מספר לא תקין",
]);

const PENDING_RSVP_TOKENS = new Set([
  "pending",
  "wait",
  "waiting",
  "awaiting",
  "unknown",
  "none",
  "no_response",
  "unanswered",
  "not_answered",
  "new",
  "created",
  "callback",
  "needs_fix",
  "need_fix",
  "needs_correction",
  "wrong_number",
  "טרם השיב",
  "ממתין",
  "בהמתנה",
  "לא ידוע",
  "דורש תיקון",
  "חזרה בסבב הבא",
]);

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeToken(value: unknown) {
  return cleanStr(value).toLowerCase();
}

export function clampCallRoundNumber(value: unknown): CallRoundNumber {
  const n = Number(value);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

/** Round 3 is the last round — a callback there stays in round 3. */
export function nextCallRoundNumber(current: unknown): CallRoundNumber {
  const n = Math.floor(Number(current));
  if (!Number.isFinite(n) || n <= 1) return 2;
  if (n >= 3) return 3;
  return 3;
}

export function normalizeGuestRsvpForCalls(value: unknown): GuestRsvpNormalized {
  const raw = normalizeToken(value);

  if (!raw || PENDING_RSVP_TOKENS.has(raw)) {
    return "pending";
  }

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

  if (NEEDS_FIX_TOKENS.has(raw) || CALLBACK_TOKENS.has(raw)) {
    return "pending";
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

export function hasFinalAttendanceAnswer(guest: any) {
  const rsvp = getGuestRsvpValue(guest);
  return rsvp === "yes" || rsvp === "no";
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

export function isCallbackCallResult(value: unknown) {
  const raw = normalizeToken(value);
  if (!raw) return false;
  return CALLBACK_TOKENS.has(raw);
}

export function isNeedsFixCallResult(value: unknown) {
  const raw = normalizeToken(value);
  if (!raw) return false;
  return NEEDS_FIX_TOKENS.has(raw);
}

export function isFollowUpTaskStatus(value: unknown) {
  return isCallbackCallResult(value) || isNeedsFixCallResult(value);
}

/**
 * Normalize a call task / callRounds row into answered | no_answer | null.
 * RSVP values must never be treated as a call result by themselves.
 * This is history/display only — it does not decide next-round eligibility.
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
    if (isNoAnswerCallResult(candidate) || isNeedsFixCallResult(candidate)) {
      return "no_answer";
    }
  }

  for (const candidate of candidates) {
    if (isAnsweredCallResult(candidate)) return "answered";
  }

  return null;
}

function firstNonEmptyNote(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i -= 1) {
        const item = value[i];
        const text = cleanStr(
          typeof item === "string" ? item : item?.text || item?.note || item?.body
        );
        if (text) return text;
      }
      continue;
    }

    const text = cleanStr(value);
    if (text) return text;
  }

  return "";
}

function classifyFollowUpKindFromValues(values: unknown[]): CallFollowUpKind | null {
  for (const value of values) {
    if (isCallbackCallResult(value)) return "callback";
  }

  for (const value of values) {
    if (isNeedsFixCallResult(value)) return "needs_fix";
  }

  return null;
}

export function classifyCallFollowUpFromSources(input: {
  answerStatus?: unknown;
  resultStatus?: unknown;
  result?: unknown;
  callResult?: unknown;
  status?: unknown;
  outcome?: unknown;
  callStatus?: unknown;
  answeredResult?: unknown;
  noAnswerResult?: unknown;
  pendingCallStatus?: unknown;
  pendingReason?: unknown;
  nextRoundReason?: unknown;
  callbackRequested?: unknown;
  needsFix?: unknown;
  phoneNeedsCorrection?: unknown;
  phoneInvalid?: unknown;
  note?: unknown;
  guestNote?: unknown;
  guestNotes?: unknown;
  notes?: unknown;
}): GuestRoundFollowUp | null {
  const kind = classifyFollowUpKindFromValues([
    input.nextRoundReason,
    input.pendingReason,
    input.pendingCallStatus,
    input.noAnswerResult,
    input.answeredResult,
    input.resultStatus,
    input.result,
    input.callResult,
    input.outcome,
    input.callStatus,
    input.status,
  ]);

  const flaggedNeedsFix =
    input.needsFix === true ||
    input.phoneNeedsCorrection === true ||
    input.phoneInvalid === true;

  const flaggedCallback = input.callbackRequested === true;

  const resolvedKind =
    kind ||
    (flaggedCallback ? "callback" : null) ||
    (flaggedNeedsFix ? "needs_fix" : null);

  if (!resolvedKind) return null;

  return {
    kind: resolvedKind,
    note: firstNonEmptyNote(input.note, input.notes),
    guestNote: firstNonEmptyNote(input.guestNote, input.guestNotes),
  };
}

function getGuestRoundRow(guest: any, round: CallRoundNumber) {
  const rounds = Array.isArray(guest?.callRounds) ? guest.callRounds : [];
  return (
    rounds.find(
      (row: any) => Number(row?.roundNumber || row?.round || 0) === round
    ) || null
  );
}

export function getGuestStoredCallAnswer(
  guest: any,
  round: CallRoundNumber
): CallAnswerNormalized {
  const match = getGuestRoundRow(guest, round);

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

export function getGuestStoredCallFollowUp(
  guest: any,
  round: CallRoundNumber
): GuestRoundFollowUp | null {
  const match = getGuestRoundRow(guest, round);
  const roundKey = `round${round}`;
  const lastRound = Number(guest?.lastCallRound || guest?.callRound || 0);
  const applyGuestLevelFlags =
    lastRound === round || (lastRound === 0 && round === 1);

  if (match) {
    const fromRow = classifyCallFollowUpFromSources({
      answerStatus: match.answerStatus,
      resultStatus: match.resultStatus,
      result: match.result,
      callResult: match.callResult,
      status: match.status,
      callStatus: match.callStatus,
      answeredResult: match.answeredResult,
      noAnswerResult: match.noAnswerResult,
      pendingCallStatus: match.pendingCallStatus,
      pendingReason: match.pendingReason || match.nextRoundReason,
      nextRoundReason: match.nextRoundReason,
      callbackRequested: match.callbackRequested,
      needsFix: match.needsFix,
      note: match.note || match.callDocumentation,
      notes: match.notes,
      guestNote: match.guestNote,
      guestNotes: match.guestNotes,
    });
    if (fromRow) return fromRow;
  }

  const fromRoundFields = classifyCallFollowUpFromSources({
    status: guest?.[`${roundKey}CallStatus`],
    result: guest?.[`${roundKey}CallResult`],
    resultStatus:
      guest?.[`${roundKey}CallResultStatus`] ||
      guest?.[`${roundKey}AnsweredResult`] ||
      guest?.[`${roundKey}NoAnswerResult`],
    answeredResult: guest?.[`${roundKey}AnsweredResult`],
    noAnswerResult: guest?.[`${roundKey}NoAnswerResult`],
    note: guest?.[`${roundKey}CallNote`],
  });

  if (fromRoundFields) return fromRoundFields;

  if (!applyGuestLevelFlags) return null;

  return classifyCallFollowUpFromSources({
    pendingCallStatus: guest?.pendingCallStatus,
    pendingReason: guest?.pendingReason,
    callbackRequested: guest?.callbackRequested,
    needsFix: guest?.needsFix,
    phoneNeedsCorrection: guest?.phoneNeedsCorrection,
    phoneInvalid: guest?.phoneInvalid,
    guestNote: guest?.notes || guest?.guestNotes,
  });
}

/**
 * Index the latest task per guest+round into follow-up markers.
 * Completing a previous-round task (any call result) is NOT a final RSVP.
 */
function taskTimestamp(task: any) {
  const raw = task?.updatedAt || task?.completedAt || task?.createdAt || 0;
  const time = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function indexFollowUpsFromCallTasks(
  tasks: any[]
): PreviousFollowUpByRound {
  const latestByGuestRound = new Map<string, any>();

  const sorted = [...(tasks || [])].sort(
    (a, b) => taskTimestamp(b) - taskTimestamp(a)
  );

  for (const task of sorted) {
    const guestId = extractGuestId(
      task?.guestId || task?.invitationGuestId
    );
    const round = Number(task?.round || task?.callRound || 0);
    if (!guestId || (round !== 1 && round !== 2 && round !== 3)) continue;

    const key = `${guestId}:${round}`;
    if (latestByGuestRound.has(key)) continue;
    latestByGuestRound.set(key, task);
  }

  const result: PreviousFollowUpByRound = {};

  for (const [key, task] of latestByGuestRound.entries()) {
    const followUp = classifyCallFollowUpFromSources({
      answerStatus: task?.answerStatus,
      resultStatus: task?.resultStatus,
      result: task?.result,
      callResult: task?.callResult,
      status: task?.status,
      outcome: task?.outcome,
      callStatus: task?.callStatus,
      answeredResult: task?.answeredResult,
      noAnswerResult: task?.noAnswerResult,
      pendingCallStatus: task?.pendingCallStatus,
      pendingReason: task?.pendingReason || task?.nextRoundReason,
      nextRoundReason: task?.nextRoundReason,
      callbackRequested: task?.callbackRequested,
      needsFix: task?.needsFix,
      phoneNeedsCorrection: task?.phoneNeedsCorrection,
      phoneInvalid: task?.phoneInvalid,
      note: task?.note || task?.callDocumentation,
      guestNote: task?.guestNote,
      guestNotes: task?.guestNotes,
    });

    if (!followUp) continue;

    const [guestId, roundRaw] = key.split(":");
    const round = Number(roundRaw) as CallRoundNumber;
    if (!result[round]) result[round] = new Map();
    result[round]!.set(guestId, followUp);
  }

  return result;
}

function getFollowUpForRound(input: {
  guest: any;
  round: CallRoundNumber;
  previousFollowUpByRound?: PreviousFollowUpByRound;
}): GuestRoundFollowUp | null {
  const guestId = extractGuestId(input.guest?._id || input.guest?.id);
  const fromTasks = guestId
    ? input.previousFollowUpByRound?.[input.round]?.get(guestId) || null
    : null;

  return fromTasks || getGuestStoredCallFollowUp(input.guest, input.round);
}

function hasFollowUpKind(input: {
  guest: any;
  round: CallRoundNumber;
  kind: CallFollowUpKind;
  previousFollowUpByRound?: PreviousFollowUpByRound;
}) {
  return getFollowUpForRound(input)?.kind === input.kind;
}

function hasCallbackWithoutFinal(input: {
  guest: any;
  previousFollowUpByRound?: PreviousFollowUpByRound;
  rounds?: CallRoundNumber[];
}) {
  const rounds = input.rounds || ([1, 2, 3] as CallRoundNumber[]);
  return rounds.some((round) =>
    hasFollowUpKind({
      guest: input.guest,
      round,
      kind: "callback",
      previousFollowUpByRound: input.previousFollowUpByRound,
    })
  );
}

function hasNeedsFixWithoutFinal(input: {
  guest: any;
  previousFollowUpByRound?: PreviousFollowUpByRound;
  rounds?: CallRoundNumber[];
}) {
  const rounds = input.rounds || ([1, 2, 3] as CallRoundNumber[]);
  return rounds.some((round) =>
    hasFollowUpKind({
      guest: input.guest,
      round,
      kind: "needs_fix",
      previousFollowUpByRound: input.previousFollowUpByRound,
    })
  );
}

export function getCallRoundAudienceLabel(round: CallRoundNumber) {
  if (round === 1) return "ממתינים שעדיין לא נתנו תשובה";
  if (round === 2) return "ממתינים + חזרה בסבב הבא ודורש תיקון מסבב 1";
  return "ממתינים + מתלבטים + חזרות ודורשי תיקון ללא תשובה סופית";
}

export function getCallRoundDescription(round: CallRoundNumber) {
  if (round === 1) {
    return "סבב 1 - ממתינים שעדיין לא נתנו תשובה";
  }
  if (round === 2) {
    return "סבב 2 - ממתינים + חזרה בסבב הבא ודורש תיקון מסבב 1";
  }
  return "סבב 3 - ממתינים + מתלבטים + חזרות ודורשי תיקון ללא תשובה סופית";
}

export function getSourceAudienceByRound(round: CallRoundNumber) {
  if (round === 1) return "pending_rsvp" as const;
  if (round === 2) return "round_1_no_answer" as const;
  return "round_2_no_answer" as const;
}

export function getCarriedFollowUpForRound(input: {
  guest: any;
  round: CallRoundNumber;
  previousFollowUpByRound?: PreviousFollowUpByRound;
}): {
  kind: CallFollowUpKind | null;
  fromRound: CallRoundNumber | null;
  note: string;
  adminNote: string;
} {
  const sourceRounds: CallRoundNumber[] =
    input.round === 1 ? [] : input.round === 2 ? [1] : [2, 1, 3];

  for (const fromRound of sourceRounds) {
    const followUp = getFollowUpForRound({
      guest: input.guest,
      round: fromRound,
      previousFollowUpByRound: input.previousFollowUpByRound,
    });

    if (!followUp) continue;

    const label =
      followUp.kind === "needs_fix"
        ? `דורש תיקון · מסבב ${fromRound}`
        : `חזרה בסבב הבא · מסבב ${fromRound}`;

    const note = followUp.note ? `${label}: ${followUp.note}` : label;

    return {
      kind: followUp.kind,
      fromRound,
      note,
      adminNote: note,
    };
  }

  return {
    kind: null,
    fromRound: null,
    note: "",
    adminNote: "",
  };
}

export function shouldReopenLastRoundFollowUpTask(input: {
  task: any;
  guest: any;
  round: CallRoundNumber;
  previousFollowUpByRound?: PreviousFollowUpByRound;
}) {
  if (input.round !== 3) return false;
  if (!isFollowUpTaskStatus(input.task?.status || input.task?.result)) {
    return false;
  }

  return isGuestEligibleForCallRound({
    guest: input.guest,
    round: 3,
    previousFollowUpByRound: input.previousFollowUpByRound,
  });
}

/**
 * @param previousNoAnswerByRound deprecated — ignored for eligibility.
 * Completing a previous-round task never blocks the next round.
 */
export function isGuestEligibleForCallRound(input: {
  guest: any;
  round: CallRoundNumber;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
  previousFollowUpByRound?: PreviousFollowUpByRound;
}): boolean {
  const { guest, round, previousFollowUpByRound } = input;

  if (!hasGuestPhone(guest)) return false;
  if (hasFinalAttendanceAnswer(guest)) return false;

  const rsvp = getGuestRsvpValue(guest);

  if (round === 1) {
    return rsvp === "pending";
  }

  if (round === 2) {
    if (rsvp === "pending") return true;

    return (
      hasFollowUpKind({
        guest,
        round: 1,
        kind: "callback",
        previousFollowUpByRound,
      }) ||
      hasFollowUpKind({
        guest,
        round: 1,
        kind: "needs_fix",
        previousFollowUpByRound,
      })
    );
  }

  if (rsvp === "pending" || rsvp === "maybe") return true;

  return (
    hasCallbackWithoutFinal({ guest, previousFollowUpByRound }) ||
    hasNeedsFixWithoutFinal({ guest, previousFollowUpByRound })
  );
}

export function filterGuestsForCallRound(input: {
  guests: any[];
  round: CallRoundNumber;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
  previousFollowUpByRound?: PreviousFollowUpByRound;
}) {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const guest of input.guests) {
    if (
      !isGuestEligibleForCallRound({
        guest,
        round: input.round,
        previousNoAnswerByRound: input.previousNoAnswerByRound,
        previousFollowUpByRound: input.previousFollowUpByRound,
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

/**
 * Guests who should be added to an already-open round, without touching
 * tasks that already exist for those guests in this round.
 */
export function selectMissingGuestsForOpenRound(input: {
  guests: any[];
  round: CallRoundNumber;
  existingGuestIds: Iterable<string>;
  previousFollowUpByRound?: PreviousFollowUpByRound;
}) {
  const existing = new Set(
    Array.from(input.existingGuestIds || []).map((id) => String(id || "")).filter(Boolean)
  );

  return filterGuestsForCallRound({
    guests: input.guests,
    round: input.round,
    previousFollowUpByRound: input.previousFollowUpByRound,
  }).filter((guest) => {
    const guestId = extractGuestId(guest?._id || guest?.id);
    return Boolean(guestId) && !existing.has(guestId);
  });
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
