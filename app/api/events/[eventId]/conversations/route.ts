import { NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Event from "@/models/Event";
import EventConversation from "@/models/EventConversation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export async function GET(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  await db();

  const auth = await getUserIdFromRequest();
  if (!auth?.userId) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { eventId } = params;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ success: false, error: "INVALID_EVENT_ID" }, { status: 400 });
  }

  const event = await Event.findOne({
    _id: eventId,
    $or: [{ userId: auth.userId }, { producerId: auth.userId }],
  }).select("_id");

  if (!event) {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const conversations = await EventConversation
    .find({ eventId })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    conversations,
  });
}
