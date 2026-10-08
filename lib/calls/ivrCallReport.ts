/**
 * Admin IVR report classification. Display status comes from stored attempt
 * fields only. Unanswered calls are never labeled as answered-and-hung-up.
 */

import { wallTimeInZoneToUtc } from "@/lib/weddingChallenges/timezone";

export const IVR_REPORT_TIMEZONE = "Asia/Jerusalem";

export const IVR_REPORT_STATUSES = [
  "waiting",
  "dialing",
  "ringing",
  "in_call",
  "no_answer",
  "busy",
  "failed",
  "voicemail",
  "answered_no_digit",
  "answered_hangup",
  "partial",
  "yes",
  "no",
  "maybe",
  "blocked",
  "unresolved",
] as const;

export type IvrReportCallStatus = (typeof IVR_REPORT_STATUSES)[number];

export const IVR_REPORT_STATUS_LABELS: Record<IvrReportCallStatus, string> = {
  waiting: "ממתין לחיוג",
  dialing: "מחייג",
  ringing: "מצלצל",
  in_call: "בשיחה",
  no_answer: "לא ענה",
  busy: "תפוס",
  failed: "נכשל",
  voicemail: "תא קולי",
  answered_no_digit: "נענה – ללא הקשה",
  answered_hangup: "נענה וניתק",
  partial: "נענה – תשובה חלקית",
  yes: "אישר הגעה",
  no: "לא מגיע",
  maybe: "מתלבט",
  blocked: "בוטל / נחסם",
  unresolved: "לא הותאם לאורח",
};

const PROBLEM_STATUSES = new Set<IvrReportCallStatus>([
  "no_answer",
  "busy",
  "failed",
  "voicemail",
  "answered_no_digit",
  "answered_hangup",
  "partial",
  "blocked",
  "unresolved",
]);

export type IvrAttemptFacts = {
  status?: string | null;
  answered?: boolean | null;
  rsvpApplied?: boolean | null;
  rsvpResult?: string | null;
  choiceDigit?: string | null;
  guestCountDigits?: string | null;
  endedAt?: Date | string | null;
  audioMode?: string | null;
  eventNameAudioUrl?: string | null;
  introAudioUrl?: string | null;
  direction?: string | null;
  channel?: string | null;
  dialRequestedAt?: Date | string | null;
  ringingAt?: Date | string | null;
  playbackStartedAt?: Date | string | null;
  firstDigitAt?: Date | string | null;
  choiceDigitAt?: Date | string | null;
  followupPlaybackStartedAt?: Date | string | null;
  rsvpAppliedAt?: Date | string | null;
  answeredAt?: Date | string | null;
  durationSeconds?: number | null;
  error?: string | null;
  hangupCause?: string | null;
};

