import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { processUpcomingEventNotifications } from "@/lib/customerNotifications/liveEvents";
import { processAdminOperationalNotifications } from "@/lib/customerNotifications/adminCenterLive";
import { processProducerCollectionNotices } from "@/lib/producerBilling/noticesLive";

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
    const result = await processUpcomingEventNotifications();
    let adminOps: { messages: number; calls: number; shifts: number; events: number } | null = null;
    try {
      adminOps = await processAdminOperationalNotifications();
    } catch (error) {
      console.error("admin operational notifications failed", error);
    }
    let producerBilling: { created: number; resolved: number; daily: boolean } | null = null;
    try {
      producerBilling = await processProducerCollectionNotices();
    } catch (error) {
      console.error("producer billing notices failed", error);
    }
    return NextResponse.json(
      { success: true, ...result, adminOps, producerBilling },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("event notifications cron failed", error);
    return NextResponse.json(
      { success: false, error: "CRON_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
