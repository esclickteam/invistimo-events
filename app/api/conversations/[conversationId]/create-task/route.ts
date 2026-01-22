import { NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EventConversation from "@/models/EventConversation";
import EventTask from "@/models/EventTask";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   POST – יצירת משימה מהחלטה
========================================================= */
export async function POST(
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

  const body = await req.json();
  const { decisionIndex } = body;

  if (typeof decisionIndex !== "number") {
    return NextResponse.json({ success: false, error: "INVALID_DECISION_INDEX" }, { status: 400 });
  }

  const conversation = await EventConversation.findById(conversationId);
  if (!conversation) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const event = await Event.findOne({
    _id: conversation.eventId,
    $or: [{ userId: auth.userId }, { producerId: auth.userId }],
  });

  if (!event) {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const decision = conversation.decisions[decisionIndex];
  if (!decision || !decision.text) {
    return NextResponse.json({ success: false, error: "DECISION_NOT_FOUND" }, { status: 404 });
  }

  /* =========================
     Create Task
  ========================= */
  const task = await EventTask.create({
  eventId: conversation.eventId,
  userId: auth.userId,
  title: decision.text,
  status: "open",
});



  /* =========================
     Link decision → task
  ========================= */
  decision.createdTaskId = task._id;
  await conversation.save();

  return NextResponse.json({
    success: true,
    task,
  });
}
