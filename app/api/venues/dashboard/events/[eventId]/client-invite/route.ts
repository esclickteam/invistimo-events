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

    venueClientRegistrationLink: cleanString(
      event?.venueClientRegistrationLink
    ),

    venueClientUserId: event?.venueClientUserId
      ? String(event.venueClientUserId)
      : "",

    venueClientPackageType: cleanString(event?.venueClientPackageType),
    venueClientRecordsCount: Number(event?.venueClientRecordsCount || 0),
    venueClientPaymentStatus: cleanString(event?.venueClientPaymentStatus),
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
 * בעל האולם בוחר תבנית הושבה.
 * ה-API יוצר token וקישור הרשמה:
 * /register?venueInviteToken=...
 *
 * החבילה לא נבחרת כאן.
 * הלקוח בוחר חבילה אחרי ההרשמה בעמוד:
 * /venue-client/packages
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
    const seatingTemplateId = cleanString(body.seatingTemplateId);
    const templateObjectId = toObjectId(seatingTemplateId);

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

    const venueHallId = cleanString(event.venueHallId);

    if (!venueHallId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מוגדר אולם לאירוע הזה",
        },
        { status: 400 }
      );
    }

    const venueOwnerIdForTemplate = toObjectId(auth.userId) || auth.userId;

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

    const existingToken = cleanString(event.venueClientInviteToken);
    const token = existingToken || createInviteToken();

    const baseUrl = getBaseUrl(req);

    const registrationLink = `${baseUrl}/register?venueInviteToken=${encodeURIComponent(
      token
    )}`;

    const now = new Date();

    await events.updateOne(
      {
        _id: eventObjectId,
        venueOwnerId: { $in: ownerValues },
        venueAccessStatus: "linked",
      },
      {
        $set: {
          venueClientInviteToken: token,
          venueClientInviteStatus: "sent",
          venueClientInviteSentAt: now,

          venueClientSelectedSeatingTemplateId: templateObjectId,
          venueClientRegistrationLink: registrationLink,

          venueClientVenueOwnerId: toObjectId(auth.userId) || auth.userId,
          venueClientVenueHallId: venueHallId,
          venueClientVenueHallName: cleanString(event.venueHallName),

          venueClientEventId: eventObjectId,
          venueClientEventTitle: cleanString(
            event.title || event.eventName || event.eventTitle || "אירוע"
          ),
          venueClientEventDate: cleanString(event.date || event.eventDate),
          venueClientEventTime: cleanString(
            event.time || event.startTime || event.eventTime
          ),

          updatedAt: now,
        },
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

        venueClientSelectedSeatingTemplateId: seatingTemplateId,
        venueClientRegistrationLink: registrationLink,

        venueClientVenueHallId: venueHallId,
        venueClientVenueHallName: cleanString(event.venueHallName),

        venueClientEventId: String(eventObjectId),
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