import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  /* ================= AUTH ================= */
  const auth = await getUserIdFromRequest();

  if (!auth?.userId) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const userId = auth.userId;

  /* ================= LOAD USER ================= */
  const user = await User.findById(userId).lean({ virtuals: true });

  if (!user) {
    return NextResponse.json(
      { success: false, error: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  const smsBalance =
    typeof user.smsBalance === "number" ? user.smsBalance : 0;

  const sentSmsCount =
    typeof user.smsUsed === "number" ? user.smsUsed : 0;

  /* ================= 🧪 TRIAL USER ================= */
  if (user.isTrial) {
    return NextResponse.json({
      success: true,
      isTrial: true,
      smsEnabled: smsBalance > 0,
      remainingMessages: smsBalance,
      sentSmsCount,
    });
  }

  /* ================= REGULAR USER ================= */
  return NextResponse.json({
    success: true,
    isTrial: false,
    smsEnabled: smsBalance > 0,
    remainingMessages: smsBalance,
    sentSmsCount,
  });
}
