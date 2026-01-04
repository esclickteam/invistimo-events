import { NextResponse } from "next/server";
import { sendScheduledSms } from "@/workers/sendScheduledSms";

/* ======================================================
   Vercel Cron – Send Scheduled SMS
   🔔 רץ כל דקה דרך vercel.json
====================================================== */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  /* ======================================================
     AUTH – רק Vercel Cron
  ====================================================== */
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

  /* ======================================================
     EXECUTE WORKER
  ====================================================== */
  try {
    const result = await sendScheduledSms();

    return NextResponse.json(
      {
        success: true,
        message: "Scheduled SMS worker executed",
        result, // אופציונלי: לוגים / ספירה
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
