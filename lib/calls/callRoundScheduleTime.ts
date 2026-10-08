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

/** Same-day work orders become executable from this Israel wall clock. */
export const SAME_DAY_WORK_ORDER_OPEN_HOUR = 9;
export const SAME_DAY_WORK_ORDER_OPEN_MINUTE = 0;

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
  if (typeof value === "string") {
    const wall = value.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall)) return wall;
  }
  return utcToWallTimeInput(value || null, CALL_ROUND_TIMEZONE);
}

/** Recorded-calls UI: DD/MM/YYYY HH:mm in Asia/Jerusalem, 24-hour clock. */
export function formatCallRoundDateTimeDmy(
  value?: string | Date | null
): string {
  if (!value) return "";

  if (typeof value === "string") {
    const wall = value.trim().match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
    );
    if (wall) {
      return `${wall[3]}/${wall[2]}/${wall[1]} ${wall[4]}:${wall[5]}`;
    }
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = getTimeZoneParts(date);
    return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
  } catch {
    return "";
  }
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
 * Round is due when scheduledAt <= now (Israel wall clock stored as absolute Date).
 * dateKey is optional filtering for "today's run" — overdue rounds from earlier
 * days still qualify so a missed cron minute never drops a round forever.
 */
export function isCallRoundDue(input: {
  scheduledAt: Date;
  dateKey?: string;
  now?: Date;
  force?: boolean;
}) {
  if (input.force) return true;

  const now = input.now || new Date();

  if (input.scheduledAt.getTime() > now.getTime()) {
    return false;
  }

  if (input.dateKey) {
    const scheduledKey = getCallRoundDateKeyInIsrael(input.scheduledAt);
    // Same day, or overdue from a previous Israel day.
    if (scheduledKey > input.dateKey) {
      return false;
    }
  }

  return true;
}

/** Normalize schedule value before PATCH — returns ISO or empty. */
export function normalizeCallRoundScheduledAtForSave(
  value?: string | null
): string {
  const date = parseCallRoundScheduledAt(value);
  return date ? date.toISOString() : "";
}

/* ============================================================
   Shift-window exposure (work orders vs scheduledAt)
   Exposure at shift start ≠ execution time (scheduledAt).
============================================================ */

export type ShiftTimeWindow = {
  /** Minutes from Israel midnight inclusive. */
  startMinutes: number;
  /** Minutes from Israel midnight inclusive. */
  endMinutes: number;
};

