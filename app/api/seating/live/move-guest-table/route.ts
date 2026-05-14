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
  if (typeof value === "number") return String(value).trim();

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
    normalizeId(table?.tableNumber),
    normalizeId(table?.number),

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

function tableHasGuest(table: any, guestId: string) {
  return (table?.seatedGuests || []).some((sg: any) =>
    sameId(sg.guestId, guestId)
  );
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
  const numeric = Number(clean);

  const query: any[] = [
    { id: toTableId },
    { tableId: toTableId },
    { name: toTableId },
    { tableNumber: toTableId },
    { number: toTableId },
    { "tables.id": toTableId },
    { "tables.tableId": toTableId },
    { "tables.name": toTableId },
    { "tables.tableNumber": toTableId },
    { "tables.number": toTableId },
  ];

  if (clean && clean !== toTableId) {
    query.push(
      { id: clean },
      { tableId: clean },
      { name: clean },
      { name: `שולחן ${clean}` },
      { tableNumber: clean },
      { number: clean },
      { "tables.id": clean },
      { "tables.tableId": clean },
      { "tables.name": clean },
      { "tables.name": `שולחן ${clean}` },
      { "tables.tableNumber": clean },
      { "tables.number": clean }
    );
  }

  if (Number.isFinite(numeric)) {
    query.push(
      { tableNumber: numeric },
      { number: numeric },
      { "tables.tableNumber": numeric },
      { "tables.number": numeric }
    );
  }

  if (mongoose.Types.ObjectId.isValid(toTableId)) {
    query.push(
      { _id: new mongoose.Types.ObjectId(toTableId) },
      { "tables._id": new mongoose.Types.ObjectId(toTableId) }
    );
  }

  return query;
}

function serializeTables(tables: any[]) {
  return (tables || []).map((table: any) => ({
    _id: normalizeId(table?._id),
    id: normalizeId(table?.id),
    tableId: normalizeId(table?.tableId),
    name: table?.name,
    tableNumber: table?.tableNumber,
    number: table?.number,
    capacity: table?.capacity,
    seats: table?.seats,
    seatCount: table?.seatCount,
    seatedGuestsCount: table?.seatedGuests?.length || 0,
  }));
}

async function updateGuestFields(guest: any, table: any | null) {
  guest.tableId = table ? getTableStableId(table) : null;
  guest.tableName = table ? getTableLabel(table) : "";
  guest.tableNumber = table ? getTableNumber(table) : undefined;

  await guest.save();
}

async function applyMoveToTablesArray({
  ownerDoc,
  tables,
  guest,
  guestId,
  toTableId,
  seatsCount,
  source,
}: {
  ownerDoc: any;
  tables: any[];
  guest: any;
  guestId: string;
  toTableId: string;
  seatsCount: number;
  source: string;
}) {
  let selectedTable: any = null;

  if (toTableId) {
    selectedTable =
      tables.find((table: any) => isTargetTable(table, toTableId)) || null;

    if (!selectedTable) {
      return null;
    }
  }

  for (const table of tables) {
    cleanGuestFromTable(table, guestId);
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

    selectedTable.seatedGuests = selectedTable.seatedGuests || [];

    selectedTable.seatedGuests.push(
      ...freeSeats.map((seatIndex) => ({
        guestId,
        seatIndex,
        arrived: Number(guest.actualArrivedCount || 0) > 0,
      }))
    );
  }

  await updateGuestFields(guest, selectedTable);

  if (typeof ownerDoc.markModified === "function") {
    ownerDoc.markModified("tables");
  }

  await ownerDoc.save();

  return NextResponse.json({
    success: true,
    guest,
    tables,
    table: selectedTable || null,
    source,
  });
}

async function findSeatingTableDocByScopeOrDirect({
  scopedQuery,
  toTableId,
}: {
  scopedQuery: any[];
  toTableId: string;
}) {
  let doc: any = null;

  if (scopedQuery.length) {
    doc = await SeatingTable.findOne({
      $or: scopedQuery,
      tables: { $exists: true },
    });
  }

  if (!doc && toTableId) {
    doc = await SeatingTable.findOne({
      $or: buildDirectTableQuery(toTableId),
      tables: { $exists: true },
    });
  }

  return doc;
}

async function findLegacyStandaloneTables({
  scopedQuery,
  toTableId,
}: {
  scopedQuery: any[];
  toTableId: string;
}) {
  let docs: any[] = [];

  if (scopedQuery.length) {
    docs = await SeatingTable.find({
      $or: scopedQuery,
    });
  }

  docs = docs.filter((doc: any) => !Array.isArray(doc.tables));

  if (!docs.length && toTableId) {
    const directTable = await SeatingTable.findOne({
      $or: buildDirectTableQuery(toTableId),
    });

    if (directTable && !Array.isArray(directTable.tables)) {
      const widerQuery: any[] = [];

      if (directTable.eventId) {
        widerQuery.push(
          { eventId: directTable.eventId },
          { eventId: normalizeId(directTable.eventId) }
        );
      }

      if (directTable.invitationId) {
        widerQuery.push(
          { invitationId: directTable.invitationId },
          { invitationId: normalizeId(directTable.invitationId) },
          { invitation: directTable.invitationId },
          { invitation: normalizeId(directTable.invitationId) }
        );
      }

      if (widerQuery.length) {
        docs = await SeatingTable.find({
          $or: widerQuery,
        });

        docs = docs.filter((doc: any) => !Array.isArray(doc.tables));
      }

      if (!docs.length) {
        docs = [directTable];
      }
    }
  }

  return docs;
}

