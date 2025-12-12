export type RSVPStatus = "yes" | "no" | "pending";

export const RSVP_LABELS: Record<RSVPStatus, string> = {
  yes: "מגיע",
  no: "לא מגיע",
  pending: "בהמתנה",
};
