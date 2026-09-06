import {
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "./constants";

export type WeddingChallengesEntitlementUser = {
  role?: string | null;
  hasPaid?: boolean | null;
  weddingChallengesOnly?: boolean | null;
  includeWeddingChallenges?: boolean | null;
  includeDigitalSeating?: boolean | null;
  includeEventManagement?: boolean | null;
  selfManageEnabled?: boolean | null;
  accessModules?: {
    weddingChallenges?: boolean | null;
    rsvpSeating?: boolean | null;
    eventProduction?: boolean | null;
  } | null;
  salesUpsells?: {
    weddingChallenges?: {
      enabled?: boolean | null;
      price?: number | null;
    } | null;
    weddingChallengesGiveaway?: {
      enabled?: boolean | null;
      price?: number | null;
    } | null;
  } | null;
  planLimits?: {
    weddingChallengesEnabled?: boolean | null;
    seatingEnabled?: boolean | null;
  } | null;
  features?: {
    weddingWebsite?: boolean | null;
  } | null;
};

export function userHasWeddingChallengesEntitlement(
  user: WeddingChallengesEntitlementUser | null | undefined
): boolean {
  if (!user) return false;

  return (
    user.accessModules?.weddingChallenges === true ||
    user.includeWeddingChallenges === true ||
    user.salesUpsells?.weddingChallenges?.enabled === true ||
    user.planLimits?.weddingChallengesEnabled === true
  );
}

export function userHasWeddingChallengesGiveawayEntitlement(
  user: WeddingChallengesEntitlementUser | null | undefined
): boolean {
  if (!userHasWeddingChallengesEntitlement(user)) return false;
  return (
    user?.salesUpsells?.weddingChallengesGiveaway?.enabled === true ||
    (user as { includeWeddingChallengesGiveaway?: boolean })?.includeWeddingChallengesGiveaway === true
  );
}

export function userHasInviteOrProductionPackage(
  user: WeddingChallengesEntitlementUser | null | undefined
): boolean {
  if (!user) return false;
  if (user.weddingChallengesOnly === true) return false;
  return (
    user.includeDigitalSeating === true ||
    user.includeEventManagement === true ||
    user.selfManageEnabled === true ||
    user.accessModules?.eventProduction === true ||
    user.planLimits?.seatingEnabled === true ||
    user.features?.weddingWebsite === true
  );
}

export function userIsWeddingChallengesOnly(
  user: WeddingChallengesEntitlementUser | null | undefined
): boolean {
  if (!userHasWeddingChallengesEntitlement(user)) return false;
  if (user?.weddingChallengesOnly === true) return true;
  if (userHasInviteOrProductionPackage(user)) return false;
  if (user?.hasPaid === true) return false;
  return true;
}

export function weddingChallengesAddonPrice(user?: WeddingChallengesEntitlementUser | null) {
  const stored = Number(user?.salesUpsells?.weddingChallenges?.price || 0);
  return stored > 0 ? stored : WEDDING_CHALLENGES_PRICE_ILS;
}

export function weddingChallengesGiveawayAddonPrice(
  user?: WeddingChallengesEntitlementUser | null
) {
  const stored = Number(user?.salesUpsells?.weddingChallengesGiveaway?.price || 0);
  return stored > 0 ? stored : WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS;
}
