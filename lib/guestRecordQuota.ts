/**
 * Package record quota counts only guests that were created with a phone number.
 * Guests without a phone do not consume records and cannot receive a phone later.
 */

export const GUEST_PHONE_LOCKED_ERROR =
  "לא ניתן להוסיף מספר טלפון לאורח שנוצר ללא טלפון.";

export function guestPhoneDigits(phone: unknown): string {
  return String(phone || "").replace(/\D/g, "").trim();
}

export function guestCountsTowardRecordQuota(phone: unknown): boolean {
  return guestPhoneDigits(phone).length > 0;
}

export const BILLABLE_GUEST_PHONE_FILTER = {
  phone: { $regex: "\\d" },
};

export function countGuestsTowardRecordQuota(
  guests: Array<{ phone?: unknown } | null | undefined>
): number {
  return guests.filter((guest) =>
    guestCountsTowardRecordQuota(guest?.phone)
  ).length;
}

export function canAssignPhoneToGuest(
  existingPhone: unknown,
  nextPhone: unknown
): boolean {
  const existing = guestPhoneDigits(existingPhone);
  const next = guestPhoneDigits(nextPhone);

  if (!existing && next) return false;
  return true;
}

export function billableGuestMatch(invitationId: unknown) {
  return {
    invitationId,
    ...BILLABLE_GUEST_PHONE_FILTER,
  };
}
