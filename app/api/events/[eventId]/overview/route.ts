import { NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Event from "@/models/Event";
import EventTask from "@/models/EventTask";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   GET – Overview לאירוע
========================================================= */
export async function GET(
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

    /* =========================
       Load Event
       ✔️ בעלים או מפיק
    ========================= */
    const event = await Event.findOne({
      _id: eventId,
      status: "active",
      $or: [
        { userId: auth.userId },      // לקוח
        { producerId: auth.userId },  // מפיק (אימפרסונציה)
      ],
    })
      .select("title date budgetTotal userId producerId")
      .lean();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Load Tasks
       ✔️ רק פעילות
    ========================= */
    const tasks = await EventTask.find({
      eventId: event._id,
      archived: false,
    })
      .sort({ order: 1, dueDate: 1, createdAt: 1 })
      .select("title dueDate status order createdAt")
      .lean();

    /* =========================
       Budget
       (כרגע spent = 0)
    ========================= */
    const budgetTotal = Number(event.budgetTotal) || 0;
    const spent = 0;

    /* =========================
       Response
    ========================= */
    return NextResponse.json({
      success: true,

      event: {
        id: event._id,
        title: event.title || "הפקת אירוע",
        date: event.date,
        userId: event.userId,
        producerId: event.producerId,
        budgetTotal,
      },

      budget: {
        total: budgetTotal,
        spent,
        remaining: budgetTotal - spent,
      },

      tasks,
    });
  } catch (err) {
    console.error("❌ GET /events/[eventId]/overview failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
