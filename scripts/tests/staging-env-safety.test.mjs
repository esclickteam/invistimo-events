import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";
import path from "path";
import { pathToFileURL } from "url";

async function loadAppEnv() {
  // Load via tsx transform by dynamic import of .ts through node --import tsx if available
  const { register } = await import("tsx/esm/api");
  const unregister = register();
  try {
    const mod = await import(
      pathToFileURL(path.resolve("lib/env/appEnv.ts")).href
    );
    const safety = await import(
      pathToFileURL(path.resolve("lib/env/safetyGuards.ts")).href
    );
    const sends = await import(
      pathToFileURL(path.resolve("lib/env/externalSends.ts")).href
    );
    return { ...mod, ...safety, ...sends };
  } finally {
    unregister?.();
  }
}

test("staging env safety suite", async (t) => {
  const {
    resolveAppEnv,
    getMongoDatabaseNameFromUri,
    getCloudinaryRootFolder,
    getAuthCookieDomain,
    evaluateEnvironmentSafety,
    assertExternalSendAllowed,
  } = await loadAppEnv();

  await t.test("parses mongo db name from URI", () => {
    assert.equal(
      getMongoDatabaseNameFromUri(
        "mongodb+srv://user:pass@cluster/invistimo_staging?retryWrites=true"
      ),
      "invistimo_staging"
    );
  });

  await t.test("APP_ENV=staging resolves", () => {
    process.env.APP_ENV = "staging";
    assert.equal(resolveAppEnv(), "staging");
  });

  await t.test("staging cloudinary root", () => {
    process.env.APP_ENV = "staging";
    delete process.env.CLOUDINARY_ROOT_FOLDER;
    assert.equal(getCloudinaryRootFolder(), "invistimo/staging");
  });

  await t.test("staging cookies are host-only", () => {
    process.env.APP_ENV = "staging";
    assert.equal(getAuthCookieDomain(), undefined);
  });

  await t.test("production cookies use shared domain", () => {
    process.env.APP_ENV = "production";
    assert.equal(getAuthCookieDomain(), ".invistimo.com");
  });

  await t.test("staging + production db name fails safety", () => {
    process.env.APP_ENV = "staging";
    process.env.MONGO_URI =
      "mongodb+srv://u:p@cluster0.example/invite?retryWrites=true";
    delete process.env.MONGO_ENV_LABEL;
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.invistimo.com";
    process.env.EXTERNAL_SENDS_MODE = "disabled";
    const result = evaluateEnvironmentSafety();
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => e.includes("STAGING_POINTS_TO_PRODUCTION_DB"))
    );
  });

  await t.test("staging + staging db passes", () => {
    process.env.APP_ENV = "staging";
    process.env.MONGO_URI =
      "mongodb+srv://u:p@cluster0.example/invistimo_staging?retryWrites=true";
    process.env.MONGO_ENV_LABEL = "staging";
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.invistimo.com";
    process.env.EXTERNAL_SENDS_MODE = "disabled";
    const result = evaluateEnvironmentSafety();
    assert.equal(result.ok, true);
    assert.equal(result.evidence.mongoDbName, "invistimo_staging");
    assert.equal(result.evidence.stripeMode, "test");
  });

  await t.test("staging + live stripe fails", () => {
    process.env.APP_ENV = "staging";
    process.env.MONGO_URI =
      "mongodb+srv://u:p@cluster0.example/invistimo_staging";
    process.env.MONGO_ENV_LABEL = "staging";
    process.env.STRIPE_SECRET_KEY = "sk_live_xxx";
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.invistimo.com";
    const result = evaluateEnvironmentSafety();
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes("STAGING_HAS_LIVE_STRIPE_KEY"));
  });

  await t.test("external sends disabled by default on staging", () => {
    process.env.APP_ENV = "staging";
    delete process.env.EXTERNAL_SENDS_MODE;
    const gate = assertExternalSendAllowed({
      channel: "email",
      to: "customer@example.com",
    });
    assert.equal(gate.allowed, false);
  });
});
