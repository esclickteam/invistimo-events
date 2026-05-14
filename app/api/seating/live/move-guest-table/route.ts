import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Seating from "@/models/Seating";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============================================================
   Helpers
============================================================ */

function normalizeId(value: any) {
  if (!value) return "";

  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);

  if (typeof value === "object") {
    return String(value._id || value.id || value.toString?.() || "").trim();
  }

  return String(value).trim();
}

function cleanValue(value: any) {
  return String(value || "")
    .replace(/שולחן/g, "")
    .replace(/\(.+?\)/g, "")
    .trim();
}

function sameId(a: any, b: any) {
  const left = normalizeId(a);
  const right = normalizeId(b);

  return !!left && !!right && left === right;
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

function getCapacity(table: any) {
  return Number(table?.capacity || table?.seats || table?.seatCount || 12);
}

function getGuestSeatsCount(guest: any) {
  return Math.max(
    1,
    Number(guest.actualArrivedCount || 0) ||
      Number(guest.arrivedCount || 0) ||
      Number(guest.guestsCount || 1)
  );
}

function getTableStableId(table: any) {
  return (
    normalizeId(table?._id) ||
    normalizeId(table?.id) ||
    normalizeId(table?.tableId) ||
    normalizeId(table?.tableNumber) ||
    normalizeId(table?.number) ||
    ""
  );
}

function isTargetTable(table: any, toTableId: string) {
  const selectedRaw = normalizeId(toTableId);
  const selectedClean = cleanValue(toTableId);

  const candidates = [
    normalizeId(table?._id),
    normalizeId(table?.id),
    normalizeId(table?.tableId),

    cleanValue(table?._id),
    cleanValue(table?.id),
    cleanValue(table?.tableId),
    cleanValue(table?.name),
    cleanValue(table?.tableNumber),
    cleanValue(table?.number),
    cleanValue(getTableLabel(table)),
  ].filter(Boolean);

  return candidates.includes(selectedRaw) || candidates.includes(selectedClean);
}

function cleanGuestFromTable(table: any, guestId: string) {
  table.seatedGuests = (table.seatedGuests || []).filter(
    (sg: any) => !sameId(sg.guestId, guestId)
  );
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

    if (free.length >= count) break;
  }

  return free;
}

function buildScopedQuery(eventId: string, guest: any) {
  const invitationId = normalizeId(guest.invitationId || guest.invitation);

  const query: any[] = [];

  if (eventId) {
    query.push({ eventId }, { eventId: String(eventId) });

    if (mongoose.Types.ObjectId.isValid(eventId)) {
      query.push({ eventId: new mongoose.Types.ObjectId(eventId) });
    }
  }

  if (invitationId) {
    query.push({ invitationId }, { invitation: invitationId });

    if (mongoose.Types.ObjectId.isValid(invitationId)) {
      const invitationObjectId = new mongoose.Types.ObjectId(invitationId);

      query.push(
        { invitationId: invitationObjectId },
        { invitation: invitationObjectId }
      );
    }
  }

  return query;
}

function buildDirectTableQuery(toTableId: string) {
  const clean = cleanValue(toTableId);

  const query: any[] = [
    { id: toTableId },
    { tableId: toTableId },
    { name: toTableId },
    { tableNumber: toTableId },
    { number: toTableId },
  ];

  if (clean && clean !== toTableId) {
    query.push(
      { id: clean },
      { tableId: clean },
      { name: clean },
      { name: `שולחן ${clean}` },
      { tableNumber: clean },
      { number: clean }
    );
  }

  const numeric = Number(clean);

  if (Number.isFinite(numeric)) {
    query.push({ tableNumber: numeric }, { number: numeric });
  }

  if (mongoose.Types.ObjectId.isValid(toTableId)) {
    query.push({ _id: new mongoose.Types.ObjectId(toTableId) });
  }

  return query;
}

function serializeTables(tables: any[]) {
  return tables.map((table: any) => ({
    _id: normalizeId(table._id),
    id: normalizeId(table.id),
    tableId: normalizeId(table.tableId),
    name: table.name,
    tableNumber: table.tableNumber,
    number: table.number,
    eventId: normalizeId(table.eventId),
    invitationId: normalizeId(table.invitationId),
    seatedGuests: table.seatedGuests || [],
  }));
}

async function updateGuestFields(guest: any, table: any | null) {
  guest.tableId = table ? getTableStableId(table) : null;
  guest.tableName = table ? getTableLabel(table) : "";
  guest.tableNumber = table ? getTableNumber(table) : undefined;

  await guest.save();
}

