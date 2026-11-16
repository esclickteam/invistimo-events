import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/db";
import { linkDisplayCronAuthorized } from "@/lib/whatsapp/linkDisplayExperiment";
import {
  DisplayTrialSendRefused,
  mongoDisplayTrialSendLock,
  sendDisplayTrialOnce,
} from "@/lib/whatsapp/displayTrialSend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One send of rsvp_invitation_display_trial. CRON_SECRET is required.
 * The database lock refuses a second send.
 */
export async function GET(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET || "");
  if (!linkDisplayCronAuthorized(secret, req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  try {
    const sent = await sendDisplayTrialOnce({ store: mongoDisplayTrialSendLock() });
    return NextResponse.json({ success: true, accepted: true, messageId: sent.messageId });
  } catch (error) {
    if (error instanceof DisplayTrialSendRefused) {
      return NextResponse.json({ success: true, already: true });
    }
    console.error("display trial send failed");
    return NextResponse.json({ success: false, error: "SEND_FAILED" }, { status: 500 });
  }
}
