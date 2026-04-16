import { NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

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

  // אם זה populate → אובייקט עם _id
  if (typeof eventId === "object" && eventId !== null && "_id" in eventId) {
    return String((eventId as any)._id);
  }

  // אם זה כבר ObjectId
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

    const user = await User.findById(userId)
      .select("createdByProducer assignedProducerId assignedClientIds role staffType")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const ctx = resolveProducerContext(auth, user);

    const orFilters: any[] = [];

    const ownerIdObj = toObjectId(userId);
    if (ownerIdObj) orFilters.push({ ownerId: ownerIdObj });

    const producerIdObj = toObjectId(ctx.effectiveProducerId);
    if (producerIdObj) orFilters.push({ producerId: producerIdObj });

    const assignedClientObjIds = ctx.assignedClientIds
      .map((id) => toObjectId(id))
      .filter(Boolean) as mongoose.Types.ObjectId[];

    if (assignedClientObjIds.length > 0) {
      orFilters.push({ ownerId: { $in: assignedClientObjIds } });
    }

    if (orFilters.length === 0) {
      return NextResponse.json({ success: true, invitation: null });
    }

    const invitation = await Invitation.findOne({
      eventId: { $ne: null },
      $or: orFilters,
    })
      .sort({ updatedAt: -1 })
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
        previewImage
        maxGuests
        maxMessages
        remainingMessages
        shareId
        producerId
        ownerId
      `)
      .lean();

    if (!invitation) {
      return NextResponse.json({ success: true, invitation: null });
    }

    const eventData =
  typeof invitation.eventId === "object"
    ? invitation.eventId
    : null;

const normalizedEventId = normalizeEventId(invitation.eventId);

return NextResponse.json({
  success: true,
  invitation: {
    ...invitation,
    eventId: normalizedEventId,
    event: eventData, // ⭐ תיקון פה
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
      .select("email guests maxMessages createdByProducer assignedProducerId role staffType")
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
    if (producerIdObj) queryOr.push({ producerId: producerIdObj });

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
        maxGuests: Number((user as any).guests) || Number((event as any).maxGuests) || 100,
        maxMessages: Number((user as any).maxMessages) || 300,
        sentSmsCount: 0,
      });
    }

    return NextResponse.json(
      {
        success: true,
        invitation: {
          _id: invitation._id,
          eventId: String(invitation.eventId), // ⭐ תמיד string
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
