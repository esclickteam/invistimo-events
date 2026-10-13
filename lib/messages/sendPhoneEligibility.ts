import {
  displayPhone,
  normalizePhoneKey,
  phoneNeedsReview,
} from "@/lib/guestPhone";
import { normalizeSmsPhone } from "@/lib/sendSMS";

export type SendPhoneClass = "missing" | "invalid" | "sendable";

export type SendPhoneGuest = {
  phone?: unknown;
  phoneNormalized?: unknown;
  phoneLengthApproved?: unknown;
  requiresPhoneReview?: unknown;
};

/**
 * A guest with no phone is not a failed send.
 * A guest whose number still needs review, or which no provider can accept,
 * stays out of the queue until the number is fixed or explicitly approved.
 * A manually approved number is sendable only when the destination is long
 * enough for the existing WhatsApp sender. Kosher numbers are not rejected here.
 */
export function classifyGuestPhoneForSend(
  guest: SendPhoneGuest | null | undefined
): SendPhoneClass {
  const raw = displayPhone(guest?.phone);
  const key = normalizePhoneKey(guest?.phoneNormalized) || normalizePhoneKey(raw);
  if (!raw || !key) return "missing";
  if (phoneNeedsReview(guest)) return "invalid";
  const destination = normalizeSmsPhone(raw);
  if (destination.length < 10 || destination.length > 15) return "invalid";
  return "sendable";
}

export function splitGuestsBySendPhone<T extends SendPhoneGuest>(guests: T[]) {
  const sendable: T[] = [];
  const missing: T[] = [];
  const invalid: T[] = [];
  for (const guest of guests) {
    const decision = classifyGuestPhoneForSend(guest);
    if (decision === "sendable") sendable.push(guest);
    else if (decision === "missing") missing.push(guest);
    else invalid.push(guest);
  }
  return { sendable, missing, invalid };
}
