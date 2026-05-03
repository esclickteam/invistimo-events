import { NextRequest, NextResponse } from "next/server";
import ScheduledMessage from "@/models/ScheduledMessage";
import dbConnect from "@/lib/db";

export async function POST(req: NextRequest) {
  await dbConnect();

  const body = await req.json();

  const {
    invitationId,
    type,
    channel,
    scheduledAt,
    audience,
  } = body;

  // אם כבר קיים תזמון → עדכון
  let existing = await ScheduledMessage.findOne({
    invitationId,
    type,
    channel,
    status: "pending",
  });

  if (existing && !existing.lockedAt) {
    existing.scheduledAt = scheduledAt;
    await existing.save();

    return NextResponse.json(existing);
  }

  // אם אין → יצירה
  const msg = await ScheduledMessage.create({
    invitationId,
    type,
    channel,
    scheduledAt,
    audience,
    status: "pending",
  });

  return NextResponse.json(msg);
}