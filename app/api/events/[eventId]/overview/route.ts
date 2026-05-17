import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";

import Event from "@/models/Event";
import EventTask from "@/models/EventTask";
import EventSupplier from "@/models/EventSupplier";

import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   Helpers
========================================================= */
function hasOwn(body: any, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function normalizeOptionalString(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeNullableNumber(value: any) {
  if (value === "" || value === null || value === undefined) return null;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) return "INVALID";

  return numberValue;
}

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
       חשוב: לא מושכים שום דבר מ-Invitation
    ========================= */
    const event = await Event.findOne({
      _id: eventId,
      status: "active",
      $or: [{ userId: auth.userId }, { producerId: auth.userId }],
    })
      .select(
        [
          "title",
          "date",
          "time",
          "location",
          "budgetTotal",
          "estimatedGuests",
          "estimatedGuestCount",
          "userId",
          "producerId",
        ].join(" ")
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

    console.log("🟢 GET /overview – event from DB:", {
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      budgetTotal: event.budgetTotal,
      estimatedGuests: event.estimatedGuests,
      estimatedGuestCount: event.estimatedGuestCount,
    });

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
      event.estimatedGuests === null ||
      event.estimatedGuests === undefined ||
      event.estimatedGuests === ""
        ? event.estimatedGuestCount === null ||
          event.estimatedGuestCount === undefined ||
          event.estimatedGuestCount === ""
          ? null
          : Number(event.estimatedGuestCount)
        : Number(event.estimatedGuests);

    const normalizedEstimatedGuests =
      Number.isFinite(Number(estimatedGuests)) && Number(estimatedGuests) > 0
        ? Number(estimatedGuests)
        : null;

    const commitments = suppliers.reduce(
      (sum, supplier) => sum + Number(supplier.price || 0),
      0
    );

    const paid = suppliers.reduce(
      (sum, supplier) => sum + Number(supplier.advance || 0),
      0
    );

    const available = Math.max(budgetTotal - commitments, 0);

    console.log("🟢 GET /overview – calculated budget:", {
      budgetTotal,
      estimatedGuests: normalizedEstimatedGuests,
      commitments,
      paid,
      available,
    });

    return NextResponse.json({
      success: true,

      event: {
        id: event._id,

        title: event.title || "",

        date: event.date || "",

        time: event.time || "",

        location: {
          address: event.location?.address || "",
          lat: event.location?.lat,
          lng: event.location?.lng,
        },

        userId: event.userId,

        producerId: event.producerId,

        budgetTotal,

        estimatedGuests: normalizedEstimatedGuests,

        estimatedGuestCount: normalizedEstimatedGuests,
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
   תומך:
   - פרטי אירוע
   - תקציב
   - כמות מוזמנים משוערת ידנית
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

    const hasBudgetTotal = hasOwn(body, "budgetTotal");

    const hasEstimatedGuests =
      hasOwn(body, "estimatedGuests") || hasOwn(body, "estimatedGuestCount");

    const hasTitle = hasOwn(body, "title");
    const hasDate = hasOwn(body, "date");
    const hasTime = hasOwn(body, "time");

    const hasLocationAddress =
      hasOwn(body, "locationAddress") ||
      hasOwn(body, "address") ||
      hasOwn(body, "location");

    const hasAnySupportedField =
      hasBudgetTotal ||
      hasEstimatedGuests ||
      hasTitle ||
      hasDate ||
      hasTime ||
      hasLocationAddress;

    if (!hasAnySupportedField) {
      console.log("🟡 PATCH /overview – no supported fields, skipping update");

      return NextResponse.json({
        success: true,
      });
    }

    const updateFields: Record<string, any> = {};

    /* =========================
       Budget
    ========================= */
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

    /* =========================
       Estimated Guests
       ידני בלבד — לא מ-Invitation ולא מ-maxGuests
    ========================= */
    if (hasEstimatedGuests) {
      const rawEstimatedGuests =
        hasOwn(body, "estimatedGuests")
          ? body.estimatedGuests
          : body.estimatedGuestCount;

      const estimatedGuests = normalizeNullableNumber(rawEstimatedGuests);

      console.log(
        "🟡 PATCH /overview – parsed estimatedGuests:",
        estimatedGuests
      );

      if (estimatedGuests === "INVALID") {
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
       Event Details
    ========================= */
    if (hasTitle) {
      updateFields.title = normalizeOptionalString(body.title);
    }

    if (hasDate) {
      updateFields.date = normalizeOptionalString(body.date);
    }

    if (hasTime) {
      updateFields.time = normalizeOptionalString(body.time);
    }

    if (hasLocationAddress) {
      const locationAddress =
        typeof body.location === "object" && body.location !== null
          ? body.location.address
          : body.locationAddress ?? body.address ?? "";

      updateFields["location.address"] = normalizeOptionalString(
        locationAddress
      );
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
      [
        "title",
        "date",
        "time",
        "location",
        "budgetTotal",
        "estimatedGuests",
        "estimatedGuestCount",
        "userId",
        "producerId",
      ].join(" ")
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
      event.estimatedGuests === null ||
      event.estimatedGuests === undefined ||
      event.estimatedGuests === ""
        ? event.estimatedGuestCount === null ||
          event.estimatedGuestCount === undefined ||
          event.estimatedGuestCount === ""
          ? null
          : Number(event.estimatedGuestCount)
        : Number(event.estimatedGuests);

    const normalizedEstimatedGuests =
      Number.isFinite(Number(estimatedGuests)) && Number(estimatedGuests) > 0
        ? Number(estimatedGuests)
        : null;

    console.log("🟢 PATCH /overview – overview saved to DB:", {
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      budgetTotal,
      estimatedGuests: normalizedEstimatedGuests,
    });

    return NextResponse.json({
      success: true,

      event: {
        id: event._id,

        title: event.title || "",

        date: event.date || "",

        time: event.time || "",

        location: {
          address: event.location?.address || "",
          lat: event.location?.lat,
          lng: event.location?.lng,
        },

        userId: event.userId,

        producerId: event.producerId,

        budgetTotal,

        estimatedGuests: normalizedEstimatedGuests,

        estimatedGuestCount: normalizedEstimatedGuests,
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