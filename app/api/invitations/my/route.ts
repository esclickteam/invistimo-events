import { NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============================================================
  Helpers
============================================================ */
function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(id?: string | null) {
  const cleanId = cleanString(id);

  if (!cleanId) return null;
  if (!mongoose.Types.ObjectId.isValid(cleanId)) return null;

  return new mongoose.Types.ObjectId(cleanId);
}

function normalizeEventId(eventId: any): string | null {
  if (!eventId) return null;

  if (typeof eventId === "object" && eventId !== null && "_id" in eventId) {
    return String((eventId as any)._id);
  }

  if (mongoose.Types.ObjectId.isValid(eventId)) {
    return String(eventId);
  }

  return null;
}

function normalizeId(value: any): string {
  if (!value) return "";

  if (typeof value === "object" && value !== null && "_id" in value) {
    return String(value._id);
  }

  return String(value);
}

function resolveProducerContext(auth: any, user: any) {
  const role = auth?.role ?? user?.role ?? null;
  const staffType = auth?.staffType ?? user?.staffType ?? null;
  const impersonationRole = auth?.impersonationRole ?? null;

  const isProducer = role === "producer" || impersonationRole === "producer";

  const isProducerStaff =
    (role === "staff" && staffType === "producer_staff") ||
    impersonationRole === "producer_staff" ||
    impersonationRole === "staff_producer";

  const isProducerLike = isProducer || isProducerStaff;

  const effectiveProducerId = isProducer
    ? String(auth.userId)
    : user?.assignedProducerId
      ? String(user.assignedProducerId)
      : user?.createdByProducer
        ? String(user.createdByProducer)
        : null;

  const assignedClientIds: string[] = Array.isArray(user?.assignedClientIds)
    ? user.assignedClientIds.map((x: any) => String(x))
    : [];

  return {
    role,
    staffType,
    impersonationRole,
    isProducer,
    isProducerStaff,
    isProducerLike,
    effectiveProducerId,
    assignedClientIds,
  };
}

function buildInvitationResponse(invitation: any) {
  const normalizedEventId = normalizeEventId(invitation.eventId);

  return {
    ...invitation,

    _id: normalizeId(invitation._id),

    eventId: normalizedEventId,
    invitationId: normalizeId(invitation._id),

    event:
      typeof invitation.eventId === "object" && invitation.eventId !== null
        ? invitation.eventId
        : null,

    ownerId: invitation.ownerId ? normalizeId(invitation.ownerId) : null,
    userId: invitation.userId ? normalizeId(invitation.userId) : null,

    venueClientEventId: invitation.venueClientEventId
      ? normalizeId(invitation.venueClientEventId)
      : null,

    venueClientInvitationId: normalizeId(invitation._id),
  };
}

/* ============================================================
  GET — מחזיר את ההזמנה של המשתמש
============================================================ */
export async function GET(req: Request) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);
    const userObjectId = toObjectId(userId);

    const { searchParams } = new URL(req.url);
    const includeVenueClient =
      searchParams.get("includeVenueClient") === "1" ||
      searchParams.get("venueClient") === "1";

    const eventIdFromQuery = cleanString(searchParams.get("eventId"));
    const eventObjectIdFromQuery = toObjectId(eventIdFromQuery);

    const user = await User.findById(userId)
      .select(
        `
          email
          role
          staffType
          createdByProducer
          assignedProducerId
          assignedClientIds

          venueClientSource
          billingSource
          venueClientEventId
          venueClientInvitationId
          venueHallId
          venueClientHallId
          venueSeatingTemplateId
        `
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const ctx = resolveProducerContext(auth, user);

    const orFilters: any[] = [];

    /*
      רגיל:
      הזמנות קיימות אצלך בדרך כלל לפי ownerId.
    */
    if (userObjectId) {
      orFilters.push({ ownerId: userObjectId });

      /*
        חשוב ללקוח אולם:
        ההזמנה שנוצרת דרך complete/payment-success נשמרת אצלך גם לפי userId.
      */
      orFilters.push({ userId: userObjectId });
    }

    /*
      תמיכה אם נשמרו ids כסטרינגים בקולקשן ישנה.
    */
    if (userId) {
      orFilters.push({ ownerId: userId });
      orFilters.push({ userId });
    }

    const producerIdObj = toObjectId(ctx.effectiveProducerId);

    if (producerIdObj) {
      orFilters.push({ producerId: producerIdObj });
    }

    const assignedClientObjIds = ctx.assignedClientIds
      .map((id) => toObjectId(id))
      .filter(Boolean) as mongoose.Types.ObjectId[];

    if (assignedClientObjIds.length > 0) {
      orFilters.push({ ownerId: { $in: assignedClientObjIds } });
      orFilters.push({ userId: { $in: assignedClientObjIds } });
    }

    /*
      fallback לפי user.venueClientInvitationId אם נשמר על המשתמש.
    */
    const venueClientInvitationId = toObjectId(
      (user as any)?.venueClientInvitationId
    );

    if (venueClientInvitationId) {
      orFilters.push({ _id: venueClientInvitationId });
    }

    /*
      fallback לפי user.venueClientEventId אם נשמר על המשתמש.
    */
    const userVenueClientEventId = toObjectId((user as any)?.venueClientEventId);

    if (userVenueClientEventId) {
      orFilters.push({ eventId: userVenueClientEventId });
      orFilters.push({ venueClientEventId: userVenueClientEventId });
      orFilters.push({ productionEventId: userVenueClientEventId });
      orFilters.push({ linkedEventId: userVenueClientEventId });
    }

    /*
      אם הדף של ההושבה שולח eventId ב-query,
      נחפש גם לפיו.
    */
    if (eventObjectIdFromQuery) {
      orFilters.push({ eventId: eventObjectIdFromQuery });
      orFilters.push({ venueClientEventId: eventObjectIdFromQuery });
      orFilters.push({ productionEventId: eventObjectIdFromQuery });
      orFilters.push({ linkedEventId: eventObjectIdFromQuery });
    }

    if (orFilters.length === 0) {
      return NextResponse.json({ success: true, invitation: null });
    }

    const baseQuery: any = {
      eventId: { $ne: null },
      $or: orFilters,
    };

    /*
      לא חובה, אבל אם ביקשנו includeVenueClient,
      אנחנו לא מגבילים ל-ownerId בלבד.
      זה משאיר הזמנות רגילות כמו שהן ומוסיף תמיכה בלקוח אולם.
    */
    const invitation = await Invitation.findOne(baseQuery)
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate({
        path: "eventId",
        select: `
          title
          date
          time
          eventType
          type
          location
          imageUrl
          coverImageUrl
          giftCreditUrl
        `,
      })
      .select(`
        _id
        title

        eventId
        productionEventId
        linkedEventId
        venueClientEventId

        previewImage
        headerImageUrl

        maxGuests
        maxMessages
        remainingMessages
        shareId

        producerId
        ownerId
        userId

        location
        eventDate
        eventTime
        eventType
        giftCreditUrl

        venueSource
        venueOwnerId
        venueHallId
        venueHallName
        venueAccessStatus

        venueClientPackageType
        venueClientRecordsCount
        venueClientPaymentStatus

        seatingEnabled
        rsvpEnabled
        eventManagementEnabled

        updatedAt
        createdAt
      `)
      .lean();

    /*
      fallback נוסף ללקוח אולם:
      אם Invitation model לא מחזיר בגלל schema/fields,
      ניגש ישירות לקולקשן invitations.
    */
    let rawVenueInvitation: any = null;

    if (!invitation && includeVenueClient && userObjectId) {
      const invitationsCollection =
        mongoose.connection.db?.collection("invitations");

      rawVenueInvitation = await invitationsCollection?.findOne(
        {
          $or: [
            { userId: userObjectId },
            { userId },
            ...(venueClientInvitationId
              ? [{ _id: venueClientInvitationId }]
              : []),
            ...(userVenueClientEventId
              ? [
                  { eventId: userVenueClientEventId },
                  { venueClientEventId: userVenueClientEventId },
                  { productionEventId: userVenueClientEventId },
                  { linkedEventId: userVenueClientEventId },
                ]
              : []),
            ...(eventObjectIdFromQuery
              ? [
                  { eventId: eventObjectIdFromQuery },
                  { venueClientEventId: eventObjectIdFromQuery },
                  { productionEventId: eventObjectIdFromQuery },
                  { linkedEventId: eventObjectIdFromQuery },
                ]
              : []),
          ],
          eventId: { $ne: null },
        },
        {
          sort: {
            updatedAt: -1,
            createdAt: -1,
          },
        }
      );
    }

    const finalInvitation = invitation || rawVenueInvitation;

    if (!finalInvitation) {
      return NextResponse.json({ success: true, invitation: null });
    }

    return NextResponse.json({
      success: true,
      invitation: buildInvitationResponse(finalInvitation),
    });
  } catch (err) {
    console.error("❌ Error loading my invitation:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* ============================================================
  POST — יצירת הזמנה
============================================================ */
export async function POST(req: Request) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const user = await User.findById(userId)
      .select(
        "email guests maxMessages createdByProducer assignedProducerId role staffType"
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const { eventId } = body;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const event = await Event.findOne({ _id: eventId, userId }).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const ctx = resolveProducerContext(auth, user);
    const producerId = ctx.effectiveProducerId;
    const producerIdObj = toObjectId(producerId);

    const queryOr: any[] = [{ ownerId: event.userId ?? userId }];

    if (producerIdObj) {
      queryOr.push({ producerId: producerIdObj });
    }

    let invitation: any = await Invitation.findOne({
      eventId: event._id,
      $or: queryOr,
    }).lean();

    if (!invitation) {
      invitation = await Invitation.create({
        ownerId: event.userId ?? userId,
        producerId: producerIdObj ?? null,
        eventId: event._id,
        guests: [],
        maxGuests:
          Number((user as any).guests) ||
          Number((event as any).maxGuests) ||
          100,
        maxMessages: Number((user as any).maxMessages) || 300,
        sentSmsCount: 0,
      });
    }

    return NextResponse.json(
      {
        success: true,
        invitation: {
          _id: String(invitation._id),
          eventId: String(invitation.eventId),
          maxGuests: invitation.maxGuests,
          maxMessages: invitation.maxMessages,
          remainingMessages: invitation.remainingMessages,
          shareId: invitation.shareId,
          producerId: invitation.producerId ?? null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error creating invitation:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}