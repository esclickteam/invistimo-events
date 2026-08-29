/**
 * Legacy invitation preference (kept for compatibility).
 * Prefer salesUpsells.weddingWebsite.enabled for purchase entitlement.
 *
 * Package model:
 * - Regular: WhatsApp → guest-specific /invite/[shareId]?token=...
 * - Wedding Website (entitled + published): WhatsApp → /w/[shareId]
 *   (via /invite/site/[shareId] bridge for Meta button base URL)
 *
 * Regular invitation image/upload remains required in BOTH packages.
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
