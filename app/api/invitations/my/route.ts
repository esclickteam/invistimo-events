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
function toObjectId(id?: string | null) {
  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
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

    const user = await User.findById(userId)
      .select(`
        createdByProducer
        assignedProducerId
        assignedClientIds
        role
        staffType
        venueClientSource
        venueClientPackageType
        venueClientHallId
        hallId
        venueHallId
        includeSeating
        includeDigitalSeating
      `)
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
      חשוב:
      הזמנה רגילה בדרך כלל יושבת על ownerId.
      הזמנה של לקוח אולם אצלך נוצרה עם userId.
      לכן חייבים לבדוק את שניהם.
    */
    if (userObjectId) {
      orFilters.push({ ownerId: userObjectId });
      orFilters.push({ userId: userObjectId });
      orFilters.push({ venueClientUserId: userObjectId });
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
      orFilters.push({ venueClientUserId: { $in: assignedClientObjIds } });
    }

    /*
      fallback ללקוח אולם:
      אם משום מה אין userId/ownerId בהזמנה,
      אפשר למצוא לפי hallId של הלקוח.
    */
    const currentUser = user as any;

    const venueHallId =
      String(
        currentUser?.venueClientHallId ||
          currentUser?.hallId ||
          currentUser?.venueHallId ||
          ""
      ).trim();

    const isVenueClient =
      currentUser?.venueClientSource === true ||
      currentUser?.venueClientPackageType === "seating_only" ||
      currentUser?.venueClientPackageType === "rsvp_seating" ||
      currentUser?.venueClientPackageType === "rsvp_and_seating" ||
      currentUser?.includeSeating === true ||
      currentUser?.includeDigitalSeating === true;

    if (isVenueClient && venueHallId) {
      orFilters.push({
        venueHallId,
        venueSource: "venue_client",
      });

      orFilters.push({
        venueHallId,
        venueClientPackageType: { $exists: true },
      });
    }

    if (orFilters.length === 0) {
      return NextResponse.json({ success: true, invitation: null });
    }

    const invitation = await Invitation.findOne({
      eventId: { $ne: null },
      $or: orFilters,
    })
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
        userId
        ownerId
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
        location
        eventDate
        eventTime
        eventType
        giftCreditUrl
        venueOwnerId
        venueHallId
        venueHallName
        venueAccessStatus
        venueSource
        venueClientPackageType
        venueClientRecordsCount
        seatingEnabled
        rsvpEnabled
        eventManagementEnabled
        paymentStatus
        venueClientPaymentStatus
      `)
      .lean();

    if (!invitation) {
      return NextResponse.json({ success: true, invitation: null });
    }

    const normalizedEventId = normalizeEventId(invitation.eventId);

    console.log("✅ /api/invitations/my:", {
      userId,
      invitationId: String(invitation._id),
      eventId: normalizedEventId,
      venueHallId: (invitation as any)?.venueHallId || null,
      venueSource: (invitation as any)?.venueSource || null,
      venueClientPackageType:
        (invitation as any)?.venueClientPackageType || null,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        _id: String(invitation._id),

        userId: (invitation as any).userId
          ? String((invitation as any).userId)
          : null,

        ownerId: (invitation as any).ownerId
          ? String((invitation as any).ownerId)
          : null,

        producerId: (invitation as any).producerId
          ? String((invitation as any).producerId)
          : null,

        eventId: normalizedEventId,

        event:
          typeof invitation.eventId === "object"
            ? invitation.eventId
            : null,
      },
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

    const queryOr: any[] = [
      { ownerId: event.userId ?? userId },
      { userId: event.userId ?? userId },
    ];

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
        userId: event.userId ?? userId,
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
          producerId: invitation.producerId
            ? String(invitation.producerId)
            : null,
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