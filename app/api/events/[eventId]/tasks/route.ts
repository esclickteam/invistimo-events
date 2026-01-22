import { NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Event from "@/models/Event";
import EventTask from "@/models/EventTask";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   POST – יצירת משימה חדשה לאירוע
========================================================= */
export async function POST(
  req: Request,
  { params }: { params: { eventId: string } }
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

    const { eventId } = params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { title, dueDate } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { success: false, error: "TITLE_REQUIRED" },
        { status: 400 }
      );
    }

    /* =========================
       Load Event (Owner / Producer)
    ========================= */
    const event = await Event.findOne({
      _id: eventId,
      status: "active",
      $or: [
        { userId: auth.userId },
        { producerId: auth.userId },
      ],
    })
      .select("_id userId producerId")
      .lean();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Create Task
    ========================= */
    const task = await EventTask.create({
      eventId: event._id,
      userId: event.userId,
      producerId: event.producerId,
      title: title.trim(),
      dueDate: typeof dueDate === "string" ? dueDate : "",
      status: "open",
      order: Date.now(), // סדר בסיסי לפי יצירה
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (err) {
    console.error("❌ POST /events/[eventId]/tasks failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
