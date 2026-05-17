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
      console.warn("⛔ GET /overview – INVALID_EVENT_ID:", eventId);

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
      $or: [{ userId: auth.userId }, { producerId: auth.userId }],
    })
      .select(
        "title date budgetTotal estimatedGuests estimatedGuestCount userId producerId"
      )
      .lean();

    if (!event) {
      console.warn("⛔ GET /overview – EVENT_NOT_FOUND:", eventId);

      return NextResponse.json(
        {
          success: false,
          error: "EVENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    console.log("🟢 GET /overview – event.budgetTotal from DB:", event.budgetTotal);
    console.log(
      "🟢 GET /overview – event.estimatedGuests from DB:",
      event.estimatedGuests,
      event.estimatedGuestCount
    );

    /* =========================
       Load Invitation
    ========================= */
    const invitation = await Invitation.findOne({
      eventId: event._id,
    })
      .select("title estimatedGuests estimatedGuestCount guestEstimate expectedGuests guestsEstimate guestCount guestsCount maxGuests")
      .lean();

    console.log("🟢 GET /overview – invitation title:", invitation?.title);

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

    console.log("🔵 GET /overview – tasks count:", tasks.length);

    /* =========================
       Load Suppliers
    ========================= */
    const suppliers = await EventSupplier.find({
      eventId: event._id,
    })
      .select("price advance")
      .lean();

    console.log("🔵 GET /overview – suppliers count:", suppliers.length);

    /* =========================
       Budget Calculations
    ========================= */
    const budgetTotal = Number(event.budgetTotal) || 0;

    const estimatedGuests =
      Number(
        event.estimatedGuests ??
          event.estimatedGuestCount ??
          invitation?.estimatedGuests ??
          invitation?.estimatedGuestCount ??
          invitation?.guestEstimate ??
          invitation?.expectedGuests ??
          invitation?.guestsEstimate ??
          invitation?.guestCount ??
          invitation?.guestsCount ??
          invitation?.maxGuests ??
          0
      ) || 0;

    const commitments = suppliers.reduce(
      (sum, s) => sum + Number(s.price || 0),
      0
    );

    const paid = suppliers.reduce(
      (sum, s) => sum + Number(s.advance || 0),
      0
    );

    const available = Math.max(budgetTotal - commitments, 0);

    console.log("🟢 GET /overview – calculated budget:", {
      budgetTotal,
      estimatedGuests,
      commitments,
      paid,
      available,
    });

    return NextResponse.json({
      success: true,

      event: {
        id: event._id,

        title: invitation?.title || event.title || "הפקת אירוע",

        date: event.date,

        userId: event.userId,

        producerId: event.producerId,

        budgetTotal,

        estimatedGuests,

        estimatedGuestCount: estimatedGuests,
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
    console.error("❌ GET /events/[eventId]/overview failed:", err);

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
   PATCH – עדכון Overview
   תומך גם בתקציב וגם בכמות מוזמנים משוערת
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
      console.warn("⛔ PATCH /overview – UNAUTHORIZED");

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

    console.log("🟡 PATCH /overview – eventId:", eventId);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn("⛔ PATCH /overview – INVALID_EVENT_ID:", eventId);

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

    console.log("🟡 PATCH /overview – body received:", body);

    const hasBudgetTotal = Object.prototype.hasOwnProperty.call(
      body,
      "budgetTotal"
    );

    const hasEstimatedGuests =
      Object.prototype.hasOwnProperty.call(body, "estimatedGuests") ||
      Object.prototype.hasOwnProperty.call(body, "estimatedGuestCount");

    if (!hasBudgetTotal && !hasEstimatedGuests) {
      console.log("🟡 PATCH /overview – no supported fields, skipping update");

      return NextResponse.json({
        success: true,
      });
    }

    const updateFields: Record<string, number> = {};

    if (hasBudgetTotal) {
      const budgetTotal = Number(body.budgetTotal);

      console.log("🟡 PATCH /overview – parsed budgetTotal:", budgetTotal);

      if (!Number.isFinite(budgetTotal) || budgetTotal < 0) {
        console.warn("⛔ PATCH /overview – INVALID_BUDGET:", body.budgetTotal);

        return NextResponse.json(
          {
            success: false,
            error: "INVALID_BUDGET",
          },
          { status: 400 }
        );
      }

      updateFields.budgetTotal = budgetTotal;
    }

    if (hasEstimatedGuests) {
      const rawEstimatedGuests =
        body.estimatedGuests ?? body.estimatedGuestCount ?? 0;

      const estimatedGuests = Number(rawEstimatedGuests);

      console.log(
        "🟡 PATCH /overview – parsed estimatedGuests:",
        estimatedGuests
      );

      if (!Number.isFinite(estimatedGuests) || estimatedGuests < 0) {
        console.warn(
          "⛔ PATCH /overview – INVALID_ESTIMATED_GUESTS:",
          rawEstimatedGuests
        );

        return NextResponse.json(
          {
            success: false,
            error: "INVALID_ESTIMATED_GUESTS",
          },
          { status: 400 }
        );
      }

      updateFields.estimatedGuests = estimatedGuests;
      updateFields.estimatedGuestCount = estimatedGuests;
    }

    /* =========================
       Update Event
    ========================= */
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        status: "active",
        $or: [{ userId: auth.userId }, { producerId: auth.userId }],
      },
      {
        $set: updateFields,
      },
      {
        new: true,
      }
    ).select(
      "title date budgetTotal estimatedGuests estimatedGuestCount userId producerId"
    );

    if (!event) {
      console.warn("⛔ PATCH /overview – EVENT_NOT_FOUND:", eventId);

      return NextResponse.json(
        {
          success: false,
          error: "EVENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const budgetTotal = Number(event.budgetTotal) || 0;

    const estimatedGuests =
      Number(event.estimatedGuests ?? event.estimatedGuestCount ?? 0) || 0;

    console.log("🟢 PATCH /overview – overview saved to DB:", {
      budgetTotal,
      estimatedGuests,
    });

    return NextResponse.json({
      success: true,

      event: {
        id: event._id,

        title: event.title,

        date: event.date,

        userId: event.userId,

        producerId: event.producerId,

        budgetTotal,

        estimatedGuests,

        estimatedGuestCount: estimatedGuests,
      },
    });
  } catch (err) {
    console.error("❌ PATCH /events/[eventId]/overview failed:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}