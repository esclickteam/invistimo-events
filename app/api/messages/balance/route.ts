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

  /* ================= RAW VALUES ================= */
  const maxMessages =
    typeof user.maxMessages === "number" ? user.maxMessages : 0;

  const smsUsed =
    typeof user.smsUsed === "number" ? user.smsUsed : 0;

  const remainingMessages = Math.max(
  (typeof user.maxMessages === "number" ? user.maxMessages : 0) -
  (typeof user.smsUsed === "number" ? user.smsUsed : 0),
  0
);

  const smsEnabled = remainingMessages > 0;

  /* ================= RESPONSE ================= */
  return NextResponse.json({
    success: true,
    isTrial: !!user.isTrial,
    smsEnabled,
    maxMessages,
    smsUsed,
    remainingMessages,
  });
}
