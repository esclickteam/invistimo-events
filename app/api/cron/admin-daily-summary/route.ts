import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { processDailyEventsSummary } from "@/lib/customerNotifications/adminCenterLive";

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

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  try {
    await dbConnect();
    const summary = await processDailyEventsSummary();
    return NextResponse.json(
      { success: true, summary },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("admin daily summary cron failed", error);
    return NextResponse.json(
      { success: false, error: "CRON_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
