import { NextResponse } from "next/server";
import {
  getAuthCookieDomain,
  getCloudinaryRootFolder,
  getPublicSiteUrl,
  resolveAppEnv,
} from "@/lib/env/appEnv";
import { evaluateEnvironmentSafety } from "@/lib/env/safetyGuards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Safe isolation evidence endpoint — no secrets.
 * Useful for Staging/Production smoke gates.
 */
export async function GET() {
  const safety = evaluateEnvironmentSafety();
  const appEnv = resolveAppEnv();

  return NextResponse.json({
    success: true,
    ok: safety.ok,
    appEnv,
    siteUrl: getPublicSiteUrl(),
    cookieDomain: getAuthCookieDomain() || "(host-only)",
    cloudinaryRootFolder: getCloudinaryRootFolder(),
    mongoDbName: safety.evidence.mongoDbName,
    stripeMode: safety.evidence.stripeMode,
    externalSends: safety.evidence.externalSends,
    errors: safety.errors,
    warnings: safety.warnings,
    architecture: {
      frontendAndApi: "same-nextjs-deployment",
      stagingApiPath: "/api/* on staging domain",
      productionApiPath: "/api/* on www.invistimo.com",
    },
  });
}
