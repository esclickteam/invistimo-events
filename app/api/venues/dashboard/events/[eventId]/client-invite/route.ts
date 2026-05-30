import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    eventId: string;
  }>;
};

type VenueClientPackageType = "seating_only" | "rsvp_seating" | "full";

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

function createInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL;

  if (envUrl) {
    if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
      return envUrl.replace(/\/$/, "");
    }

    return `https://${envUrl}`.replace(/\/$/, "");
  }

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function objectIdOrString(value: unknown) {
  const stringValue = cleanString(value);
  const objectIdValue = toObjectId(stringValue);

  return objectIdValue ? [objectIdValue, stringValue] : [stringValue];
}

function getOwnerQueryValues(userId: string) {
  const values: any[] = [userId];

  if (mongoose.Types.ObjectId.isValid(userId)) {
    values.push(new mongoose.Types.ObjectId(userId));
  }

  return values;
}

function normalizePackageType(value: unknown): VenueClientPackageType {
  const packageType = cleanString(value);

  if (
    packageType === "seating_only" ||
    packageType === "rsvp_seating" ||
    packageType === "full"
  ) {
    return packageType;
  }

  return "seating_only";
}

function getEventTitle(event: any) {
  return cleanString(
    event?.title ||
      event?.eventName ||
      event?.eventTitle ||
      event?.name ||
      "אירוע"
  );
}

function getEventDate(event: any) {
  return cleanString(event?.date || event?.eventDate || "");
}

function getEventTime(event: any) {
  return cleanString(event?.time || event?.startTime || event?.eventTime || "");
}

function getRecordsCount(source: any) {
  if (Array.isArray(source?.guests)) {
    return source.guests.length;
  }

  const value =
    source?.estimatedGuestCount ||
    source?.estimatedGuests ||
    source?.maxGuests ||
    source?.recordsCount ||
    source?.venueClientRecordsCount ||
    0;

  const count = Number(value);

  return Number.isFinite(count) && count > 0 ? count : 0;
}

function serializeInvite(event: any) {
  return {
    venueClientInviteToken: cleanString(event?.venueClientInviteToken),
    venueClientInviteStatus:
      cleanString(event?.venueClientInviteStatus) || "not_sent",
    venueClientInviteSentAt: event?.venueClientInviteSentAt || null,

    venueClientInviteUsedAt: event?.venueClientInviteUsedAt || null,
    venueClientInviteUsedByUserId: event?.venueClientInviteUsedByUserId
      ? String(event.venueClientInviteUsedByUserId)
      : "",
    venueClientInviteUsedEmail: cleanString(event?.venueClientInviteUsedEmail),

    venueClientInviteLockedAt: event?.venueClientInviteLockedAt || null,
    venueClientInviteLockedByUserId: event?.venueClientInviteLockedByUserId
      ? String(event.venueClientInviteLockedByUserId)
      : "",
    venueClientInviteLockedEmail: cleanString(event?.venueClientInviteLockedEmail),

    venueClientInviteExpiresAt: event?.venueClientInviteExpiresAt || null,

    venueClientSelectedSeatingTemplateId:
      event?.venueClientSelectedSeatingTemplateId
        ? String(event.venueClientSelectedSeatingTemplateId)
        : "",

    venueClientSelectedSeatingTemplateName: cleanString(
      event?.venueClientSelectedSeatingTemplateName
    ),

    venueClientRegistrationLink: cleanString(
      event?.venueClientRegistrationLink
    ),

    venueClientUserId: event?.venueClientUserId
      ? String(event.venueClientUserId)
      : "",

    venueClientInvitationId: event?.venueClientInvitationId
      ? String(event.venueClientInvitationId)
      : "",

    venueClientPackageType:
      cleanString(event?.venueClientPackageType) || "seating_only",

    venueClientRecordsCount: Number(event?.venueClientRecordsCount || 0),

    venueClientPaymentStatus:
      cleanString(event?.venueClientPaymentStatus) || "pending",

    venueClientVenueOwnerId: event?.venueClientVenueOwnerId
      ? String(event.venueClientVenueOwnerId)
      : "",

    venueClientVenueHallId: cleanString(event?.venueClientVenueHallId),
    venueClientVenueHallName: cleanString(event?.venueClientVenueHallName),

    venueClientEventId: event?.venueClientEventId
      ? String(event.venueClientEventId)
      : "",

    venueClientEventTitle: cleanString(event?.venueClientEventTitle),
    venueClientEventDate: cleanString(event?.venueClientEventDate),
    venueClientEventTime: cleanString(event?.venueClientEventTime),
  };
}

