export type RSVPStatus = "yes" | "no" | "maybe" | "pending";

export const RSVP_LABELS: Record<RSVPStatus, string> = {
  yes: "מגיע",
  no: "לא מגיע",
  maybe: "מתלבטים",
  pending: "בהמתנה",
};
