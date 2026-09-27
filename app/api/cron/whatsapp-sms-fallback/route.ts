import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { processWhatsappSmsFallbacks } from "@/lib/sms/whatsappSmsFallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cronAuthorized(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  const authHeader = String(req.headers.get("authorization") || "").trim();
  if (req.headers.get("x-vercel-cron") === "1") return true;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await db();
    const stats = await processWhatsappSmsFallbacks();

    return NextResponse.json(
      { success: true, stats },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("❌ WHATSAPP SMS FALLBACK CRON ERROR:", err);

    return NextResponse.json(
      { success: false, error: err?.message || "CRON_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
