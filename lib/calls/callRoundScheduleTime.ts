/**
 * Call-round schedule wall-clock helpers (Asia/Jerusalem).
 *
 * Schedule is stored as an absolute Date (scheduledAt).
 * Audience is resolved only at execution time — never at schedule save.
 */

import {
  DEFAULT_EVENT_TIMEZONE,
  parseEventDateTime,
  utcToWallTimeInput,
  wallTimeInZoneToUtc,
} from "@/lib/weddingChallenges/timezone";

export const CALL_ROUND_TIMEZONE = DEFAULT_EVENT_TIMEZONE;

/** Legacy date-only schedules open at noon Israel time. */
export const LEGACY_DATE_ONLY_HOUR = 12;
export const LEGACY_DATE_ONLY_MINUTE = 0;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getTimeZoneParts(date: Date, timeZone = CALL_ROUND_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function getCallRoundDateKeyInIsrael(date = new Date()) {
  const parts = getTimeZoneParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/**
 * Parse admin/API schedule input into a UTC Date for the Israel wall clock.
 * Accepts:
 * - datetime-local: YYYY-MM-DDTHH:mm
 * - date-only: YYYY-MM-DD (defaults to 12:00 Israel)
 * - ISO strings / Date objects (absolute instants)
 */
export function parseCallRoundScheduledAt(
  value?: string | Date | null
): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Absolute ISO with timezone must not be re-interpreted as Israel wall time.
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return wallTimeInZoneToUtc(
      `${raw}T${pad2(LEGACY_DATE_ONLY_HOUR)}:${pad2(LEGACY_DATE_ONLY_MINUTE)}`,
      CALL_ROUND_TIMEZONE
    );
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    return parseEventDateTime(raw.slice(0, 16), CALL_ROUND_TIMEZONE);
  }

  return parseEventDateTime(raw, CALL_ROUND_TIMEZONE);
}

/** Value for `<input type="datetime-local" />` in Asia/Jerusalem. */
export function formatCallRoundDateTimeInput(
  value?: string | Date | null
): string {
  return utcToWallTimeInput(value || null, CALL_ROUND_TIMEZONE);
}

/** Admin display: date + time in Israel. */
export function formatCallRoundDateTimeDisplay(
  value?: string | Date | null
): string | null {
  if (!value) return null;

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const weekday = date.toLocaleDateString("he-IL", {
      timeZone: CALL_ROUND_TIMEZONE,
      weekday: "long",
    });

    const dateText = date.toLocaleDateString("he-IL", {
      timeZone: CALL_ROUND_TIMEZONE,
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });

    const timeText = date.toLocaleTimeString("he-IL", {
      timeZone: CALL_ROUND_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    return `${weekday} · ${dateText}, ${timeText}`;
  } catch {
    return null;
  }
}

/** Client display: date only (no time). */
export function formatCallRoundDateOnlyDisplay(
  value?: string | Date | null
): string | null {
  if (!value) return null;

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const weekday = date.toLocaleDateString("he-IL", {
      timeZone: CALL_ROUND_TIMEZONE,
      weekday: "long",
    });

    const dateText = date.toLocaleDateString("he-IL", {
      timeZone: CALL_ROUND_TIMEZONE,
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });

    return `${weekday} · ${dateText}`;
  } catch {
    return null;
  }
}

/**
 * Round is due when its Israel calendar day matches dateKey
 * and scheduledAt <= now (unless force).
 */
export function isCallRoundDue(input: {
  scheduledAt: Date;
  dateKey: string;
  now?: Date;
  force?: boolean;
}) {
  if (input.force) return true;

  if (getCallRoundDateKeyInIsrael(input.scheduledAt) !== input.dateKey) {
    return false;
  }

  const now = input.now || new Date();
  return input.scheduledAt.getTime() <= now.getTime();
}

/** Normalize schedule value before PATCH — returns ISO or empty. */
export function normalizeCallRoundScheduledAtForSave(
  value?: string | null
): string {
  const date = parseCallRoundScheduledAt(value);
  return date ? date.toISOString() : "";
}
