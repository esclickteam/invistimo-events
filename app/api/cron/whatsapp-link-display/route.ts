import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/db";
import { WHATSAPP_HEADER_PROBE_RECIPIENT } from "@/lib/whatsapp/headerProbe";
import { mongoLinkDisplayLock } from "@/lib/whatsapp/linkDisplayLock";
import {
  LINK_DISPLAY_EXPERIMENT_ARMED,
  LinkDisplayNotApproved,
  ONE_HEADER_PROBE_PHRASE,
  linkDisplayCronAuthorized,
  sendLinkDisplayExperiment,
} from "@/lib/whatsapp/linkDisplayExperiment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel cron only. CRON_SECRET is required. A spoofed cron header is not enough.
 * While LINK_DISPLAY_EXPERIMENT_ARMED is false, this route does not send.
 */
export async function GET(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET || "");
  if (!linkDisplayCronAuthorized(secret, req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!LINK_DISPLAY_EXPERIMENT_ARMED) {
    return NextResponse.json({ success: true, ready: true, armed: false });
  }

  await connectDB();
  try {
    const sent = await sendLinkDisplayExperiment(
      { phrase: ONE_HEADER_PROBE_PHRASE, to: WHATSAPP_HEADER_PROBE_RECIPIENT },
      { store: mongoLinkDisplayLock() }
    );
    return NextResponse.json({
      success: true,
      accepted: true,
      messageId: sent.messageId,
    });
  } catch (error) {
    if (error instanceof LinkDisplayNotApproved) {
      return NextResponse.json({ success: true, ready: true, already: true });
    }
    console.error("link display experiment failed");
    return NextResponse.json({ success: false, error: "SEND_FAILED" }, { status: 500 });
  }
}
