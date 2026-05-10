import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";

import Event from "@/models/Event";
import Invitation from "@/models/Invitation";

import EventTask from "@/models/EventTask";
import EventSupplier from "@/models/EventSupplier";

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

    console.log("🔵 GET /overview – start");

    /* =========================
       Auth
    ========================= */
    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      console.warn("⛔ GET /overview – UNAUTHORIZED");

      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    /* =========================
       Params
    ========================= */
    const { eventId } = await context.params;

    console.log("🔵 GET /overview – eventId:", eventId);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn(
        "⛔ GET /overview – INVALID_EVENT_ID:",
        eventId
      );

      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EVENT_ID",
        },
        { status: 400 }
      );
    }

    /* =========================
       Load Event
    ========================= */
    const event = await Event.findOne({
      _id: eventId,
      status: "active",
      $or: [
        { userId: auth.userId },
        { producerId: auth.userId },
      ],
    })
      .select(
        "title date budgetTotal userId producerId"
      )
      .lean();

    if (!event) {
      console.warn(
        "⛔ GET /overview – EVENT_NOT_FOUND:",
        eventId
      );

      return NextResponse.json(
        {
          success: false,
          error: "EVENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    console.log(
      "🟢 GET /overview – event.budgetTotal from DB:",
      event.budgetTotal
    );

    /* =========================
       Load Invitation
    ========================= */
    const invitation = await Invitation.findOne({
      eventId: event._id,
    })
      .select("title")
      .lean();

    console.log(
      "🟢 GET /overview – invitation title:",
      invitation?.title
    );

    /* =========================
       Load Tasks
    ========================= */
    const tasks = await EventTask.find({
      eventId: event._id,
      archived: false,
    })
      .sort({
        order: 1,
        dueDate: 1,
        createdAt: 1,
      })
      .lean();

    console.log(
      "🔵 GET /overview – tasks count:",
      tasks.length
    );

    /* =========================
       Load Suppliers
    ========================= */
    const suppliers = await EventSupplier.find({
      eventId: event._id,
    })
      .select("price advance")
      .lean();

    console.log(
      "🔵 GET /overview – suppliers count:",
      suppliers.length
    );

    /* =========================
       Budget Calculations
    ========================= */
    const budgetTotal =
      Number(event.budgetTotal) || 0;

    const commitments = suppliers.reduce(
      (sum, s) => sum + Number(s.price || 0),
      0
    );

    const paid = suppliers.reduce(
      (sum, s) => sum + Number(s.advance || 0),
      0
    );

    const available = Math.max(
      budgetTotal - commitments,
      0
    );

    console.log(
      "🟢 GET /overview – calculated budget:",
      {
        budgetTotal,
        commitments,
        paid,
        available,
      }
    );

    return NextResponse.json({
      success: true,

      event: {
        id: event._id,

        title:
          invitation?.title ||
          event.title ||
          "הפקת אירוע",

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
    console.error(
      "❌ GET /events/[eventId]/overview failed:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
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

    console.log("🟡 PATCH /overview – start");

    /* =========================
       Auth
    ========================= */
    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      console.warn(
        "⛔ PATCH /overview – UNAUTHORIZED"
      );

      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    /* =========================
       Params
    ========================= */
    const { eventId } = await context.params;

    console.log(
      "🟡 PATCH /overview – eventId:",
      eventId
    );

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn(
        "⛔ PATCH /overview – INVALID_EVENT_ID:",
        eventId
      );

      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EVENT_ID",
        },
        { status: 400 }
      );
    }

    /* =========================
       Body
    ========================= */
    const body = await req.json();

    console.log(
      "🟡 PATCH /overview – body received:",
      body
    );

    if (
      !Object.prototype.hasOwnProperty.call(
        body,
        "budgetTotal"
      )
    ) {
      console.log(
        "🟡 PATCH /overview – no budgetTotal, skipping update"
      );

      return NextResponse.json({
        success: true,
      });
    }

    const budgetTotal = Number(body.budgetTotal);

    console.log(
      "🟡 PATCH /overview – parsed budgetTotal:",
      budgetTotal
    );

    if (
      !Number.isFinite(budgetTotal) ||
      budgetTotal < 0
    ) {
      console.warn(
        "⛔ PATCH /overview – INVALID_BUDGET:",
        body.budgetTotal
      );

      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BUDGET",
        },
        { status: 400 }
      );
    }

    /* =========================
       Update Event
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
        $set: {
          budgetTotal,
        },
      },
      {
        new: true,
      }
    ).select(
      "title date budgetTotal userId producerId"
    );

    if (!event) {
      console.warn(
        "⛔ PATCH /overview – EVENT_NOT_FOUND:",
        eventId
      );

      return NextResponse.json(
        {
          success: false,
          error: "EVENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    console.log(
      "🟢 PATCH /overview – budget saved to DB:",
      event.budgetTotal
    );

    return NextResponse.json({
      success: true,

      event: {
        id: event._id,

        title: event.title,

        date: event.date,

        userId: event.userId,

        producerId: event.producerId,

        budgetTotal:
          Number(event.budgetTotal) || 0,
      },
    });
  } catch (err) {
    console.error(
      "❌ PATCH /events/[eventId]/overview failed:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}