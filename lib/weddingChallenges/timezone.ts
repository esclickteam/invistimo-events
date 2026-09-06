export const DEFAULT_EVENT_TIMEZONE = "Asia/Jerusalem";

const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

function zoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") === 24 ? 0 : read("hour"),
    read("minute"),
    read("second")
  );

  return asUtc - date.getTime();
}

export function parseEventDateTime(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_EVENT_TIMEZONE
): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/Z$|[+-]\d{2}:\d{2}$/.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return wallTimeInZoneToUtc(raw, timeZone);
}

export function wallTimeInZoneToUtc(
  wall: string,
  timeZone = DEFAULT_EVENT_TIMEZONE
): Date | null {
  const match = String(wall || "").trim().match(WALL_RE);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const first = naive - zoneOffsetMs(new Date(naive), timeZone);
  const utc = new Date(naive - zoneOffsetMs(new Date(first), timeZone));
  if (Number.isNaN(utc.getTime())) return null;
  return utc;
}

export function utcToWallTimeInput(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_EVENT_TIMEZONE
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

export function formatInZone(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_EVENT_TIMEZONE
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = new Intl.DateTimeFormat("he-IL", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${formatted} (${timeZone === "Asia/Jerusalem" ? "שעון ישראל" : timeZone})`;
}

export function countdownMs(target: string | Date | null | undefined, now = new Date()) {
  if (!target) return null;
  const date = target instanceof Date ? target : new Date(target);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime() - now.getTime();
}

export function countdownLabel(target: string | Date | null | undefined, now = new Date()) {
  const ms = countdownMs(target, now);
  if (ms == null) return "";
  if (ms <= 0) return "הגיע הזמן";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} ימים, ${hours} שעות`;
  if (hours > 0) return `${hours} שעות, ${minutes} דקות`;
  return `${minutes} דקות`;
}
