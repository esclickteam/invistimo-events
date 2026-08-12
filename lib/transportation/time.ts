/** Normalize user-entered clock times to HH:MM (24h). */

export function normalizeTimeInput(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";

  // Already HH:MM or HH:MM:SS
  const colon = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return "";
  }

  // Compact 4 digits: 0800 / 0030
  const digits = value.replace(/\D/g, "");
  if (digits.length === 3 || digits.length === 4) {
    const padded = digits.padStart(4, "0");
    const h = Number(padded.slice(0, 2));
    const m = Number(padded.slice(2, 4));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  return "";
}

export function isValidTimeInput(raw: string): boolean {
  const value = String(raw || "").trim();
  if (!value) return true;
  return Boolean(normalizeTimeInput(value));
}
