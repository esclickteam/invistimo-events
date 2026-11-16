import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";
import { createDisplayTrialTemplate } from "@/lib/whatsapp/displayTrialTemplate";
import { linkDisplayCronAuthorized } from "@/lib/whatsapp/linkDisplayExperiment";
import { WHATSAPP_HEADER_PROBE_RECIPIENT } from "@/lib/whatsapp/headerProbe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUEUE_KEY = "whatsapp:display-trial-template:one";

/**
 * Creates the trial template once. It does not send a WhatsApp message.
 * CRON_SECRET is required. A spoofed cron header is not accepted.
 */
export async function GET(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET || "");
  if (!linkDisplayCronAuthorized(secret, req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  let claimed = false;
  try {
    await WhatsappQueue.create({
      phone: WHATSAPP_HEADER_PROBE_RECIPIENT,
      templateName: "rsvp_invitation_display_trial",
      idempotencyKey: QUEUE_KEY,
      payload: { experiment: "display-trial-template", state: "claimed" },
      status: "cancelled",
      channel: "whatsapp",
      type: "custom",
      attempts: 1,
      maxAttempts: 1,
      lockedBy: "display-trial-template",
    });
    claimed = true;
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
  }
  if (!claimed) {
    return NextResponse.json({ success: true, already: true });
  }

  const result = await createDisplayTrialTemplate();
  await WhatsappQueue.updateOne(
    { idempotencyKey: QUEUE_KEY },
    {
      $set: {
        payload: {
          experiment: "display-trial-template",
          state: result.ok ? "submitted" : "failed",
          httpStatus: result.status,
          error: result.error,
          old: result.facts,
          trial: "trial" in result ? result.trial : null,
          differences: "differences" in result ? result.differences : null,
          created: "created" in result ? result.created : false,
        },
      },
    }
  );
  return NextResponse.json({
    success: result.ok,
    created: "created" in result ? result.created : false,
    status: result.status,
  });
}
