/**
 * Call-round eligibility: RSVP status is separate from call result.
 *
 * RSVP: yes | no | maybe | pending
 * Call result examples: answered / no_answer / callback / wrong_number
 *
 * Round 1: RSVP pending only
 * Round 2: round1 = no_answer AND still pending
 * Round 3: (round1+round2 = no_answer AND still pending) OR RSVP maybe
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
  if (round === 2) return "לא ענו בסבב 1";
  return "לא ענו בסבבים 1–2 + מתלבטים";
}

export function getCallRoundDescription(round: CallRoundNumber) {
  if (round === 1) {
    return "סבב 1 - ממתינים שעדיין לא נתנו תשובה";
  }
  if (round === 2) {
    return "סבב 2 - לא ענו בסבב 1";
  }
  return "סבב 3 - לא ענו בסבבים 1–2 + מתלבטים";
}

export function getSourceAudienceByRound(round: CallRoundNumber) {
  if (round === 1) return "pending_rsvp" as const;
  if (round === 2) return "round_1_no_answer" as const;
  return "round_2_no_answer" as const;
}

/**
 * @param previousNoAnswerByRound Map of round -> Set(guestId) that had NO_ANSWER
 */
export function isGuestEligibleForCallRound(input: {
  guest: any;
  round: CallRoundNumber;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
}): boolean {
  const { guest, round, previousNoAnswerByRound } = input;

  if (!hasGuestPhone(guest)) return false;

  const guestId = extractGuestId(guest?._id || guest?.id);
  const rsvp = getGuestRsvpValue(guest);

  if (round === 1) {
    return rsvp === "pending";
  }

  if (round === 2) {
    if (rsvp !== "pending") return false;

    const fromTasks = previousNoAnswerByRound?.[1]?.has(guestId) === true;
    const fromGuest = getGuestStoredCallAnswer(guest, 1) === "no_answer";

    return fromTasks || fromGuest;
  }

  // Round 3
  if (rsvp === "maybe") return true;

  if (rsvp !== "pending") return false;

  const r1FromTasks = previousNoAnswerByRound?.[1]?.has(guestId) === true;
  const r2FromTasks = previousNoAnswerByRound?.[2]?.has(guestId) === true;
  const r1FromGuest = getGuestStoredCallAnswer(guest, 1) === "no_answer";
  const r2FromGuest = getGuestStoredCallAnswer(guest, 2) === "no_answer";

  const hadRound1NoAnswer = r1FromTasks || r1FromGuest;
  const hadRound2NoAnswer = r2FromTasks || r2FromGuest;

  return hadRound1NoAnswer && hadRound2NoAnswer;
}

export function filterGuestsForCallRound(input: {
  guests: any[];
  round: CallRoundNumber;
  previousNoAnswerByRound?: Partial<Record<1 | 2, Set<string>>>;
}) {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const guest of input.guests) {
    if (
      !isGuestEligibleForCallRound({
        guest,
        round: input.round,
        previousNoAnswerByRound: input.previousNoAnswerByRound,
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
