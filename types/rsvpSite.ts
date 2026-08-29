/**
 * סוג אתר אישורי הגעה להזמנה.
 * standard — קישור אישי לכל אורח (/invite/[shareId]?token=...)
 * personal — אתר חתונה אישי (/w/[shareId]?token=...)
 *
 * ברירת המחדל היא תמיד standard. לקוחות קיימים לא משתנים
 * אלא אם בוחרים personal במפורש בהקמת משתמש או באדמין.
 */
export type RsvpSiteMode = "standard" | "personal";

export const RSVP_SITE_MODE_DEFAULT: RsvpSiteMode = "standard";

export const RSVP_SITE_MODE_OPTIONS: {
  value: RsvpSiteMode;
  title: string;
  description: string;
  badge?: string;
}[] = [
  {
    value: "standard",
    title: "קישור אישי לכל אורח",
    description:
      "כל אורח מקבל קישור אישי לדף אישור הגעה. זה מה שעובד היום אצל הלקוחות הקיימים.",
  },
  {
    value: "personal",
    title: "אתר חתונה אישי",
    description:
      "אתר מלא ומעוצב עם סיפור, תמונות, לוח זמנים, מתנות ואישור הגעה. נפתח רק ללקוח הזה.",
  },
];

export function normalizeRsvpSiteMode(value: unknown): RsvpSiteMode {
  return value === "personal" ? "personal" : RSVP_SITE_MODE_DEFAULT;
}

export function isPersonalRsvpSite(value: unknown): boolean {
  return normalizeRsvpSiteMode(value) === "personal";
}
