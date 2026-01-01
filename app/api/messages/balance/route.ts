import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  const auth = await getUserIdFromRequest();

if (!auth?.userId) {
  return NextResponse.json(
    { success: false, error: "UNAUTHORIZED" },
    { status: 401 }
  );
}

const userId = auth.userId;

  /* ================= LOAD USER ================= */

  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  /* ================= 🧪 TRIAL USER ================= */

  if (user.isTrial) {
    const limit = user.planLimits?.smsLimit ?? 10;
    const used = user.smsUsed ?? 0;

    return NextResponse.json({
      success: true,
      isTrial: true,
      smsEnabled: limit > 0,
      maxMessages: limit,
      remainingMessages: Math.max(limit - used, 0),
      sentSmsCount: used,
    });
  }

  /* ================= REGULAR USER ================= */

  const invitation = await Invitation.findOne({ ownerId: userId }).lean();

  if (!invitation) {
    return NextResponse.json({
      success: true,
      smsEnabled: false,
      maxMessages: 0,
      remainingMessages: 0,
      sentSmsCount: 0,
    });
  }

  const maxMessages =
    typeof invitation.maxMessages === "number"
      ? invitation.maxMessages
      : 0;

  const remainingMessages =
    typeof invitation.remainingMessages === "number"
      ? invitation.remainingMessages
      : 0;

  const sentSmsCount =
    typeof invitation.sentSmsCount === "number"
      ? invitation.sentSmsCount
      : 0;

  return NextResponse.json({
    success: true,
    isTrial: false,
    smsEnabled: maxMessages > 0,
    maxMessages,
    remainingMessages,
    sentSmsCount,
  });
}
