import { normalizeRsvpSiteMode } from "@/types/rsvpSite";

export type WeddingWebsiteEntitlementInput = {
  /** Owner / user sales upsells */
  salesUpsells?: {
    weddingWebsite?: { enabled?: boolean | null } | null;
  } | null;
  /** Invitation-level settings */
  invitationSettings?: {
    rsvpSiteMode?: unknown;
    weddingWebsiteEntitled?: unknown;
  } | null;
  /** Explicit staging/test fixture flag */
  isStagingFixture?: boolean | null;
};

/**
 * Wedding Website is an add-on package — never a replacement for Regular Invitation.
 * Entitled when:
 * - salesUpsells.weddingWebsite.enabled
 * - invitationSettings.weddingWebsiteEntitled === true
 * - OR legacy rsvpSiteMode === "personal" (existing product toggle)
 */
export function isWeddingWebsiteEntitled(
  input: WeddingWebsiteEntitlementInput | null | undefined
): boolean {
  if (!input) return false;
  if (input.salesUpsells?.weddingWebsite?.enabled === true) return true;
  if (input.invitationSettings?.weddingWebsiteEntitled === true) return true;
  if (normalizeRsvpSiteMode(input.invitationSettings?.rsvpSiteMode) === "personal") {
    return true;
  }
  return false;
}
