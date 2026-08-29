/**
 * חוויית אורח / סוג הזמנה.
 *
 * personal_invitation — קישור אישי לכל אורח (/invite/[shareId]?token=...)
 * wedding_website — אתר חתונה אישי (/w/[shareId]?token=...)
 *
 * rsvpSiteMode נשמר ככינוי תאימות לאחור:
 * standard ↔ personal_invitation
 * personal ↔ wedding_website
 *
 * ברירת המחדל לכל לקוח קיים ולכל לקוח חדש היא personal_invitation.
 * אין migration שמשנה לקוחות קיימים.
 */

export type GuestExperienceType = "personal_invitation" | "wedding_website";
export type RsvpSiteMode = "standard" | "personal";

export const GUEST_EXPERIENCE_DEFAULT: GuestExperienceType = "personal_invitation";
export const RSVP_SITE_MODE_DEFAULT: RsvpSiteMode = "standard";

export const RSVP_SITE_MODE_OPTIONS: {
  value: RsvpSiteMode;
  experience: GuestExperienceType;
  title: string;
  description: string;
  badge?: string;
}[] = [
  {
    value: "standard",
    experience: "personal_invitation",
    title: "קישור אישי לכל אורח",
    description:
      "כל אורח מקבל קישור אישי לדף אישור הגעה. זה מה שעובד היום אצל הלקוחות הקיימים.",
  },
  {
    value: "personal",
    experience: "wedding_website",
    title: "אתר חתונה אישי",
    description:
      "אתר מלא ומעוצב עם סיפור, תמונות, לוח זמנים, הסעות ואישור הגעה. נפתח רק ללקוח הזה.",
  },
];

export function rsvpSiteModeFromExperience(
  value: unknown
): RsvpSiteMode {
  return value === "wedding_website" || value === "personal"
    ? "personal"
    : RSVP_SITE_MODE_DEFAULT;
}

export function guestExperienceFromRsvpSiteMode(
  value: unknown
): GuestExperienceType {
  return value === "personal" || value === "wedding_website"
    ? "wedding_website"
    : GUEST_EXPERIENCE_DEFAULT;
}

export function normalizeGuestExperienceType(
  value: unknown
): GuestExperienceType {
  if (value === "wedding_website" || value === "personal") {
    return "wedding_website";
  }
  return GUEST_EXPERIENCE_DEFAULT;
}

export function normalizeRsvpSiteMode(value: unknown): RsvpSiteMode {
  return rsvpSiteModeFromExperience(value);
}

export function isPersonalRsvpSite(value: unknown): boolean {
  return normalizeRsvpSiteMode(value) === "personal";
}

export function isWeddingWebsiteExperience(value: unknown): boolean {
  return normalizeGuestExperienceType(value) === "wedding_website";
}

export type CustomerFeatures = {
  weddingWebsite: boolean;
  guestMessages: boolean;
};

export function emptyCustomerFeatures(): CustomerFeatures {
  return {
    weddingWebsite: false,
    guestMessages: false,
  };
}

export function featuresForExperience(
  experience: GuestExperienceType
): CustomerFeatures {
  const enabled = experience === "wedding_website";
  return {
    weddingWebsite: enabled,
    guestMessages: enabled,
  };
}
