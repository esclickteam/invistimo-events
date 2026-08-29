import {
  emptyCustomerFeatures,
  isWeddingWebsiteExperience,
  normalizeGuestExperienceType,
  type CustomerFeatures,
  type GuestExperienceType,
} from "@/types/rsvpSite";

type FeatureSource = {
  guestExperienceType?: unknown;
  rsvpSiteMode?: unknown;
  invitationSettings?: {
    guestExperienceType?: unknown;
    rsvpSiteMode?: unknown;
  };
  features?: Partial<CustomerFeatures> | null;
} | null | undefined;

export function getGuestExperienceType(source: FeatureSource): GuestExperienceType {
  return normalizeGuestExperienceType(
    source?.guestExperienceType ??
      source?.invitationSettings?.guestExperienceType ??
      source?.rsvpSiteMode ??
      source?.invitationSettings?.rsvpSiteMode
  );
}

function readStoredFlag(
  features: Partial<CustomerFeatures> | null | undefined,
  key: keyof CustomerFeatures
): boolean | undefined {
  const value = features?.[key];
  return typeof value === "boolean" ? value : undefined;
}

/**
 * Entitlement עצמאי. לא בודקים route ולא קיום template.
 * אם הדגל לא נשמר עדיין, Wedding Website customer מקבל גם guestMessages.
 */
export function getCustomerFeatures(source: FeatureSource): CustomerFeatures {
  const experience = getGuestExperienceType(source);
  const storedWeddingWebsite = readStoredFlag(source?.features, "weddingWebsite");
  const storedGuestMessages = readStoredFlag(source?.features, "guestMessages");

  const weddingWebsite =
    storedWeddingWebsite ?? isWeddingWebsiteExperience(experience);

  return {
    weddingWebsite,
    guestMessages: storedGuestMessages ?? weddingWebsite,
  };
}

export function hasWeddingWebsiteFeature(source: FeatureSource): boolean {
  return getCustomerFeatures(source).weddingWebsite;
}

export function hasGuestMessagesFeature(source: FeatureSource): boolean {
  return getCustomerFeatures(source).guestMessages;
}

export function resolveCustomerFeatures(source: FeatureSource): CustomerFeatures {
  return getCustomerFeatures(source) || emptyCustomerFeatures();
}
