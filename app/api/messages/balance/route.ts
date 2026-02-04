import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    /* ================= RAW VALUES ================= */
    const maxMessages =
      Number.isFinite(user.maxMessages) ? user.maxMessages : 0;

    const smsUsed =
      Number.isFinite(user.smsUsed) ? user.smsUsed : 0;

    /* ================= CALC ================= */
    const remainingMessages = Math.max(maxMessages - smsUsed, 0);
    const smsEnabled = remainingMessages > 0;

    /* ================= RESPONSE ================= */
    return NextResponse.json({
      success: true,
      isTrial: Boolean(user.isTrial),
      smsEnabled,
      maxMessages,
      smsUsed,
      remainingMessages,
    });
  } catch (err) {
    console.error("❌ /api/messages/balance GET error:", err);
    return NextResponse.json(
      { success: false, error: "BALANCE_FETCH_FAILED" },
      { status: 500 }
    );
  }
}
