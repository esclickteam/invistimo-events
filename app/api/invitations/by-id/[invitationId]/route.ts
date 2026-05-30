import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    invitationId: string;
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

function objectIdOrString(value: unknown) {
  const stringValue = cleanString(value);
  const objectIdValue = toObjectId(stringValue);

  return objectIdValue ? [objectIdValue, stringValue] : [stringValue];
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

function normalizeDateOnly(value: unknown) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = cleanString(value);

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toISOString().slice(0, 10);
}

function getInvitationTitle(invitation: any) {
  return (
    cleanString(invitation?.title) ||
    cleanString(invitation?.eventTitle) ||
    cleanString(invitation?.eventName) ||
    cleanString(invitation?.invitationTitle) ||
    cleanString(invitation?.name) ||
    "האירוע שלך"
  );
}

function serializeInvitation(invitation: any, linkedEvent: any) {
  const eventId =
    invitation?.eventId ||
    invitation?.venueClientEventId ||
    invitation?.productionEventId ||
    invitation?.linkedEventId ||
    linkedEvent?._id ||
    "";

  const title =
    getInvitationTitle(invitation) ||
    cleanString(linkedEvent?.title) ||
    "האירוע שלך";

  const eventDate =
    normalizeDateOnly(invitation?.eventDate || invitation?.date) ||
    normalizeDateOnly(linkedEvent?.date);

  const eventTime =
    cleanString(invitation?.eventTime || invitation?.time) ||
    cleanString(linkedEvent?.time);

  const location = invitation?.location || linkedEvent?.location || {};

  return {
    ...invitation,

    _id: String(invitation._id),
    id: String(invitation._id),

    eventId: eventId ? String(eventId) : "",
    event: eventId ? String(eventId) : "",
    linkedEventId: linkedEvent?._id ? String(linkedEvent._id) : "",

    title,
    eventTitle: title,
    eventName: title,

    eventDate,
    date: eventDate,
    eventTime,
    time: eventTime,

    shareId: cleanString(invitation?.shareId),

    venueOwnerId: invitation?.venueOwnerId
      ? String(invitation.venueOwnerId)
      : linkedEvent?.venueOwnerId
        ? String(linkedEvent.venueOwnerId)
        : "",

    venueHallId: cleanString(
      invitation?.venueHallId || linkedEvent?.venueHallId
    ),

    venueHallName: cleanString(
      invitation?.venueHallName || linkedEvent?.venueHallName
    ),

    location: {
      ...location,
      address: cleanString(location?.address || location?.name),
    },
  };
}

function serializeEvent(event: any, invitation: any) {
  if (!event && !invitation) return null;

  const title =
    cleanString(
      invitation?.eventTitle ||
        invitation?.eventName ||
        invitation?.title
    ) ||
    cleanString(event?.title) ||
    "אירוע";

  const eventDate =
    normalizeDateOnly(invitation?.eventDate || invitation?.date) ||
    normalizeDateOnly(event?.date);

  const eventTime =
    cleanString(invitation?.eventTime || invitation?.time) ||
    cleanString(event?.time);

  const location = invitation?.location || event?.location || {};

  return {
    _id: event?._id ? String(event._id) : "",
    id: event?._id ? String(event._id) : "",

    title,
    eventTitle: title,
    eventName: title,

    date: eventDate,
    eventDate,
    time: eventTime,
    eventTime,

    location: {
      ...location,
      address: cleanString(location?.address || location?.name),
    },

    venueOwnerId: event?.venueOwnerId ? String(event.venueOwnerId) : "",

    venueHallId: cleanString(
      event?.venueHallId || invitation?.venueHallId
    ),

    venueHallName: cleanString(
      event?.venueHallName || invitation?.venueHallName
    ),

    venueClientInvitationId: invitation?._id
      ? String(invitation._id)
      : "",
  };
}

async function findLinkedVenueEvent({
  authUserId,
  invitation,
  invitationId,
  eventId,
}: {
  authUserId: string;
  invitation: any;
  invitationId: string;
  eventId?: string | null;
}) {
  const events = getCollection("events");

  if (!events) return null;

  const ownerValues = objectIdOrString(authUserId);
  const invitationValues = objectIdOrString(invitationId);

  const eventValues: any[] = [];

  if (eventId) {
    eventValues.push(...objectIdOrString(eventId));
  }

  if (invitation?.eventId) {
    eventValues.push(...objectIdOrString(invitation.eventId));
  }

  if (invitation?.venueClientEventId) {
    eventValues.push(...objectIdOrString(invitation.venueClientEventId));
  }

  if (invitation?.linkedEventId) {
    eventValues.push(...objectIdOrString(invitation.linkedEventId));
  }

  if (invitation?.productionEventId) {
    eventValues.push(...objectIdOrString(invitation.productionEventId));
  }

  const uniqueEventValues = Array.from(
    new Map(eventValues.map((value) => [String(value), value])).values()
  );

  const orQuery: any[] = [
    { venueClientInvitationId: { $in: invitationValues } },
    { invitationId: { $in: invitationValues } },
  ];

  if (uniqueEventValues.length) {
    orQuery.push({ _id: { $in: uniqueEventValues } });
    orQuery.push({ eventId: { $in: uniqueEventValues } });
    orQuery.push({ venueClientEventId: { $in: uniqueEventValues } });
    orQuery.push({ linkedEventId: { $in: uniqueEventValues } });
    orQuery.push({ productionEventId: { $in: uniqueEventValues } });
  }

  return events.findOne({
    venueOwnerId: { $in: ownerValues },
    venueAccessStatus: "linked",
    $or: orQuery,
  });
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const { invitationId } = await params;
    const invitationObjectId = toObjectId(invitationId);

    if (!invitationObjectId) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה הזמנה לא תקין",
        },
        { status: 400 }
      );
    }

    const eventId = req.nextUrl.searchParams.get("eventId");
    const isVenueView = req.nextUrl.searchParams.get("venueView") === "1";

    const invitation = await Invitation.findById(invitationObjectId).lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          message: "ההזמנה לא נמצאה",
        },
        { status: 404 }
      );
    }

    const authUserId = String(auth.userId);

    const ownerId = invitation.ownerId ? String(invitation.ownerId) : "";
    const invitationUserId = invitation.userId
      ? String(invitation.userId)
      : "";
    const producerId = invitation.producerId
      ? String(invitation.producerId)
      : "";
    const directVenueOwnerId = invitation.venueOwnerId
      ? String(invitation.venueOwnerId)
      : "";

    let linkedEvent: any = null;

    let allowed =
      ownerId === authUserId ||
      invitationUserId === authUserId ||
      producerId === authUserId;

    if (!allowed && isVenueView) {
      if (directVenueOwnerId === authUserId) {
        allowed = true;
      }

      linkedEvent = await findLinkedVenueEvent({
        authUserId,
        invitation,
        invitationId,
        eventId,
      });

      if (linkedEvent) {
        allowed = true;
      }
    }

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "אין הרשאה לצפייה בהזמנה",
        },
        { status: 403 }
      );
    }

    if (!linkedEvent && isVenueView) {
      linkedEvent = await findLinkedVenueEvent({
        authUserId,
        invitation,
        invitationId,
        eventId,
      });
    }

    return NextResponse.json({
      success: true,
      invitation: serializeInvitation(invitation, linkedEvent),
      event: serializeEvent(linkedEvent, invitation),
    });
  } catch (error) {
    console.error("GET /api/invitations/by-id/[invitationId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת ההזמנה נכשלה",
      },
      { status: 500 }
    );
  }
}