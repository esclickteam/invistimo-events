import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import SeatingTable from "@/models/SeatingTable";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Next.js 16 — params הוא Promise
 */
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

function countSeatsFromTables(tables: any[]) {
  let totalSeats = 0;
  let occupiedSeats = 0;

  for (const table of tables || []) {
    const seats = Array.isArray(table?.seats) ? table.seats : [];
    const guests = Array.isArray(table?.guests) ? table.guests : [];
    const assignedGuests = Array.isArray(table?.assignedGuests)
      ? table.assignedGuests
      : [];

    if (seats.length > 0) {
      totalSeats += seats.length;

      for (const seat of seats) {
        if (
          seat?.guestId ||
          seat?.guest ||
          seat?.guestName ||
          seat?.assignedGuestId
        ) {
          occupiedSeats += 1;
        }
      }
    } else {
      const capacity =
        Number(table?.capacity) ||
        Number(table?.seatsCount) ||
        Number(table?.chairs) ||
        Number(table?.maxGuests) ||
        0;

      totalSeats += capacity;
      occupiedSeats += guests.length + assignedGuests.length;
    }
  }

  return {
    totalSeats,
    occupiedSeats,
  };
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
  const eventObjectId = toObjectId(eventId);

  const queries: any[] = [
    ...buildIdOrQueries("eventId", eventId),
    ...buildIdOrQueries("venueClientEventId", eventId),
    ...buildIdOrQueries("linkedEventId", eventId),
    ...buildIdOrQueries("productionEventId", eventId),
  ];

  if (eventObjectId) {
    queries.push({ eventId: eventObjectId });
  }

  return SeatingTable.findOne({ $or: queries })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
}

async function countGuestsForSeating(record: any) {
  const guestsCollection = getCollection("guests");

  if (!guestsCollection) {
    return {
      totalGuests: 0,
      confirmedGuests: 0,
      arrivedGuests: 0,
    };
  }

  const orQueries: any[] = [];

  if (record?.eventId) {
    orQueries.push(...buildIdOrQueries("eventId", record.eventId));
  }

  if (record?.invitationId) {
    orQueries.push(...buildIdOrQueries("invitationId", record.invitationId));
  }

  if (record?.userId) {
    orQueries.push(...buildIdOrQueries("userId", record.userId));
    orQueries.push(...buildIdOrQueries("ownerId", record.userId));
  }

  if (orQueries.length === 0) {
    return {
      totalGuests: 0,
      confirmedGuests: 0,
      arrivedGuests: 0,
    };
  }

  const guests = await guestsCollection
    .find({
      $or: orQueries,
    })
    .project({
      _id: 1,
      guestsCount: 1,
      count: 1,
      amount: 1,
      rsvp: 1,
      status: 1,
      arrivedCount: 1,
      actualArrivedCount: 1,
      arrived: 1,
      liveStatus: 1,
    })
    .toArray();

  let totalGuests = 0;
  let confirmedGuests = 0;
  let arrivedGuests = 0;

  for (const guest of guests) {
    const guestAmount =
      Number(guest?.guestsCount) ||
      Number(guest?.count) ||
      Number(guest?.amount) ||
      1;

    totalGuests += guestAmount;

    const rsvp = cleanString(guest?.rsvp || guest?.status);

    if (
      rsvp === "yes" ||
      rsvp === "confirmed" ||
      rsvp === "arriving" ||
      rsvp === "מגיע"
    ) {
      confirmedGuests += guestAmount;
    }

    const arrivedAmount =
      Number(guest?.actualArrivedCount) ||
      Number(guest?.arrivedCount) ||
      (guest?.arrived === true || guest?.liveStatus === "arrived"
        ? guestAmount
        : 0);

    arrivedGuests += arrivedAmount;
  }

  return {
    totalGuests,
    confirmedGuests,
    arrivedGuests,
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
          error: "אין הרשאה לצפות בהושבה של האירוע הזה",
        },
        { status: 403 }
      );
    }

    const seatingRecord = await findSeatingRecord(cleanEventId);

    if (!seatingRecord) {
      return NextResponse.json({
        success: true,
        exists: false,
        seating: null,
        stats: {
          totalTables: 0,
          totalSeats: 0,
          seatedGuests: 0,
          unseatedGuests: 0,
          arrivedGuests: 0,
          confirmedGuests: 0,
          completed: false,
        },
      });
    }

    const tables = Array.isArray(seatingRecord?.tables)
      ? seatingRecord.tables
      : [];

    const zones = Array.isArray(seatingRecord?.zones)
      ? seatingRecord.zones
      : [];

    const seatStats = countSeatsFromTables(tables);
    const guestStats = await countGuestsForSeating(seatingRecord);

    const confirmedGuests =
      guestStats.confirmedGuests || guestStats.totalGuests || 0;

    const seatedGuests = seatStats.occupiedSeats || 0;
    const unseatedGuests = Math.max(0, confirmedGuests - seatedGuests);

    return NextResponse.json({
      success: true,
      exists: true,
      seating: stringifyDoc({
        id: String(seatingRecord._id),
        _id: String(seatingRecord._id),

        eventId: seatingRecord.eventId ? String(seatingRecord.eventId) : null,
        invitationId: seatingRecord.invitationId
          ? String(seatingRecord.invitationId)
          : null,
        userId: seatingRecord.userId ? String(seatingRecord.userId) : null,

        source: seatingRecord.source || null,
        sourceTemplateId: seatingRecord.sourceTemplateId
          ? String(seatingRecord.sourceTemplateId)
          : null,

        venueHallId: seatingRecord.venueHallId || event?.venueHallId || null,
        venueHallName:
          seatingRecord.venueHallName || event?.venueHallName || null,

        tables,
        zones,
        background: seatingRecord.background || null,
        canvasView: seatingRecord.canvasView || null,

        updatedAt: seatingRecord.updatedAt || null,
        createdAt: seatingRecord.createdAt || null,
      }),
      stats: {
        totalTables: tables.length,
        totalSeats: seatStats.totalSeats,
        seatedGuests,
        unseatedGuests,
        arrivedGuests: guestStats.arrivedGuests,
        confirmedGuests,
        completed: confirmedGuests > 0 && unseatedGuests === 0,
      },
    });
  } catch (error: any) {
    console.error(
      "GET /api/venues/dashboard/events/[eventId]/seating failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בשליפת הושבת האירוע",
      },
      { status: 500 }
    );
  }
}