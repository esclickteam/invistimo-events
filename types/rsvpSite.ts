/**
 * Product preference at invitation level.
 * standard — Regular personal invitation link (/invite/[shareId]) — PROTECTED CORE
 * personal — Also manage a separate Wedding Website (/w/[shareId])
 *
 * IMPORTANT: This never rewrites SMS/WhatsApp invite links automatically.
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
    title: "הזמנה אישית",
    description:
      "הקישור הרגיל לאורחים — תמונת ההזמנה ואישור הגעה. לא משתנה כשמפעילים אתר חתונה.",
  },
  {
    value: "personal",
    title: "אתר חתונה אישי",
    description:
      "מוצר נפרד: אתר מלא עם תבנית, סיפור, לו״ז, הסעות ו-RSVP בכתובת /w/... ליד ההזמנה הרגילה.",
    badge: "חדש",
  },
];

export function normalizeRsvpSiteMode(value: unknown): RsvpSiteMode {
  return value === "personal" ? "personal" : RSVP_SITE_MODE_DEFAULT;
}
