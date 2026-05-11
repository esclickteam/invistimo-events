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
  tableId?: string | null;
  tableName?: string | null;
  tableNumber?: number | null;
  seatNumber?: number | null;
};

type SeatingInnerTable = {
  id?: string;
  _id?: string;
  name?: string;
  number?: number;
  tableName?: string;
  title?: string;
  type?: string;
  seats?: number | string;
  seatedGuests?: any[];
  [key: string]: any;
};

function getGuestName(guest: InvitationGuestDoc) {
  return guest.name || guest.fullName || "אורח ללא שם";
}

function getGuestCount(guest: InvitationGuestDoc) {
  const arrived = Number(guest.arrivedCount || 0);
  if (Number.isFinite(arrived) && arrived > 0) return Math.floor(arrived);

  const guestsCount = Number(guest.guestsCount || guest.count || 1);
  return Number.isFinite(guestsCount) && guestsCount > 0
    ? Math.floor(guestsCount)
    : 1;
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

function getTableId(table: SeatingInnerTable) {
  return String(table.id || table._id || "");
}

function getTableName(table: SeatingInnerTable) {
  return (
    table.name ||
    table.tableName ||
    table.title ||
    (table.number ? `שולחן ${table.number}` : "שולחן")
  );
}

function getTableNumber(table: SeatingInnerTable) {
  if (typeof table.number === "number") return table.number;

  const name = String(table.name || table.tableName || table.title || "");
  const match = name.match(/\d+/);
  if (!match) return null;

  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function getTableCapacity(table: SeatingInnerTable) {
  const seats = Number(table.seats || 0);
  return Number.isFinite(seats) && seats > 0 ? Math.floor(seats) : 0;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const guard = await requireSeating();
    if (!guard.ok) {
      return guard.response!;
    }

    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "MISSING_EVENT_ID" },
        { status: 400 }
      );
    }

    /*
      1. מוצאים הזמנה לפי eventId
    */
    const invitation = await Invitation.findOne({ eventId })
      .select("_id eventId")
      .lean<{ _id: mongoose.Types.ObjectId; eventId?: string } | null>();

    if (!invitation?._id) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה הזמנה לאירוע הזה" },
        { status: 400 }
      );
    }

    const invitationId = invitation._id;

    /*
      2. שולפים אורחים מאותו מקור כמו /api/seating/guests/[eventId]
    */
    const allGuests = await InvitationGuest.find({ invitationId })
      .lean<InvitationGuestDoc[]>()
      .exec();

    if (!allGuests.length) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאו אורחים להזמנה הזו",
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
        },
        { status: 400 }
      );
    }

    /*
      3. שולפים את מסמך ההושבה.
      חשוב: אצלך SeatingTable הוא מסמך אחד עם tables בפנים.
    */
    const seatingDoc = await SeatingTable.findOne({ eventId }).lean<any>();

    if (!seatingDoc) {
      return NextResponse.json(
        { success: false, error: "לא נמצא סידור הושבה לאירוע הזה" },
        { status: 400 }
      );
    }

    const rawTables: SeatingInnerTable[] = Array.isArray(seatingDoc.tables)
      ? seatingDoc.tables
      : [];

    if (!rawTables.length) {
      return NextResponse.json(
        { success: false, error: "לא נמצאו שולחנות בסידור ההושבה" },
        { status: 400 }
      );
    }

    /*
      4. מכינים שולחנות לפי table.seats
    */
    const tableStates = rawTables
      .map((table) => {
        const tableId = getTableId(table);
        const capacity = getTableCapacity(table);

        return {
          table,
          tableId,
          tableName: getTableName(table),
          tableNumber: getTableNumber(table),
          capacity,
          remaining: capacity,
          seatedGuests: [] as InvitationGuestDoc[],
        };
      })
      .filter((table) => table.tableId && table.capacity > 0)
      .sort((a, b) => b.capacity - a.capacity);

    if (!tableStates.length) {
      return NextResponse.json(
        {
          success: false,
          error: "לא הוגדרה כמות מקומות בשולחנות",
          debug: {
            tablesCount: rawTables.length,
            sampleTables: rawTables.slice(0, 5).map((table) => ({
              id: table.id,
              _id: table._id,
              name: table.name,
              number: table.number,
              seats: table.seats,
            })),
          },
        },
        { status: 400 }
      );
    }

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
        },
        { status: 400 }
      );
    }

    /*
      5. איפוס שיוך קודם אצל כל האורחים
    */
    await InvitationGuest.updateMany(
      { invitationId },
      {
        $unset: {
          tableId: "",
          seatNumber: "",
        },
        $set: {
          tableNumber: null,
          tableName: "",
        },
      }
    );

    /*
      6. בניית קבוצות לפי groupId / relation
    */
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

    /*
      7. אלגוריתם הושבה
    */
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

    /*
      8. מחזירים את seatedGuests לתוך מערך tables הקיים
    */
    const tableStateById = new Map(
      tableStates.map((table) => [table.tableId, table])
    );

    const updatedTables = rawTables.map((table) => {
      const tableId = getTableId(table);
      const state = tableStateById.get(tableId);

      if (!state) {
        return {
          ...table,
          seatedGuests: [],
        };
      }

      let currentSeatNumber = 1;

      const seatedGuestsPayload = state.seatedGuests.map((guest) => {
        const guestCount = getGuestCount(guest);
        const seatNumber = currentSeatNumber;

        currentSeatNumber += guestCount;

        return {
          guestId: String(guest._id),
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

      return {
        ...table,
        seatedGuests: seatedGuestsPayload,
      };
    });

    /*
      9. שמירת מערך הטבלאות במסמך ההושבה
    */
    await SeatingTable.updateOne(
      { eventId },
      {
        $set: {
          tables: updatedTables,
          updatedAt: new Date(),
        },
      }
    );

    /*
      10. עדכון האורחים עצמם
    */
    for (const tableState of tableStates) {
      let currentSeatNumber = 1;

      for (const guest of tableState.seatedGuests) {
        const guestCount = getGuestCount(guest);
        const seatNumber = currentSeatNumber;

        currentSeatNumber += guestCount;

        await InvitationGuest.updateOne(
          {
            _id: guest._id,
            invitationId,
          },
          {
            $set: {
              tableId: tableState.tableId,
              tableName: tableState.tableName,
              tableNumber: tableState.tableNumber,
              seatNumber,
            },
          }
        );
      }
    }

    const seatedGuestCount = tableStates.reduce((sum, table) => {
      return sum + table.seatedGuests.length;
    }, 0);

    const seatedSeatsCount = tableStates.reduce((sum, table) => {
      return (
        sum +
        table.seatedGuests.reduce((innerSum, guest) => {
          return innerSum + getGuestCount(guest);
        }, 0)
      );
    }, 0);

    return NextResponse.json({
      success: true,
      message: "SMART_SEATING_COMPLETED",
      seatedCount: seatedGuestCount,
      seatedGuestCount,
      seatedSeatsCount,
      totalApprovedGuests: approvedGuests.length,
      totalGuestsInInvitation: allGuests.length,
      totalGuestSeats,
      totalTableSeats,
      tablesCount: tableStates.length,
      unseatedCount: unseatedGuests.length,
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