import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import Guest from "@/models/Guest";
import SeatingTable from "@/models/SeatingTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ===============================
   POST – CLEAR SMART SEATING
   מסיר הושבה מכל השולחנות
   מחזיר אורחים לרשימת האורחים
=============================== */

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();

    /* ===============================
       AUTH
    =============================== */

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    /* ===============================
       PARAMS
    =============================== */

    const { eventId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EVENT_ID",
        },
        { status: 400 }
      );
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    /* ===============================
       CHECK DATA
    =============================== */

    const tablesCount = await SeatingTable.countDocuments({
      eventId: eventObjectId,
    });

    if (!tablesCount) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאו שולחנות לאירוע הזה",
        },
        { status: 404 }
      );
    }

    const guestsCount = await Guest.countDocuments({
      eventId: eventObjectId,
      $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
    });

    if (!guestsCount) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאו אורחים לאירוע הזה",
        },
        { status: 404 }
      );
    }

    /* ===============================
       CLEAR TABLE SEATING
       לא מוחק שולחנות
       רק מרוקן seatedGuests
    =============================== */

    const tablesResult = await SeatingTable.updateMany(
      { eventId: eventObjectId },
      {
        $set: {
          seatedGuests: [],
        },
      }
    );

    /* ===============================
       CLEAR GUEST SEATING
       לא מוחק אורחים
       רק מסיר שיוך לשולחן
    =============================== */

    const guestsResult = await Guest.updateMany(
      {
        eventId: eventObjectId,
        $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
      },
      {
        $unset: {
          tableId: "",
          seatNumber: "",
          tableName: "",
        },
      }
    );

    /* ===============================
       RESPONSE
    =============================== */

    return NextResponse.json({
      success: true,
      message: "CLEAR_SMART_SEATING_COMPLETED",
      clearedTablesCount: tablesResult.modifiedCount ?? 0,
      clearedGuestsCount: guestsResult.modifiedCount ?? 0,
    });
  } catch (error: any) {
    console.error("❌ CLEAR SMART SEATING ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "CLEAR_SMART_SEATING_FAILED",
      },
      { status: 500 }
    );
  }
}