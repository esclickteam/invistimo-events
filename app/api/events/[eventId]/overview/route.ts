import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Event from "@/models/Event";
import EventTask from "@/models/EventTask";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   GET – Overview לאירוע
========================================================= */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
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
       Params (⚠️ Promise!)
    ========================= */
    const { eventId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
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
    ========================= */
    const tasks = await EventTask.find({
      eventId: event._id,
      archived: false,
    })
      .sort({ order: 1, dueDate: 1, createdAt: 1 })
      .lean();

    const budgetTotal = Number(event.budgetTotal) || 0;
    const spent = 0;

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

/* =========================================================
   PATCH – עדכון Overview (תקציב)
========================================================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
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
    const { eventId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    /* =========================
       Body
    ========================= */
    const body = await req.json();
    const budgetTotal = Number(body.budgetTotal);

    if (Number.isNaN(budgetTotal) || budgetTotal < 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_BUDGET" },
        { status: 400 }
      );
    }

    /* =========================
       Update Event (Owner / Producer)
    ========================= */
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        status: "active",
        $or: [
          { userId: auth.userId },
          { producerId: auth.userId },
        ],
      },
      {
        $set: { budgetTotal },
      },
      { new: true }
    ).select("title date budgetTotal userId producerId");

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        userId: event.userId,
        producerId: event.producerId,
        budgetTotal: Number(event.budgetTotal) || 0,
      },
    });
  } catch (err) {
    console.error("❌ PATCH /events/[eventId]/overview failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
