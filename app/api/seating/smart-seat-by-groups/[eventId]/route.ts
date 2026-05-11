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
};

type SeatingInnerTable = {
  id: string;
  name?: string;
  type?: string;
  group?: any;
  seats?: number;
  x?: number;
  y?: number;
  rotation?: number;
  width?: number;
  height?: number;
  radius?: number;
  color?: string;
  locked?: boolean;
  seatedGuests?: {
    guestId: mongoose.Types.ObjectId | string;
    seatIndex: number;
    arrived?: boolean;
    isVirtual?: boolean;
  }[];
  [key: string]: any;
};

type GroupBucket = {
  key: string;
  members: InvitationGuestDoc[];
  seatsNeeded: number;
};

function getGuestCount(guest: InvitationGuestDoc) {
  const count = Number(
    guest.arrivedCount ||
      guest.actualArrivedCount ||
      guest.guestsCount ||
      guest.count ||
      1
  );

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
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
  if (guest.groupId) return `group:${String(guest.groupId)}`;

  if (guest.relation?.trim()) {
    return `relation:${guest.relation.trim().toLowerCase()}`;
  }

  return `guest:${String(guest._id)}`;
}

function getTableName(table: SeatingInnerTable) {
  return table.name || "שולחן";
}

function getTableCapacity(table: SeatingInnerTable) {
  const seats = Number(table.seats || 0);
  return Number.isFinite(seats) && seats > 0 ? Math.floor(seats) : 0;
}

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

    /* ===============================
       invitation לפי eventId
    =============================== */
    const invitation = await Invitation.findOne({ eventId })
      .select("_id eventId")
      .lean<{ _id: mongoose.Types.ObjectId } | null>();

    if (!invitation?._id) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה הזמנה לאירוע הזה" },
        { status: 400 }
      );
    }

    const invitationId = invitation._id;

    /* ===============================
       אורחים
    =============================== */
    const allGuests = await InvitationGuest.find({ invitationId })
      .lean<InvitationGuestDoc[]>()
      .exec();

    if (!allGuests.length) {
      return NextResponse.json(
        { success: false, error: "לא נמצאו אורחים להזמנה הזו" },
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

    /* ===============================
       מסמך הושבה
    =============================== */
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

    /* ===============================
       טבלאות פעילות
    =============================== */
    const tableStates = rawTables
      .map((table) => {
        const capacity = getTableCapacity(table);

        return {
          tableId: table.id,
          tableName: getTableName(table),
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
            rawTablesCount: rawTables.length,
            sampleTables: rawTables.slice(0, 5).map((t) => ({
              id: t.id,
              name: t.name,
              seats: t.seats,
            })),
          },
        },
        { status: 400 }
      );
    }

    const totalGuestSeats = approvedGuests.reduce(
      (sum, guest) => sum + getGuestCount(guest),
      0
    );

    const totalTableSeats = tableStates.reduce(
      (sum, table) => sum + table.capacity,
      0
    );

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

    /* ===============================
       איפוס שיוך קודם באורחים
    =============================== */
    await InvitationGuest.updateMany(
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

    /* ===============================
       בניית קבוצות
    =============================== */
    const groupMap = new Map<string, GroupBucket>();

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

    const groupsPool: GroupBucket[] = Array.from(groupMap.values()).sort(
      (a, b) => b.seatsNeeded - a.seatsNeeded
    );

    const unseatedGuests: InvitationGuestDoc[] = [];

    /* =========================================================
       אלגוריתם חדש:
       ממלאים שולחן-שולחן, לא מפזרים קבוצות על הרבה שולחנות
    ========================================================= */
    for (const table of tableStates) {
      if (!groupsPool.length) break;

      while (table.remaining > 0 && groupsPool.length > 0) {
        // מחפשים את הקבוצה הכי גדולה שנכנסת בשארית
        let bestIndex = -1;

        for (let i = 0; i < groupsPool.length; i++) {
          if (groupsPool[i].seatsNeeded <= table.remaining) {
            bestIndex = i;
            break; // groupsPool כבר ממוין מהגדול לקטן
          }
        }

        if (bestIndex === -1) {
          // אין יותר קבוצה שלמה שנכנסת בשולחן הזה
          break;
        }

        const chosenGroup = groupsPool[bestIndex];

        table.seatedGuests.push(...chosenGroup.members);
        table.remaining -= chosenGroup.seatsNeeded;

        groupsPool.splice(bestIndex, 1);
      }
    }

    /* =========================================================
       אם נשארו קבוצות שלא נכנסו שלמות:
       רק עכשיו מנסים לפצל — ורק אם באמת חייבים
    ========================================================= */
    for (const group of groupsPool) {
      let remainingGroupMembers = [...group.members];

      const availableTables = tableStates
        .filter((table) => table.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining);

      for (const table of availableTables) {
        if (!remainingGroupMembers.length) break;

        while (remainingGroupMembers.length && table.remaining > 0) {
          const guest = remainingGroupMembers[0];
          const guestSeats = getGuestCount(guest);

          if (guestSeats <= table.remaining) {
            table.seatedGuests.push(guest);
            table.remaining -= guestSeats;
            remainingGroupMembers.shift();
          } else {
            break;
          }
        }
      }

      if (remainingGroupMembers.length) {
        unseatedGuests.push(...remainingGroupMembers);
      }
    }

    /* ===============================
       בניית seatedGuests לפי המודל האמיתי
    =============================== */
    const tableStateById = new Map(
      tableStates.map((table) => [table.tableId, table])
    );

    const updatedTables = rawTables.map((table) => {
      const state = tableStateById.get(table.id);

      if (!state) {
        return {
          ...table,
          seatedGuests: [],
        };
      }

      const seatedGuestsPayload: {
        guestId: mongoose.Types.ObjectId;
        seatIndex: number;
        arrived: boolean;
        isVirtual: boolean;
      }[] = [];

      let seatIndex = 0;

      for (const guest of state.seatedGuests) {
        const guestSeats = getGuestCount(guest);

        seatedGuestsPayload.push({
          guestId: guest._id,
          seatIndex,
          arrived: false,
          isVirtual: false,
        });

        seatIndex += guestSeats;
      }

      return {
        ...table,
        seatedGuests: seatedGuestsPayload,
      };
    });

    await SeatingTable.updateOne(
      { eventId },
      {
        $set: {
          tables: updatedTables,
          updatedAt: new Date(),
        },
      }
    );

    /* ===============================
       עדכון InvitationGuest
    =============================== */
    for (const tableState of tableStates) {
      let seatIndex = 0;

      for (const guest of tableState.seatedGuests) {
        const guestSeats = getGuestCount(guest);

        await InvitationGuest.updateOne(
          {
            _id: guest._id,
            invitationId,
          },
          {
            $set: {
              tableId: tableState.tableId,
              tableName: tableState.tableName,
              seatNumber: seatIndex + 1,
            },
          }
        );

        seatIndex += guestSeats;
      }
    }

    const seatedGuestCount = tableStates.reduce(
      (sum, table) => sum + table.seatedGuests.length,
      0
    );

    const seatedSeatsCount = tableStates.reduce((sum, table) => {
      return (
        sum +
        table.seatedGuests.reduce(
          (innerSum, guest) => innerSum + getGuestCount(guest),
          0
        )
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
      tablesSummary: tableStates.map((table) => ({
        tableId: table.tableId,
        tableName: table.tableName,
        capacity: table.capacity,
        used: table.capacity - table.remaining,
        remaining: table.remaining,
        seatedGuestsCount: table.seatedGuests.length,
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