function clean(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function hasEnded(attempt: IvrAttemptFacts) {
  if (attempt.endedAt) return true;
  const status = clean(attempt.status);
  return [
    "no_answer",
    "busy",
    "failed",
    "voicemail",
    "hangup_before_response",
    "completed",
    "canceled",
    "unresolved",
  ].includes(status);
}

export function rsvpResultLabel(result: unknown, applied: unknown) {
  if (!applied) return "אין תשובה";
  const value = clean(result);
  if (value === "yes") return "אישר הגעה";
  if (value === "no") return "לא מגיע";
  if (value === "maybe") return "מתלבט";
  return "אין תשובה";
}

export function classifyIvrAttempt(attempt: IvrAttemptFacts): {
  callStatus: IvrReportCallStatus;
  label: string;
  rsvpLabel: string;
  problem: boolean;
} {
  const status = clean(attempt.status);
  const answered = attempt.answered === true;
  const applied = attempt.rsvpApplied === true;
  const result = clean(attempt.rsvpResult);
  const choice = clean(attempt.choiceDigit);
  const countDigits = clean(attempt.guestCountDigits);
  const ended = hasEnded(attempt);
  const rsvpLabel = rsvpResultLabel(result, applied);

  let callStatus: IvrReportCallStatus = "waiting";

  if (applied && (result === "yes" || result === "no" || result === "maybe")) {
    callStatus = result;
  } else if (status === "canceled") {
    callStatus = "blocked";
  } else if (status === "failed") {
    callStatus = "failed";
  } else if (status === "unresolved") {
    callStatus = "unresolved";
  } else if (status === "voicemail" || (!answered && status.includes("machine"))) {
    callStatus = "voicemail";
  } else if (!answered && status === "busy") {
    callStatus = "busy";
  } else if (!answered && (status === "no_answer" || status === "hangup_before_response")) {
    callStatus = "no_answer";
  } else if (!answered && !ended && status === "queued") {
    callStatus = "waiting";
  } else if (!answered && !ended && status === "initiated") {
    callStatus = "dialing";
  } else if (!answered && !ended && status === "ringing") {
    callStatus = "ringing";
  } else if (!answered && ended) {
    callStatus = status === "busy" ? "busy" : "no_answer";
  } else if (answered && !ended && !applied) {
    callStatus = "in_call";
  } else if (answered && !applied) {
    if (choice === "1" || countDigits) callStatus = "partial";
    else if (!choice) callStatus = "answered_no_digit";
    else callStatus = "answered_hangup";
  }

  return {
    callStatus,
    label: IVR_REPORT_STATUS_LABELS[callStatus],
    rsvpLabel,
    problem: PROBLEM_STATUSES.has(callStatus),
  };
}

export function ivrAudioModeLabel(attempt: IvrAttemptFacts) {
  const mode = clean(attempt.audioMode);
  if (mode === "ai") return "קריינות AI";
  if (mode === "self_recorded" || mode === "self-recorded") return "הקלטה אישית";
  if (clean(attempt.eventNameAudioUrl)) return "קריינות AI";
  if (clean(attempt.introAudioUrl)) return "הקלטה אישית";
  return "לא זמין";
}

export function ivrDirectionLabel(attempt: IvrAttemptFacts) {
  const direction = clean(attempt.direction);
  const channel = clean(attempt.channel);
  if (direction === "inbound" || channel === "inbound_ivr") return "נכנסת";
  return "יוצאת";
}

function toDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffMs(from: unknown, to: unknown) {
  const start = toDate(from);
  const end = toDate(to);
  if (!start || !end) return null;
  return end.getTime() - start.getTime();
}

export function ivrAttemptTimings(attempt: IvrAttemptFacts) {
  const callDurationMs =
    diffMs(attempt.answeredAt, attempt.endedAt) ??
    (attempt.answered &&
    typeof attempt.durationSeconds === "number" &&
    attempt.durationSeconds > 0
      ? attempt.durationSeconds * 1000
      : null);

  return {
    dialToRingMs: diffMs(attempt.dialRequestedAt, attempt.ringingAt),
    ringMs: attempt.answered
      ? diffMs(attempt.ringingAt, attempt.answeredAt)
      : diffMs(attempt.ringingAt, attempt.endedAt),
    answerToPlaybackMs: diffMs(attempt.answeredAt, attempt.playbackStartedAt),
    digitToFollowupMs: diffMs(
      attempt.firstDigitAt,
      attempt.followupPlaybackStartedAt
    ),
    digitToRsvpMs: diffMs(
      attempt.choiceDigitAt || attempt.firstDigitAt,
      attempt.rsvpAppliedAt
    ),
    callDurationMs,
  };
}

export function formatIvrDuration(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms)) return "לא זמין";
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(Math.round(ms));
  if (abs < 1000) return `${sign}${abs} ms`;
  const seconds = abs / 1000;
  if (seconds < 60) {
    const text = seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1);
    return `${sign}${text} שניות`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${sign}${minutes} דק׳ ${rest} שנ׳`;
}

export function formatIvrIsraelDateTime(value?: Date | string | null) {
  const date = toDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IVR_REPORT_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  const hour = read("hour") === "24" ? "00" : read("hour");
  return `${read("day")}/${read("month")}/${read("year")} ${hour}:${read("minute")}:${read("second")}`;
}

export function redactIvrReportText(value: unknown) {
  return String(value || "")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(sk_|key_)[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/TELNYX_API_KEY[=:]\S+/gi, "TELNYX_API_KEY=[redacted]")
    .slice(0, 500);
}

export function parseIvrReportDayRange(from?: string | null, to?: string | null) {
  function startOf(value: string) {
    const dmy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const wall = dmy
      ? `${dmy[3]}-${dmy[2]}-${dmy[1]}T00:00`
      : iso
        ? `${iso[1]}-${iso[2]}-${iso[3]}T00:00`
        : "";
    return wall ? wallTimeInZoneToUtc(wall, IVR_REPORT_TIMEZONE) : null;
  }

  const start = from ? startOf(from) : null;
  const endStart = to ? startOf(to) : null;
  const end = endStart ? new Date(endStart.getTime() + 24 * 60 * 60 * 1000) : null;
  return { start, end };
}

export function average(values: Array<number | null | undefined>) {
  const nums = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}
