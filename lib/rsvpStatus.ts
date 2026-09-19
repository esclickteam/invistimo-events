/**
 * Canonical guest RSVP values.
 * - yes: confirmed attending
 * - no: not attending
 * - maybe: explicit "still unsure" answer (מתלבטים)
 * - pending: no answer yet (לא ענו)
 *
 * maybe must NEVER count toward confirmed arriving guests.
 */

export type GuestRsvpStatus = "yes" | "no" | "maybe" | "pending";

export const GUEST_RSVP_VALUES: GuestRsvpStatus[] = [
  "yes",
  "no",
  "maybe",
  "pending",
];

export function normalizeGuestRsvp(value: unknown): GuestRsvpStatus {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (
    raw === "yes" ||
    raw === "confirmed" ||
    raw === "arriving" ||
    raw === "arrive" ||
    raw === "attending" ||
    raw === "approved" ||
    raw === "coming" ||
    raw === "accepted" ||
    raw === "מגיע" ||
    raw === "מגיעים" ||
    raw === "אישר" ||
    raw === "מאשר"
  ) {
    return "yes";
  }

  if (
    raw === "no" ||
    raw === "declined" ||
    raw === "rejected" ||
    raw === "not_coming" ||
    raw === "not-coming" ||
    raw === "not coming" ||
    raw === "cancelled" ||
    raw === "לא מגיע" ||
    raw === "לא מגיעים" ||
    raw === "לא מאשר"
  ) {
    return "no";
  }

  if (
    raw === "maybe" ||
    raw === "undecided" ||
    raw === "unsure" ||
    raw === "thinking" ||
    raw === "hesitating" ||
    raw === "מתלבט" ||
    raw === "מתלבטת" ||
    raw === "מתלבטים" ||
    raw === "עדיין לא בטוחים" ||
    raw === "לא בטוח" ||
    raw === "לא בטוחים"
  ) {
    return "maybe";
  }

  if (raw.includes("לא מגיע")) return "no";
  if (raw.includes("מגיע") && !raw.includes("לא")) return "yes";
  if (raw.includes("מתלבט")) return "maybe";

  return "pending";
}

/** Admin / dashboard label */
export function guestRsvpAdminLabel(status: GuestRsvpStatus): string {
  switch (status) {
    case "yes":
      return "מגיע";
    case "no":
      return "לא מגיע";
    case "maybe":
      return "מתלבטים";
    default:
      return "לא ענו";
  }
}

/** Guest-facing friendly label */
export function guestRsvpGuestLabel(status: GuestRsvpStatus): string {
  switch (status) {
    case "yes":
      return "מגיעים";
    case "no":
      return "לא מגיעים";
    case "maybe":
      return "עדיין לא בטוחים";
    default:
      return "טרם השבנו";
  }
}

export function isConfirmedAttending(status: unknown): boolean {
  return normalizeGuestRsvp(status) === "yes";
}

export function rsvpCountsAsAnswered(status: unknown): boolean {
  const s = normalizeGuestRsvp(status);
  return s === "yes" || s === "no" || s === "maybe";
}
