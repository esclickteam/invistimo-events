import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import { requireSeating } from "@/lib/guards/requireSeating";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

/* ===============================
   POST – CLEAR SMART SEATING
   מסיר הושבה מכל השולחנות
   מחזיר אורחים לרשימת האורחים
=============================== */

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* ===============================
       AUTH
    =============================== */

    const guard = await requireSeating();

    if (!guard.ok) {
      return guard.response!;
    }

    /* ===============================
       PARAMS
    =============================== */

    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_EVENT_ID",
        },
        { status: 400 }
      );
    }

    /* ===============================
       FIND INVITATION BY EVENT ID
       אותו מקור כמו /api/seating/guests/[eventId]
    =============================== */

    const invitation = await Invitation.findOne({ eventId })
      .select("_id eventId")
      .lean<{
        _id: any;
        eventId?: string;
      } | null>();

    if (!invitation?._id) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאה הזמנה לאירוע הזה",
        },
        { status: 404 }
      );
    }

    const invitationId = invitation._id;

    /* ===============================
       CHECK TABLES
    =============================== */

    const tablesCount = await SeatingTable.countDocuments({
      eventId,
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

    /* ===============================
       CHECK GUESTS
       חשוב: InvitationGuest לפי invitationId
    =============================== */

    const guestsCount = await InvitationGuest.countDocuments({
      invitationId,
    });

    if (!guestsCount) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאו אורחים להזמנה הזו",
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
      { eventId },
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

    const guestsResult = await InvitationGuest.updateMany(
      { invitationId },
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
      debug: {
        eventId,
        invitationId: String(invitationId),
        guestsCount,
        tablesCount,
      },
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