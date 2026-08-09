import {
  getMongoDatabaseNameFromUri,
  isProductionAppEnv,
  isStagingAppEnv,
  resolveAppEnv,
  type AppEnv,
} from "@/lib/env/appEnv";

export type SafetyGuardResult = {
  ok: boolean;
  appEnv: AppEnv;
  errors: string[];
  warnings: string[];
  evidence: {
    mongoDbName: string | null;
    stripeMode: "live" | "test" | "missing" | "unknown";
    externalSends: "disabled" | "allowlist" | "enabled";
    siteUrl: string;
  };
};

const PROD_DB_NAME_HINTS = [
  "invite",
  "invistimo",
  "invistimo_prod",
  "invistimo-production",
  "production",
];

const STAGING_DB_NAME_HINTS = [
  "invistimo_staging",
  "invite_staging",
  "staging",
  "invistimo-staging",
];

function clean(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function detectStripeMode(): SafetyGuardResult["evidence"]["stripeMode"] {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) return "missing";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "unknown";
}

export function detectExternalSendsMode(): SafetyGuardResult["evidence"]["externalSends"] {
  const flag = clean(process.env.EXTERNAL_SENDS_MODE);
  if (flag === "disabled" || flag === "off" || flag === "0" || flag === "false") {
    return "disabled";
  }
  if (flag === "allowlist" || flag === "whitelist") return "allowlist";
  if (flag === "enabled" || flag === "on" || flag === "1" || flag === "true") {
    return "enabled";
  }

  // Defaults: staging/preview/dev/test = disabled; production = enabled
  const env = resolveAppEnv();
  if (env === "production") return "enabled";
  return "disabled";
}

function looksLikeProductionDb(dbName: string | null, uri: string) {
  const name = clean(dbName);
  const uriLower = clean(uri);

  if (!name && !uriLower) return false;

  if (name && STAGING_DB_NAME_HINTS.includes(name)) return false;
  if (name.includes("staging") || name.includes("preview") || name.includes("test")) {
    return false;
  }

  if (name && PROD_DB_NAME_HINTS.includes(name)) return true;
  if (uriLower.includes("/invite?") || uriLower.endsWith("/invite")) return true;
  if (uriLower.includes("invistimo_prod") || uriLower.includes("production")) {
    return true;
  }

  // Explicit override markers
  if (clean(process.env.MONGO_ENV_LABEL) === "production") return true;
  return false;
}

function looksLikeStagingDb(dbName: string | null, uri: string) {
  const name = clean(dbName);
  const uriLower = clean(uri);
  if (name && STAGING_DB_NAME_HINTS.includes(name)) return true;
  if (name.includes("staging")) return true;
  if (uriLower.includes("staging")) return true;
  if (clean(process.env.MONGO_ENV_LABEL) === "staging") return true;
  return false;
}

/**
 * Evaluate isolation safety without printing secrets.
 */
export function evaluateEnvironmentSafety(): SafetyGuardResult {
  const appEnv = resolveAppEnv();
  const errors: string[] = [];
  const warnings: string[] = [];

  const mongoUri = String(
    process.env.MONGO_URI || process.env.MONGODB_URI || ""
  ).trim();
  const mongoDbName = getMongoDatabaseNameFromUri(mongoUri);
  const stripeMode = detectStripeMode();
  const externalSends = detectExternalSendsMode();
  const siteUrl = String(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      ""
  ).trim();

  if (isStagingAppEnv(appEnv)) {
    if (!mongoUri) {
      errors.push("STAGING_MISSING_MONGO_URI");
    } else if (looksLikeProductionDb(mongoDbName, mongoUri)) {
      errors.push("STAGING_POINTS_TO_PRODUCTION_DB");
    } else if (!looksLikeStagingDb(mongoDbName, mongoUri)) {
      // Require explicit staging naming unless MONGO_ENV_LABEL=staging
      if (clean(process.env.MONGO_ENV_LABEL) !== "staging") {
        errors.push(
          "STAGING_DB_NAME_NOT_RECOGNIZED_AS_STAGING (set MONGO_URI db to invistimo_staging or MONGO_ENV_LABEL=staging)"
        );
      }
    }

    if (stripeMode === "live") {
      errors.push("STAGING_HAS_LIVE_STRIPE_KEY");
    }

    if (externalSends === "enabled") {
      warnings.push(
        "STAGING_EXTERNAL_SENDS_ENABLED (prefer disabled or allowlist)"
      );
    }

    if (siteUrl.includes("www.invistimo.com")) {
      errors.push("STAGING_SITE_URL_POINTS_TO_PRODUCTION");
    }
  }

  if (isProductionAppEnv(appEnv)) {
    if (mongoUri && looksLikeStagingDb(mongoDbName, mongoUri)) {
      errors.push("PRODUCTION_POINTS_TO_STAGING_DB");
    }
    if (stripeMode === "test") {
      warnings.push("PRODUCTION_USING_STRIPE_TEST_KEY");
    }
    if (
      siteUrl.includes("staging.invistimo.com") ||
      siteUrl.includes("vercel.app")
    ) {
      warnings.push("PRODUCTION_SITE_URL_LOOKS_NON_PRODUCTION");
    }
  }

  return {
    ok: errors.length === 0,
    appEnv,
    errors,
    warnings,
    evidence: {
      mongoDbName,
      stripeMode,
      externalSends,
      siteUrl: siteUrl || "(unset)",
    },
  };
}

let enforced = false;

/**
 * Throw on fatal isolation violations. Call from DB connect / instrumentation.
 */
export function assertEnvironmentSafety(options?: { throwOnError?: boolean }) {
  const result = evaluateEnvironmentSafety();
  const shouldThrow = options?.throwOnError !== false;

  if (!result.ok) {
    const message = `[ENV SAFETY] APP_ENV=${result.appEnv} blocked: ${result.errors.join(
      "; "
    )}`;
    console.error(message, {
      warnings: result.warnings,
      evidence: result.evidence,
    });
    if (shouldThrow) {
      throw new Error(message);
    }
  } else if (!enforced) {
    console.log("[ENV SAFETY] ok", {
      appEnv: result.appEnv,
      mongoDbName: result.evidence.mongoDbName,
      stripeMode: result.evidence.stripeMode,
      externalSends: result.evidence.externalSends,
    });
  }

  enforced = true;
  return result;
}
