import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import Guest from "@/models/Guest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ===============================
   TYPES
=============================== */

type GuestDoc = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  fullName?: string;
  guestsCount?: number;
  count?: number;
  groupId?: mongoose.Types.ObjectId | string | null;
  relation?: string | null;
  tableId?: mongoose.Types.ObjectId | string | null;
  seatNumber?: number | null;
};

type TableDoc = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  tableName?: string;
  title?: string;
  seats?: number;
  capacity?: number;
  maxSeats?: number;
  seatedGuests?: any[];
};

/* ===============================
   HELPERS
=============================== */

function getGuestName(guest: GuestDoc) {
  return guest.name || guest.fullName || "אורח ללא שם";
}

function getGuestCount(guest: GuestDoc) {
  const count = Number(guest.guestsCount || guest.count || 1);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function getGroupKey(guest: GuestDoc) {
  if (guest.groupId) {
    return `group:${String(guest.groupId)}`;
  }

  if (guest.relation && guest.relation.trim()) {
    return `relation:${guest.relation.trim().toLowerCase()}`;
  }

  return `guest:${String(guest._id)}`;
}

function getTableCapacity(table: TableDoc) {
  const capacity = Number(table.seats || table.capacity || table.maxSeats || 0);
  return Number.isFinite(capacity) && capacity > 0 ? capacity : 0;
}

function getTableName(table: TableDoc) {
  return table.name || table.tableName || table.title || "שולחן";
}

/* ===============================
   POST – SMART SEAT BY GROUPS
=============================== */

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    await db();

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
       BODY
       מקבלים invitationId מהפרונט
    =============================== */

    const body = await req.json().catch(() => ({}));

    let invitationIdFromBody: string | null =
      typeof body?.invitationId === "string" && body.invitationId
        ? body.invitationId
        : null;

    let invitationObjectId: mongoose.Types.ObjectId | null = null;

    if (
      invitationIdFromBody &&
      mongoose.Types.ObjectId.isValid(invitationIdFromBody)
    ) {
      invitationObjectId = new mongoose.Types.ObjectId(invitationIdFromBody);
    }

    /* ===============================
       FALLBACK – FIND INVITATION BY EVENT
       אם משום מה לא הגיע invitationId מהפרונט
    =============================== */

    if (!invitationObjectId) {
      const invitation = await Invitation.findOne({
        $or: [
          { eventId: eventObjectId },
          { eventId },
          { _id: eventObjectId },
        ],
      })
        .select("_id eventId")
        .lean<{
          _id: mongoose.Types.ObjectId;
          eventId?: mongoose.Types.ObjectId | string;
        } | null>();

      if (invitation?._id) {
        invitationObjectId = invitation._id;
        invitationIdFromBody = String(invitation._id);
      }
    }

    /* ===============================
       GUEST QUERY
       מחפש לפי כל האפשרויות:
       eventId כאובייקט
       eventId כסטרינג
       invitationId כאובייקט
       invitationId כסטרינג
       invitation כאובייקט / סטרינג
    =============================== */

    const guestOrQuery: any[] = [
      { eventId: eventObjectId },
      { eventId },
    ];

    if (invitationObjectId) {
      guestOrQuery.push({ invitationId: invitationObjectId });
      guestOrQuery.push({ invitationId: String(invitationObjectId) });
      guestOrQuery.push({ invitation: invitationObjectId });
      guestOrQuery.push({ invitation: String(invitationObjectId) });
    }

    const guestBaseQuery = {
      $and: [
        {
          $or: guestOrQuery,
        },
        {
          $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        },
      ],
    };

    /* ===============================
       LOAD DATA
    =============================== */

    const guests = await Guest.find(guestBaseQuery).lean<GuestDoc[]>();

    const tables = await SeatingTable.find({
      $or: [{ eventId: eventObjectId }, { eventId }],
    }).lean<TableDoc[]>();

    if (!guests.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "לא נמצאו אורחים לאירוע הזה. ה־API קיבל eventId אבל לא הצליח למצוא אורחים לפי eventId או invitationId.",
          debug: {
            eventId,
            invitationId: invitationObjectId ? String(invitationObjectId) : null,
            guestOrQuery,
          },
        },
        { status: 400 }
      );
    }

    if (!tables.length) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאו שולחנות לאירוע הזה",
          debug: {
            eventId,
            invitationId: invitationObjectId ? String(invitationObjectId) : null,
          },
        },
        { status: 400 }
      );
    }

    const validTables = tables
      .map((table) => ({
        table,
        tableId: String(table._id),
        tableName: getTableName(table),
        capacity: getTableCapacity(table),
        remaining: getTableCapacity(table),
        seatedGuests: [] as GuestDoc[],
      }))
      .filter((table) => table.capacity > 0)
      .sort((a, b) => b.capacity - a.capacity);

    if (!validTables.length) {
      return NextResponse.json(
        {
          success: false,
          error: "לא הוגדרה כמות מקומות בשולחנות",
        },
        { status: 400 }
      );
    }

    const totalGuestSeats = guests.reduce((sum, guest) => {
      return sum + getGuestCount(guest);
    }, 0);

    const totalTableSeats = validTables.reduce((sum, table) => {
      return sum + table.capacity;
    }, 0);

    if (totalGuestSeats > totalTableSeats) {
      return NextResponse.json(
        {
          success: false,
          error: `אין מספיק מקומות. יש ${totalGuestSeats} מקומות נדרשים לאורחים אבל רק ${totalTableSeats} מקומות בשולחנות.`,
          totalGuestSeats,
          totalTableSeats,
        },
        { status: 400 }
      );
    }

    /* ===============================
       RESET CURRENT SEATING
    =============================== */

    await SeatingTable.updateMany(
      {
        $or: [{ eventId: eventObjectId }, { eventId }],
      },
      {
        $set: {
          seatedGuests: [],
        },
      }
    );

    await Guest.updateMany(
      guestBaseQuery,
      {
        $unset: {
          tableId: "",
          seatNumber: "",
          tableName: "",
        },
      }
    );

    /* ===============================
       BUILD GROUPS
    =============================== */

    const groupMap = new Map<
      string,
      {
        key: string;
        members: GuestDoc[];
        seatsNeeded: number;
      }
    >();

    for (const guest of guests) {
      const key = getGroupKey(guest);

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          members: [],
          seatsNeeded: 0,
        });
      }

      const group = groupMap.get(key)!;
      group.members.push(guest);
      group.seatsNeeded += getGuestCount(guest);
    }

    const groups = Array.from(groupMap.values()).sort(
      (a, b) => b.seatsNeeded - a.seatsNeeded
    );

    const unseatedGuests: GuestDoc[] = [];

    /* ===============================
       SMART SEATING ALGORITHM
    =============================== */

    for (const group of groups) {
      const groupSeatsNeeded = group.seatsNeeded;

      const bestFullTable = validTables
        .filter((table) => table.remaining >= groupSeatsNeeded)
        .sort((a, b) => a.remaining - b.remaining)[0];

      if (bestFullTable) {
        bestFullTable.seatedGuests.push(...group.members);
        bestFullTable.remaining -= groupSeatsNeeded;
        continue;
      }

      let guestsToSeat = [...group.members];

      const availableTables = validTables
        .filter((table) => table.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining);

      for (const table of availableTables) {
        if (!guestsToSeat.length) break;

        let remainingSeatsInTable = table.remaining;
        const chunk: GuestDoc[] = [];

        while (guestsToSeat.length && remainingSeatsInTable > 0) {
          const nextGuest = guestsToSeat[0];
          const nextGuestCount = getGuestCount(nextGuest);

          if (nextGuestCount <= remainingSeatsInTable) {
            chunk.push(nextGuest);
            guestsToSeat.shift();
            remainingSeatsInTable -= nextGuestCount;
          } else {
            break;
          }
        }

        if (chunk.length) {
          table.seatedGuests.push(...chunk);

          const usedSeats = chunk.reduce((sum, guest) => {
            return sum + getGuestCount(guest);
          }, 0);

          table.remaining -= usedSeats;
        }
      }

      if (guestsToSeat.length) {
        unseatedGuests.push(...guestsToSeat);
      }
    }

    /* ===============================
       SAVE TABLES + GUESTS
    =============================== */

    let seatedGuestCount = 0;
    let seatedSeatsCount = 0;

    for (const tableState of validTables) {
      let currentSeatNumber = 1;

      const seatedGuestsPayload = tableState.seatedGuests.map((guest) => {
        const guestCount = getGuestCount(guest);
        const seatNumber = currentSeatNumber;

        currentSeatNumber += guestCount;

        return {
          guestId: guest._id,
          name: getGuestName(guest),
          guestsCount: guestCount,
          count: guestCount,
          groupId: guest.groupId || null,
          relation: guest.relation || "",
          seatNumber,
        };
      });

      seatedGuestCount += tableState.seatedGuests.length;

      seatedSeatsCount += tableState.seatedGuests.reduce((sum, guest) => {
        return sum + getGuestCount(guest);
      }, 0);

      await SeatingTable.updateOne(
        {
          _id: new mongoose.Types.ObjectId(tableState.tableId),
        },
        {
          $set: {
            seatedGuests: seatedGuestsPayload,
          },
        }
      );

      for (const guest of tableState.seatedGuests) {
        const payloadItem = seatedGuestsPayload.find(
          (item) => String(item.guestId) === String(guest._id)
        );

        await Guest.updateOne(
          { _id: guest._id },
          {
            $set: {
              tableId: new mongoose.Types.ObjectId(tableState.tableId),
              seatNumber: payloadItem?.seatNumber || null,
            },
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "SMART_SEATING_COMPLETED",
      seatedGuestCount,
      seatedSeatsCount,
      seatedCount: seatedGuestCount,
      totalGuests: guests.length,
      totalGuestSeats,
      totalTableSeats,
      unseatedCount: unseatedGuests.length,
      debug: {
        eventId,
        invitationId: invitationObjectId ? String(invitationObjectId) : null,
      },
      unseatedGuests: unseatedGuests.map((guest) => ({
        id: String(guest._id),
        name: getGuestName(guest),
        guestsCount: getGuestCount(guest),
        groupId: guest.groupId ? String(guest.groupId) : null,
        relation: guest.relation || "",
      })),
    });
  } catch (error: any) {
    console.error("❌ SMART SEAT BY GROUPS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "SMART_SEATING_FAILED",
      },
      { status: 500 }
    );
  }
}