/** Parse "HH:mm" / "H:mm" into minutes from midnight. */
export function parseClockToMinutes(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

export function getIsraelMinutesSinceMidnight(
  date: Date,
  timeZone = CALL_ROUND_TIMEZONE
) {
  const parts = getTimeZoneParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

export function formatIsraelClock(date: Date, timeZone = CALL_ROUND_TIMEZONE) {
  const parts = getTimeZoneParts(date, timeZone);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/** Hebrew label for planned execution time, e.g. "מתוכנן ל־12:00". */
export function formatPlannedExecutionLabel(
  value?: string | Date | null
): string | null {
  if (!value) return null;

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `מתוכנן ל־${formatIsraelClock(date)}`;
  } catch {
    return null;
  }
}

/**
 * Whether a shift time window covers a clock time (minutes).
 * Supports overnight windows when end < start.
 */
export function shiftWindowCoversMinutes(
  window: ShiftTimeWindow,
  minutes: number
) {
  const { startMinutes, endMinutes } = window;

  if (endMinutes >= startMinutes) {
    return minutes >= startMinutes && minutes <= endMinutes;
  }

  return minutes >= startMinutes || minutes <= endMinutes;
}

/**
 * Shift has started for work-order exposure on dateKey:
 * - past days: treated as started
 * - future days: not started
 * - same day: now >= shift start
 */
export function hasEmployeeShiftStarted(input: {
  dateKey: string;
  startMinutes: number;
  now?: Date;
}) {
  const now = input.now || new Date();
  const todayKey = getCallRoundDateKeyInIsrael(now);

  if (todayKey > input.dateKey) return true;
  if (todayKey < input.dateKey) return false;

  return getIsraelMinutesSinceMidnight(now) >= input.startMinutes;
}

/**
 * Round falls during an employee's shift on the work date.
 * scheduledAt must be on the same Israel day as dateKey.
 */
export function shiftCoversScheduledRound(input: {
  dateKey: string;
  scheduledAt: Date;
  window: ShiftTimeWindow;
}) {
  const scheduledKey = getCallRoundDateKeyInIsrael(input.scheduledAt);
  if (scheduledKey !== input.dateKey) return false;

  return shiftWindowCoversMinutes(
    input.window,
    getIsraelMinutesSinceMidnight(input.scheduledAt)
  );
}

/**
 * Israel-day gate for opening every same-day call round to employees.
 * scheduledAt time is display-only after this clock (e.g. 22:00 still opens at 09:00).
 */
export function hasReachedSameDayWorkOrderOpenTime(input: {
  dateKey: string;
  now?: Date;
}) {
  const now = input.now || new Date();
  const nowKey = getCallRoundDateKeyInIsrael(now);

  if (nowKey > input.dateKey) return true;
  if (nowKey < input.dateKey) return false;

  const openMinutes =
    SAME_DAY_WORK_ORDER_OPEN_HOUR * 60 + SAME_DAY_WORK_ORDER_OPEN_MINUTE;
  return getIsraelMinutesSinceMidnight(now) >= openMinutes;
}

/**
 * Should this round be opened as a work order now?
 *
 * 1) Same Israel day, after 09:00 Israel — all of today's rounds, including
 *    later planned times (15:00 / 22:00). scheduledAt is not mutated.
 * 2) Classic due: scheduledAt <= now (overdue / previous Israel day).
 * 3) force: always.
 *
 * Tomorrow's rounds (scheduledKey > dateKey) never open today.
 */
export function shouldExposeCallRoundWorkOrder(input: {
  scheduledAt: Date;
  dateKey: string;
  now?: Date;
  force?: boolean;
  hasCoveringStartedShift?: boolean;
  hasStartedShiftToday?: boolean;
}) {
  if (input.force) return true;

  const scheduledKey = getCallRoundDateKeyInIsrael(input.scheduledAt);
  if (scheduledKey > input.dateKey) return false;

  if (
    scheduledKey === input.dateKey &&
    hasReachedSameDayWorkOrderOpenTime({
      dateKey: input.dateKey,
      now: input.now,
    })
  ) {
    return true;
  }

  return isCallRoundDue({
    scheduledAt: input.scheduledAt,
    dateKey: input.dateKey,
    now: input.now,
    force: false,
  });
}

export function isSameIsraelDay(
  value?: string | Date | null,
  dateKey?: string
) {
  if (!value || !dateKey) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return getCallRoundDateKeyInIsrael(date) === dateKey;
}

/**
 * Employee "today's rounds" list: any non-terminal work order on dateKey,
 * including later planned times, even before remaining tasks exist.
 */
export function isEmployeeTodayWorkOrderVisible(input: {
  status?: string | null;
  dateKey: string;
  configuredRoundAt?: string | Date | null;
  workDate?: string | Date | null;
  autoOpenAt?: string | Date | null;
  myTasksRemaining?: number;
}) {
  const status = String(input.status || "").trim().toLowerCase();
  if (
    status === "completed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "expired"
  ) {
    return false;
  }

  const raw =
    input.configuredRoundAt || input.workDate || input.autoOpenAt || null;
  if (raw) {
    const orderKey = getCallRoundDateKeyInIsrael(
      raw instanceof Date ? raw : new Date(raw)
    );
    if (orderKey < input.dateKey) return false;
    if (orderKey > input.dateKey) return false;
    return true;
  }

  return Number(input.myTasksRemaining || 0) > 0;
}
