import { NextRequest, NextResponse } from "next/server";
import ScheduledMessage from "@/models/ScheduledMessage";
import dbConnect from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const { id } = await context.params; // 🔥 חובה בגרסה החדשה

  const msg = await ScheduledMessage.findOne({
    _id: id,
    status: "pending",
    lockedAt: null, // ❗ חשוב
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