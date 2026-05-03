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
    round, // 🔥 חשוב מאוד אצלך
  } = body;

  if (!invitationId || !type || !channel || !scheduledAt) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // 🔥 חיפוש תזמון קיים לפי round
  let existing = await ScheduledMessage.findOne({
    invitationId,
    type,
    channel,
    round: round ?? 1,
    status: "pending",
  });

  // ================= UPDATE =================
  if (existing) {
    if (existing.lockedAt) {
      return NextResponse.json(
        { error: "ההודעה כבר בתהליך שליחה ולא ניתן לערוך" },
        { status: 400 }
      );
    }

    existing.scheduledAt = new Date(scheduledAt);
    existing.audience = audience ?? existing.audience;

    await existing.save();

    return NextResponse.json(existing);
  }

  // ================= CREATE =================
  const msg = await ScheduledMessage.create({
    invitationId,
    type,
    channel,
    round: round ?? 1,
    scheduledAt: new Date(scheduledAt),
    audience: audience ?? [],
    status: "pending",
    lockedAt: null,
  });

  return NextResponse.json(msg);
}