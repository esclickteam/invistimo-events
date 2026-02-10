import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Event from "@/models/Event";
import EventTask from "@/models/EventTask";
import EventSupplier from "@/models/EventSupplier";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   GET – Overview לאירוע
========================================================= */
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    console.log("🔵 GET /api/events/[eventId]/overview – start");

    /* =========================
       🔐 Auth
    ========================= */
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      console.warn("⛔ UNAUTHORIZED");
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    /* =========================
       📌 Params
    ========================= */
    const { eventId } = params;
    console.log("🔵 eventId:", eventId);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn("⛔ INVALID_EVENT_ID:", eventId);
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    /* =========================
       🎉 Load Event
    ========================= */
    const event = await Event.findOne({
      _id: eventId,
      status: "active",
      $or: [{ userId: auth.userId }, { producerId: auth.userId }],
    })
      .select("title date budgetTotal userId producerId")
      .lean();

    if (!event) {
      console.warn("⛔ EVENT_NOT_FOUND:", eventId);
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       📝 Load Tasks
    ========================= */
    const tasks = await EventTask.find({
      eventId: event._id,
      archived: false,
    })
      .sort({ order: 1, dueDate: 1, createdAt: 1 })
      .lean();

    /* =========================
       💰 Load Suppliers / Budget
    ========================= */
    const suppliers = await EventSupplier.find({
      eventId: event._id,
    })
      .select("price advance")
      .lean();

    const budgetTotal = Number(event.budgetTotal) || 0;

    const commitments = suppliers.reduce(
      (sum, s) => sum + Number(s.price || 0),
      0
    );

    const paid = suppliers.reduce(
      (sum, s) => sum + Number(s.advance || 0),
      0
    );

    const available = Math.max(budgetTotal - commitments, 0);

    /* =========================
       ✅ Response
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
        commitments,
        paid,
        available,
      },
      tasks,
    });
  } catch (err) {
    console.error("❌ GET /overview failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH – עדכון תקציב אירוע
========================================================= */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    console.log("🟡 PATCH /api/events/[eventId]/overview – start");

    /* =========================
       🔐 Auth
    ========================= */
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      console.warn("⛔ UNAUTHORIZED");
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    /* =========================
       📌 Params
    ========================= */
    const { eventId } = params;
    console.log("🟡 eventId:", eventId);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn("⛔ INVALID_EVENT_ID:", eventId);
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    /* =========================
       📦 Body
    ========================= */
    const body = await req.json();

    if (!Object.prototype.hasOwnProperty.call(body, "budgetTotal")) {
      return NextResponse.json({ success: true });
    }

    const budgetTotal = Number(body.budgetTotal);
    if (!Number.isFinite(budgetTotal) || budgetTotal < 0) {
      console.warn("⛔ INVALID_BUDGET:", body.budgetTotal);
      return NextResponse.json(
        { success: false, error: "INVALID_BUDGET" },
        { status: 400 }
      );
    }

    /* =========================
       💾 Update Event
    ========================= */
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        status: "active",
        $or: [{ userId: auth.userId }, { producerId: auth.userId }],
      },
      { $set: { budgetTotal } },
      { new: true }
    ).select("title date budgetTotal userId producerId");

    if (!event) {
      console.warn("⛔ EVENT_NOT_FOUND:", eventId);
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
    console.error("❌ PATCH /overview failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
