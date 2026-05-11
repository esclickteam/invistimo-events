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

type InvitationGuestDoc = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  fullName?: string;
  phone?: string;
  guestsCount?: number;
  count?: number;
  arrivedCount?: number;
  actualArrivedCount?: number;
  rsvp?: string;
  status?: string;
  groupId?: mongoose.Types.ObjectId | string | null;
  relation?: string | null;
  tableId?: mongoose.Types.ObjectId | string | null;
  tableName?: string | null;
  seatNumber?: number | null;
};

type TableDoc = {
  _id: mongoose.Types.ObjectId;
  id?: string;
  name?: string;
  tableName?: string;
  title?: string;

  // ✅ אצלך כמות המקומות בשולחן היא seats
  seats?: number | string;

  seatedGuests?: any[];
};

/* ===============================
   HELPERS
=============================== */

function getGuestName(guest: InvitationGuestDoc) {
  return guest.name || guest.fullName || "אורח ללא שם";
}

function getGuestCount(guest: InvitationGuestDoc) {
  const count = Number(
    guest.arrivedCount ||
      guest.actualArrivedCount ||
      guest.guestsCount ||
      guest.count ||
      1
  );

  return Number.isFinite(count) && count > 0 ? count : 1;
}

function isApprovedGuest(guest: InvitationGuestDoc) {
  const rsvp = String(guest.rsvp || "").toLowerCase().trim();
  const status = String(guest.status || "").toLowerCase().trim();

  return (
    rsvp === "yes" ||
    rsvp === "approved" ||
    rsvp === "confirmed" ||
    rsvp === "attending" ||
    rsvp === "מגיע" ||
    rsvp === "אישר" ||
    status === "yes" ||
    status === "approved" ||
    status === "confirmed" ||
    status === "attending" ||
    status === "מגיע" ||
    status === "אישר"
  );
}

function getGroupKey(guest: InvitationGuestDoc) {
  if (guest.groupId) {
    return `group:${String(guest.groupId)}`;
  }

  if (guest.relation && guest.relation.trim()) {
    return `relation:${guest.relation.trim().toLowerCase()}`;
  }

  return `guest:${String(guest._id)}`;
}

function getTableCapacity(table: TableDoc) {
  const seats = Number(table.seats || 0);

  if (Number.isFinite(seats) && seats > 0) {
    return seats;
  }

  return 0;
}

function getTableName(table: TableDoc) {
  return table.name || table.tableName || table.title || "שולחן";
}

