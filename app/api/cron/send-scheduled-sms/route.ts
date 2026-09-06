import { NextResponse } from "next/server";
import {
  sendScheduledSms,
  sendScheduledWhatsapp,
} from "@/workers/sendScheduledSms";
import { processWeddingChallengesJobs } from "@/lib/weddingChallenges/jobs";

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
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  try {
    const smsResult = await sendScheduledSms();
    const whatsappResult = await sendScheduledWhatsapp();
    const weddingChallenges = await processWeddingChallengesJobs();

    return NextResponse.json(
      {
        success: true,
        message: "Scheduled workers executed",
        stats: {
          sms: {
            totalSent: smsResult.sent || 0,
            totalProcessed: smsResult.processed || 0,
            totalFailed: smsResult.failed || 0,
          },
          whatsapp: {
            totalSent: whatsappResult.sent || 0,
          },
          weddingChallenges,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("❌ Cron Worker Error:", err);

    return NextResponse.json(
      { success: false, error: "CRON_FAILED" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}