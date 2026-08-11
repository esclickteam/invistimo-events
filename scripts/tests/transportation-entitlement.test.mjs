/**
 * Pure entitlement visibility tests for Transportation Management.
 * Run: node scripts/tests/transportation-entitlement.test.mjs
 */

import assert from "node:assert/strict";

function isProductionAppEnv(env) {
  return env === "production";
}

const TRANSPORTATION_STAGING_TEST_EMAILS = [
  "staging-transport-a@invistimo.test",
  "customer-transport-a@invistimo.test",
];

function userHasTransportationEntitlement(user, appEnv = "production") {
  if (!user) return false;

  if (
    user.accessModules?.transportationManagement === true ||
    user.includeTransportationManagement === true ||
    user.salesUpsells?.transportationManagement?.enabled === true ||
    user.planLimits?.transportationEnabled === true
  ) {
    return true;
  }

  if (!isProductionAppEnv(appEnv)) {
    const email = String(user.email || "")
      .trim()
      .toLowerCase();
    if (TRANSPORTATION_STAGING_TEST_EMAILS.includes(email)) {
      return true;
    }
  }

  return false;
}

// Regular production customer — must NOT see module
assert.equal(
  userHasTransportationEntitlement(
    {
      email: "regular@example.com",
      includeTransportationManagement: false,
      accessModules: { transportationManagement: false },
    },
    "production"
  ),
  false
);

// Explicit entitlement — YES
assert.equal(
  userHasTransportationEntitlement(
    {
      email: "vip@example.com",
      includeTransportationManagement: true,
    },
    "production"
  ),
  true
);

// accessModules flag — YES
assert.equal(
  userHasTransportationEntitlement(
    {
      accessModules: { transportationManagement: true },
    },
    "production"
  ),
  true
);

// Staging allowlist email without flag — YES in staging, NO in production
assert.equal(
  userHasTransportationEntitlement(
    { email: "staging-transport-a@invistimo.test" },
    "staging"
  ),
  true
);
assert.equal(
  userHasTransportationEntitlement(
    { email: "staging-transport-a@invistimo.test" },
    "production"
  ),
  false
);

// Customer B style — never
assert.equal(
  userHasTransportationEntitlement(
    {
      email: "staging-transport-b@invistimo.test",
      includeTransportationManagement: false,
      accessModules: { transportationManagement: false },
    },
    "staging"
  ),
  false
);

console.log(
  JSON.stringify(
    {
      ok: true,
      VISIBLE_TO_OTHER_CUSTOMERS: "NO",
      VISIBLE_TO_TEST_ACCOUNT: "YES",
    },
    null,
    2
  )
);