async function applyMoveToLegacyStandaloneTables({
  tables,
  guest,
  guestId,
  toTableId,
  seatsCount,
}: {
  tables: any[];
  guest: any;
  guestId: string;
  toTableId: string;
  seatsCount: number;
}) {
  let selectedTable: any = null;

  if (toTableId) {
    selectedTable =
      tables.find((table: any) => isTargetTable(table, toTableId)) || null;

    if (!selectedTable) {
      return null;
    }
  }

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

    selectedTable.seatedGuests = selectedTable.seatedGuests || [];

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

  const freshTables = await SeatingTable.find({
    _id: { $in: tables.map((table: any) => table._id) },
  }).lean();

  return NextResponse.json({
    success: true,
    guest,
    tables: freshTables.length ? freshTables : tables,
    table: selectedTable || null,
    source: "SeatingTableLegacy",
  });
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

    /*
      1. SeatingTable במבנה האמיתי שלך:
      מסמך אחד שיש בתוכו tables[].
      זה החלק החשוב שהיה חסר.
    */
    const seatingTableDoc = await findSeatingTableDocByScopeOrDirect({
      scopedQuery,
      toTableId,
    });

    if (seatingTableDoc?.tables?.length) {
      const hasTarget = toTableId
        ? seatingTableDoc.tables.some((table: any) =>
            isTargetTable(table, toTableId)
          )
        : true;

      const hasGuestInside = seatingTableDoc.tables.some((table: any) =>
        tableHasGuest(table, guestId)
      );

      if (hasTarget || !toTableId || hasGuestInside) {
        const response = await applyMoveToTablesArray({
          ownerDoc: seatingTableDoc,
          tables: seatingTableDoc.tables,
          guest,
          guestId,
          toTableId,
          seatsCount,
          source: "SeatingTable.tables",
        });

        if (response) return response;
      }
    }

    /*
      2. Seating במידה ויש אצלך גם מודל ישן/מקביל עם tables[].
    */
    const seatingDoc = scopedQuery.length
      ? await Seating.findOne({
          $or: scopedQuery,
        })
      : null;

    if (seatingDoc?.tables?.length) {
      const hasTarget = toTableId
        ? seatingDoc.tables.some((table: any) => isTargetTable(table, toTableId))
        : true;

      const hasGuestInside = seatingDoc.tables.some((table: any) =>
        tableHasGuest(table, guestId)
      );

      if (hasTarget || !toTableId || hasGuestInside) {
        const response = await applyMoveToTablesArray({
          ownerDoc: seatingDoc,
          tables: seatingDoc.tables,
          guest,
          guestId,
          toTableId,
          seatsCount,
          source: "Seating.tables",
        });

        if (response) return response;
      }
    }

    /*
      3. fallback אחרון בלבד:
      אם קיימים שולחנות כמסמכים נפרדים.
      לא משתמשים בזה כברירת מחדל כדי לא לשבור את המבנה שלך.
    */
    const legacyTables = await findLegacyStandaloneTables({
      scopedQuery,
      toTableId,
    });

    if (legacyTables.length) {
      const response = await applyMoveToLegacyStandaloneTables({
        tables: legacyTables,
        guest,
        guestId,
        toTableId,
        seatsCount,
      });

      if (response) return response;
    }

    return NextResponse.json(
      {
        success: false,
        message: toTableId
          ? "השולחן שנבחר לא נמצא"
          : "לא נמצאו שולחנות לאירוע",
        debug: {
          eventId,
          guestId,
          toTableId,
          guestInvitationId: normalizeId(guest.invitationId),
          scopedQueryCount: scopedQuery.length,
          seatingTableDocFound: !!seatingTableDoc,
          seatingTableTablesCount: seatingTableDoc?.tables?.length || 0,
          seatingDocFound: !!seatingDoc,
          seatingTablesCount: seatingDoc?.tables?.length || 0,
          seatingTableAvailableTables: seatingTableDoc?.tables
            ? serializeTables(seatingTableDoc.tables)
            : [],
          seatingAvailableTables: seatingDoc?.tables
            ? serializeTables(seatingDoc.tables)
            : [],
          legacyTablesCount: legacyTables.length,
          legacyAvailableTables: serializeTables(legacyTables),
        },
      },
      { status: 404 }
    );
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