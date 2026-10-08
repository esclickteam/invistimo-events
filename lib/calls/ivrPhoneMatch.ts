/**
 * Phone normalization helpers for matching Telnyx From to InvitationGuest.phone.
 */

import { normalizePhoneForTelnyx } from "@/lib/telnyx/ivrCallControl";

function digitsOnly(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

/**
 * Build common storage variants for an inbound E.164 (or local) phone.
 * Guests may be stored as 050…, 97250…, +97250…, or bare national digits.
 */
export function buildIvrPhoneMatchVariants(phone: unknown): string[] {
  const e164 = normalizePhoneForTelnyx(phone);
  if (!e164) return [];

  const digits = digitsOnly(e164);
  const variants = new Set<string>();

  variants.add(e164);
  variants.add(digits);

  if (digits.startsWith("972") && digits.length >= 11) {
    const national = `0${digits.slice(3)}`;
    variants.add(national);
    variants.add(digits.slice(3));
    variants.add(`+${digits}`);
  } else if (digits.startsWith("0") && digits.length >= 9) {
    const withoutZero = digits.slice(1);
    variants.add(withoutZero);
    variants.add(`972${withoutZero}`);
    variants.add(`+972${withoutZero}`);
  }

  return [...variants].filter(Boolean);
}

/** Last 9 national digits — loose compare when formats differ. */
export function ivrPhoneNationalKey(phone: unknown): string {
  const digits = digitsOnly(normalizePhoneForTelnyx(phone) || phone);
  if (!digits) return "";
  if (digits.startsWith("972") && digits.length >= 11) {
    return digits.slice(-9);
  }
  if (digits.startsWith("0") && digits.length >= 10) {
    return digits.slice(-9);
  }
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

export function phonesLikelyMatch(a: unknown, b: unknown): boolean {
  const ka = ivrPhoneNationalKey(a);
  const kb = ivrPhoneNationalKey(b);
  return Boolean(ka && kb && ka === kb);
}
