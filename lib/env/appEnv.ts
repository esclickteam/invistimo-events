/**
 * Canonical Invistimo application environment.
 *
 * Vercel sets NODE_ENV=production for Preview/Staging/Production builds,
 * so we must NOT use NODE_ENV alone for isolation decisions.
 */

export type AppEnv =
  | "development"
  | "test"
  | "preview"
  | "staging"
  | "production";

const VALID: AppEnv[] = [
  "development",
  "test",
  "preview",
  "staging",
  "production",
];

function clean(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Resolve APP_ENV with safe fallbacks.
 * Explicit APP_ENV wins. Then VERCEL_ENV / custom target hints.
 */
export function resolveAppEnv(): AppEnv {
  const explicit = clean(process.env.APP_ENV);
  if (VALID.includes(explicit as AppEnv)) {
    return explicit as AppEnv;
  }

  // Vercel custom environment slug when available
  const vercelTarget = clean(
    process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV
  );
  if (vercelTarget === "staging") return "staging";
  if (vercelTarget === "preview") return "preview";
  if (vercelTarget === "production") return "production";
  if (vercelTarget === "development") return "development";

  if (clean(process.env.NODE_ENV) === "test") return "test";
  if (clean(process.env.NODE_ENV) === "development") return "development";

  // Fallback: treat unknown production Node builds as production only when
  // site URL clearly points at the live apex/www.
  const site = clean(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      ""
  );
  if (
    site.includes("://www.invistimo.com") ||
    site === "https://invistimo.com" ||
    site.startsWith("https://invistimo.com/")
  ) {
    return "production";
  }
  if (site.includes("staging.invistimo.com")) {
    return "staging";
  }

  if (clean(process.env.NODE_ENV) === "production") {
    // Ambiguous Vercel production Node build without APP_ENV — prefer preview-safe
    // only when VERCEL_ENV says preview; otherwise production.
    return "production";
  }

  return "development";
}

export function isProductionAppEnv(env = resolveAppEnv()) {
  return env === "production";
}

export function isStagingAppEnv(env = resolveAppEnv()) {
  return env === "staging";
}

export function isPreviewAppEnv(env = resolveAppEnv()) {
  return env === "preview";
}

/** Host-shared cookie domain only for true Production. */
export function getAuthCookieDomain(): string | undefined {
  return isProductionAppEnv() ? ".invistimo.com" : undefined;
}

export function getPublicSiteUrl(): string {
  const fromEnv = String(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.APP_URL ||
      process.env.SITE_URL ||
      ""
  ).trim();

  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const env = resolveAppEnv();
  if (env === "staging") return "https://staging.invistimo.com";
  if (env === "production") return "https://www.invistimo.com";
  return "http://localhost:3000";
}

/** Cloudinary folder root prefix for isolation. */
export function getCloudinaryRootFolder(): string {
  const override = String(process.env.CLOUDINARY_ROOT_FOLDER || "").trim();
  if (override) return override.replace(/\/$/, "");

  const env = resolveAppEnv();
  if (env === "staging") return "invistimo/staging";
  if (env === "preview" || env === "development" || env === "test") {
    return "invistimo/preview";
  }
  return "invistimo/production";
}

export function getMongoDatabaseNameFromUri(uri: string): string | null {
  try {
    const cleaned = String(uri || "").trim();
    if (!cleaned) return null;
    const withoutQuery = cleaned.split("?")[0];
    const afterAt = withoutQuery.includes("@")
      ? withoutQuery.split("@").pop() || withoutQuery
      : withoutQuery.replace(/^mongodb(\+srv)?:\/\//, "");
    const path = afterAt.includes("/")
      ? afterAt.split("/").slice(1).join("/")
      : "";
    const name = path.split("/")[0];
    return name ? decodeURIComponent(name) : null;
  } catch {
    return null;
  }
}
