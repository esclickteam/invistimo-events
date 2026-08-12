import { isProductionAppEnv, resolveAppEnv } from "@/lib/env/appEnv";

/**
 * Transportation Management entitlement.
 *
 * Defaults OFF for every customer.
 * Enabled only via explicit admin/sales flags on the User document.
 *
 * Production general rollout is intentionally OFF:
 * customers without the flag never see the module.
 */

export type TransportationEntitlementUser = {
  role?: string | null;
  includeTransportationManagement?: boolean | null;
  accessModules?: {
    transportationManagement?: boolean | null;
  } | null;
  salesUpsells?: {
    transportationManagement?: {
      enabled?: boolean | null;
    } | null;
  } | null;
  planLimits?: {
    transportationEnabled?: boolean | null;
  } | null;
  email?: string | null;
  isStagingFixture?: boolean | null;
  isDemoUser?: boolean | null;
};

/** Staging/dev allowlist emails used by seed fixtures (never auto-enabled in prod). */
export const TRANSPORTATION_STAGING_TEST_EMAILS = [
  "staging-transport-a@invistimo.test",
  "customer-transport-a@invistimo.test",
] as const;

export function userHasTransportationEntitlement(
  user: TransportationEntitlementUser | null | undefined
): boolean {
  if (!user) return false;

  if (
    user.accessModules?.transportationManagement === true ||
    user.includeTransportationManagement === true ||
    user.salesUpsells?.transportationManagement?.enabled === true ||
    user.planLimits?.transportationEnabled === true
  ) {
    return true;
  }

  // Non-production: allow explicit staging fixture test accounts by email
  // so QA can verify without a commercial package. Production never uses this.
  if (!isProductionAppEnv()) {
    const email = String(user.email || "")
      .trim()
      .toLowerCase();
    if (
      (TRANSPORTATION_STAGING_TEST_EMAILS as readonly string[]).includes(email)
    ) {
      return true;
    }
  }

  return false;
}

export function isTransportationModuleDeployedEnv() {
  const env = resolveAppEnv();
  // Built everywhere; visibility is still entitlement-gated.
  return (
    env === "staging" ||
    env === "preview" ||
    env === "development" ||
    env === "test" ||
    env === "production"
  );
}
