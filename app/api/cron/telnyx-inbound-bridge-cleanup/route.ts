import { NextRequest, NextResponse } from "next/server";

import { cleanupStaleInboundBridges } from "@/lib/telnyx/inboundBridgeState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Protected cleanup endpoint.
 * Allowed only via:
 * - Vercel Cron header (x-vercel-cron: 1), or
 * - Authorization: Bearer ${CRON_SECRET}
 *
 * If CRON_SECRET is missing and request is not from Vercel Cron → 401.
 * Not freely callable from the public internet without the secret.
 */
function authorize(req: NextRequest) {
  const secret = cleanStr(process.env.CRON_SECRET);
  const authHeader = cleanStr(req.headers.get("authorization"));
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  if (isVercelCron) return true;

  if (!secret) return false;

  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  try {
    if (!authorize(req)) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const result = await cleanupStaleInboundBridges(25);

    return NextResponse.json({
      success: true,
      cleaned: result.cleaned,
      results: result.results,
    });
  } catch (error) {
    console.error("TELNYX INBOUND BRIDGE CLEANUP CRON FAILED:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "CLEANUP_FAILED",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
