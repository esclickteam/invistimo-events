import { NextResponse } from "next/server";
import {
  sendScheduledSms,
  sendScheduledWhatsapp,
} from "@/workers/sendScheduledSms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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