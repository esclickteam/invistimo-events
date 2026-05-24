import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";

export type VenueClientPackageType =
  | "seating_only"
  | "rsvp_seating"
  | "full_event_management";

export type VenueClientPaymentStatus = "paid" | "pending" | "failed";

type ActivateVenueClientPackageParams = {
  venueInviteToken: string;
  userId: string;
  email: string;
  packageType: VenueClientPackageType;
  recordsCount: number;
  paymentStatus?: VenueClientPaymentStatus;
  paymentAmount?: number;
  stripeSessionId?: string;
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

function normalizeRecords(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.max(0, Math.floor(numberValue));
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

function createShareId() {
  return `venue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

function getPackageName(packageType: VenueClientPackageType) {
  if (packageType === "seating_only") {
    return "הושבה בלבד דרך אולם";
  }

  if (packageType === "rsvp_seating") {
    return "הושבה + אישורי הגעה דרך אולם";
  }

  return "הושבה + אישורי הגעה + ניהול אירוע דרך אולם";
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

async function createOrUpdateInvitation({
  event,
  userId,
  email,
  recordsCount,
  packageType,
  paymentStatus,
  paymentAmount,
}: {
  event: any;
  userId: mongoose.Types.ObjectId;
  email: string;
  recordsCount: number;
  packageType: VenueClientPackageType;
  paymentStatus: VenueClientPaymentStatus;
  paymentAmount: number;
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

  const rsvpEnabled = isRsvpEnabled(packageType);
  const eventManagementEnabled = isEventManagementEnabled(packageType);

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
    rsvpEnabled,
    eventManagementEnabled,

    paymentStatus,
    venueClientPaymentStatus: paymentStatus,
    paidAmount: paymentAmount,
    venueClientPaymentAmount: paymentAmount,

    updatedAt: now,
  };

  if (existingInvitation?._id) {
    await invitations.updateOne(
      { _id: existingInvitation._id },
      {
        $set: invitationPayload,
        $setOnInsert: {
          createdAt: now,
        },
      }
    );

    const shareId = existingInvitation.shareId || createShareId();

    if (!existingInvitation.shareId) {
      await invitations.updateOne(
        { _id: existingInvitation._id },
        {
          $set: {
            shareId,
          },
        }
      );
    }

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

  /*
    חשוב:
    upsert לפי eventId + invitationId.
    אם כבר קיימת הושבה לאותו אירוע/הזמנה — לא יוצרים כפילות.
    זה עדיין לא נוגע בהושבה של משתמשים רגילים ולא בלייב.
  */
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

        isActive: true,
        hasDashboardAccess: true,
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

        venueOwnerId: event.venueOwnerId,

        venueClientHallId: venueHallId,
        venueHallId,
        hallId: venueHallId,
        venueClientHallName: venueHallName,
        venueHallName,

        venueSeatingTemplateId: template._id,
        venueSeatingTemplateName: cleanString(template.name),
        venueSeatingTemplateImportedAt: new Date(),

        includeSeating: true,
        includeDigitalSeating: true,

        includeSystem: rsvpEnabled,
        includeCalls: rsvpEnabled,
        includeCreditGifts: false,

        includeEventManagement: eventManagementEnabled,
        selfManageEnabled: eventManagementEnabled,

        includeDesign: false,

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

export async function activateVenueClientPackage({
  venueInviteToken,
  userId,
  email,
  packageType,
  recordsCount,
  paymentStatus = "paid",
  paymentAmount = 0,
  stripeSessionId = "",
}: ActivateVenueClientPackageParams) {
  await connectDB();

  const events = getCollection("events");

  if (!events) {
    throw new Error("לא נמצאה קולקשן events");
  }

  const cleanToken = cleanString(venueInviteToken);
  const cleanEmail = cleanString(email).toLowerCase();
  const normalizedRecordsCount = normalizeRecords(recordsCount);
  const userObjectId = toObjectId(userId);

  if (!cleanToken) {
    throw new Error("חסר token של אולם");
  }

  if (!userObjectId) {
    throw new Error("מזהה משתמש לא תקין");
  }

  if (!cleanEmail) {
    throw new Error("חסר אימייל משתמש");
  }

  if (!normalizedRecordsCount || normalizedRecordsCount <= 0) {
    throw new Error("חובה להזין מספר רשומות");
  }

  const event = await events.findOne({
    venueClientInviteToken: cleanToken,
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
    userId: userObjectId,
    email: cleanEmail,
    recordsCount: normalizedRecordsCount,
    packageType,
    paymentStatus,
    paymentAmount,
  });

  await copySeatingTemplateToClientEvent({
    event,
    invitation,
    userId: userObjectId,
    template,
  });

  await updateUserPermissions({
    userId: userObjectId,
    email: cleanEmail,
    recordsCount: normalizedRecordsCount,
    event,
    template,
    packageType,
    paymentStatus,
    paymentAmount,
  });

  await events.updateOne(
    { _id: event._id },
    {
      $set: {
        userId: userObjectId,
        venueClientUserId: userObjectId,

        venueClientInviteStatus:
          paymentStatus === "paid" ? "paid" : "payment_pending",

        venueClientRegisteredAt: event.venueClientRegisteredAt || new Date(),

        venueClientPackageType: packageType,
        venueClientRecordsCount: normalizedRecordsCount,

        venueClientHallId: venueHallId,
        venueHallId,

        venueClientPaymentStatus: paymentStatus,
        venueClientPaymentAmount: paymentAmount,
        venueClientPaymentIncluded: packageType === "seating_only",

        venueClientInvitationId: invitation._id,

        venueClientStripeSessionId: stripeSessionId || undefined,

        updatedAt: new Date(),
      },
    }
  );

  return {
    success: true,
    invitationId: String(invitation._id),
    eventId: String(event._id),
    venueClientHallId: venueHallId,
    redirectUrl: "/dashboard",
  };
}