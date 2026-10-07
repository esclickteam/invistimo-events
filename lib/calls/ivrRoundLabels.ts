import { isIvrCallsUser } from "@/lib/calls/callsType";

/** Audience blurbs for the three outbound call rounds (human call-center copy). */
export function humanCallRoundAudience(round: number): string {
  if (round === 1) return "ממתינים שעדיין לא נתנו תשובה";
  if (round === 2) return "לא ענו בסבב 1";
  return "לא ענו בסבבים 1–2 + מתלבטים";
}

/** Audience blurbs for IVR recorded-call rounds. */
export function ivrCallRoundAudience(round: number): string {
  if (round === 1) return "אורחים שעדיין לא השיבו להזמנה";
  if (round === 2) return "לא ענו בסבב המוקלט הראשון";
  return "לא ענו בסבבים 1–2 + מתלבטים";
}

export function callRoundScheduleLabel(user: unknown, round: number): string {
  if (isIvrCallsUser(user)) {
    return `סבב מוקלט ${round} · ${ivrCallRoundAudience(round)}`;
  }
  return `סבב שיחות ${round} · ${humanCallRoundAudience(round)}`;
}

export function callRoundScheduleGroup(user: unknown): string {
  return isIvrCallsUser(user) ? "סבבי שיחות מוקלטות" : "סבבי שיחות";
}

export function callRoundChannelLabel(user: unknown): string {
  return isIvrCallsUser(user) ? "שיחות מוקלטות" : "שיחות";
}
