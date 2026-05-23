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

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
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

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const authUserId = cleanString(auth.userId);
    const { eventId } = await context.params;
    const cleanEventId = cleanString(eventId);

    if (!cleanEventId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה אירוע" },
        { status: 400 }
      );
    }

    const [user, event] = await Promise.all([
      User.findById(authUserId).lean(),
      findEventById(cleanEventId),
    ]);

    if (!user || !event) {
      return NextResponse.json(
        { success: false, error: "אירוע או משתמש לא נמצאו" },
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
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    const seatingRecord = await SeatingTable.findOne({
      $or: [
        ...buildIdOrQueries("eventId", cleanEventId),
        ...buildIdOrQueries("venueClientEventId", cleanEventId),
        ...buildIdOrQueries("linkedEventId", cleanEventId),
        ...buildIdOrQueries("productionEventId", cleanEventId),
      ],
    })
      .select("_id eventId invitationId userId updatedAt createdAt")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const guestsCollection = getCollection("guests");

    let guestsUpdatedAt: Date | null = null;

    if (guestsCollection) {
      const guestOrQueries: any[] = [
        ...buildIdOrQueries("eventId", cleanEventId),
        ...buildIdOrQueries("linkedEventId", cleanEventId),
        ...buildIdOrQueries("venueClientEventId", cleanEventId),
      ];

      if (seatingRecord?.eventId) {
        guestOrQueries.push(...buildIdOrQueries("eventId", seatingRecord.eventId));
      }

      if (seatingRecord?.invitationId) {
        guestOrQueries.push(
          ...buildIdOrQueries("invitationId", seatingRecord.invitationId)
        );
      }

      if (seatingRecord?.userId) {
        guestOrQueries.push(...buildIdOrQueries("userId", seatingRecord.userId));
        guestOrQueries.push(...buildIdOrQueries("ownerId", seatingRecord.userId));
      }

      const latestGuest = await guestsCollection
        .find({ $or: guestOrQueries })
        .project({ updatedAt: 1, createdAt: 1 })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(1)
        .toArray();

      guestsUpdatedAt =
        latestGuest?.[0]?.updatedAt || latestGuest?.[0]?.createdAt || null;
    }

    return NextResponse.json({
      success: true,
      seatingUpdatedAt:
        seatingRecord?.updatedAt || seatingRecord?.createdAt || null,
      guestsUpdatedAt,
    });
  } catch (error: any) {
    console.error("GET venue event sync-status failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בבדיקת סנכרון",
      },
      { status: 500 }
    );
  }
}