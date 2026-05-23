import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function normalizeRecords(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.max(0, Math.floor(numberValue));
}

function createShareId() {
  return `venue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

function getEventTitle(event: any) {
  return cleanString(
    event?.title || event?.eventName || event?.eventTitle || "אירוע"
  );
}

function getEventDate(event: any) {
  return cleanString(event?.date || event?.eventDate || "");
}

function getEventTime(event: any) {
  return cleanString(event?.time || event?.startTime || event?.eventTime || "");
}

async function createOrUpdateInvitation({
  event,
  userId,
  email,
  recordsCount,
}: {
  event: any;
  userId: mongoose.Types.ObjectId;
  email: string;
  recordsCount: number;
}) {
  const invitations = getCollection("invitations");

  if (!invitations) {
    throw new Error("לא נמצאה קולקשן invitations");
  }

  const now = new Date();

  const existingInvitation = await invitations.findOne({
    venueClientEventId: event._id,
    userId,
  });

  const title = getEventTitle(event);
  const date = getEventDate(event);
  const time = getEventTime(event);

  const invitationPayload = {
    userId,
    email,

    eventId: event._id,
    productionEventId: event._id,
    linkedEventId: event._id,
    venueClientEventId: event._id,

    venueOwnerId: event.venueOwnerId,
    venueHallId: cleanString(event.venueHallId),
    venueHallName: cleanString(event.venueHallName),
    venueAccessStatus: "linked",
    venueSource: "venue_client",

    title,
    eventTitle: title,
    eventName: title,

    eventType: cleanString(event.eventType || "wedding"),
    eventDate: date,
    date,
    eventTime: time,
    time,

    estimatedGuests: recordsCount,
    estimatedGuestCount: recordsCount,
    maxGuests: recordsCount,

    venueClientPackageType: "seating_only",
    venueClientRecordsCount: recordsCount,

    seatingEnabled: true,
    rsvpEnabled: false,
    eventManagementEnabled: false,

    paymentStatus: "included",
    updatedAt: now,
  };

  if (existingInvitation?._id) {
    await invitations.updateOne(
      { _id: existingInvitation._id },
      {
        $set: invitationPayload,
      }
    );

    return {
      ...existingInvitation,
      ...invitationPayload,
      _id: existingInvitation._id,
      shareId: existingInvitation.shareId || createShareId(),
    };
  }

  const shareId = createShareId();

  const inserted = await invitations.insertOne({
    ...invitationPayload,
    shareId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    ...invitationPayload,
    _id: inserted.insertedId,
    shareId,
  };
}

async function copySeatingTemplateToClientEvent({
  event,
  invitation,
  userId,
  template,
}: {
  event: any;
  invitation: any;
  userId: mongoose.Types.ObjectId;
  template: any;
}) {
  const seatingTables = getCollection("seatingtables");

  if (!seatingTables) {
    throw new Error("לא נמצאה קולקשן seatingtables");
  }

  const canvas = template?.canvas || {};
  const now = new Date();

  await seatingTables.updateOne(
    {
      eventId: event._id,
      invitationId: invitation._id,
    },
    {
      $set: {
        userId,

        eventId: event._id,
        invitationId: invitation._id,
        shareId: cleanString(invitation.shareId),

        venueOwnerId: event.venueOwnerId,
        venueHallId: cleanString(event.venueHallId),
        venueHallName: cleanString(event.venueHallName),

        source: "venue_seating_template",
        sourceTemplateId: template._id,

        tables: Array.isArray(template.tables) ? template.tables : [],
        background: canvas.background || null,
        canvasView: canvas.canvasView || null,
        zones: Array.isArray(canvas.zones) ? canvas.zones : [],

        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    }
  );
}

async function updateUserPermissions({
  userId,
  email,
  recordsCount,
}: {
  userId: mongoose.Types.ObjectId;
  email: string;
  recordsCount: number;
}) {
  const users = getCollection("users");

  if (!users) {
    throw new Error("לא נמצאה קולקשן users");
  }

  await users.updateOne(
    {
      _id: userId,
    },
    {
      $set: {
        email,

        plan: "seating_only",
        packageName: "הושבה בלבד דרך אולם",

        venueClientSource: true,
        venueClientPackageType: "seating_only",
        venueClientRecordsCount: recordsCount,

        maxGuests: recordsCount,
        guests: recordsCount,
        maxMessages: 0,

        planLimits: {
          seatingEnabled: true,
          rsvpEnabled: false,
          eventManagementEnabled: false,
          suppliersBudgetEnabled: false,
          maxGuests: recordsCount,
          maxRecords: recordsCount,
          allowedMessageRounds: 0,
        },

        updatedAt: new Date(),
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const events = getCollection("events");

    if (!events) {
      return NextResponse.json(
        {
          success: false,
          message: "לא נמצאה קולקשן events",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const venueInviteToken = cleanString(body.venueInviteToken);
    const userIdRaw = cleanString(body.userId);
    const email = cleanString(body.email).toLowerCase();
    const packageType = cleanString(body.packageType);
    const recordsCount = normalizeRecords(body.recordsCount);

    if (!venueInviteToken) {
      return NextResponse.json(
        { success: false, message: "חסר token של אולם" },
        { status: 400 }
      );
    }

    const userId = toObjectId(userIdRaw);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "מזהה משתמש לא תקין" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "חסר אימייל משתמש" },
        { status: 400 }
      );
    }

    if (!recordsCount || recordsCount <= 0) {
      return NextResponse.json(
        { success: false, message: "חובה להזין מספר רשומות" },
        { status: 400 }
      );
    }

    if (packageType !== "seating_only") {
      return NextResponse.json(
        {
          success: false,
          message:
            "הנתיב הזה מיועד להושבה בלבד. חבילות בתשלום עוברות דרך Stripe.",
        },
        { status: 400 }
      );
    }

    const event = await events.findOne({
      venueClientInviteToken: venueInviteToken,
      venueClientInviteStatus: "sent",
      venueAccessStatus: "linked",
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "קישור ההרשמה לא נמצא או שאינו פעיל",
        },
        { status: 404 }
      );
    }

    const selectedTemplateId = toObjectId(
      event.venueClientSelectedSeatingTemplateId
    );

    if (!selectedTemplateId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא נבחרה תבנית הושבה לקישור הזה",
        },
        { status: 400 }
      );
    }

    const template = await VenueSeatingTemplate.findOne({
      _id: selectedTemplateId,
      ownerId: event.venueOwnerId,
      hallId: cleanString(event.venueHallId),
      isActive: true,
    }).lean();

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          message: "תבנית ההושבה לא נמצאה או לא שייכת לאולם",
        },
        { status: 404 }
      );
    }

    const invitation = await createOrUpdateInvitation({
      event,
      userId,
      email,
      recordsCount,
    });

    await copySeatingTemplateToClientEvent({
      event,
      invitation,
      userId,
      template,
    });

    await updateUserPermissions({
      userId,
      email,
      recordsCount,
    });

    await events.updateOne(
      { _id: event._id },
      {
        $set: {
          userId,
          venueClientUserId: userId,
          venueClientInviteStatus: "registered",
          venueClientRegisteredAt: new Date(),
          venueClientPackageType: "seating_only",
          venueClientRecordsCount: recordsCount,
          venueClientPaymentStatus: "included",
          venueClientInvitationId: invitation._id,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "חבילת ההושבה נפתחה בהצלחה",
      redirectUrl: "/dashboard",
      invitationId: String(invitation._id),
      eventId: String(event._id),
    });
  } catch (error: any) {
    console.error(
      "POST /api/venues/client-registration/complete failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "פתיחת חבילת ההושבה נכשלה",
      },
      { status: 500 }
    );
  }
}