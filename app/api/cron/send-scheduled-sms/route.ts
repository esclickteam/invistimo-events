import { NextResponse } from "next/server";
import { sendScheduledSms } from "@/workers/sendScheduledSms";

/* ======================================================
   Vercel Cron – Send Scheduled SMS
====================================================== */

export async function GET(request: Request) {
  // 🔐 אבטחה: רק Vercel Cron יכול לקרוא לזה
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    await sendScheduledSms();

    return NextResponse.json({
      success: true,
      message: "Scheduled SMS worker executed",
    });
  } catch (err) {
    console.error("❌ Cron Worker Error:", err);

    return NextResponse.json(
      { success: false, error: "CRON_FAILED" },
      { status: 500 }
    );
  }
}
