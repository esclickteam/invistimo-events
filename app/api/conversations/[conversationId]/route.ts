import { NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EventConversation from "@/models/EventConversation";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================
   GET – טעינת פגישה
========================= */
export async function GET(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  await db();

  const auth = await getUserIdFromRequest();
  if (!auth?.userId) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { conversationId } = params;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return NextResponse.json({ success: false, error: "INVALID_ID" }, { status: 400 });
  }

  const convo = await EventConversation.findById(conversationId).lean();
  if (!convo) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const event = await Event.findOne({
    _id: convo.eventId,
    $or: [{ userId: auth.userId }, { producerId: auth.userId }],
  }).select("_id");

  if (!event) {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }

  return NextResponse.json({ success: true, conversation: convo });
}

/* =========================
   PATCH – עדכון פגישה
========================= */
export async function PATCH(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  await db();

  const auth = await getUserIdFromRequest();
  if (!auth?.userId) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { conversationId } = params;
  const updates = await req.json();

  const convo = await EventConversation.findById(conversationId);
  if (!convo) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }

  Object.assign(convo, {
    summary: updates.summary ?? convo.summary,
    decisions: updates.decisions ?? convo.decisions,
  });   

  await convo.save();

  return NextResponse.json({ success: true });
}
