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

function getRecordsCount(event: any) {
  const value =
    event?.estimatedGuestCount ||
    event?.estimatedGuests ||
    event?.maxGuests ||
    event?.guests ||
    event?.recordsCount ||
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

/**
 * GET
 * מחזיר את מצב קישור ההרשמה של האירוע.
 */
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

/**
 * POST
 *
 * הזרימה:
 * 1. בעל האולם נמצא בתוך אירוע משויך לאולם.
 * 2. בעל האולם בוחר תבנית הושבה מתוך VenueSeatingTemplate של האולם שלו.
 * 3. כאן נשמרת הבחירה על Event בלבד.
 * 4. נוצר קישור הרשמה ללקוח.
 * 5. בהשלמת הרשמה של הלקוח, השרת יעתיק את התבנית להושבה הרגילה של הלקוח.
 *
 * חשוב:
 * לא נוגעים כאן בהושבה הרגילה.
 * לא נוגעים כאן בהושבה לייב.
 * לא יוצרים כאן seatingtables.
 * רק שומרים על האירוע איזו תבנית האולם בחר ללקוח.
 */
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

    const existingToken = cleanString(event?.venueClientInviteToken);
    const token = existingToken || createInviteToken();

    const baseUrl = getBaseUrl(req);

    const registrationLink = `${baseUrl}/register?venueInviteToken=${encodeURIComponent(
      token
    )}`;

    const now = new Date();

    const eventTitle = getEventTitle(event);
    const eventDate = getEventDate(event);
    const eventTime = getEventTime(event);
    const recordsCount = getRecordsCount(event);

    const selectedTemplateName = cleanString(
      (seatingTemplate as any)?.name || "תבנית הושבה"
    );

    const venueOwnerIdValue = venueOwnerObjectId || String(auth.userId);

    const updatePayload = {
      venueClientInviteToken: token,
      venueClientInviteStatus: "sent",
      venueClientInviteSentAt: now,

      /**
       * זה השדה הקריטי:
       * כאן נשמרת התבנית שבעל האולם בחר ללקוח.
       * בהשלמת הרשמה משתמשים בזה כדי להעתיק את התבנית להושבה הרגילה של הלקוח.
       */
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
      venueClientRecordsCount: recordsCount,
      venueClientPaymentStatus: "pending",

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

        venueClientSelectedSeatingTemplateId: String(templateObjectId),
        venueClientSelectedSeatingTemplateName: selectedTemplateName,

        venueClientRegistrationLink: registrationLink,

        venueClientVenueOwnerId: String(venueOwnerIdValue),
        venueClientVenueHallId: venueHallId,
        venueClientVenueHallName: venueHallName,

        venueClientEventId: String(eventObjectId),
        venueClientEventTitle: eventTitle,
        venueClientEventDate: eventDate,
        venueClientEventTime: eventTime,

        venueClientPackageType: packageType,
        venueClientRecordsCount: recordsCount,
        venueClientPaymentStatus: "pending",
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