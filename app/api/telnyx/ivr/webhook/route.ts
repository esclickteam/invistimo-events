import { after, NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  beginOutboundPlaybackAfterAnswer,
  handleIvrTelnyxWebhook,
  OUTBOUND_ANSWER_DELAY_MS,
} from "@/lib/calls/ivrWebhookHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dedicated IVR webhook — does not alter the softphone voice webhook.
 * Outbound IVR calls set webhook_url to this route explicitly.
 */
export async function POST(req: NextRequest) {
  try {
    await db();

    const body = await req.json().catch(() => ({}));
    const result = await handleIvrTelnyxWebhook(body);

    if (
      result &&
      "deferOutboundPlayback" in result &&
      result.deferOutboundPlayback &&
      result.attemptId &&
      result.callControlId
    ) {
      const attemptId = String(result.attemptId);
      const callControlId = String(result.callControlId);
      after(async () => {
        await new Promise((resolve) =>
          setTimeout(resolve, OUTBOUND_ANSWER_DELAY_MS)
        );
        try {
          await beginOutboundPlaybackAfterAnswer({ attemptId, callControlId });
        } catch (error) {
          console.error("[telnyx/ivr/webhook] delayed playback failed", error);
        }
      });
    }

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
