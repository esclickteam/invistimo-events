/**
 * Normalize login identifier (email or phone) from mobile copy/paste / autofill.
 * WhatsApp and iOS often inject RTL/LTR marks or zero-width chars that break lookup.
 */
const INVISIBLE_OR_BIDI_CHARS =
  /[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;

export function stripInvisibleChars(value: string) {
  return String(value || "").replace(INVISIBLE_OR_BIDI_CHARS, "");
}

export function normalizeLoginIdentifier(raw: unknown) {
  return stripInvisibleChars(String(raw || ""))
    .trim()
    .toLowerCase();
}

export function normalizeLoginPassword(raw: unknown) {
  // Trim edges only — do not remove internal spaces from intentional passwords.
  return stripInvisibleChars(String(raw || "")).trim();
}