async function findTablesByDirectTable(toTableId: string) {
  if (!toTableId) return [];

  const directTable = await SeatingTable.findOne({
    $or: buildDirectTableQuery(toTableId),
  });

  if (!directTable) return [];

  const scopedByDirectTable: any[] = [];

  if (directTable.eventId) {
    scopedByDirectTable.push(
      { eventId: directTable.eventId },
      { eventId: normalizeId(directTable.eventId) }
    );
  }

  if (directTable.invitationId) {
    scopedByDirectTable.push(
      { invitationId: directTable.invitationId },
      { invitationId: normalizeId(directTable.invitationId) },
      { invitation: directTable.invitationId },
      { invitation: normalizeId(directTable.invitationId) }
    );
  }

  if (!scopedByDirectTable.length) return [directTable];

  const tables = await SeatingTable.find({
    $or: scopedByDirectTable,
  });

  return tables.length ? tables : [directTable];
}

/* ============================================================
   PATCH
============================================================ */

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const eventId = String(body.eventId || "").trim();
    const guestId = String(body.guestId || "").trim();
    const toTableId = body.toTableId ? String(body.toTableId).trim() : "";

    if (!guestId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר guestId",
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
    const scopedQuery = buildScopedQuery(eventId, guest);

    if (!scopedQuery.length && toTableId) {
      const directTables = await findTablesByDirectTable(toTableId);

      if (!directTables.length) {
        return NextResponse.json(
          {
            success: false,
            message: "לא נמצאו שולחנות לאירוע",
            debug: {
              eventId,
              guestId,
              toTableId,
              guestInvitationId: normalizeId(guest.invitationId),
            },
          },
          { status: 404 }
        );
      }
    }

    /*
      1. ניסיון ראשון:
      Seating - מסמך אחד עם tables[]
    */
    const seating = scopedQuery.length
      ? await Seating.findOne({
          $or: scopedQuery,
        })
      : null;

    if (seating?.tables?.length) {
      let selectedTable: any = null;

      if (toTableId) {
        selectedTable =
          seating.tables.find((table: any) => isTargetTable(table, toTableId)) ||
          null;
      }

      if (!toTableId || selectedTable) {
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

        await updateGuestFields(guest, selectedTable);
        await seating.save();

        return NextResponse.json({
          success: true,
          guest,
          tables: seating.tables,
          table: selectedTable || null,
          source: "Seating",
        });
      }
    }

    /*
      2. ניסיון שני:
      SeatingTable - כל שולחן כמסמך נפרד
    */
    let tables = scopedQuery.length
      ? await SeatingTable.find({
          $or: scopedQuery,
        })
      : [];

    /*
      חשוב:
      גם אם נמצאו שולחנות לפי eventId / invitationId,
      עדיין יכול להיות שהשולחן שנבחר לא נמצא שם בגלל mismatch.
      לכן עושים fallback ישיר לפי toTableId גם כש-tables לא ריק.
    */
    let selectedTable: any = null;

    if (toTableId && tables.length) {
      selectedTable =
        tables.find((table: any) => isTargetTable(table, toTableId)) || null;
    }

    if (toTableId && !selectedTable) {
      const directTables = await findTablesByDirectTable(toTableId);

      if (directTables.length) {
        tables = directTables;
        selectedTable =
          tables.find((table: any) => isTargetTable(table, toTableId)) ||
          directTables[0] ||
          null;
      }
    }

    if (!tables.length) {
      return NextResponse.json(
        {
          success: false,
          message: "לא נמצאו שולחנות לאירוע",
          debug: {
            eventId,
            guestId,
            toTableId,
            guestInvitationId: normalizeId(guest.invitationId),
            seatingFound: !!seating,
            seatingTablesCount: seating?.tables?.length || 0,
          },
        },
        { status: 404 }
      );
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
            guestInvitationId: normalizeId(guest.invitationId),
            availableTables: serializeTables(tables),
            seatingAvailableTables: seating?.tables
              ? serializeTables(seating.tables)
              : [],
          },
        },
        { status: 404 }
      );
    }

    /*
      קודם מנקים את האורח מכל השולחנות.
      חשוב כדי שלא יהיה כפול.
    */
    for (const table of tables) {
      cleanGuestFromTable(table, guestId);
      await table.save();
    }

    if (selectedTable) {
      const freeSeats = findFreeSeatIndexes(selectedTable, seatsCount, guestId);

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

    await updateGuestFields(guest, selectedTable);

    const nextTables = scopedQuery.length
      ? await SeatingTable.find({
          $or: scopedQuery,
        }).lean()
      : [];

    return NextResponse.json({
      success: true,
      guest,
      tables: nextTables.length ? nextTables : tables,
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