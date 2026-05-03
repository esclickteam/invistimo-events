import { NextRequest, NextResponse } from "next/server";
import ScheduledMessage from "@/models/ScheduledMessage";
import dbConnect from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  const msg = await ScheduledMessage.findOne({
    _id: params.id,
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