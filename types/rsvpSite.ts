/**
 * סוג אתר אישורי הגעה להזמנה.
 * standard — הקישור הרגיל הקיים (/invite/[shareId])
 * personal — אתר חתונה אישי (טרם מופעל)
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
    title: "קישור רגיל",
    description:
      "דף אישור הגעה קצר — תמונת ההזמנה, אישור הגעה, ואפשרויות נוספות. זה מה שעובד היום.",
  },
  {
    value: "personal",
    title: "אתר חתונה אישי",
    description:
      "אתר מלא ומעוצב עם סיפור, תמונות, לוח זמנים, מתנות ואישור הגעה — חוויה מותאמת אישית.",
    badge: "בקרוב",
  },
];

export function normalizeRsvpSiteMode(value: unknown): RsvpSiteMode {
  return value === "personal" ? "personal" : RSVP_SITE_MODE_DEFAULT;
}
