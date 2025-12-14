import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Invitation from "@/models/Invitation";
import Payment from "@/models/Payment";
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
     1️⃣ SMS כלולים לפי חבילה
  ===================================================== */

  let smsFromPlan = 0;

  if (invitation.plan === "premium") {
    const guestsInPlan =
      typeof invitation.maxGuests === "number"
        ? invitation.maxGuests
        : 0;

    // 3 הודעות לכל אורח
    smsFromPlan = guestsInPlan * 3;
  }

  /* =====================================================
     2️⃣ הרחבות SMS שנרכשו בפועל
     (נספר רק תשלומים ששולמו)
  ===================================================== */

  const smsAddons = await Payment.find({
    invitationId: invitation._id,
    type: "sms",
    status: "paid",
  });

  const smsFromAddons = smsAddons.reduce((sum, p) => {
    return sum + (typeof p.count === "number" ? p.count : 0);
  }, 0);

  /* =====================================================
     3️⃣ חישוב סופי
  ===================================================== */

  const maxMessages = smsFromPlan + smsFromAddons;
  const sentSmsCount =
    typeof invitation.sentSmsCount === "number"
      ? invitation.sentSmsCount
      : 0;

  const remainingMessages = Math.max(
    maxMessages - sentSmsCount,
    0
  );

  /* =====================================================
     4️⃣ Response אחיד (גם אם 0/0)
  ===================================================== */

  return NextResponse.json({
    success: true,

    plan: invitation.plan,
    smsEnabled: true,

    maxMessages,
    sentSmsCount,
    remainingMessages,

    breakdown: {
      fromPlan: smsFromPlan,
      fromAddons: smsFromAddons,
    },
  });
}
