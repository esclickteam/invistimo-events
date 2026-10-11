/**
 * Event-level phone identity and Israeli mobile length review.
 * Display value stays as entered. Comparison uses the normalized key.
 * 0501234567, 050-1234567 and +972501234567 share one key.
 * The 10-digit rule applies only to numbers that start with 05.
 */

export const PHONE_DUPLICATE_MESSAGE = "מספר הטלפון כבר קיים באירוע זה";

export const PHONE_LENGTH_REVIEW_MESSAGE =
  "מספר הטלפון אינו כולל 10 ספרות. יש לבדוק את תקינות המספר.";

export const PHONE_SKIP_EXISTING = "מספר טלפון כבר קיים באירוע";
export const PHONE_SKIP_IN_FILE = "מספר כפול בקובץ";

export type PhoneSkipReason =
  | typeof PHONE_SKIP_EXISTING
  | typeof PHONE_SKIP_IN_FILE;

export type PhoneImportDuplicate = {
  name: string;
  phone: string;
  reason: PhoneSkipReason;
};

export function displayPhone(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

export function phoneDigits(value: unknown): string {
  return displayPhone(value).replace(/\D/g, "");
}

/**
 * Canonical key for duplicate checks inside one event.
 * Israeli numbers collapse to the local 0-prefixed form.
 * Other numbers keep their digits after stripping separators and a 00 prefix.
 */
export function normalizePhoneKey(value: unknown): string {
  let digits = phoneDigits(value);
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits) return "";

  if (digits.startsWith("972")) {
    const national = digits.slice(3);
    if (!national) return "";
    return national.startsWith("0") ? national : `0${national}`;
  }

  return digits;
}

export function isIsraeliMobileLengthInvalid(value: unknown): boolean {
  const key = normalizePhoneKey(value);
  if (!key.startsWith("05")) return false;
  return key.length !== 10;
}

export function phoneNeedsReview(guest: {
  phone?: unknown;
  phoneNormalized?: unknown;
  phoneLengthApproved?: unknown;
} | null | undefined): boolean {
  if (!guest) return false;
  const key =
    normalizePhoneKey(guest.phoneNormalized) || normalizePhoneKey(guest.phone);
  if (!isIsraeliMobileLengthInvalid(key)) return false;
  return guest.phoneLengthApproved !== true;
}

export function phoneFieldsForStorage(
  value: unknown,
  options?: { keepApproval?: boolean }
) {
  const phone = displayPhone(value);
  const phoneNormalized = normalizePhoneKey(phone);
  return {
    phone,
    phoneNormalized: phoneNormalized || null,
    phoneLengthApproved: options?.keepApproval === true,
  };
}

export function classifyPhoneImportRows<T extends { name: string; phone?: unknown }>(
  rows: T[],
  existingKeys: Iterable<string>
) {
  const existing = new Set(
    [...existingKeys].map((key) => normalizePhoneKey(key)).filter(Boolean)
  );
  const seenInFile = new Set<string>();
  const accepted: T[] = [];
  const duplicates: PhoneImportDuplicate[] = [];

  for (const row of rows) {
    const phone = displayPhone(row.phone);
    const key = normalizePhoneKey(phone);

    if (!key) {
      accepted.push(row);
      continue;
    }

    if (existing.has(key)) {
      duplicates.push({
        name: row.name,
        phone,
        reason: PHONE_SKIP_EXISTING,
      });
      continue;
    }

    if (seenInFile.has(key)) {
      duplicates.push({
        name: row.name,
        phone,
        reason: PHONE_SKIP_IN_FILE,
      });
      continue;
    }

    seenInFile.add(key);
    accepted.push(row);
  }

  const reviewCount = accepted.filter((row) =>
    isIsraeliMobileLengthInvalid(row.phone)
  ).length;

  return {
    fileCount: rows.length,
    accepted,
    duplicates,
    reviewCount,
  };
}
