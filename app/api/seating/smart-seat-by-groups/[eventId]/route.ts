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

const DEFAULT_TABLE_CAPACITY = 12;
const MIN_TABLE_OCCUPANCY_RATIO = 0.5;

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

function getMinOccupancy(table: TableState) {
  return Math.ceil(table.capacity * MIN_TABLE_OCCUPANCY_RATIO);
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
   AUTO TABLES
=============================== */

function getNextTableNumber(rawTables: SeatingInnerTable[]) {
  const numbers = rawTables
    .map((table, index) => getTableNumber(table, index))
    .filter((num) => Number.isFinite(num) && num > 0);

  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function getDefaultAutoTablePosition(rawTables: SeatingInnerTable[]) {
  const existingWithPosition = rawTables.filter(
    (table) => Number.isFinite(Number(table.x)) && Number.isFinite(Number(table.y))
  );

  if (!existingWithPosition.length) {
    return { x: 120, y: 120 };
  }

  const maxX = Math.max(...existingWithPosition.map((table) => Number(table.x || 0)));
  const maxY = Math.max(...existingWithPosition.map((table) => Number(table.y || 0)));

  return {
    x: maxX + 160,
    y: maxY,
  };
}

function createAutoTable(
  rawTables: SeatingInnerTable[],
  tableNumber: number,
  capacity: number
): SeatingInnerTable {
  const { x, y } = getDefaultAutoTablePosition(rawTables);

  return {
    id: `auto-table-${new mongoose.Types.ObjectId().toString()}`,
    name: `שולחן ${tableNumber}`,
    type: "round",
    seats: capacity,
    x,
    y,
    rotation: 0,
    width: 120,
    height: 120,
    radius: 60,
    color: "#F8F1E7",
    locked: false,
    seatedGuests: [],
    group: null,
    isAutoCreated: true,
  };
}

function ensureEnoughTables(
  rawTables: SeatingInnerTable[],
  totalGuestSeats: number
) {
  let totalTableSeats = rawTables.reduce((sum, table) => {
    return sum + getTableCapacity(table);
  }, 0);

  const existingCapacities = rawTables
    .map(getTableCapacity)
    .filter((capacity) => capacity > 0);

  const defaultCapacity = existingCapacities.length
    ? Math.max(...existingCapacities)
    : DEFAULT_TABLE_CAPACITY;

  let nextTableNumber = getNextTableNumber(rawTables);
  let addedTablesCount = 0;

  while (totalTableSeats < totalGuestSeats) {
    const newTable = createAutoTable(rawTables, nextTableNumber, defaultCapacity);

    rawTables.push(newTable);

    totalTableSeats += defaultCapacity;
    nextTableNumber += 1;
    addedTablesCount += 1;
  }

  return {
    rawTables,
    totalTableSeats,
    addedTablesCount,
  };
}

/* ===============================
   REBALANCE WEAK TABLES
=============================== */

function buildSeatedGroupBucketsFromTable(table: TableState): GroupBucket[] {
  const map = new Map<string, GroupBucket>();

  for (const guest of table.seatedGuests) {
    const key = getGroupKey(guest);
    const seatsNeeded = getGuestCount(guest);

    if (!map.has(key)) {
      map.set(key, {
        key,
        label: getGroupLabel(guest),
        groupId: getGroupId(guest),
        members: [],
        seatsNeeded: 0,
        isNoGroup: !hasRealGroup(guest),
      });
    }

    const bucket = map.get(key)!;
    bucket.members.push(guest);
    bucket.seatsNeeded += seatsNeeded;
  }

  return Array.from(map.values());
}

function removeGuestsFromTable(table: TableState, guestsToRemove: InvitationGuestDoc[]) {
  const idsToRemove = new Set(guestsToRemove.map((guest) => String(guest._id)));

  table.seatedGuests = table.seatedGuests.filter(
    (guest) => !idsToRemove.has(String(guest._id))
  );

  const removedSeats = guestsToRemove.reduce((sum, guest) => {
    return sum + getGuestCount(guest);
  }, 0);

  table.remaining += removedSeats;
}

function addGuestsToTable(table: TableState, guestsToAdd: InvitationGuestDoc[]) {
  table.seatedGuests.push(...guestsToAdd);

  const addedSeats = guestsToAdd.reduce((sum, guest) => {
    return sum + getGuestCount(guest);
  }, 0);

  table.remaining -= addedSeats;
}

/*
  ✅ אם יש שולחן חלש, לדוגמה 2/12:
  - לא משאירים אותו ככה.
  - מחפשים קבוצות קטנות משולחנות אחרים.
  - מעבירים כמה קבוצות קטנות לשולחן החלש.
  - לא מפרקים קבוצות.
  - לא הופכים את השולחן התורם לחלש מדי.
*/
function rebalanceWeakTablesWithSmallGroups(tableStates: TableState[]) {
  let changed = true;
  let movesCount = 0;

  while (changed) {
    changed = false;

    const weakTables = tableStates
      .filter((table) => {
        const used = getUsedSeats(table);
        const min = getMinOccupancy(table);

        return used > 0 && used < min && table.remaining > 0;
      })
      .sort((a, b) => {
        const usedA = getUsedSeats(a);
        const usedB = getUsedSeats(b);

        if (usedA !== usedB) return usedA - usedB;

        return compareByTableNumber(a, b);
      });

    for (const weakTable of weakTables) {
      const weakUsed = getUsedSeats(weakTable);
      const weakMin = getMinOccupancy(weakTable);

      if (weakUsed >= weakMin) continue;

      const donorCandidates: {
        donorTable: TableState;
        group: GroupBucket;
        donorAfterMove: number;
      }[] = [];

      for (const donorTable of tableStates) {
        if (donorTable.tableId === weakTable.tableId) continue;

        const donorUsed = getUsedSeats(donorTable);
        const donorMin = getMinOccupancy(donorTable);

        if (donorUsed <= donorMin) continue;

        const donorGroups = buildSeatedGroupBucketsFromTable(donorTable);

        for (const group of donorGroups) {
          if (group.seatsNeeded <= 0) continue;
          if (group.seatsNeeded > weakTable.remaining) continue;

          const donorAfterMove = donorUsed - group.seatsNeeded;

          if (donorAfterMove < donorMin) continue;

          donorCandidates.push({
            donorTable,
            group,
            donorAfterMove,
          });
        }
      }

      if (!donorCandidates.length) {
        continue;
      }

      donorCandidates.sort((a, b) => {
        if (a.group.seatsNeeded !== b.group.seatsNeeded) {
          return a.group.seatsNeeded - b.group.seatsNeeded;
        }

        return compareByTableNumber(a.donorTable, b.donorTable);
      });

      for (const candidate of donorCandidates) {
        const currentWeakUsed = getUsedSeats(weakTable);
        const currentWeakMin = getMinOccupancy(weakTable);

        if (currentWeakUsed >= currentWeakMin) {
          break;
        }

        if (candidate.group.seatsNeeded > weakTable.remaining) {
          continue;
        }

        const donorUsed = getUsedSeats(candidate.donorTable);
        const donorMin = getMinOccupancy(candidate.donorTable);
        const donorAfterMove = donorUsed - candidate.group.seatsNeeded;

        if (donorAfterMove < donorMin) {
          continue;
        }

        removeGuestsFromTable(candidate.donorTable, candidate.group.members);
        addGuestsToTable(weakTable, candidate.group.members);

        changed = true;
        movesCount += 1;
      }
    }
  }

  return movesCount;
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

    const seatingDoc = await SeatingTable.findOne({ eventId }).lean<any>();

    if (!seatingDoc) {
      return NextResponse.json(
        { success: false, error: "לא נמצא סידור הושבה לאירוע הזה" },
        { status: 400 }
      );
    }

    let rawTables: SeatingInnerTable[] = Array.isArray(seatingDoc.tables)
      ? [...seatingDoc.tables]
      : [];

    if (!rawTables.length) {
      return NextResponse.json(
        { success: false, error: "לא נמצאו שולחנות בסידור ההושבה" },
        { status: 400 }
      );
    }

    const totalGuestSeats = approvedGuests.reduce((sum, guest) => {
      return sum + getGuestCount(guest);
    }, 0);

    const totalTableSeatsBeforeAuto = rawTables.reduce((sum, table) => {
      return sum + getTableCapacity(table);
    }, 0);

    const autoTableResult = ensureEnoughTables(rawTables, totalGuestSeats);

    rawTables = autoTableResult.rawTables;

    const totalTableSeats = autoTableResult.totalTableSeats;
    const addedTablesCount = autoTableResult.addedTablesCount;

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

    const largeGroupThreshold = Math.max(2, Math.ceil(maxTableCapacity * 0.75));

    const largeGroups = groupedBuckets.filter(
      (group) => group.seatsNeeded >= largeGroupThreshold
    );

    const smallGroups = groupedBuckets.filter(
      (group) => group.seatsNeeded < largeGroupThreshold
    );

    const unseatedGuests: InvitationGuestDoc[] = [];

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

    /*
      ✅ השלב החדש:
      אחרי שכל האורחים שובצו, בודקים אם נוצר שולחן חלש.
      לדוגמה 2/12, 3/12, 4/12, 5/12.
      אם כן — מעבירים אליו כמה קבוצות קטנות משולחנות אחרים.
    */
    const rebalanceMovesCount = rebalanceWeakTablesWithSmallGroups(tableStates);

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
      totalTableSeatsBeforeAuto,
      totalTableSeats,
      addedTablesCount,
      rebalanceMovesCount,

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
        minOccupancy: getMinOccupancy(table),
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