async function findClientInvitationForVenueEvent(event: any, token?: string) {
  const invitations = getCollection("invitations");

  if (!invitations) return null;

  const existingInvitationId = toObjectId(event?.venueClientInvitationId);

  if (existingInvitationId) {
    const existingInvitation = await invitations.findOne({
      _id: existingInvitationId,
    });

    if (existingInvitation) return existingInvitation;
  }

  const cleanedToken = cleanString(token || event?.venueClientInviteToken);

  if (cleanedToken) {
    const tokenInvitation = await invitations.findOne({
      $or: [
        { venueClientInviteToken: cleanedToken },
        { venueInviteToken: cleanedToken },
        { inviteToken: cleanedToken },
        { registrationToken: cleanedToken },
      ],
    });

    if (tokenInvitation) return tokenInvitation;
  }

  const eventIdValues = objectIdOrString(event?._id);

  const directByEventId = await invitations.findOne({
    $or: [
      { eventId: { $in: eventIdValues } },
      { venueClientEventId: { $in: eventIdValues } },
      { productionEventId: { $in: eventIdValues } },
      { linkedEventId: { $in: eventIdValues } },
      { event: { $in: eventIdValues } },
    ],
  });

  if (directByEventId) return directByEventId;

  const userIdValues = objectIdOrString(event?.userId);
  const eventDate = getEventDate(event);
  const eventTitle = getEventTitle(event);

  if (userIdValues.length && eventDate) {
    const byOwnerDateAndTitle = await invitations.findOne(
      {
        $and: [
          {
            $or: [
              { ownerId: { $in: userIdValues } },
              { userId: { $in: userIdValues } },
            ],
          },
          {
            $or: [{ eventDate }, { date: eventDate }],
          },
          {
            $or: [
              { title: eventTitle },
              { eventTitle },
              { eventName: eventTitle },
            ],
          },
        ],
      },
      {
        sort: {
          updatedAt: -1,
          createdAt: -1,
        },
      }
    );

    if (byOwnerDateAndTitle) return byOwnerDateAndTitle;

    const byOwnerAndDate = await invitations.findOne(
      {
        $and: [
          {
            $or: [
              { ownerId: { $in: userIdValues } },
              { userId: { $in: userIdValues } },
            ],
          },
          {
            $or: [{ eventDate }, { date: eventDate }],
          },
        ],
      },
      {
        sort: {
          updatedAt: -1,
          createdAt: -1,
        },
      }
    );

    if (byOwnerAndDate) return byOwnerAndDate;
  }

  return null;
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

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

    const { eventId } = await params;
    const eventObjectId = toObjectId(eventId);

    if (!eventObjectId) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

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

    const ownerValues = getOwnerQueryValues(String(auth.userId));

    const event = await events.findOne({
      _id: eventObjectId,
      venueOwnerId: { $in: ownerValues },
      venueAccessStatus: "linked",
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    const linkedInvitation = await findClientInvitationForVenueEvent(event);

    if (
      linkedInvitation?._id &&
      String(event?.venueClientInvitationId || "") !== String(linkedInvitation._id)
    ) {
      const linkedUserId =
        linkedInvitation.ownerId ||
        linkedInvitation.userId ||
        linkedInvitation.user ||
        event.venueClientUserId ||
        "";

      const linkedRecordsCount =
        getRecordsCount(linkedInvitation) || getRecordsCount(event);

      await events.updateOne(
        {
          _id: eventObjectId,
          venueOwnerId: { $in: ownerValues },
          venueAccessStatus: "linked",
        },
        {
          $set: {
            venueClientInvitationId: linkedInvitation._id,
            ...(linkedUserId ? { venueClientUserId: linkedUserId } : {}),
            venueClientRecordsCount: linkedRecordsCount,
            venueClientPaymentStatus:
              cleanString(linkedInvitation.paymentStatus) ||
              cleanString(event.venueClientPaymentStatus) ||
              "pending",
            updatedAt: new Date(),
          },
        }
      );

      event.venueClientInvitationId = linkedInvitation._id;
      event.venueClientUserId = linkedUserId;
      event.venueClientRecordsCount = linkedRecordsCount;
      event.venueClientPaymentStatus =
        cleanString(linkedInvitation.paymentStatus) ||
        cleanString(event.venueClientPaymentStatus) ||
        "pending";
    }

    return NextResponse.json({
      success: true,
      invite: serializeInvite(event),
    });
  } catch (error: any) {
    console.error(
      "GET /api/venues/dashboard/events/[eventId]/client-invite failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "טעינת קישור ההרשמה נכשלה",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

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

    const { eventId } = await params;
    const eventObjectId = toObjectId(eventId);

    if (!eventObjectId) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const seatingTemplateId = cleanString(body?.seatingTemplateId);
    const templateObjectId = toObjectId(seatingTemplateId);

    const packageType = normalizePackageType(body?.packageType);

    if (!templateObjectId) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה לבחור תבנית הושבה",
        },
        { status: 400 }
      );
    }

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

    const ownerValues = getOwnerQueryValues(String(auth.userId));

    const event = await events.findOne({
      _id: eventObjectId,
      venueOwnerId: { $in: ownerValues },
      venueAccessStatus: "linked",
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    const venueHallId = cleanString(event?.venueHallId);
    const venueHallName = cleanString(event?.venueHallName);

    if (!venueHallId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מוגדר אולם לאירוע הזה",
        },
        { status: 400 }
      );
    }

    const venueOwnerObjectId = toObjectId(auth.userId);
    const venueOwnerIdForTemplate = venueOwnerObjectId || auth.userId;

    const seatingTemplate = await VenueSeatingTemplate.findOne({
      _id: templateObjectId,
      ownerId: venueOwnerIdForTemplate,
      hallId: venueHallId,
      isActive: true,
    }).lean();

    if (!seatingTemplate) {
      return NextResponse.json(
        {
          success: false,
          message: "תבנית ההושבה לא נמצאה או לא שייכת לאולם של האירוע",
        },
        { status: 404 }
      );
    }

    /*
      קישור חד פעמי:
      בכל יצירת קישור מהאולם מייצרים token חדש.
      לא משתמשים שוב בטוקן ישן, כדי שקישור שכבר נשלח/נוצל לא ימשיך לעבוד.
    */
    const token = createInviteToken();

    const baseUrl = getBaseUrl(req);

    const registrationLink = `${baseUrl}/register?venueInviteToken=${encodeURIComponent(
      token
    )}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const eventTitle = getEventTitle(event);
    const eventDate = getEventDate(event);
    const eventTime = getEventTime(event);
    const recordsCount = getRecordsCount(event);

    const selectedTemplateName = cleanString(
      (seatingTemplate as any)?.name || "תבנית הושבה"
    );

    const venueOwnerIdValue = venueOwnerObjectId || String(auth.userId);

    /*
      מאחר שזה קישור חדש וחד פעמי, לא מחברים אותו אוטומטית להזמנה ישנה.
      מי שיפתח את הקישור ויבחר חבילה הוא המשתמש שהקישור יינעל אליו.
    */
    const linkedInvitationId = null;
    const linkedUserId = "";
    const linkedRecordsCount = recordsCount;
    const linkedPaymentStatus = "pending";

    const updatePayload: any = {
      venueClientInviteToken: token,
      venueClientInviteStatus: "sent",
      venueClientInviteSentAt: now,

      /*
        שדות חד-פעמיים:
        הקישור החדש מתחיל נקי. ברגע שהלקוח יתחיל תשלום הוא יינעל,
        ואחרי הצלחה או פתיחת הושבה בלבד הוא יסומן כ-used.
      */
      venueClientInviteUsedAt: null,
      venueClientInviteUsedByUserId: null,
      venueClientInviteUsedEmail: "",
      venueClientInviteLockedAt: null,
      venueClientInviteLockedByUserId: null,
      venueClientInviteLockedEmail: "",
      venueClientInviteExpiresAt: expiresAt,

      venueClientSelectedSeatingTemplateId: templateObjectId,
      venueClientSelectedSeatingTemplateName: selectedTemplateName,

      venueClientRegistrationLink: registrationLink,

      venueClientVenueOwnerId: venueOwnerIdValue,
      venueClientVenueHallId: venueHallId,
      venueClientVenueHallName: venueHallName,

      venueClientEventId: eventObjectId,
      venueClientEventTitle: eventTitle,
      venueClientEventDate: eventDate,
      venueClientEventTime: eventTime,

      venueClientPackageType: packageType,
      venueClientRecordsCount: linkedRecordsCount,
      venueClientPaymentStatus: linkedPaymentStatus,
      venueClientPaymentSessionId: "",
      venueClientStripeSessionId: "",
      venueClientPaymentAmount: 0,
      venueClientInvitationId: null,
      venueClientUserId: null,

      updatedAt: now,
    };

    await events.updateOne(
      {
        _id: eventObjectId,
        venueOwnerId: { $in: ownerValues },
        venueAccessStatus: "linked",
      },
      {
        $set: updatePayload,
      }
    );

    return NextResponse.json({
      success: true,
      message: "קישור הרשמה נוצר בהצלחה",
      registrationLink,
      invite: {
        venueClientInviteToken: token,
        venueClientInviteStatus: "sent",
        venueClientInviteSentAt: now,
        venueClientInviteUsedAt: null,
        venueClientInviteUsedByUserId: "",
        venueClientInviteUsedEmail: "",
        venueClientInviteLockedAt: null,
        venueClientInviteLockedByUserId: "",
        venueClientInviteLockedEmail: "",
        venueClientInviteExpiresAt: expiresAt,

        venueClientSelectedSeatingTemplateId: String(templateObjectId),
        venueClientSelectedSeatingTemplateName: selectedTemplateName,

        venueClientRegistrationLink: registrationLink,

        venueClientUserId: linkedUserId ? String(linkedUserId) : "",
        venueClientInvitationId: linkedInvitationId
          ? String(linkedInvitationId)
          : "",

        venueClientVenueOwnerId: String(venueOwnerIdValue),
        venueClientVenueHallId: venueHallId,
        venueClientVenueHallName: venueHallName,

        venueClientEventId: String(eventObjectId),
        venueClientEventTitle: eventTitle,
        venueClientEventDate: eventDate,
        venueClientEventTime: eventTime,

        venueClientPackageType: packageType,
        venueClientRecordsCount: linkedRecordsCount,
        venueClientPaymentStatus: linkedPaymentStatus,
      },
      copyText: `שלום, האולם פתח עבורך גישה ל-Invistimo לניהול האירוע שלך. להרשמה: ${registrationLink}`,
    });
  } catch (error: any) {
    console.error(
      "POST /api/venues/dashboard/events/[eventId]/client-invite failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "יצירת קישור הרשמה ללקוח נכשלה",
      },
      { status: 500 }
    );
  }
}