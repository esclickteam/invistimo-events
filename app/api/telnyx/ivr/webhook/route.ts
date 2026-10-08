import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { handleIvrTelnyxWebhook } from "@/lib/calls/ivrWebhookHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dedicated IVR webhook — does not alter the softphone voice webhook.
 * Outbound playback starts inside the answered handler. No artificial delay.
 */
export async function POST(req: NextRequest) {
  try {
    await db();

    const body = await req.json().catch(() => ({}));
    const result = await handleIvrTelnyxWebhook(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[telnyx/ivr/webhook] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "TELNYX_IVR_WEBHOOK_FAILED",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Invistimo IVR Telnyx webhook is alive",
  });
}
