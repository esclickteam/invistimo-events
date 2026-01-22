import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Event from "@/models/Event";
import EventConversation from "@/models/EventConversation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   GET – Load conversations
========================================================= */
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { eventId } = params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const event = await Event.findOne({
      _id: eventId,
      $or: [{ userId: auth.userId }, { producerId: auth.userId }],
    }).select("_id");

    if (!event) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const conversations = await EventConversation.find({ eventId })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, conversations });
  } catch (err) {
    console.error("❌ GET conversations failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST – Create meeting / conversation
========================================================= */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { eventId } = params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const event = await Event.findOne({
      _id: eventId,
      $or: [{ userId: auth.userId }, { producerId: auth.userId }],
    }).select("_id");

    if (!event) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { type, entityType, entityName, date, summary } = body;

    if (!type || !entityType || !entityName || !date) {
      return NextResponse.json(
        { success: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const conversation = await EventConversation.create({
      eventId,
      type,
      entityType,
      entityName,
      date,
      summary: summary || "",
      createdBy: auth.userId,
    });

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (err) {
    console.error("❌ POST conversation failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
