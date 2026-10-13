import { NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import { liveDeletionPermitted } from "@/lib/customers/eventDeletionPolicy";
import { runDryEventDeletion } from "@/lib/customers/eventDeletionRun";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cronAuthorized(request: Request) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  const authHeader = String(request.headers.get("authorization") || "").trim();
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (isVercelCron) return true;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

/**
 * Daily candidate scan. This route cannot delete customers or events.
 * Real deletion stays disabled until a separate explicit approval.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (liveDeletionPermitted()) {
    return NextResponse.json(
      { success: false, error: "LIVE_DELETION_DISABLED", executed: 0 },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }
  try {
    await dbConnect();
    const result = await runDryEventDeletion();
    return NextResponse.json(
      {
        success: true,
        mode: "dry_run",
        liveDeletionEnabled: false,
        executed: 0,
        emergencyStop: result.emergencyStop,
        anomaly: result.anomaly,
        runId: result.runId,
        eligibleEvents: result.entries.filter((entry) => entry.bucket === "eligible").length,
        reported: result.entries.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("event auto deletion dry run failed", error);
    return NextResponse.json(
      { success: false, error: "CRON_FAILED", executed: 0, mode: "dry_run" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
