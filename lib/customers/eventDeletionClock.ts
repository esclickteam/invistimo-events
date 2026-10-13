import { wallTimeInZoneToUtc } from "@/lib/weddingChallenges/timezone";

/**
 * Event-day clock for automatic deletion.
 * The only time base is the current event date, interpreted in Asia/Jerusalem.
 * Reminder send time, thank-you send time, quote date, and account creation
 * are intentionally not accepted by this module.
 */
export const EVENT_DELETION_TIME_ZONE = "Asia/Jerusalem";

/** Full days after the event day has ended. Eligibility is the next midnight. */
export const FULL_DAYS_AFTER_EVENT_END = 7;

export type CivilDate = {
  year: number;
  month: number;
  day: number;
};

export type EventClockResult =
  | {
      ok: true;
      civilDate: CivilDate;
      isoDate: string;
      eligibleAt: Date;
      relation: "future" | "today" | "past";
      sevenFullDaysElapsed: boolean;
    }
  | {
      ok: false;
      reason: "MISSING_EVENT_DATE" | "INVALID_EVENT_DATE";
    };

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function civilDateKey(date: CivilDate) {
  return `${date.year}${pad(date.month)}${pad(date.day)}`;
}

export function formatCivilDate(date: CivilDate) {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

export function isValidCivilDate(date: CivilDate) {
  if (!Number.isInteger(date.year) || date.year < 2000 || date.year > 2100) return false;
  if (!Number.isInteger(date.month) || date.month < 1 || date.month > 12) return false;
  if (!Number.isInteger(date.day) || date.day < 1 || date.day > 31) return false;
  const probe = new Date(Date.UTC(date.year, date.month - 1, date.day));
  return (
    probe.getUTCFullYear() === date.year &&
    probe.getUTCMonth() === date.month - 1 &&
    probe.getUTCDate() === date.day
  );
}

export function addCalendarDays(date: CivilDate, days: number): CivilDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function israelCivilDate(instant: Date): CivilDate | null {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_DELETION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  const match = formatted.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return isValidCivilDate(date) ? date : null;
}

/** Midnight at the start of a civil day in Israel. 00:00 is never a DST gap. */
export function israelMidnightUtc(date: CivilDate): Date | null {
  if (!isValidCivilDate(date)) return null;
  return wallTimeInZoneToUtc(
    `${formatCivilDate(date)}T00:00`,
    EVENT_DELETION_TIME_ZONE
  );
}

/**
 * Eligible at 00:00 Israel on the 8th civil day after the event date.
 * Event day ends at the next midnight; seven full days after that is day+8 00:00.
 * Example: 10.10 is eligible only from 18.10 00:00 Asia/Jerusalem.
 */
export function deletionEligibleAt(eventDate: CivilDate): Date | null {
  return israelMidnightUtc(addCalendarDays(eventDate, FULL_DAYS_AFTER_EVENT_END + 1));
}

function civilFromParts(year: number, month: number, day: number): CivilDate | null {
  const date = { year, month, day };
  return isValidCivilDate(date) ? date : null;
}

/**
 * Reads one stored event date. A bare YYYY-MM-DD is an Israel civil date,
 * not a UTC instant. Datetimes are converted to the Israel civil date.
 * Empty and unparseable values fail closed.
 */
export function parseEventCivilDate(value: unknown): CivilDate | null {
  if (value == null) return null;
  if (value instanceof Date) return israelCivilDate(value);
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;

  const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDay) {
    return civilFromParts(Number(isoDay[1]), Number(isoDay[2]), Number(isoDay[3]));
  }

  const hebrewDay = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (hebrewDay) {
    return civilFromParts(
      Number(hebrewDay[3]),
      Number(hebrewDay[2]),
      Number(hebrewDay[1])
    );
  }

  if (!/[T\s]\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return israelCivilDate(parsed);
}

export function compareCivilDates(left: CivilDate, right: CivilDate) {
  const delta = Number(civilDateKey(left)) - Number(civilDateKey(right));
  if (delta < 0) return -1;
  if (delta > 0) return 1;
  return 0;
}

export function evaluateEventClock(storedEventDate: unknown, now: Date): EventClockResult {
  if (storedEventDate == null || storedEventDate === "") {
    return { ok: false, reason: "MISSING_EVENT_DATE" };
  }
  const civilDate = parseEventCivilDate(storedEventDate);
  if (!civilDate) return { ok: false, reason: "INVALID_EVENT_DATE" };

  const today = israelCivilDate(now);
  if (!today) return { ok: false, reason: "INVALID_EVENT_DATE" };

  const order = compareCivilDates(civilDate, today);
  const relation = order > 0 ? "future" : order < 0 ? "past" : "today";
  const eligibleAt = deletionEligibleAt(civilDate);
  if (!eligibleAt) return { ok: false, reason: "INVALID_EVENT_DATE" };

  return {
    ok: true,
    civilDate,
    isoDate: formatCivilDate(civilDate),
    eligibleAt,
    relation,
    sevenFullDaysElapsed: relation === "past" && now.getTime() >= eligibleAt.getTime(),
  };
}
