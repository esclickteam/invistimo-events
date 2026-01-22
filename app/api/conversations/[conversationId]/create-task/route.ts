import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EventConversation from "@/models/EventConversation";
import EventTask from "@/models/EventTask";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    await db();

    /* =========================
       Auth
    ========================= */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    /* =========================
       Params
    ========================= */
    const { conversationId } = await params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_CONVERSATION_ID" },
        { status: 400 }
      );
    }

    /* =========================
       Load Conversation
    ========================= */
    const conversation = await EventConversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "CONVERSATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Create Task
    ========================= */
    const task = await EventTask.create({
      eventId: conversation.eventId,
      userId: auth.userId,
      title: "משימה מפגישה",
      status: "open",
    });

    /* =========================
       Link decision → task (אם קיים)
    ========================= */
    // אם בעתיד תרצי:
    // decision.createdTaskId = task._id;
    // await conversation.save();

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (err) {
    console.error("❌ create-task failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
