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
  const user = await User.findById(userId).lean();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  /* ================= 🧪 TRIAL USER ================= */
  if (user.isTrial) {
    const maxMessages =
      typeof user.planLimits?.smsLimit === "number"
        ? user.planLimits.smsLimit
        : 0;

    const sentSmsCount =
      typeof user.smsUsed === "number" ? user.smsUsed : 0;

    const remainingMessages = Math.max(
      maxMessages - sentSmsCount,
      0
    );

    return NextResponse.json({
      success: true,
      isTrial: true,
      smsEnabled: maxMessages > 0,
      maxMessages,
      remainingMessages,
      sentSmsCount,
    });
  }

  /* ================= REGULAR USER ================= */

  const maxMessages =
    typeof user.maxMessages === "number" ? user.maxMessages : 0;

  const sentSmsCount =
    typeof user.smsUsed === "number" ? user.smsUsed : 0;

  const remainingMessages = Math.max(
    maxMessages - sentSmsCount,
    0
  );

  return NextResponse.json({
    success: true,
    isTrial: false,
    smsEnabled: maxMessages > 0,
    maxMessages,
    remainingMessages,
    sentSmsCount,
  });
}