/* ===============================
   POST – SMART SEAT BY GROUPS
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
       אותו מקור כמו:
       /api/seating/guests/[eventId]
    =============================== */

    const invitation = await Invitation.findOne({ eventId })
      .select("_id eventId")
      .lean<{
        _id: mongoose.Types.ObjectId;
        eventId?: string;
      } | null>();

    if (!invitation?._id) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאה הזמנה לאירוע הזה",
        },
        { status: 400 }
      );
    }

    const invitationId = invitation._id;

    /* ===============================
       LOAD GUESTS
       לפי InvitationGuest כמו במסך ההושבה
    =============================== */

    const allGuests = await InvitationGuest.find({
      invitationId,
    })
      .lean<InvitationGuestDoc[]>()
      .exec();

    if (!Array.isArray(allGuests) || !allGuests.length) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאו אורחים להזמנה הזו",
          debug: {
            eventId,
            invitationId: String(invitationId),
          },
        },
        { status: 400 }
      );
    }

    const approvedGuests = allGuests.filter(isApprovedGuest);

    if (!approvedGuests.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "נמצאו אורחים, אבל אין אורחים שאישרו הגעה. ההושבה החכמה מתבצעת רק למי שאישר הגעה.",
          debug: {
            eventId,
            invitationId: String(invitationId),
            allGuestsCount: allGuests.length,
            sampleGuest: allGuests[0],
          },
        },
        { status: 400 }
      );
    }

    /* ===============================
       LOAD TABLES
       שולחנות לפי eventId
    =============================== */

    const tables = await SeatingTable.find({
      eventId,
    })
      .lean<TableDoc[]>()
      .exec();

    if (!Array.isArray(tables) || !tables.length) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאו שולחנות לאירוע הזה",
          debug: {
            eventId,
            invitationId: String(invitationId),
          },
        },
        { status: 400 }
      );
    }

    /*
      ✅ השדה של המקומות אצלך הוא seats.
      כל שולחן שאין לו seats גדול מ־0 לא נכנס לחישוב.
    */
    const tableStates = tables
      .map((table) => {
        const capacity = getTableCapacity(table);

        return {
          table,
          tableId: String(table._id),
          tableName: getTableName(table),
          capacity,
          remaining: capacity,
          seatedGuests: [] as InvitationGuestDoc[],
        };
      })
      .filter((table) => table.capacity > 0)
      .sort((a, b) => b.capacity - a.capacity);

    if (!tableStates.length) {
      return NextResponse.json(
        {
          success: false,
          error: "לא הוגדרה כמות מקומות בשולחנות",
          debug: {
            eventId,
            invitationId: String(invitationId),
            tablesCount: tables.length,
            sampleTables: tables.slice(0, 5).map((table) => ({
              id: String(table._id),
              name: getTableName(table),
              seats: table.seats,
              seatedGuestsCount: table.seatedGuests?.length || 0,
            })),
          },
        },
        { status: 400 }
      );
    }

    /* ===============================
       VALIDATE SEATS
    =============================== */

    const totalGuestSeats = approvedGuests.reduce((sum, guest) => {
      return sum + getGuestCount(guest);
    }, 0);

    const totalTableSeats = tableStates.reduce((sum, table) => {
      return sum + table.capacity;
    }, 0);

    if (totalGuestSeats > totalTableSeats) {
      return NextResponse.json(
        {
          success: false,
          error: `אין מספיק מקומות. יש ${totalGuestSeats} מקומות נדרשים למי שאישר הגעה, אבל רק ${totalTableSeats} מקומות בשולחנות.`,
          totalGuestSeats,
          totalTableSeats,
          approvedGuestsCount: approvedGuests.length,
          tablesCount: tableStates.length,
        },
        { status: 400 }
      );
    }

    /* ===============================
       RESET CURRENT SEATING
       פעולה של "הושב מחדש" מאפסת הושבה קיימת
       ואז בונה מחדש לפי קבוצות.
    =============================== */

    await SeatingTable.updateMany(
      { eventId },
      {
        $set: {
          seatedGuests: [],
        },
      }
    );

    await InvitationGuest.updateMany(
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
       BUILD GROUPS
       רק אורחים שאישרו הגעה
    =============================== */

    const groupMap = new Map<
      string,
      {
        key: string;
        members: InvitationGuestDoc[];
        seatsNeeded: number;
      }
    >();

    for (const guest of approvedGuests) {
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

    const unseatedGuests: InvitationGuestDoc[] = [];

    /* ===============================
       SMART SEATING ALGORITHM

       1. קודם מנסה לשים קבוצה שלמה בשולחן אחד.
       2. אם אין שולחן מתאים — מפצל לקבוצות שולחנות פנויים.
       3. משתמש ב־table.seats ככמות המקומות.
    =============================== */

    for (const group of groups) {
      const groupSeatsNeeded = group.seatsNeeded;

      const bestFullTable = tableStates
        .filter((table) => table.remaining >= groupSeatsNeeded)
        .sort((a, b) => a.remaining - b.remaining)[0];

      if (bestFullTable) {
        bestFullTable.seatedGuests.push(...group.members);
        bestFullTable.remaining -= groupSeatsNeeded;
        continue;
      }

      let guestsToSeat = [...group.members];

      const availableTables = tableStates
        .filter((table) => table.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining);

      for (const table of availableTables) {
        if (!guestsToSeat.length) break;

        let remainingSeatsInTable = table.remaining;
        const chunk: InvitationGuestDoc[] = [];

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

    for (const tableState of tableStates) {
      let currentSeatNumber = 1;

      const seatedGuestsPayload = tableState.seatedGuests.map((guest) => {
        const guestCount = getGuestCount(guest);
        const seatNumber = currentSeatNumber;

        currentSeatNumber += guestCount;

        return {
          guestId: guest._id,
          name: getGuestName(guest),
          phone: guest.phone || "",
          guestsCount: guestCount,
          count: guestCount,
          groupId: guest.groupId || null,
          relation: guest.relation || "",
          rsvp: guest.rsvp || "",
          status: guest.status || "",
          seatNumber,
        };
      });

      seatedGuestCount += tableState.seatedGuests.length;

      seatedSeatsCount += tableState.seatedGuests.reduce((sum, guest) => {
        return sum + getGuestCount(guest);
      }, 0);

      await SeatingTable.updateOne(
        {
          _id: tableState.tableId,
          eventId,
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

        await InvitationGuest.updateOne(
          {
            _id: guest._id,
            invitationId,
          },
          {
            $set: {
              tableId: tableState.tableId,
              tableName: tableState.tableName,
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

      totalApprovedGuests: approvedGuests.length,
      totalGuestsInInvitation: allGuests.length,

      totalGuestSeats,
      totalTableSeats,

      tablesCount: tableStates.length,
      unseatedCount: unseatedGuests.length,

      tablesSummary: tableStates.map((table) => ({
        tableId: table.tableId,
        tableName: table.tableName,
        seats: table.capacity,
        seatedGuests: table.seatedGuests.length,
        usedSeats: table.seatedGuests.reduce((sum, guest) => {
          return sum + getGuestCount(guest);
        }, 0),
        remaining: table.remaining,
      })),

      unseatedGuests: unseatedGuests.map((guest) => ({
        id: String(guest._id),
        name: getGuestName(guest),
        phone: guest.phone || "",
        guestsCount: getGuestCount(guest),
        groupId: guest.groupId ? String(guest.groupId) : null,
        relation: guest.relation || "",
        rsvp: guest.rsvp || "",
        status: guest.status || "",
      })),

      debug: {
        eventId,
        invitationId: String(invitationId),
        allGuestsCount: allGuests.length,
        approvedGuestsCount: approvedGuests.length,
        tablesCount: tables.length,
        validTablesCount: tableStates.length,
      },
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