import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VenueClientPackageType =
  | "seating_only"
  | "rsvp_seating"
  | "full_event_management";

type VenueClientPaymentStatus = "paid" | "pending" | "failed";

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

function isAllowedPackageType(value: unknown): value is VenueClientPackageType {
  return (
    value === "seating_only" ||
    value === "rsvp_seating" ||
    value === "full_event_management"
  );
}

function isRsvpEnabled(packageType: VenueClientPackageType) {
  return packageType === "rsvp_seating" || packageType === "full_event_management";
}

function isEventManagementEnabled(packageType: VenueClientPackageType) {
  return packageType === "full_event_management";
}

function getAllowedMessageRounds(packageType: VenueClientPackageType): 0 | 3 {
  return packageType === "seating_only" ? 0 : 3;
}

function getPackageName(packageType: VenueClientPackageType) {
  if (packageType === "seating_only") {
    return "הושבה בלבד דרך אולם";
  }

  if (packageType === "rsvp_seating") {
    return "הושבה + אישורי הגעה דרך אולם";
  }

  return "הושבה + אישורי הגעה + ניהול אירוע דרך אולם";
}

function calculatePaymentAmount({
  packageType,
  recordsCount,
}: {
  packageType: VenueClientPackageType;
  recordsCount: number;
}) {
  if (packageType === "seating_only") {
    return 0;
  }

  if (packageType === "rsvp_seating") {
    return recordsCount * 2;
  }

  return recordsCount * 2 + 100;
}

