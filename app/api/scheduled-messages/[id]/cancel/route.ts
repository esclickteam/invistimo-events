import { NextRequest, NextResponse } from "next/server";
import ScheduledMessage from "@/models/ScheduledMessage";
import dbConnect from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* ================= AUTH ================= */
async function getAuthUserId() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("authToken")?.value ||
    cookieStore.get("token")?.value ||
    null;

  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded?.userId || decoded?.id || decoded?._id || null;
  } catch {
    return null;
  }
}

/* ================= CANCEL ================= */

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const userId = await getAuthUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  const msg = await ScheduledMessage.findOne({
    _id: id,
    userId, // 🔥 חשוב
    status: "pending",
    lockedAt: null,
  });

  if (!msg) {
    return NextResponse.json(
      { error: "לא ניתן לבטל" },
      { status: 400 }
    );
  }

  msg.status = "cancelled";
  await msg.save();

  return NextResponse.json({ success: true });
}