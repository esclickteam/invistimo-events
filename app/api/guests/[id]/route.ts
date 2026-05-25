import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Group from "@/models/Group";
import Seating from "@/models/Seating";
import SeatingTable from "@/models/SeatingTable";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { recalcGroupExpectedCount } from "@/lib/recalcGroupExpectedCount";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const RSVP_VALUES = new Set(["yes", "no", "pending"]);

const CALL_ANSWER_VALUES = new Set(["answered", "no_answer"]);
const CALL_RESULT_VALUES = new Set([
  "yes",
  "no",
  "will_reply",
  "needs_correction",
]);

/* ============================================
   Helpers
============================================ */
async function getMaxGuestsForInvitationOwner(ownerId: string) {
  const owner = await User.findById(ownerId).lean();
  return owner?.planLimits?.maxGuests ?? 100;
}

async function getInvitationProducerPermission(auth: any, invitation: any) {
  const producerIdStr = invitation.producerId?.toString?.() || null;

  return {
    producerIdStr,
    isProducerByInvitation:
      !!producerIdStr &&
      (auth.userId?.toString?.() === producerIdStr ||
        auth.impersonatedBy?.toString?.() === producerIdStr),
  };
}

function toSafeNumber(value: any, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function normalizeCallRoundNotes(notes: any) {
  if (notes === null || notes === undefined || notes === "") return [];

  if (typeof notes === "string") {
    const text = notes.trim();
    if (!text) return [];

    return [
      {
        text,
        createdAt: new Date(),
        createdBy: "מערכת",
      },
    ];
  }

  if (!Array.isArray(notes)) {
    const text =
      typeof notes?.text === "string"
        ? notes.text.trim()
        : typeof notes?.note === "string"
          ? notes.note.trim()
          : "";

    if (!text) return [];

    return [
      {
        text,
        createdAt: notes?.createdAt ? new Date(notes.createdAt) : new Date(),
        createdBy:
          typeof notes?.createdBy === "string" && notes.createdBy.trim()
            ? notes.createdBy.trim()
            : "מערכת",
      },
    ];
  }

  return notes
    .map((note) => {
      if (note === null || note === undefined || note === "") return null;

      if (typeof note === "string") {
        const text = note.trim();
        if (!text) return null;

        return {
          text,
          createdAt: new Date(),
          createdBy: "מערכת",
        };
      }

      const text =
        typeof note?.text === "string"
          ? note.text.trim()
          : typeof note?.note === "string"
            ? note.note.trim()
            : "";

      if (!text) return null;

      return {
        text,
        createdAt: note?.createdAt ? new Date(note.createdAt) : new Date(),
        createdBy:
          typeof note?.createdBy === "string" && note.createdBy.trim()
            ? note.createdBy.trim()
            : "מערכת",
      };
    })
    .filter(Boolean);
}

function sanitizeExistingRoundNotes(rounds: any) {
  if (!Array.isArray(rounds)) return rounds;

  return rounds.map((round: any, index: number) => {
    const raw =
      round && typeof round.toObject === "function"
        ? round.toObject()
        : round || {};

    return {
      ...raw,
      roundNumber: Number(raw?.roundNumber ?? index + 1),
      notes: normalizeCallRoundNotes(raw?.notes),
    };
  });
}

function normalizeCallRounds(callRounds: any[]) {
  return callRounds.map((r: any, index: number) => {
    const roundNumber = Number(r?.roundNumber ?? index + 1);

    const answerStatus = CALL_ANSWER_VALUES.has(r?.answerStatus)
      ? r.answerStatus
      : CALL_ANSWER_VALUES.has(r?.status)
        ? r.status
        : null;

    const resultStatus =
      answerStatus === "answered" && CALL_RESULT_VALUES.has(r?.resultStatus)
        ? r.resultStatus
        : null;

    const amount =
      answerStatus === "answered" && resultStatus === "yes"
        ? Math.max(1, toSafeNumber(r?.amount, 1))
        : resultStatus === "no"
          ? 0
          : Math.max(0, toSafeNumber(r?.amount, 0));

    return {
      roundNumber,
      answerStatus,
      resultStatus,
      amount,
      notes: normalizeCallRoundNotes(r?.notes),
      calledAt: r?.calledAt
        ? new Date(r.calledAt)
        : answerStatus
          ? new Date()
          : null,
      updatedAt: r?.updatedAt ? new Date(r.updatedAt) : new Date(),
    };
  });
}

function getIncomingRsvp(data: any) {
  if (typeof data?.rsvp === "string" && RSVP_VALUES.has(data.rsvp)) {
    return data.rsvp;
  }

  if (
    typeof data?.rsvpStatus === "string" &&
    RSVP_VALUES.has(data.rsvpStatus)
  ) {
    return data.rsvpStatus;
  }

  if (typeof data?.status === "string" && RSVP_VALUES.has(data.status)) {
    return data.status;
  }

  return null;
}

function getIncomingArrivedCount(data: any) {
  if (typeof data?.arrivedCount === "number" && data.arrivedCount >= 0) {
    return data.arrivedCount;
  }

  if (typeof data?.amount === "number" && data.amount >= 0) {
    return data.amount;
  }

  return null;
}

/* ============================================
   LIVE Seating Helpers
   חשוב:
   actualArrivedCount לבד לא משחרר כיסאות.
   רק syncSeatsToActual=true משחרר / מסנכרן.
   checkSeatOptionsOnly=true רק מחזיר הצעות, בלי לשנות כלום.
============================================ */

function normalizeLiveId(value: any) {
  if (!value) return "";

  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();

  if (typeof value === "object") {
    return String(value._id || value.id || value.toString?.() || "").trim();
  }

  return String(value).trim();
}

function sameLiveId(a: any, b: any) {
  const left = normalizeLiveId(a);
  const right = normalizeLiveId(b);

  return !!left && !!right && left === right;
}

function getLiveTableCapacity(table: any) {
  return Number(table?.capacity || table?.seats || table?.seatCount || 12);
}

function getLiveTableNumber(table: any) {
  return String(table?.tableNumber || table?.number || "").trim();
}

function getLiveTableLabel(table: any) {
  const name = String(table?.name || "").trim();

  if (name) return name;

  const number = getLiveTableNumber(table);
  return number ? `שולחן ${number}` : "שולחן";
}

function getLiveTableId(table: any) {
  return (
    normalizeLiveId(table?._id) ||
    normalizeLiveId(table?.id) ||
    normalizeLiveId(table?.tableId) ||
    normalizeLiveId(table?.tableNumber) ||
    normalizeLiveId(table?.number)
  );
}

function tableHasLiveGuest(table: any, guestId: string) {
  return (table?.seatedGuests || []).some((sg: any) =>
    sameLiveId(sg?.guestId, guestId)
  );
}

function cleanLiveGuestFromTable(table: any, guestId: string) {
  table.seatedGuests = (table?.seatedGuests || []).filter(
    (sg: any) => !sameLiveId(sg?.guestId, guestId)
  );
}

function isGuestCurrentLiveTable(table: any, guest: any, guestId: string) {
  const tableMongoId = normalizeLiveId(table?._id);
  const tableId = normalizeLiveId(table?.id);
  const tableCustomId = normalizeLiveId(table?.tableId);
  const tableNumber = getLiveTableNumber(table);
  const tableName = String(table?.name || "").trim();

  const guestTableId = normalizeLiveId(guest?.tableId);
  const guestTableName = String(guest?.tableName || "").trim();
  const guestTableNumber = String(guest?.tableNumber || "").trim();

  return (
    tableHasLiveGuest(table, guestId) ||
    (!!guestTableId &&
      [tableMongoId, tableId, tableCustomId, tableNumber].includes(
        guestTableId
      )) ||
    (!!guestTableName &&
      (guestTableName === tableName ||
        guestTableName === `שולחן ${tableNumber}` ||
        guestTableName.replace("שולחן", "").trim() === tableNumber)) ||
    (!!guestTableNumber && guestTableNumber === tableNumber)
  );
}

function findFreeLiveSeatIndexes(table: any, count: number, guestId: string) {
  const capacity = getLiveTableCapacity(table);

  const occupied = new Set(
    (table?.seatedGuests || [])
      .filter((sg: any) => !sameLiveId(sg?.guestId, guestId))
      .map((sg: any) => Number(sg?.seatIndex))
      .filter((n: number) => Number.isFinite(n))
  );

  const free: number[] = [];

  for (let i = 0; i < capacity; i++) {
    if (!occupied.has(i)) free.push(i);
    if (free.length >= count) break;
  }

  return free;
}

function buildLiveSeatingScopeQuery(invitation: any, guest: any) {
  const eventId = normalizeLiveId(
    invitation?.eventId ||
      invitation?.event ||
      invitation?.event_id ||
      invitation?.eventDetails?._id
  );

  const invitationId = normalizeLiveId(
    guest?.invitationId || guest?.invitation || invitation?._id
  );

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

function serializeLiveTables(tables: any[]) {
  return (tables || []).map((table: any) => {
    const capacity = getLiveTableCapacity(table);
    const seatedGuests = table?.seatedGuests || [];
    const seatedGuestsCount = seatedGuests.length;

    return {
      _id: normalizeLiveId(table?._id),
      id: normalizeLiveId(table?.id),
      tableId: normalizeLiveId(table?.tableId),
      name: table?.name,
      tableNumber: table?.tableNumber,
      number: table?.number,
      capacity,
      seats: table?.seats,
      seatCount: table?.seatCount,
      seatedGuests,
      seatedGuestsCount,
      freeSeatsCount: Math.max(0, capacity - seatedGuestsCount),
      isFull: seatedGuestsCount >= capacity,
    };
  });
}

function getLiveGroupKey(guest: any) {
  return String(
    guest?.groupId ||
      guest?.relation ||
      guest?.groupName ||
      guest?.group ||
      ""
  ).trim();
}

function getLiveTableFreeSeats(table: any, ignoredGuestId?: string) {
  const capacity = getLiveTableCapacity(table);

  const occupied = (table?.seatedGuests || []).filter((sg: any) => {
    if (!ignoredGuestId) return true;
    return !sameLiveId(sg?.guestId, ignoredGuestId);
  }).length;

  return Math.max(0, capacity - occupied);
}

async function buildGuestLookupForSuggestions(invitation: any, guest: any) {
  const invitationId = normalizeLiveId(
    guest?.invitationId || guest?.invitation || invitation?._id
  );

  const query: any = {};

  if (invitationId) {
    query.$or = [{ invitationId }, { invitation: invitationId }];

    if (mongoose.Types.ObjectId.isValid(invitationId)) {
      const invitationObjectId = new mongoose.Types.ObjectId(invitationId);
      query.$or.push(
        { invitationId: invitationObjectId },
        { invitation: invitationObjectId }
      );
    }
  }

  if (!query.$or?.length) return new Map<string, any>();

  const guests = await InvitationGuest.find(query)
    .select("_id name groupId relation groupName group")
    .lean();

  const map = new Map<string, any>();

  for (const g of guests || []) {
    map.set(normalizeLiveId(g?._id), g);
  }

  return map;
}

function tableHasSameGroupGuest({
  table,
  guest,
  guestId,
  guestLookup,
}: {
  table: any;
  guest: any;
  guestId: string;
  guestLookup: Map<string, any>;
}) {
  const guestGroupKey = getLiveGroupKey(guest);
  if (!guestGroupKey) return false;

  return (table?.seatedGuests || []).some((sg: any) => {
    const seatedGuestId = normalizeLiveId(sg?.guestId);
    if (!seatedGuestId || sameLiveId(seatedGuestId, guestId)) return false;

    const seatedGuest = guestLookup.get(seatedGuestId);

    if (!seatedGuest) return false;

    return getLiveGroupKey(seatedGuest) === guestGroupKey;
  });
}

function buildSuggestedLiveTables({
  tables,
  guest,
  guestId,
  requiredSeats,
  currentTable,
  guestLookup,
}: {
  tables: any[];
  guest: any;
  guestId: string;
  requiredSeats: number;
  currentTable?: any | null;
  guestLookup: Map<string, any>;
}) {
  const currentTableId = currentTable ? getLiveTableId(currentTable) : "";

  return (tables || [])
    .map((table: any) => {
      const tableId = getLiveTableId(table);
      const freeSeats = getLiveTableFreeSeats(table, guestId);
      const sameGroup = tableHasSameGroupGuest({
        table,
        guest,
        guestId,
        guestLookup,
      });

      return {
        tableId,
        tableName: getLiveTableLabel(table),
        tableNumber: table?.tableNumber || table?.number || null,
        capacity: getLiveTableCapacity(table),
        freeSeats,
        sameGroup,
        canFit: freeSeats >= requiredSeats,
        isCurrentTable: !!currentTableId && tableId === currentTableId,
      };
    })
    .filter((table: any) => table.canFit && !table.isCurrentTable)
    .sort((a: any, b: any) => {
      if (a.sameGroup !== b.sameGroup) return a.sameGroup ? -1 : 1;
      return b.freeSeats - a.freeSeats;
    })
    .slice(0, 5);
}

async function syncOrCheckActualArrivedToAllSeating({
  invitation,
  guest,
  mode,
}: {
  invitation: any;
  guest: any;
  mode: "sync" | "check";
}) {
  const guestId = normalizeLiveId(guest?._id);
  if (!guestId) return null;

  const actual = Math.max(0, Number(guest.actualArrivedCount || 0));
  const expected = Math.max(
    0,
    Number(guest.arrivedCount || 0) || Number(guest.guestsCount || 0)
  );

  const scopedQuery = buildLiveSeatingScopeQuery(invitation, guest);
  if (!scopedQuery.length) return null;

  const guestLookup = await buildGuestLookupForSuggestions(invitation, guest);

  const buildSeatStatus = () => ({
    expected,
    actual,
    diff: actual - expected,
    status:
      actual > expected
        ? "over"
        : actual < expected
          ? "under"
          : actual === expected && actual > 0
            ? "match"
            : actual === 0 && expected > 0
              ? "under"
              : "none",
  });

  const handleTablesArray = async (ownerDoc: any, tables: any[]) => {
    const currentTable =
      (tables || []).find((table: any) =>
        isGuestCurrentLiveTable(table, guest, guestId)
      ) || null;

    if (!currentTable) {
      return {
        tables: serializeLiveTables(tables),
        seatStatus: buildSeatStatus(),
        suggestedTables: buildSuggestedLiveTables({
          tables,
          guest,
          guestId,
          requiredSeats: actual,
          currentTable: null,
          guestLookup,
        }),
      };
    }

    if (mode === "check") {
      const freeInCurrent = getLiveTableFreeSeats(currentTable, guestId);
      const canFitCurrent = freeInCurrent >= actual;

      return {
        tables: serializeLiveTables(tables),
        currentTable: {
          tableId: getLiveTableId(currentTable),
          tableName: getLiveTableLabel(currentTable),
          freeSeats: freeInCurrent,
          capacity: getLiveTableCapacity(currentTable),
          canFit: canFitCurrent,
        },

        suggestedTables: buildSuggestedLiveTables({
  tables,
  guest,
  guestId,
  requiredSeats: actual,
  currentTable,
  guestLookup,
}),

        seatStatus: buildSeatStatus(),
      };
    }

    // mode === "sync"
    // רק כאן משחררים/מסנכרנים כיסאות בפועל.
    for (const table of tables) {
      cleanLiveGuestFromTable(table, guestId);
    }

    if (actual > 0) {
      const freeSeats = findFreeLiveSeatIndexes(
        currentTable,
        actual,
        guestId
      );

      if (freeSeats.length < actual) {
        const available = getLiveTableFreeSeats(currentTable, guestId);

        return NextResponse.json(
          {
            success: false,
            code: "TABLE_NOT_ENOUGH_FREE_SEATS",
            message: `אין מספיק מקום פנוי בשולחן הנוכחי. פנויים ${available}, נדרשים ${actual}.`,
            currentTable: {
              tableId: getLiveTableId(currentTable),
              tableName: getLiveTableLabel(currentTable),
              freeSeats: available,
              capacity: getLiveTableCapacity(currentTable),
              canFit: false,
            },
            suggestedTables: buildSuggestedLiveTables({
              tables,
              guest,
              guestId,
              requiredSeats: actual,
              currentTable,
              guestLookup,
            }),
            seatStatus: buildSeatStatus(),
          },
          { status: 409 }
        );
      }

      currentTable.seatedGuests = currentTable.seatedGuests || [];

      currentTable.seatedGuests.push(
        ...freeSeats.map((seatIndex) => ({
          guestId,
          seatIndex,
          arrived: true,
        }))
      );
    }

    if (typeof ownerDoc.markModified === "function") {
      ownerDoc.markModified("tables");
    }

    await ownerDoc.save();

    return {
      tables: serializeLiveTables(tables),
      seatStatus: buildSeatStatus(),
      suggestedTables: [],
    };
  };

  const seatingTableDoc = await SeatingTable.findOne({
    $or: scopedQuery,
    tables: { $exists: true },
  });

  if (seatingTableDoc?.tables?.length) {
    const result = await handleTablesArray(
      seatingTableDoc,
      seatingTableDoc.tables
    );

    if (result instanceof NextResponse) return result;
    if (result) return result;
  }

  const seatingDoc = await Seating.findOne({
    $or: scopedQuery,
  });

  if (seatingDoc?.tables?.length) {
    const result = await handleTablesArray(seatingDoc, seatingDoc.tables);

    if (result instanceof NextResponse) return result;
    if (result) return result;
  }

  const legacyTables = await SeatingTable.find({
    $or: scopedQuery,
  });

  const standaloneTables = legacyTables.filter(
    (doc: any) => !Array.isArray(doc.tables)
  );

  if (standaloneTables.length) {
    const currentTable =
      standaloneTables.find((table: any) =>
        isGuestCurrentLiveTable(table, guest, guestId)
      ) || null;

    if (mode === "check") {
      const canFitCurrent = currentTable
        ? getLiveTableFreeSeats(currentTable, guestId) >= actual
        : false;

      return {
        tables: serializeLiveTables(standaloneTables),
        currentTable: currentTable
          ? {
              tableId: getLiveTableId(currentTable),
              tableName: getLiveTableLabel(currentTable),
              freeSeats: getLiveTableFreeSeats(currentTable, guestId),
              capacity: getLiveTableCapacity(currentTable),
              canFit: canFitCurrent,
            }
          : null,

        suggestedTables: buildSuggestedLiveTables({
  tables: standaloneTables,
  guest,
  guestId,
  requiredSeats: actual,
  currentTable,
  guestLookup,
}),

        seatStatus: buildSeatStatus(),
      };
    }

    if (!currentTable) return null;

    for (const table of standaloneTables) {
      cleanLiveGuestFromTable(table, guestId);
      await table.save();
    }

    if (actual > 0) {
      const freeSeats = findFreeLiveSeatIndexes(
        currentTable,
        actual,
        guestId
      );

      if (freeSeats.length < actual) {
        const available = getLiveTableFreeSeats(currentTable, guestId);

        return NextResponse.json(
          {
            success: false,
            code: "TABLE_NOT_ENOUGH_FREE_SEATS",
            message: `אין מספיק מקום פנוי בשולחן הנוכחי. פנויים ${available}, נדרשים ${actual}.`,
            currentTable: {
              tableId: getLiveTableId(currentTable),
              tableName: getLiveTableLabel(currentTable),
              freeSeats: available,
              capacity: getLiveTableCapacity(currentTable),
              canFit: false,
            },
            suggestedTables: buildSuggestedLiveTables({
              tables: standaloneTables,
              guest,
              guestId,
              requiredSeats: actual,
              currentTable,
              guestLookup,
            }),
            seatStatus: buildSeatStatus(),
          },
          { status: 409 }
        );
      }

      currentTable.seatedGuests = currentTable.seatedGuests || [];

      currentTable.seatedGuests.push(
        ...freeSeats.map((seatIndex) => ({
          guestId,
          seatIndex,
          arrived: true,
        }))
      );

      await currentTable.save();
    }

    const freshTables = await SeatingTable.find({
      _id: { $in: standaloneTables.map((t: any) => t._id) },
    }).lean();

    return {
      tables: serializeLiveTables(
        freshTables.length ? freshTables : standaloneTables
      ),
      seatStatus: buildSeatStatus(),
      suggestedTables: [],
    };
  }

  return null;
}

/* ============================================
   GET — שליפת אורח יחיד
============================================ */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    await db();
    console.log("📥 GET /api/guests/[id]", id);

    const guest = await InvitationGuest.findById(id);

    if (!guest) {
      console.warn("⚠️ Guest not found", id);
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("❌ GET /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================
   PUT — עדכון אורח / RSVP / קבוצה
============================================ */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    await db();
    console.log("🚀 PUT /api/guests/[id] HIT", id);

    const data = await req.json();
    console.log("📦 Payload:", data);

    const guest = await InvitationGuest.findById(id);

    if (!guest) {
      console.warn("⚠️ Guest not found", id);
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const invitation = await Invitation.findById(guest.invitationId);

    if (!invitation) {
      console.warn("⚠️ Invitation not found", guest.invitationId);
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const auth: any = await getUserIdFromRequest(req);

    const effectiveRole =
      auth?.impersonationRole === "producer_staff"
        ? "producer"
        : auth?.impersonationRole || auth?.role;

    if (!auth?.userId) {
      console.warn("⛔ Unauthorized – no userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = auth.userId.toString() === invitation.ownerId.toString();
    const isAdmin = effectiveRole === "admin";
    const isProducerRole = effectiveRole === "producer";
    const isWorkerRole = effectiveRole === "worker";
    const isVenueOwnerRole = effectiveRole === "venue_owner";

    const { producerIdStr, isProducerByInvitation } =
      await getInvitationProducerPermission(auth, invitation);

    console.log("🔐 Permissions:", {
      isOwner,
      isAdmin,
      isProducerRole,
      isWorkerRole,
      isVenueOwnerRole,
      isProducerByInvitation,
      producerIdStr,
      userId: auth.userId?.toString?.(),
      impersonatedBy: auth.impersonatedBy?.toString?.(),
      effectiveRole,
    });

    if (
      !isOwner &&
      !isAdmin &&
      !isProducerRole &&
      !isWorkerRole &&
      !isVenueOwnerRole &&
      !isProducerByInvitation
    ) {
      console.warn("⛔ Not authorized to update guest");
      return NextResponse.json(
        { error: "Not authorized to update this guest" },
        { status: 403 }
      );
    }

    const beforeGroupId = guest.groupId ? String(guest.groupId) : null;

    /* ===============================
       שדות כלליים
    =============================== */
    if (typeof data.name === "string") guest.name = data.name;
    if (typeof data.phone === "string") guest.phone = data.phone;
    if (typeof data.notes === "string") guest.notes = data.notes;

    if ("tableId" in data) {
      const tableId =
        data.tableId === null ||
        data.tableId === undefined ||
        data.tableId === "" ||
        data.tableId === "null" ||
        data.tableId === "undefined"
          ? null
          : String(data.tableId).trim();

      (guest as any).tableId = tableId || undefined;
    }

    if ("tableName" in data) {
      const tableName =
        data.tableName === null ||
        data.tableName === undefined ||
        data.tableName === "null" ||
        data.tableName === "undefined"
          ? ""
          : String(data.tableName).trim();

      (guest as any).tableName = tableName;
    }

    if ("tableNumber" in data) {
      const tableNumber = Number(data.tableNumber);

      if (Number.isFinite(tableNumber) && tableNumber > 0) {
        (guest as any).tableNumber = tableNumber;
      } else {
        (guest as any).tableNumber = undefined;
      }
    }

    /* ===============================
       groupId
    =============================== */
    if ("groupId" in data) {
      const raw = data.groupId;

      const cleaned =
        raw === null ||
        raw === undefined ||
        raw === "" ||
        raw === "null" ||
        raw === "undefined"
          ? null
          : String(raw).trim();

      if (cleaned) {
        guest.groupId = cleaned;
      } else {
        guest.groupId = undefined;
      }
    }

    /* ===============================
       relation
    =============================== */
    if (typeof data.relation === "string") {
      const newRelation = data.relation.trim();
      guest.relation = newRelation;

      if (!guest.groupId && newRelation) {
        const group = await Group.findOneAndUpdate(
          {
            eventId: invitation.eventId,
            name: newRelation,
          },
          {
            $setOnInsert: {
              invitationId: invitation._id,
              eventId: invitation.eventId,
              name: newRelation,
            },
          },
          {
            upsert: true,
            new: true,
          }
        );

        guest.groupId = group._id;
      }
    }

    /* ===============================
       guestsCount
    =============================== */
    if (typeof data.guestsCount === "number" && data.guestsCount >= 1) {
      const nextGuestsCount = data.guestsCount;
      const prevGuestsCount = guest.guestsCount ?? 1;

      if (nextGuestsCount !== prevGuestsCount) {
        const maxGuests = await getMaxGuestsForInvitationOwner(
          invitation.ownerId.toString()
        );

        const aggregate = await InvitationGuest.aggregate([
          { $match: { invitationId: invitation._id } },
          { $group: { _id: null, total: { $sum: "$guestsCount" } } },
        ]);

        const currentTotalGuestsCount = aggregate?.[0]?.total ?? 0;

        const nextTotalGuestsCount =
          currentTotalGuestsCount - prevGuestsCount + nextGuestsCount;

        if (nextTotalGuestsCount > maxGuests) {
          return NextResponse.json(
            {
              success: false,
              code: "PLAN_GUEST_LIMIT_EXCEEDED",
              error: `לא ניתן לעדכן. חבילת המשתמש מוגבלת ל-${maxGuests} מוזמנים (כמות מוזמנים כוללת).`,
              limit: maxGuests,
              currentTotal: currentTotalGuestsCount,
              requestedTotal: nextTotalGuestsCount,
            },
            { status: 409 }
          );
        }

        guest.guestsCount = nextGuestsCount;
      }
    }

    /* ===============================
       RSVP
    =============================== */
    const incomingRsvp = getIncomingRsvp(data);
    const incomingArrivedCount = getIncomingArrivedCount(data);

    if (incomingArrivedCount !== null) {
      guest.arrivedCount = incomingArrivedCount;

      if ("amount" in guest) {
        guest.amount = incomingArrivedCount;
      }
    }

    if (incomingRsvp) {
      guest.rsvp = incomingRsvp as "yes" | "no" | "pending";

      if ("status" in guest) {
        guest.status = incomingRsvp as "yes" | "no" | "pending";
      }

      if (incomingRsvp === "no") {
        guest.arrivedCount = 0;

        if ("amount" in guest) {
          guest.amount = 0;
        }
      }

      if (incomingRsvp === "yes") {
        const nextArrivedCount =
          incomingArrivedCount ??
          guest.arrivedCount ??
          guest.guestsCount ??
          1;

        guest.arrivedCount = Math.max(1, Number(nextArrivedCount || 1));

        if ("amount" in guest) {
          guest.amount = guest.arrivedCount;
        }
      }

      if (incomingRsvp === "pending") {
        const nextArrivedCount =
          incomingArrivedCount !== null
            ? incomingArrivedCount
            : guest.arrivedCount ?? 0;

        guest.arrivedCount = Math.max(0, Number(nextArrivedCount || 0));

        if ("amount" in guest) {
          guest.amount = guest.arrivedCount;
        }
      }
    }

    /* ===============================
       actualArrivedCount — מגיעים בפועל
    =============================== */
    if (
      typeof data.actualArrivedCount === "number" &&
      data.actualArrivedCount >= 0
    ) {
      const canUpdateActualArrived =
        isAdmin ||
        isProducerRole ||
        isWorkerRole ||
        isVenueOwnerRole ||
        isProducerByInvitation;

      if (!canUpdateActualArrived) {
        return NextResponse.json(
          { error: "Not authorized to update actualArrivedCount" },
          { status: 403 }
        );
      }

      guest.actualArrivedCount = Math.max(
        0,
        Number(data.actualArrivedCount || 0)
      );

      if (guest.actualArrivedCount > 0 && guest.rsvp !== "yes") {
        guest.rsvp = "yes";

        if ("status" in guest) {
          guest.status = "yes";
        }

        if (!guest.arrivedCount || guest.arrivedCount === 0) {
          guest.arrivedCount = guest.guestsCount ?? 1;

          if ("amount" in guest) {
            guest.amount = guest.arrivedCount;
          }
        }
      }

      const shouldSyncSeatsToActual =
        data.syncSeatsToActual === true ||
        data.releaseSeatsToActual === true;

      const shouldCheckSeatOptionsOnly =
        data.checkSeatOptionsOnly === true;

      if (shouldSyncSeatsToActual || shouldCheckSeatOptionsOnly) {
        const seatingResult = await syncOrCheckActualArrivedToAllSeating({
          invitation,
          guest,
          mode: shouldCheckSeatOptionsOnly ? "check" : "sync",
        });

        if (seatingResult instanceof NextResponse) {
          return seatingResult;
        }

        if (seatingResult?.tables) {
          (guest as any).__syncedTables = seatingResult.tables;
        }

        if (seatingResult?.seatStatus) {
          (guest as any).__seatStatus = seatingResult.seatStatus;
        }

        if (seatingResult?.suggestedTables) {
          (guest as any).__suggestedTables = seatingResult.suggestedTables;
        }

        if (seatingResult?.currentTable) {
          (guest as any).__currentTable = seatingResult.currentTable;
        }
      }
    }

    /* ===============================
       callRounds
    =============================== */
    if (Array.isArray(data.callRounds)) {
      const canUpdateCallRounds =
        isOwner ||
        isAdmin ||
        isProducerRole ||
        isVenueOwnerRole ||
        isProducerByInvitation;

      if (!canUpdateCallRounds) {
        return NextResponse.json(
          { error: "Not authorized to update callRounds" },
          { status: 403 }
        );
      }

      guest.callRounds = normalizeCallRounds(data.callRounds);
    }

    if (Array.isArray((guest as any).callRounds)) {
      (guest as any).callRounds = sanitizeExistingRoundNotes(
        (guest as any).callRounds
      );
    }

    if (Array.isArray((guest as any).allRounds)) {
      (guest as any).allRounds = sanitizeExistingRoundNotes(
        (guest as any).allRounds
      );
    }

    await guest.save();

    const afterGroupId = guest.groupId ? String(guest.groupId) : null;
    const affected = new Set<string>();

    if (beforeGroupId) affected.add(beforeGroupId);
    if (afterGroupId) affected.add(afterGroupId);

    for (const gid of affected) {
      await recalcGroupExpectedCount(gid);
    }

    const syncedTables = (guest as any).__syncedTables || null;
    const seatStatus = (guest as any).__seatStatus || null;
    const suggestedTables = (guest as any).__suggestedTables || [];
    const currentTable = (guest as any).__currentTable || null;

    delete (guest as any).__syncedTables;
    delete (guest as any).__seatStatus;
    delete (guest as any).__suggestedTables;
    delete (guest as any).__currentTable;

    return NextResponse.json({
      success: true,
      guest,
      tables: syncedTables,
      seatStatus,
      suggestedTables,
      currentTable,
    });
  } catch (error: any) {
    console.error("❌ PUT /guests/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Server error",
      },
      { status: 500 }
    );
  }
}

/* ============================================
   DELETE — מחיקת אורח
============================================ */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    await db();
    console.log("🗑️ DELETE /api/guests/[id]", id);

    const guest = await InvitationGuest.findById(id);

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const invitation = await Invitation.findById(guest.invitationId);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const auth: any = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveRole =
      auth?.impersonationRole === "producer_staff"
        ? "producer"
        : auth?.impersonationRole || auth?.role;

    const isOwner = auth.userId.toString() === invitation.ownerId.toString();
    const isAdmin = effectiveRole === "admin";
    const isProducerRole = effectiveRole === "producer";
    const isWorkerRole = effectiveRole === "worker";

    const producerIdStr = invitation.producerId?.toString?.() || null;
    const isProducerByInvitation =
      !!producerIdStr &&
      (auth.userId.toString() === producerIdStr ||
        auth.impersonatedBy?.toString?.() === producerIdStr);

    if (
      !isOwner &&
      !isAdmin &&
      !isProducerRole &&
      !isWorkerRole &&
      !isProducerByInvitation
    ) {
      return NextResponse.json(
        { error: "Not authorized to delete this guest" },
        { status: 403 }
      );
    }

    const groupId = guest.groupId ? String(guest.groupId) : null;

    await guest.deleteOne();

    if (groupId) {
      await recalcGroupExpectedCount(groupId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ DELETE /guests/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Server error",
      },
      { status: 500 }
    );
  }
}