async function createOrUpdateInvitation({
  event,
  userId,
  email,
  recordsCount,
  packageType,
  paymentStatus,
  paymentAmount,
  venueInviteToken,
}: {
  event: any;
  userId: mongoose.Types.ObjectId;
  email: string;
  recordsCount: number;
  packageType: VenueClientPackageType;
  paymentStatus: VenueClientPaymentStatus;
  paymentAmount: number;
  venueInviteToken: string;
}) {
  const invitations = getCollection("invitations");

  if (!invitations) {
    throw new Error("לא נמצאה קולקשן invitations");
  }

  const now = new Date();

  const title = getEventTitle(event);
  const date = getEventDate(event);
  const time = getEventTime(event);

  const rsvpEnabled = isRsvpEnabled(packageType);
  const eventManagementEnabled = isEventManagementEnabled(packageType);

  /*
    חשוב:
    מחפשים קודם הזמנה קיימת של אותו לקוח ואותו אירוע/טוקן.
    אם יש כמה — מעדיפים את זו שכבר יש בה guests,
    כדי שהאולם לא יתחבר להזמנה ריקה.
  */
  const possibleInvitations = await invitations
    .find({
      userId,
      $or: [
        { venueClientEventId: event._id },
        { eventId: event._id },
        { productionEventId: event._id },
        { linkedEventId: event._id },
        { venueInviteToken },
        { venueClientInviteToken: venueInviteToken },
      ],
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  const existingInvitation =
    possibleInvitations.find(
      (inv: any) => Array.isArray(inv.guests) && inv.guests.length > 0
    ) ||
    possibleInvitations[0] ||
    null;

  const invitationPayload = {
    userId,
    ownerId: userId,
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

    venueInviteToken,
    venueClientInviteToken: venueInviteToken,

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
    rsvpEnabled,
    eventManagementEnabled,

    paymentStatus,
    venueClientPaymentStatus: paymentStatus,
    paidAmount: paymentAmount,
    venueClientPaymentAmount: paymentAmount,

    updatedAt: now,
  };

  if (existingInvitation?._id) {
    const shareId = existingInvitation.shareId || createShareId();

    await invitations.updateOne(
      { _id: existingInvitation._id },
      {
        $set: {
          ...invitationPayload,
          shareId,
        },
      }
    );

    return {
      ...existingInvitation,
      ...invitationPayload,
      _id: existingInvitation._id,
      shareId,
    };
  }

  const shareId = createShareId();

  const inserted = await invitations.insertOne({
    ...invitationPayload,
    shareId,
    guests: [],
    createdAt: now,
    updatedAt: now,
  });

  return {
    ...invitationPayload,
    _id: inserted.insertedId,
    shareId,
    guests: [],
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
  event,
  template,
  packageType,
  paymentStatus,
  paymentAmount,
}: {
  userId: mongoose.Types.ObjectId;
  email: string;
  recordsCount: number;
  event: any;
  template: any;
  packageType: VenueClientPackageType;
  paymentStatus: VenueClientPaymentStatus;
  paymentAmount: number;
}) {
  const users = getCollection("users");

  if (!users) {
    throw new Error("לא נמצאה קולקשן users");
  }

  const venueHallId = cleanString(event?.venueHallId);
  const venueHallName = cleanString(event?.venueHallName);

  const rsvpEnabled = isRsvpEnabled(packageType);
  const eventManagementEnabled = isEventManagementEnabled(packageType);
  const allowedMessageRounds = getAllowedMessageRounds(packageType);

  await users.updateOne(
    {
      _id: userId,
    },
    {
      $set: {
        email,

        isActive: paymentStatus === "paid",
        hasDashboardAccess: paymentStatus === "paid",
        hasPaid: paymentStatus === "paid",
        isTrial: false,

        plan: packageType,
        packageName: getPackageName(packageType),

        billingSource: "venue",
        paymentStatus,
        paidAmount: paymentAmount,

        venueClientSource: true,
        venueClientPackageType: packageType,
        venueClientRecordsCount: recordsCount,
        venueClientPaymentStatus: paymentStatus,
        venueClientPaymentAmount: paymentAmount,

        venueClientHallId: venueHallId,
        venueHallId,
        hallId: venueHallId,
        venueClientHallName: venueHallName,
        venueHallName,

        venueOwnerId: event.venueOwnerId,

        venueSeatingTemplateId: template._id,
        venueSeatingTemplateName: cleanString(template.name),
        venueSeatingTemplateImportedAt: new Date(),

        includeSeating: true,
        includeDigitalSeating: true,

        includeSystem: rsvpEnabled,
        includeCalls: rsvpEnabled,
        includeCreditGifts: false,
        includeDesign: false,

        includeEventManagement: eventManagementEnabled,
        selfManageEnabled: eventManagementEnabled,

        maxGuests: recordsCount,
        guests: recordsCount,

        maxMessages: rsvpEnabled ? recordsCount * 3 : 0,
        remainingMessages: rsvpEnabled ? recordsCount * 3 : 0,

        smsBalance: rsvpEnabled ? recordsCount : 0,
        smsUsed: 0,
        smsLimit: rsvpEnabled ? recordsCount : 0,

        whatsappBalance: rsvpEnabled ? recordsCount * 2 : 0,
        whatsappUsed: 0,
        whatsappLimit: rsvpEnabled ? recordsCount * 2 : 0,

        allowedMessageRounds,

        accessModules: {
          seating: true,
          digitalSeating: true,
          seatingTemplates: true,

          rsvp: rsvpEnabled,
          messages: rsvpEnabled,

          eventProduction: eventManagementEnabled,
        },

        planLimits: {
          seatingEnabled: true,
          rsvpEnabled,
          eventManagementEnabled,
          suppliersBudgetEnabled: eventManagementEnabled,

          maxGuests: recordsCount,
          maxRecords: recordsCount,

          allowedMessageRounds,
          smsRounds: rsvpEnabled ? 1 : 0,
          whatsappRounds: rsvpEnabled ? 2 : 0,
          phoneCallRounds: rsvpEnabled ? 3 : 0,

          smsEnabled: rsvpEnabled,
          smsLimit: rsvpEnabled ? recordsCount : 0,

          remindersEnabled: rsvpEnabled,
          callsEnabled: rsvpEnabled,
        },

        updatedAt: new Date(),
      },
    }
  );
}

async function activateVenueClientPackage({
  venueInviteToken,
  userId,
  email,
  packageType,
  recordsCount,
  paymentStatus,
  paymentAmount,
  stripeSessionId,
}: {
  venueInviteToken: string;
  userId: mongoose.Types.ObjectId;
  email: string;
  packageType: VenueClientPackageType;
  recordsCount: number;
  paymentStatus: VenueClientPaymentStatus;
  paymentAmount: number;
  stripeSessionId?: string;
}) {
  const events = getCollection("events");

  if (!events) {
    throw new Error("לא נמצאה קולקשן events");
  }

  const event = await events.findOne({
    venueClientInviteToken: venueInviteToken,
    venueAccessStatus: "linked",
    venueClientInviteStatus: {
      $in: ["sent", "registered", "payment_pending", "paid"],
    },
  });

  if (!event) {
    throw new Error("קישור ההרשמה לא נמצא או שאינו פעיל");
  }

  const venueHallId = cleanString(event.venueHallId);

  if (!venueHallId) {
    throw new Error("לא נמצא אולם משויך לאירוע. חסר venueHallId.");
  }

  const selectedTemplateId = toObjectId(
    event.venueClientSelectedSeatingTemplateId
  );

  if (!selectedTemplateId) {
    throw new Error("לא נבחרה תבנית הושבה לקישור הזה");
  }

  const template = await VenueSeatingTemplate.findOne({
    _id: selectedTemplateId,
    ownerId: event.venueOwnerId,
    hallId: venueHallId,
    isActive: true,
  }).lean();

  if (!template) {
    throw new Error("תבנית ההושבה לא נמצאה או לא שייכת לאולם");
  }

  const invitation = await createOrUpdateInvitation({
    event,
    userId,
    email,
    recordsCount,
    packageType,
    paymentStatus,
    paymentAmount,
    venueInviteToken,
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
    event,
    template,
    packageType,
    paymentStatus,
    paymentAmount,
  });

  const now = new Date();

  await events.updateOne(
    { _id: event._id },
    {
      $set: {
        userId,
        venueClientUserId: userId,

        venueClientInviteStatus:
          paymentStatus === "paid" ? "paid" : "payment_pending",

        venueClientRegisteredAt: event.venueClientRegisteredAt || now,

        venueClientPackageType: packageType,
        venueClientRecordsCount: recordsCount,

        venueClientHallId: venueHallId,
        venueHallId,

        venueClientPaymentStatus: paymentStatus,
        venueClientPaymentAmount: paymentAmount,
        venueClientPaymentIncluded: packageType === "seating_only",

        venueClientInvitationId: invitation._id,
        venueClientEventId: event._id,

        venueClientStripeSessionId:
          stripeSessionId || event.venueClientStripeSessionId || "",

        updatedAt: now,
      },
    }
  );

  return {
    invitation,
    event,
    venueHallId,
  };
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));

    const venueInviteToken = cleanString(body.venueInviteToken);
    const userIdRaw = cleanString(body.userId);
    const email = cleanString(body.email).toLowerCase();
    const packageTypeRaw = cleanString(body.packageType);
    const recordsCount = normalizeRecords(body.recordsCount);
    const stripeSessionId = cleanString(body.stripeSessionId);

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

    if (!isAllowedPackageType(packageTypeRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "סוג חבילה לא תקין",
        },
        { status: 400 }
      );
    }

    const packageType = packageTypeRaw;

    if (packageType !== "seating_only") {
      return NextResponse.json(
        {
          success: false,
          message:
            "חבילות בתשלום חייבות לעבור דרך Stripe. ההושבה שלהן תיפתח אוטומטית לאחר אישור התשלום.",
        },
        { status: 400 }
      );
    }

    const paymentAmount = calculatePaymentAmount({
      packageType,
      recordsCount,
    });

    const result = await activateVenueClientPackage({
      venueInviteToken,
      userId,
      email,
      packageType,
      recordsCount,
      paymentStatus: "paid",
      paymentAmount,
      stripeSessionId,
    });

    return NextResponse.json({
      success: true,
      message: "חבילת ההושבה נפתחה בהצלחה",
      redirectUrl: "/dashboard",
      invitationId: String(result.invitation._id),
      eventId: String(result.event._id),
      venueClientHallId: result.venueHallId,
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