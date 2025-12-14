import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const invitation = await Invitation.findOne({ ownerId: userId });
  if (!invitation) {
    return NextResponse.json(
      { success: false, error: "INV_NOT_FOUND" },
      { status: 404 }
    );
  }

  /* =====================================================
     🟤 חבילת BASIC – אין SMS בכלל
  ===================================================== */
  if (invitation.plan === "basic") {
    return NextResponse.json({
      success: true,
      plan: "basic",
      smsEnabled: false,

      maxMessages: 0,
      sentSmsCount: 0,
      remainingMessages: 0,
    });
  }

  /* =====================================================
     🟢 חבילת PREMIUM – SMS לפי החבילה + הרחבות
  ===================================================== */

  // כמות SMS בסיסית לפי החבילה (לדוגמה: 3 הודעות לכל אורח)
  const baseSmsFromPlan =
    typeof invitation.maxGuests === "number"
      ? invitation.maxGuests * 3
      : 0;

  // הרחבות שנרכשו (Add-on)
  const extraSms =
    typeof invitation.extraSms === "number"
      ? invitation.extraSms
      : 0;

  const maxMessages = baseSmsFromPlan + extraSms;
  const sentSmsCount = invitation.sentSmsCount || 0;
  const remainingMessages = Math.max(
    maxMessages - sentSmsCount,
    0
  );

  return NextResponse.json({
    success: true,
    plan: "premium",
    smsEnabled: true,

    maxMessages,
    sentSmsCount,
    remainingMessages,

    breakdown: {
      fromPlan: baseSmsFromPlan,
      fromAddons: extraSms,
    },
  });
}
