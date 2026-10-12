import { normalizePhoneKey, phoneNeedsReview } from "@/lib/guestPhone";
import { buildIvrIntroText, resolveIvrEventName } from "@/lib/calls/ivrScript";

export type KosherPrefixRule = {
  prefix: string;
  active?: boolean;
};

export const KOSHER_MESSAGE_ROUND_ORIGIN = "kosher_message_round";

/** Digits used only for prefix matching. The stored phone is not rewritten. */
export function kosherMatchKey(phone: unknown): string {
  return normalizePhoneKey(phone);
}

export function normalizeKosherPrefix(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

/**
 * Longest active prefix wins, so 055400 matches before a shorter 05540.
 * Inactive prefixes do not match.
 */
export function matchKosherPrefix(
  phone: unknown,
  prefixes: KosherPrefixRule[]
): string | null {
  const key = kosherMatchKey(phone);
  if (!key) return null;

  const active = prefixes
    .map((row) => ({
      prefix: normalizeKosherPrefix(row.prefix),
      active: row.active !== false,
    }))
    .filter((row) => row.active && row.prefix)
    .sort((a, b) => b.prefix.length - a.prefix.length);

  for (const row of active) {
    if (key.startsWith(row.prefix)) return row.prefix;
  }
  return null;
}

export function isKosherPhone(
  phone: unknown,
  prefixes: KosherPrefixRule[]
): boolean {
  return matchKosherPrefix(phone, prefixes) !== null;
}

/**
 * Kosher prefixes are valid Israeli mobiles. Matching one is not a phone error.
 */
export function kosherPhoneIsNotALengthError(phone: unknown): boolean {
  return phoneNeedsReview({ phone }) === false;
}

/**
 * Service off, or a non-RSVP schedule, keeps the original list.
 * Callers must load active prefixes only when this returns enabled RSVP routing.
 */
export function partitionMessageGuestsForKosherService<T extends { phone?: unknown }>(input: {
  enabled: boolean;
  scheduleType: unknown;
  guests: T[];
  prefixes: KosherPrefixRule[];
}): { messageGuests: T[]; kosherGuests: T[]; enabled: boolean } {
  if (input.enabled !== true) {
    return { messageGuests: input.guests, kosherGuests: [], enabled: false };
  }
  if (String(input.scheduleType || "").trim() !== "rsvp") {
    return { messageGuests: input.guests, kosherGuests: [], enabled: true };
  }
  const split = partitionGuestsByKosher(input.guests, input.prefixes);
  return {
    messageGuests: split.regular,
    kosherGuests: split.kosher,
    enabled: true,
  };
}

export function partitionGuestsByKosher<T extends { phone?: unknown }>(
  guests: T[],
  prefixes: KosherPrefixRule[]
): { regular: T[]; kosher: T[] } {
  const regular: T[] = [];
  const kosher: T[] = [];
  for (const guest of guests) {
    if (isKosherPhone(guest.phone, prefixes)) kosher.push(guest);
    else regular.push(guest);
  }
  return { regular, kosher };
}

export type KosherRoundNumber = 1 | 2 | 3;

/** Same RSVP audience the message worker queries at send time. */
export function isGuestEligibleForKosherMessageRound(input: {
  guest: { phone?: unknown; rsvp?: unknown };
  round: KosherRoundNumber;
}): boolean {
  const round = input.round;
  const rsvp = String(input.guest.rsvp || "pending");
  if (round === 1) return true;
  return rsvp === "pending";
}

export function splitEligibleAudience<
  T extends { phone?: unknown; rsvp?: unknown },
>(input: { guests: T[]; round: KosherRoundNumber; prefixes: KosherPrefixRule[] }) {
  const eligible = input.guests.filter((guest) =>
    isGuestEligibleForKosherMessageRound({ guest, round: input.round })
  );
  const split = partitionGuestsByKosher(eligible, input.prefixes);
  return {
    eligibleCount: eligible.length,
    regularCount: split.regular.length,
    kosherCount: split.kosher.length,
    regular: split.regular,
    kosher: split.kosher,
  };
}

/**
 * Spoken name for kosher IVR only.
 * A custom value never replaces the invitation title or the regular IVR event name.
 */
export function resolveKosherSpokenEventName(input: {
  customName?: unknown;
  invitationTitle?: unknown;
  ivrConfig?: {
    eventName?: unknown;
    eventTypeLabel?: unknown;
    hostsNames?: unknown;
    eventNamePronunciation?: unknown;
  } | null;
}): { displayName: string; speechText: string; source: "custom" | "ivr" | "invitation" } {
  const custom = String(input.customName || "").trim();
  if (custom) {
    return { displayName: custom, speechText: custom, source: "custom" };
  }

  const fromIvr = resolveIvrEventName(input.ivrConfig || undefined);
  const pronunciation = String(
    input.ivrConfig?.eventNamePronunciation || ""
  ).trim();
  if (fromIvr) {
    return {
      displayName: fromIvr,
      speechText: pronunciation || fromIvr,
      source: "ivr",
    };
  }

  const title = String(input.invitationTitle || "").trim() || "האירוע";
  return { displayName: title, speechText: title, source: "invitation" };
}

export function buildKosherCallScript(speechText: string): string {
  return buildIvrIntroText({
    eventName: speechText,
    eventNamePronunciation: speechText,
  });
}

export function kosherRunId(scheduleId: unknown): string {
  return `kosher:${String(scheduleId || "").trim()}`;
}

const KOSHER_COVERING_STATUSES = new Set([
  "queued",
  "initiated",
  "ringing",
  "answered",
  "completed",
  "no_answer",
  "busy",
  "voicemail",
  "hangup_before_response",
  "invalid_input",
  "unresolved",
]);

/** Regular IVR should not dial a guest already covered by this round's kosher call. */
export function kosherAttemptCoversGuest(attempt: {
  origin?: unknown;
  status?: unknown;
} | null | undefined): boolean {
  if (!attempt) return false;
  if (String(attempt.origin || "") !== KOSHER_MESSAGE_ROUND_ORIGIN) return false;
  return KOSHER_COVERING_STATUSES.has(String(attempt.status || ""));
}

export function summarizeKosherAttempts(
  attempts: Array<{
    status?: unknown;
    answered?: unknown;
    rsvpResult?: unknown;
    rsvpApplied?: unknown;
    error?: unknown;
  }>
) {
  const summary = {
    total: attempts.length,
    queued: 0,
    dialed: 0,
    answered: 0,
    noAnswer: 0,
    failed: 0,
    rsvpYes: 0,
    rsvpNo: 0,
    rsvpMaybe: 0,
  };

  for (const attempt of attempts) {
    const status = String(attempt.status || "");
    const answered = attempt.answered === true || status === "answered" || status === "completed";
    const failed =
      status === "failed" ||
      status === "canceled" ||
      status === "invalid_input" ||
      status === "unresolved";
    const noAnswer =
      !failed &&
      (status === "no_answer" ||
        status === "busy" ||
        status === "voicemail" ||
        status === "hangup_before_response");
    const placed =
      status === "initiated" ||
      status === "ringing" ||
      answered ||
      noAnswer;

    if (status === "queued") summary.queued += 1;
    if (placed) summary.dialed += 1;
    if (answered) summary.answered += 1;
    if (noAnswer) summary.noAnswer += 1;
    if (failed) summary.failed += 1;

    if (attempt.rsvpApplied === true || attempt.rsvpResult) {
      if (attempt.rsvpResult === "yes") summary.rsvpYes += 1;
      else if (attempt.rsvpResult === "no") summary.rsvpNo += 1;
      else if (attempt.rsvpResult === "maybe") summary.rsvpMaybe += 1;
    }
  }

  return summary;
}

/** A narration or dial failure is not a successful contact. */
export function kosherFailureIsUnresolved(status: unknown, error?: unknown): boolean {
  const value = String(status || "");
  if (value === "failed" || value === "canceled") return true;
  const text = String(error || "");
  return /NARRATION_UNAVAILABLE|INVALID_PHONE|DIAL_FAILED|DIAL_BLOCKED/.test(text);
}
