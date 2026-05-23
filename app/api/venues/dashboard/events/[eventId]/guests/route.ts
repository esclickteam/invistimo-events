import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import SeatingTable from "@/models/SeatingTable";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

function stringifyDoc<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function buildIdOrQueries(field: string, value: unknown) {
  const cleanValue = cleanString(value);
  const objectId = toObjectId(cleanValue);

  const queries: any[] = [];

  if (cleanValue) {
    queries.push({ [field]: cleanValue });
  }

  if (objectId) {
    queries.push({ [field]: objectId });
  }

  return queries;
}

function isEventAccessibleByVenueUser({
  event,
  user,
  authUserId,
}: {
  event: any;
  user: any;
  authUserId: string;
}) {
  const role = cleanString(user?.role);

  if (role === "admin") return true;

  if (role === "venue_owner") {
    const eventVenueOwnerId = cleanString(event?.venueOwnerId);
    const eventOwnerId = cleanString(event?.ownerId);

    return eventVenueOwnerId === authUserId || eventOwnerId === authUserId;
  }

  if (user?.impersonated === true || user?.impersonatedByAdmin === true) {
    return true;
  }

  return false;
}

async function findEventById(eventId: string) {
  const eventObjectId = toObjectId(eventId);

  const queries: any[] = [];

  if (eventObjectId) {
    queries.push({ _id: eventObjectId });
  }

  queries.push({ id: eventId });
  queries.push({ eventId });

  return Event.findOne({ $or: queries }).lean();
}

async function findSeatingRecord(eventId: string) {
  const queries: any[] = [
    ...buildIdOrQueries("eventId", eventId),
    ...buildIdOrQueries("venueClientEventId", eventId),
    ...buildIdOrQueries("linkedEventId", eventId),
    ...buildIdOrQueries("productionEventId", eventId),
  ];

  return SeatingTable.findOne({ $or: queries })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
}

function getGuestDisplayName(guest: any) {
  return (
    cleanString(guest?.name) ||
    cleanString(guest?.fullName) ||
    cleanString(guest?.guestName) ||
    cleanString(guest?.firstName) ||
    "אורח ללא שם"
  );
}

function normalizeRsvpStatus(guest: any) {
  const value = cleanString(guest?.rsvp || guest?.status || guest?.rsvpStatus);

  if (
    value === "yes" ||
    value === "confirmed" ||
    value === "arriving" ||
    value === "מגיע"
  ) {
    return "yes";
  }

  if (
    value === "no" ||
    value === "declined" ||
    value === "not_arriving" ||
    value === "notComing" ||
    value === "לא מגיע"
  ) {
    return "no";
  }

  return "pending";
}

function findGuestTableInfo(guestId: string, guestName: string, tables: any[]) {
  for (const table of tables || []) {
    const tableNumber =
      table?.number ||
      table?.tableNumber ||
      table?.name ||
      table?.label ||
      table?.id ||
      "";

    const tableId = table?.id || table?._id || table?.tableId || "";

    const possibleLists = [
      Array.isArray(table?.seats) ? table.seats : [],
      Array.isArray(table?.guests) ? table.guests : [],
      Array.isArray(table?.assignedGuests) ? table.assignedGuests : [],
    ];

    for (const list of possibleLists) {
      for (const item of list) {
        const itemGuestId = cleanString(
          item?.guestId ||
            item?.guest?._id ||
            item?.guest?.id ||
            item?.id ||
            item?._id ||
            item?.assignedGuestId
        );

        const itemGuestName = cleanString(
          item?.guestName || item?.name || item?.guest?.name
        );

        if (guestId && itemGuestId && itemGuestId === guestId) {
          return {
            tableId: cleanString(tableId),
            tableNumber: cleanString(tableNumber),
          };
        }

        if (
          guestName &&
          itemGuestName &&
          itemGuestName.toLowerCase() === guestName.toLowerCase()
        ) {
          return {
            tableId: cleanString(tableId),
            tableNumber: cleanString(tableNumber),
          };
        }
      }
    }
  }

  return {
    tableId: "",
    tableNumber: "",
  };
}

