import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Stripe from "stripe";

import { connectDB } from "@/lib/db";
import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaidPackageType = "rsvp_seating" | "full_event_management";

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

function isPaidPackage(value: unknown): value is PaidPackageType {
  return value === "rsvp_seating" || value === "full_event_management";
}

function calculatePaidAmount(packageType: PaidPackageType, recordsCount: number) {
  const recordsPrice = recordsCount * 2;

  if (packageType === "full_event_management") {
    return recordsPrice + 100;
  }

  return recordsPrice;
}

function getDashboardRedirect(packageType: PaidPackageType) {
  if (packageType === "full_event_management") {
    return "/events/production";
  }

  return "/dashboard";
}

function getPackageName(packageType: PaidPackageType) {
  if (packageType === "rsvp_seating") {
    return "הושבה + אישורי הגעה דרך אולם";
  }

  return "הושבה + אישורי הגעה + ניהול אירוע דרך אולם";
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
  packageType,
  recordsCount,
  paidAmount,
}: {
  event: any;
  userId: mongoose.Types.ObjectId;
  email: string;
  packageType: PaidPackageType;
  recordsCount: number;
  paidAmount: number;
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

    venueClientPackageType: packageType,
    venueClientRecordsCount: recordsCount,

    seatingEnabled: true,
    rsvpEnabled: true,
    eventManagementEnabled: packageType === "full_event_management",

    paymentStatus: "paid",
    venueClientPaymentStatus: "paid",
    paidAmount,

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
  packageType,
  recordsCount,
  paidAmount,
}: {
  userId: mongoose.Types.ObjectId;
  email: string;
  packageType: PaidPackageType;
  recordsCount: number;
  paidAmount: number;
}) {
  const users = getCollection("users");

  if (!users) {
    throw new Error("לא נמצאה קולקשן users");
  }

  const eventManagementEnabled = packageType === "full_event_management";

  await users.updateOne(
    {
      _id: userId,
    },
    {
      $set: {
        email,

        /*
          חבילות אולם בתשלום:
          Stripe אישר תשלום, לכן המשתמש חייב להיות פעיל ומשולם.
        */
        isActive: true,
        hasDashboardAccess: true,
        hasPaid: true,
        isTrial: false,

        plan: packageType,
        packageName: getPackageName(packageType),

        billingSource: "venue",
        paymentStatus: "paid",
        paidAmount,

        venueClientSource: true,
        venueClientPackageType: packageType,
        venueClientRecordsCount: recordsCount,
        venueClientPaymentStatus: "paid",
        venueClientPaymentAmount: paidAmount,

        includeSeating: true,
        includeSystem: eventManagementEnabled,
        includeCalls: true,
        includeCreditGifts: false,
        includeDesign: false,

        maxGuests: recordsCount,
        guests: recordsCount,

        /*
          3 סבבי הודעות:
          2 WhatsApp + 1 SMS
        */
        maxMessages: recordsCount * 3,
        remainingMessages: recordsCount * 3,

        smsLimit: recordsCount,
        smsBalance: recordsCount,
        smsUsed: 0,

        whatsappLimit: recordsCount * 2,
        whatsappBalance: recordsCount * 2,
        whatsappUsed: 0,

        allowedMessageRounds: 3,

        planLimits: {
          seatingEnabled: true,
          rsvpEnabled: true,
          eventManagementEnabled,
          suppliersBudgetEnabled: eventManagementEnabled,

          maxGuests: recordsCount,
          maxRecords: recordsCount,

          allowedMessageRounds: 3,
          smsRounds: 1,
          whatsappRounds: 2,
          phoneCallRounds: 3,
        },

        updatedAt: new Date(),
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר STRIPE_SECRET_KEY",
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const body = await req.json().catch(() => ({}));
    const sessionId = cleanString(body.sessionId);

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר sessionId",
        },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== "paid") {
      return NextResponse.json(
        {
          success: false,
          message: "התשלום לא אושר עדיין",
        },
        { status: 400 }
      );
    }

    const metadata = session.metadata || {};

    const venueInviteToken = cleanString(metadata.venueInviteToken);
    const userIdRaw = cleanString(metadata.userId);
    const email = cleanString(metadata.email).toLowerCase();
    const packageTypeRaw = cleanString(metadata.packageType);
    const recordsCount = normalizeRecords(metadata.recordsCount);
    const eventIdRaw = cleanString(metadata.eventId);

    const userId = toObjectId(userIdRaw);
    const eventId = toObjectId(eventIdRaw);

    if (!venueInviteToken) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר token של אולם בנתוני התשלום",
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה משתמש לא תקין בנתוני התשלום",
        },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה אירוע לא תקין בנתוני התשלום",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר אימייל בנתוני התשלום",
        },
        { status: 400 }
      );
    }

    if (!isPaidPackage(packageTypeRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "חבילה לא תקינה בנתוני התשלום",
        },
        { status: 400 }
      );
    }

    if (!recordsCount || recordsCount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "מספר רשומות לא תקין בנתוני התשלום",
        },
        { status: 400 }
      );
    }

    const packageType: PaidPackageType = packageTypeRaw;

    const stripePaidAmount =
      typeof session.amount_total === "number"
        ? session.amount_total / 100
        : 0;

    const calculatedPaidAmount = calculatePaidAmount(packageType, recordsCount);
    const paidAmount = stripePaidAmount > 0 ? stripePaidAmount : calculatedPaidAmount;

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

    const event = await events.findOne({
      _id: eventId,
      venueClientInviteToken: venueInviteToken,
      venueAccessStatus: "linked",
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא נמצא או שקישור ההרשמה אינו תקין",
        },
        { status: 404 }
      );
    }

    if (
      cleanString(event.venueClientInviteStatus) === "registered" &&
      cleanString(event.venueClientPaymentStatus) === "paid" &&
      event.venueClientInvitationId
    ) {
      return NextResponse.json({
        success: true,
        message: "החבילה כבר פתוחה",
        redirectUrl: getDashboardRedirect(packageType),
        invitationId: String(event.venueClientInvitationId),
        eventId: String(event._id),
      });
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
      packageType,
      recordsCount,
      paidAmount,
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
      packageType,
      recordsCount,
      paidAmount,
    });

    await events.updateOne(
      {
        _id: event._id,
      },
      {
        $set: {
          userId,
          venueClientUserId: userId,

          venueClientInviteStatus: "registered",
          venueClientRegisteredAt: new Date(),

          venueClientPackageType: packageType,
          venueClientRecordsCount: recordsCount,

          venueClientPaymentStatus: "paid",
          venueClientPaymentSessionId: sessionId,
          venueClientPaymentAmount: paidAmount,

          venueClientInvitationId: invitation._id,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "התשלום אושר והחבילה נפתחה בהצלחה",
      redirectUrl: getDashboardRedirect(packageType),
      invitationId: String(invitation._id),
      eventId: String(event._id),
    });
  } catch (error: any) {
    console.error(
      "POST /api/venues/client-registration/payment-success failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "פתיחת החבילה לאחר התשלום נכשלה",
      },
      { status: 500 }
    );
  }
}