import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

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

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const guard = await requireSeating();
    if (!guard.ok) return guard.response!;

    const { eventId } = await context.params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findOne({ eventId })
      .select("_id eventId")
      .lean<{ _id: mongoose.Types.ObjectId } | null>();

    if (!invitation?._id) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה הזמנה לאירוע הזה" },
        { status: 404 }
      );
    }

    const invitationId = invitation._id;

    const seatingDoc = await SeatingTable.findOne({ eventId }).lean<any>();

    if (!seatingDoc) {
      return NextResponse.json(
        { success: false, error: "לא נמצא סידור הושבה לאירוע הזה" },
        { status: 404 }
      );
    }

    const rawTables = Array.isArray(seatingDoc.tables)
      ? seatingDoc.tables
      : [];

    const updatedTables = rawTables.map((table: any) => ({
      ...table,
      seatedGuests: [],
    }));

    const tablesResult = await SeatingTable.updateOne(
      { eventId },
      {
        $set: {
          tables: updatedTables,
          updatedAt: new Date(),
        },
      }
    );

    const guestsResult = await InvitationGuest.updateMany(
      { invitationId },
      {
        $unset: {
          tableId: "",
          tableName: "",
          tableNumber: "",
          seatNumber: "",
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "CLEAR_SMART_SEATING_COMPLETED",
      clearedTablesCount: rawTables.length,
      clearedGuestsCount: guestsResult.modifiedCount ?? 0,
      modifiedSeatingDocs: tablesResult.modifiedCount ?? 0,
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