import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Seating from "@/models/Seating";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeId(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
}

function sameId(a: any, b: any) {
  return normalizeId(a) === normalizeId(b);
}

function getTableLabel(table: any) {
  const raw = table?.name || table?.tableNumber || table?.number;

  if (!raw) return "";

  const text = String(raw).trim();

  if (text.includes("שולחן")) return text;

  return `שולחן ${text}`;
}

function getTableNumber(table: any) {
  return table?.tableNumber || table?.number || undefined;
}

function getGuestSeatsCount(guest: any) {
  return Math.max(
    1,
    Number(guest.actualArrivedCount || 0) ||
      Number(guest.arrivedCount || 0) ||
      Number(guest.guestsCount || 1)
  );
}

function getCapacity(table: any) {
  return Number(table?.capacity || table?.seats || table?.seatCount || 12);
}

function findFreeSeatIndexes(table: any, count: number, guestId: string) {
  const capacity = getCapacity(table);

  const occupied = new Set(
    (table.seatedGuests || [])
      .filter((sg: any) => !sameId(sg.guestId, guestId))
      .map((sg: any) => Number(sg.seatIndex))
      .filter((n: number) => Number.isFinite(n))
  );

  const free: number[] = [];

  for (let i = 0; i < capacity; i++) {
    if (!occupied.has(i)) {
      free.push(i);
    }

    if (free.length >= count) {
      break;
    }
  }

  return free;
}

function cleanGuestFromTable(table: any, guestId: string) {
  table.seatedGuests = (table.seatedGuests || []).filter(
    (sg: any) => !sameId(sg.guestId, guestId)
  );
}

function isTargetTable(table: any, toTableId: string) {
  return (
    sameId(table._id, toTableId) ||
    sameId(table.id, toTableId) ||
    sameId(table.tableId, toTableId)
  );
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const eventId = String(body.eventId || "");
    const guestId = String(body.guestId || "");
    const toTableId = body.toTableId ? String(body.toTableId) : "";

    if (!eventId || !guestId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר eventId או guestId",
        },
        { status: 400 }
      );
    }

    const guest = await InvitationGuest.findById(guestId);

    if (!guest) {
      return NextResponse.json(
        {
          success: false,
          message: "מוזמן לא נמצא",
        },
        { status: 404 }
      );
    }

    const seatsCount = getGuestSeatsCount(guest);

    /*
      קודם מנסים לעדכן לפי מודל Seating:
      מסמך אחד של אירוע שיש בתוכו tables[]
    */
    const seating = await Seating.findOne({
      $or: [
        { eventId },
        mongoose.Types.ObjectId.isValid(eventId)
          ? { eventId: new mongoose.Types.ObjectId(eventId) }
          : {},
      ],
    });

    if (seating?.tables?.length) {
      let selectedTable: any = null;

      for (const table of seating.tables) {
        if (toTableId && isTargetTable(table, toTableId)) {
          selectedTable = table;
        }
      }

      if (toTableId && !selectedTable) {
        return NextResponse.json(
          {
            success: false,
            message: "השולחן שנבחר לא נמצא",
            debug: {
              eventId,
              guestId,
              toTableId,
              source: "Seating",
              availableTables: seating.tables.map((t: any) => ({
                _id: normalizeId(t._id),
                id: normalizeId(t.id),
                name: t.name,
                tableNumber: t.tableNumber,
                number: t.number,
              })),
            },
          },
          { status: 404 }
        );
      }

      for (const table of seating.tables) {
        cleanGuestFromTable(table, guestId);
      }

      if (selectedTable) {
        const freeSeats = findFreeSeatIndexes(
          selectedTable,
          seatsCount,
          guestId
        );

        if (freeSeats.length < seatsCount) {
          return NextResponse.json(
            {
              success: false,
              message: "אין מספיק מקומות פנויים בשולחן הזה",
            },
            { status: 400 }
          );
        }

        selectedTable.seatedGuests.push(
          ...freeSeats.map((seatIndex) => ({
            guestId,
            seatIndex,
            arrived: Number(guest.actualArrivedCount || 0) > 0,
          }))
        );
      }

      guest.tableId = toTableId || null;
      guest.tableName = selectedTable ? getTableLabel(selectedTable) : "";
      guest.tableNumber = selectedTable
        ? getTableNumber(selectedTable)
        : undefined;

      await guest.save();
      await seating.save();

      return NextResponse.json({
        success: true,
        guest,
        tables: seating.tables,
        table: selectedTable || null,
        source: "Seating",
      });
    }

    /*
      fallback:
      אם אצלך האירוע כן שומר כל שולחן כ־SeatingTable נפרד
    */
    const eventQuery: any[] = [{ eventId }];

    if (mongoose.Types.ObjectId.isValid(eventId)) {
      eventQuery.push({ eventId: new mongoose.Types.ObjectId(eventId) });
    }

    const tables = await SeatingTable.find({
      $or: eventQuery,
    });

    if (!tables.length) {
      return NextResponse.json(
        {
          success: false,
          message: "לא נמצאו שולחנות לאירוע",
          debug: {
            eventId,
            guestId,
            toTableId,
          },
        },
        { status: 404 }
      );
    }

    let selectedTable: any = null;

    if (toTableId) {
      selectedTable =
        tables.find((table: any) => isTargetTable(table, toTableId)) || null;

      if (!selectedTable) {
        return NextResponse.json(
          {
            success: false,
            message: "השולחן שנבחר לא נמצא",
            debug: {
              eventId,
              guestId,
              toTableId,
              source: "SeatingTable",
              availableTables: tables.map((t: any) => ({
                _id: normalizeId(t._id),
                id: normalizeId(t.id),
                name: t.name,
                tableNumber: t.tableNumber,
                number: t.number,
              })),
            },
          },
          { status: 404 }
        );
      }
    }

    for (const table of tables) {
      cleanGuestFromTable(table, guestId);
      await table.save();
    }

    if (selectedTable) {
      const freeSeats = findFreeSeatIndexes(
        selectedTable,
        seatsCount,
        guestId
      );

      if (freeSeats.length < seatsCount) {
        return NextResponse.json(
          {
            success: false,
            message: "אין מספיק מקומות פנויים בשולחן הזה",
          },
          { status: 400 }
        );
      }

      selectedTable.seatedGuests.push(
        ...freeSeats.map((seatIndex) => ({
          guestId,
          seatIndex,
          arrived: Number(guest.actualArrivedCount || 0) > 0,
        }))
      );

      await selectedTable.save();
    }

    guest.tableId = toTableId || null;
    guest.tableName = selectedTable ? getTableLabel(selectedTable) : "";
    guest.tableNumber = selectedTable
      ? getTableNumber(selectedTable)
      : undefined;

    await guest.save();

    const nextTables = await SeatingTable.find({
      $or: eventQuery,
    }).lean();

    return NextResponse.json({
      success: true,
      guest,
      tables: nextTables,
      table: selectedTable || null,
      source: "SeatingTable",
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