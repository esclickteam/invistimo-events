/** Display helpers for message scheduling UI. Values stay YYYY-MM-DD / HH:mm. */

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Format a Date/ISO as DD/MM/YYYY (left-to-right, with leading zeros). */
export function formatScheduleDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Format a Date/ISO as HH:mm (24h, no AM/PM). */
export function formatScheduleTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Format as "DD/MM/YYYY בשעה HH:mm". */
export function formatScheduleDateTime(
  value: Date | string | null | undefined
): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatScheduleDate(d)} בשעה ${formatScheduleTime(d)}`;
}

/** YYYY-MM-DD → DD/MM/YYYY */
export function ymdToDisplay(ymd: string): string {
  if (!ymd) return "";
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** DD/MM/YYYY → YYYY-MM-DD (or null if invalid) */
export function displayToYmd(display: string): string | null {
  const cleaned = display.trim();
  const m = cleaned.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Normalize typed time to HH:mm (24h), or null if invalid. */
export function normalizeHHmm(raw: string): string | null {
  const cleaned = raw.trim();
  const m = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;

  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${pad2(hour)}:${pad2(minute)}`;
}