async function getGuestQueryForEvent(eventId: string) {
  const seatingRecord = await findSeatingRecord(eventId);

  const orQueries: any[] = [
    ...buildIdOrQueries("eventId", eventId),
    ...buildIdOrQueries("linkedEventId", eventId),
    ...buildIdOrQueries("venueClientEventId", eventId),
  ];

  if (seatingRecord?.eventId) {
    orQueries.push(...buildIdOrQueries("eventId", seatingRecord.eventId));
  }

  if (seatingRecord?.invitationId) {
    orQueries.push(
      ...buildIdOrQueries("invitationId", seatingRecord.invitationId)
    );
  }

  if (seatingRecord?.userId) {
    orQueries.push(...buildIdOrQueries("userId", seatingRecord.userId));
    orQueries.push(...buildIdOrQueries("ownerId", seatingRecord.userId));
  }

  return {
    seatingRecord,
    query: orQueries.length > 0 ? { $or: orQueries } : null,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const authUserId = cleanString(auth.userId);
    const { eventId } = await context.params;
    const cleanEventId = cleanString(eventId);

    if (!cleanEventId) {
      return NextResponse.json(
        {
          success: false,
          error: "חסר מזהה אירוע",
        },
        { status: 400 }
      );
    }

    const [user, event] = await Promise.all([
      User.findById(authUserId).lean(),
      findEventById(cleanEventId),
    ]);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "משתמש לא נמצא",
        },
        { status: 404 }
      );
    }

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "אירוע לא נמצא",
        },
        { status: 404 }
      );
    }

    if (
      !isEventAccessibleByVenueUser({
        event,
        user,
        authUserId,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "אין הרשאה לצפות במוזמנים של האירוע הזה",
        },
        { status: 403 }
      );
    }

    const guestsCollection = getCollection("guests");

    if (!guestsCollection) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאה קולקשן guests",
        },
        { status: 500 }
      );
    }

    const { seatingRecord, query } = await getGuestQueryForEvent(cleanEventId);

    if (!query) {
      return NextResponse.json({
        success: true,
        guests: [],
        stats: {
          totalRecords: 0,
          confirmedRecords: 0,
          declinedRecords: 0,
          pendingRecords: 0,
          totalGuestsAmount: 0,
          confirmedGuestsAmount: 0,
          arrivedGuestsAmount: 0,
        },
      });
    }

    const guestsRaw = await guestsCollection
      .find(query)
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .toArray();

    const tables = Array.isArray(seatingRecord?.tables)
      ? seatingRecord.tables
      : [];

    let confirmedRecords = 0;
    let declinedRecords = 0;
    let pendingRecords = 0;
    let totalGuestsAmount = 0;
    let confirmedGuestsAmount = 0;
    let arrivedGuestsAmount = 0;

    const guests = guestsRaw.map((guest: any) => {
      const id = String(guest?._id);
      const name = getGuestDisplayName(guest);
      const rsvp = normalizeRsvpStatus(guest);

      const guestsCount =
        Number(guest?.guestsCount) ||
        Number(guest?.count) ||
        Number(guest?.amount) ||
        1;

      const actualArrivedCount =
        Number(guest?.actualArrivedCount) ||
        Number(guest?.arrivedCount) ||
        (guest?.arrived === true || guest?.liveStatus === "arrived"
          ? guestsCount
          : 0);

      if (rsvp === "yes") {
        confirmedRecords += 1;
        confirmedGuestsAmount += guestsCount;
      } else if (rsvp === "no") {
        declinedRecords += 1;
      } else {
        pendingRecords += 1;
      }

      totalGuestsAmount += guestsCount;
      arrivedGuestsAmount += actualArrivedCount;

      const tableInfo = findGuestTableInfo(id, name, tables);

      return {
        id,
        _id: id,

        name,
        phone: cleanString(guest?.phone || guest?.phoneNumber || ""),
        email: cleanString(guest?.email || ""),

        guestsCount,
        rsvp,

        groupId: guest?.groupId ? String(guest.groupId) : null,
        groupName: cleanString(guest?.groupName || guest?.group || ""),

        arrived: actualArrivedCount > 0,
        arrivedCount: actualArrivedCount,
        actualArrivedCount,

        tableId: tableInfo.tableId || null,
        tableNumber: tableInfo.tableNumber || null,

        notes: cleanString(guest?.notes || guest?.note || ""),
        createdAt: guest?.createdAt || null,
        updatedAt: guest?.updatedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      guests: stringifyDoc(guests),
      seating: seatingRecord
        ? {
            id: String(seatingRecord._id),
            eventId: seatingRecord.eventId
              ? String(seatingRecord.eventId)
              : null,
            invitationId: seatingRecord.invitationId
              ? String(seatingRecord.invitationId)
              : null,
            userId: seatingRecord.userId ? String(seatingRecord.userId) : null,
            source: seatingRecord.source || null,
          }
        : null,
      stats: {
        totalRecords: guests.length,
        confirmedRecords,
        declinedRecords,
        pendingRecords,
        totalGuestsAmount,
        confirmedGuestsAmount,
        arrivedGuestsAmount,
      },
    });
  } catch (error: any) {
    console.error(
      "GET /api/venues/dashboard/events/[eventId]/guests failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בשליפת מוזמנים",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const authUserId = cleanString(auth.userId);
    const { eventId } = await context.params;
    const cleanEventId = cleanString(eventId);

    if (!cleanEventId) {
      return NextResponse.json(
        {
          success: false,
          error: "חסר מזהה אירוע",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const guestId = cleanString(body?.guestId || body?.id);
    const actualArrivedCount = Math.max(
      0,
      Math.floor(Number(body?.actualArrivedCount ?? body?.arrivedCount ?? 0))
    );

    const guestObjectId = toObjectId(guestId);

    if (!guestId || !guestObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "מזהה מוזמן לא תקין",
        },
        { status: 400 }
      );
    }

    const [user, event] = await Promise.all([
      User.findById(authUserId).lean(),
      findEventById(cleanEventId),
    ]);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "משתמש לא נמצא",
        },
        { status: 404 }
      );
    }

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "אירוע לא נמצא",
        },
        { status: 404 }
      );
    }

    if (
      !isEventAccessibleByVenueUser({
        event,
        user,
        authUserId,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "אין הרשאה לעדכן מוזמנים באירוע הזה",
        },
        { status: 403 }
      );
    }

    const guestsCollection = getCollection("guests");

    if (!guestsCollection) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאה קולקשן guests",
        },
        { status: 500 }
      );
    }

    const { query } = await getGuestQueryForEvent(cleanEventId);

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאו מוזמנים לאירוע",
        },
        { status: 404 }
      );
    }

    const existingGuest = await guestsCollection.findOne({
      _id: guestObjectId,
      ...query,
    });

    if (!existingGuest) {
      return NextResponse.json(
        {
          success: false,
          error: "המוזמן לא נמצא או לא שייך לאירוע הזה",
        },
        { status: 404 }
      );
    }

    const guestsCount =
      Number(existingGuest?.guestsCount) ||
      Number(existingGuest?.count) ||
      Number(existingGuest?.amount) ||
      1;

    const safeArrivedCount = Math.min(actualArrivedCount, guestsCount);

    await guestsCollection.updateOne(
      {
        _id: guestObjectId,
      },
      {
        $set: {
          actualArrivedCount: safeArrivedCount,
          arrivedCount: safeArrivedCount,
          arrived: safeArrivedCount > 0,
          liveStatus: safeArrivedCount > 0 ? "arrived" : "not_arrived",
          arrivedAt: safeArrivedCount > 0 ? new Date() : null,
          updatedAt: new Date(),
        },
      }
    );

    const updatedGuest = await guestsCollection.findOne({
      _id: guestObjectId,
    });

    return NextResponse.json({
      success: true,
      guest: stringifyDoc(updatedGuest || null),
    });
  } catch (error: any) {
    console.error(
      "PATCH /api/venues/dashboard/events/[eventId]/guests failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בעדכון הגעה בפועל",
      },
      { status: 500 }
    );
  }
}