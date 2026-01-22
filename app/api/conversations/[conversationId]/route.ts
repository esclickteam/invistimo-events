import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EventConversation from "@/models/EventConversation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export async function GET(
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
    const conversation = await EventConversation.findOne({
      _id: conversationId,
      $or: [
        { userId: auth.userId },
        { producerId: auth.userId },
      ],
    }).lean();

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "CONVERSATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (err) {
    console.error("❌ GET /conversations/[conversationId] failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
