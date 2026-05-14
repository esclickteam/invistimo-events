import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getTableLabel(table: any) {
  const raw = table.name || table.tableNumber || table.number;

  if (!raw) return "";

  const text = String(raw).trim();

  if (text.includes("שולחן")) return text;

  return `שולחן ${text}`;
}

function getTableNumber(table: any) {
  return table.tableNumber || table.number || undefined;
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const { eventId, guestId, toTableId } = body;

    if (!eventId || !guestId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר eventId או guestId",
        },
        { status: 400 }
      );
    }

    const eventObjectId = new mongoose.Types.ObjectId(String(eventId));
    const guestObjectId = new mongoose.Types.ObjectId(String(guestId));

    const guest = await InvitationGuest.findById(guestObjectId);

    if (!guest) {
      return NextResponse.json(
        {
          success: false,
          message: "מוזמן לא נמצא",
        },
        { status: 404 }
      );
    }

    const tables = await SeatingTable.find({ eventId: eventObjectId });

    if (!tables.length) {
      return NextResponse.json(
        {
          success: false,
          message: "לא נמצאו שולחנות לאירוע",
        },
        { status: 404 }
      );
    }

    // 1. ניקוי האורח מכל השולחנות של האירוע
    await SeatingTable.updateMany(
      { eventId: eventObjectId },
      {
        $pull: {
          seatedGuests: {
            guestId: String(guestId),
          },
        },
      }
    );

    let updatedTable = null;

    // 2. אם בחרו שולחן חדש — מוסיפים אותו לשולחן
    if (toTableId) {
      updatedTable = await SeatingTable.findOne({
        eventId: eventObjectId,
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(String(toTableId)) ? new mongoose.Types.ObjectId(String(toTableId)) : undefined },
          { id: String(toTableId) },
        ].filter(Boolean),
      });

      if (!updatedTable) {
        return NextResponse.json(
          {
            success: false,
            message: "השולחן שנבחר לא נמצא",
          },
          { status: 404 }
        );
      }

      const seatsCount = Math.max(
        1,
        Number(guest.actualArrivedCount || 0) ||
          Number(guest.arrivedCount || 0) ||
          Number(guest.guestsCount || 1)
      );

      const capacity = Number(
        updatedTable.capacity ||
          updatedTable.seats ||
          updatedTable.seatCount ||
          12
      );

      const occupiedSeatIndexes = new Set(
        (updatedTable.seatedGuests || [])
          .map((sg: any) => Number(sg.seatIndex))
          .filter((n: number) => Number.isFinite(n))
      );

      const freeSeatIndexes: number[] = [];

      for (let i = 0; i < capacity; i++) {
        if (!occupiedSeatIndexes.has(i)) {
          freeSeatIndexes.push(i);
        }

        if (freeSeatIndexes.length >= seatsCount) break;
      }

      if (freeSeatIndexes.length < seatsCount) {
        return NextResponse.json(
          {
            success: false,
            message: "אין מספיק מקומות פנויים בשולחן הזה",
          },
          { status: 400 }
        );
      }

      updatedTable.seatedGuests.push(
        ...freeSeatIndexes.map((seatIndex) => ({
          guestId: String(guestId),
          seatIndex,
          arrived: Number(guest.actualArrivedCount || 0) > 0,
        }))
      );

      await updatedTable.save();
    }

    // 3. עדכון האורח עצמו כדי שגם הדשבורד יציג נכון
    guest.tableId = toTableId || null;
    guest.tableName = updatedTable ? getTableLabel(updatedTable) : "";
    guest.tableNumber = updatedTable ? getTableNumber(updatedTable) : undefined;

    await guest.save();

    const nextTables = await SeatingTable.find({ eventId: eventObjectId }).lean();

    return NextResponse.json({
      success: true,
      guest,
      tables: nextTables,
      table: updatedTable,
    });
  } catch (err: any) {
    console.error("Move guest table error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "שגיאת שרת בעדכון שולחן",
      },
      { status: 500 }
    );
  }
}