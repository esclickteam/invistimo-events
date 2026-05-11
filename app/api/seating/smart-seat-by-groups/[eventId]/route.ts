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

type TableState = {
  tableId: string;
  tableName: string;
  tableNumber: number;
  capacity: number;
  remaining: number;
  originalIndex: number;
  seatedGuests: InvitationGuestDoc[];
};

type GroupBucket = {
  key: string;
  label: string;
  groupId: string | null;
  members: InvitationGuestDoc[];
  seatsNeeded: number;
  isNoGroup: boolean;
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

function hasRealGroup(guest: InvitationGuestDoc) {
  return Boolean(
    guest.groupId || (guest.relation && String(guest.relation).trim())
  );
}

function getGroupKey(guest: InvitationGuestDoc) {
  if (guest.groupId) {
    return `group:${String(guest.groupId)}`;
  }

  if (guest.relation?.trim()) {
    return `relation:${guest.relation.trim().toLowerCase()}`;
  }

  return `no-group:${String(guest._id)}`;
}

function getGroupLabel(guest: InvitationGuestDoc) {
  if (guest.relation?.trim()) {
    return guest.relation.trim();
  }

  if (guest.groupId) {
    return `קבוצה ${String(guest.groupId)}`;
  }

  return "ללא קבוצה";
}

function getGroupId(guest: InvitationGuestDoc) {
  return guest.groupId ? String(guest.groupId) : null;
}

function getTableName(table: SeatingInnerTable) {
  return table.name || "שולחן";
}

/* ✅ חילוץ מספר שולחן מהשם, לדוגמה: "שולחן 16" => 16 */
function getTableNumber(table: SeatingInnerTable, fallbackIndex: number) {
  const name = String(table.name || "").trim();
  const match = name.match(/\d+/);

  if (match) {
    const number = Number(match[0]);

    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }

  return fallbackIndex + 1;
}

function getTableCapacity(table: SeatingInnerTable) {
  const seats = Number(table.seats || 0);
  return Number.isFinite(seats) && seats > 0 ? Math.floor(seats) : 0;
}

function getUsedSeats(table: TableState) {
  return table.capacity - table.remaining;
}

function isPartiallyUsedTable(table: TableState) {
  const used = getUsedSeats(table);
  return used > 0 && table.remaining > 0;
}

function compareByTableNumber(a: TableState, b: TableState) {
  if (a.tableNumber !== b.tableNumber) {
    return a.tableNumber - b.tableNumber;
  }

  return a.originalIndex - b.originalIndex;
}

/*
  ✅ שילוב חכם:
  1. קודם חורים בשולחנות שכבר התחילו להתמלא.
  2. בתוך החורים — לפי מספר שולחן מהנמוך לגבוה.
  3. אחר כך שולחנות ריקים — גם לפי מספר מהנמוך לגבוה.
*/
function compareSmartFillOrder(a: TableState, b: TableState) {
  const aPartial = isPartiallyUsedTable(a);
  const bPartial = isPartiallyUsedTable(b);

  if (aPartial && !bPartial) return -1;
  if (!aPartial && bPartial) return 1;

  return compareByTableNumber(a, b);
}

function findNextEmptyTableIndex(
  tableStates: TableState[],
  startIndex: number
) {
  for (let i = startIndex; i < tableStates.length; i++) {
    const table = tableStates[i];

    if (getUsedSeats(table) === 0 && table.remaining > 0) {
      return i;
    }
  }

  return -1;
}

function seatMembersIntoTable(
  table: TableState,
  members: InvitationGuestDoc[]
) {
  while (members.length && table.remaining > 0) {
    const nextGuest = members[0];
    const guestSeats = getGuestCount(nextGuest);

    if (guestSeats <= table.remaining) {
      table.seatedGuests.push(nextGuest);
      table.remaining -= guestSeats;
      members.shift();
    } else {
      break;
    }
  }
}

function seatWholeGroupBestFit(
  group: GroupBucket,
  tableStates: TableState[]
) {
  const bestTable = tableStates
    .filter((table) => table.remaining >= group.seatsNeeded)
    .sort(compareSmartFillOrder)[0];

  if (!bestTable) {
    return false;
  }

  bestTable.seatedGuests.push(...group.members);
  bestTable.remaining -= group.seatsNeeded;

  return true;
}

function splitGroupIntoAvailableTables(
  group: GroupBucket,
  tableStates: TableState[]
) {
  const remainingMembers = [...group.members];

  const availableTables = tableStates
    .filter((table) => table.remaining > 0)
    .sort(compareSmartFillOrder);

  for (const table of availableTables) {
    if (!remainingMembers.length) break;
    seatMembersIntoTable(table, remainingMembers);
  }

  return remainingMembers;
}

/* ===============================
   POST
=============================== */

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const guard = await requireSeating();
    if (!guard.ok) {
      return guard.response!;
    }

    const { eventId } = await context.params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    /* ===============================
       1. מציאת הזמנה לפי eventId
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
       2. שליפת אורחים מהמקור האמיתי
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
       3. שליפת מסמך ההושבה
       SeatingTable = מסמך אחד לאירוע
       tables = מערך שולחנות בפנים
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
       4. בניית שולחנות לפי מספר שולחן
       ✅ שולחן 1 ואז 2 ואז 3 וכן הלאה
    =============================== */

    const tableStates: TableState[] = rawTables
      .map((table, index) => {
        const capacity = getTableCapacity(table);
        const tableName = getTableName(table);
        const tableNumber = getTableNumber(table, index);

        return {
          tableId: table.id,
          tableName,
          tableNumber,
          capacity,
          remaining: capacity,
          originalIndex: index,
          seatedGuests: [],
        };
      })
      .filter((table) => table.tableId && table.capacity > 0)
      .sort(compareByTableNumber);

    if (!tableStates.length) {
      return NextResponse.json(
        {
          success: false,
          error: "לא הוגדרה כמות מקומות בשולחנות",
          debug: {
            rawTablesCount: rawTables.length,
            sampleTables: rawTables.slice(0, 5).map((table) => ({
              id: table.id,
              name: table.name,
              seats: table.seats,
              seatedGuests: table.seatedGuests,
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

    /* ===============================
       5. איפוס שיוך קודם באורחים
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
       6. בניית קבוצות
       קבוצות אמיתיות לפי groupId/relation
       ללא קבוצה נשארים לסוף
    =============================== */

    const groupedMap = new Map<string, GroupBucket>();
    const noGroupBuckets: GroupBucket[] = [];

    for (const guest of approvedGuests) {
      const guestSeats = getGuestCount(guest);

      if (!hasRealGroup(guest)) {
        noGroupBuckets.push({
          key: `no-group:${String(guest._id)}`,
          label: "ללא קבוצה",
          groupId: null,
          members: [guest],
          seatsNeeded: guestSeats,
          isNoGroup: true,
        });

        continue;
      }

      const key = getGroupKey(guest);

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          key,
          label: getGroupLabel(guest),
          groupId: getGroupId(guest),
          members: [],
          seatsNeeded: 0,
          isNoGroup: false,
        });
      }

      const group = groupedMap.get(key)!;
      group.members.push(guest);
      group.seatsNeeded += guestSeats;
    }

    const groupedBuckets = Array.from(groupedMap.values()).sort(
      (a, b) => b.seatsNeeded - a.seatsNeeded
    );

    const maxTableCapacity = Math.max(
      ...tableStates.map((table) => table.capacity)
    );

    /*
      קבוצה גדולה:
      לפחות 75% משולחן מלא או יותר.
      לדוגמה אם שולחן הוא 12, אז 9+ נחשבת גדולה.
    */
    const largeGroupThreshold = Math.max(2, Math.ceil(maxTableCapacity * 0.75));

    const largeGroups = groupedBuckets.filter(
      (group) => group.seatsNeeded >= largeGroupThreshold
    );

    const smallGroups = groupedBuckets.filter(
      (group) => group.seatsNeeded < largeGroupThreshold
    );

    const unseatedGuests: InvitationGuestDoc[] = [];

    /* =========================================================
       שלב 1:
       קבוצות גדולות קודם.
       קבוצה גדולה מקבלת שולחנות ריקים ברצף לפי מספר שולחן.
       אם היא גדולה משולחן אחד — היא תמלא כמה שולחנות מאותה קבוצה.
       לא מכניסים לתוכה קבוצות קטנות בשלב הזה.
    ========================================================= */

    let tableCursor = 0;

    for (const group of largeGroups) {
      let remainingMembers = [...group.members];

      while (remainingMembers.length) {
        const nextTableIndex = findNextEmptyTableIndex(
          tableStates,
          tableCursor
        );

        if (nextTableIndex === -1) {
          break;
        }

        const table = tableStates[nextTableIndex];

        seatMembersIntoTable(table, remainingMembers);

        tableCursor = nextTableIndex + 1;
      }

      if (remainingMembers.length) {
        unseatedGuests.push(...remainingMembers);
      }
    }

    /* =========================================================
       שלב 2:
       קבוצות קטנות.
       קודם חורים בשולחנות שכבר התמלאו חלקית,
       אבל לפי מספר שולחן מהנמוך לגבוה.
       אם אין חור מתאים — עוברים לשולחן ריק הכי נמוך.
       אם אין מקום לקבוצה שלמה — מפצלים רק אם חייבים.
    ========================================================= */

    for (const group of smallGroups) {
      const seatedWhole = seatWholeGroupBestFit(group, tableStates);

      if (seatedWhole) {
        continue;
      }

      const stillUnseated = splitGroupIntoAvailableTables(group, tableStates);

      if (stillUnseated.length) {
        unseatedGuests.push(...stillUnseated);
      }
    }

    /* =========================================================
       שלב 3:
       ללא קבוצה / בודדים אחרונים.
       נכנסים רק אחרי שכל הקבוצות שובצו.
       גם כאן: קודם חורים, ואז שולחנות ריקים, הכל לפי מספר עולה.
    ========================================================= */

    const sortedNoGroupBuckets = noGroupBuckets.sort(
      (a, b) => b.seatsNeeded - a.seatsNeeded
    );

    for (const group of sortedNoGroupBuckets) {
      const seatedWhole = seatWholeGroupBestFit(group, tableStates);

      if (seatedWhole) {
        continue;
      }

      const stillUnseated = splitGroupIntoAvailableTables(group, tableStates);

      if (stillUnseated.length) {
        unseatedGuests.push(...stillUnseated);
      }
    }

    /* ===============================
       7. בניית tables[] לפי המודל האמיתי
       seatedGuests = רשומה לכל כיסא תפוס
       אם אורח מייצג כמה מוזמנים:
       הראשון isVirtual=false
       השאר isVirtual=true
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
          group: null,
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

        for (let i = 0; i < guestSeats; i++) {
          seatedGuestsPayload.push({
            guestId: guest._id,
            seatIndex,
            arrived: false,
            isVirtual: i > 0,
          });

          seatIndex += 1;
        }
      }

      /*
        Snapshot של הקבוצות שעל השולחן.
        אם יש כמה קבוצות, השם יהיה משולב:
        "משפחה קרובה / חברים"
      */
      const groupNames = Array.from(
        new Set(
          state.seatedGuests
            .map((guest) => String(guest.relation || "").trim())
            .filter(Boolean)
        )
      );

      const groupIds = Array.from(
        new Set(
          state.seatedGuests
            .map((guest) => (guest.groupId ? String(guest.groupId) : ""))
            .filter(Boolean)
        )
      );

      const usedSeats = state.seatedGuests.reduce((sum, guest) => {
        return sum + getGuestCount(guest);
      }, 0);

      const groupSnapshot =
        groupNames.length || groupIds.length
          ? {
              id:
                groupIds.length === 1 &&
                mongoose.Types.ObjectId.isValid(groupIds[0])
                  ? new mongoose.Types.ObjectId(groupIds[0])
                  : null,
              name:
                groupNames.length > 0
                  ? groupNames.join(" / ")
                  : groupIds.length === 1
                  ? groupIds[0]
                  : "מספר קבוצות",
              expectedCount: usedSeats,
            }
          : null;

      return {
        ...table,
        seatedGuests: seatedGuestsPayload,
        group: groupSnapshot,
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
       8. עדכון InvitationGuest
       כל אורח אמיתי מתעדכן פעם אחת
       גם אם הוא תפס כמה כיסאות
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
              tableNumber: tableState.tableNumber,
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

      largeGroupsCount: largeGroups.length,
      smallGroupsCount: smallGroups.length,
      noGroupCount: noGroupBuckets.length,

      tablesSummary: tableStates.map((table) => ({
        tableId: table.tableId,
        tableName: table.tableName,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        usedSeats: table.capacity - table.remaining,
        remaining: table.remaining,
        seatedRealGuestsCount: table.seatedGuests.length,
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