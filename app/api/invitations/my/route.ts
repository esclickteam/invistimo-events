import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   Helpers
============================================================ */
function resolveProducerContext(auth: any, user: any) {
  const role = auth?.role ?? user?.role ?? null;
  const staffType = auth?.staffType ?? user?.staffType ?? null;
  const impersonationRole = auth?.impersonationRole ?? null;

  const isProducer =
    role === "producer" || impersonationRole === "producer";

  const isProducerStaff =
    (role === "staff" && staffType === "producer_staff") ||
    impersonationRole === "producer_staff" ||
    impersonationRole === "staff_producer"; // backward compatibility

  const isProducerLike = isProducer || isProducerStaff;

  // producerId אפקטיבי:
  // 1) מפיק אמיתי -> userId
  // 2) עוזר מפיק -> assignedProducerId (או createdByProducer fallback)
  // 3) התחזות producer_staff -> גם assignedProducerId/createdByProducer
  const effectiveProducerId = isProducer
    ? String(auth.userId)
    : (user?.assignedProducerId
        ? String(user.assignedProducerId)
        : user?.createdByProducer
        ? String(user.createdByProducer)
        : null);

  return {
    role,
    staffType,
    impersonationRole,
    isProducer,
    isProducerStaff,
    isProducerLike,
    effectiveProducerId,
  };
}

/* ============================================================
   GET — מחזיר את ההזמנה של המשתמש (אם קיימת)
============================================================ */
export async function GET(req: Request) {
  try {
    await db();

    // 🔐 Auth (כולל התחזות)
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const user = await User.findById(userId)
      .select("createdByProducer assignedProducerId role staffType")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const ctx = resolveProducerContext(auth, user);

    // 🔎 מחפשים הזמנה לפי:
    // - בעלים (ownerId=userId)
    // - producerId אפקטיבי (למפיק/עוזר מפיק/התחזות)
    const orFilters: any[] = [{ ownerId: userId }];

    if (ctx.effectiveProducerId) {
      orFilters.push({ producerId: ctx.effectiveProducerId });
    }

    const invitation = await Invitation.findOne({
      eventId: { $ne: null },
      $or: orFilters,
    })
      .sort({ updatedAt: -1 })
      .select(`
        _id
        eventId
        maxGuests
        maxMessages
        remainingMessages
        shareId
        producerId
        ownerId
      `)
      .lean();

    if (!invitation) {
      return NextResponse.json({
        success: true,
        invitation: null,
      });
    }

    const event = invitation.eventId
      ? await Event.findById(invitation.eventId).select("location").lean()
      : null;

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        eventLocation: event?.location || null,
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

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "EVENT_ID_REQUIRED" },
        { status: 400 }
      );
    }

    // כרגע שומרים את בדיקת הבעלות המקורית שלך על event.userId
    const event = await Event.findOne({ _id: eventId, userId }).lean();
    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const ctx = resolveProducerContext(auth, user);
    const producerId = ctx.effectiveProducerId;

    let invitation: any = await Invitation.findOne({
      eventId: event._id,
      $or: [
        { ownerId: userId },
        ...(producerId ? [{ producerId }] : []),
      ],
    }).lean();

    if (!invitation) {
      invitation = await Invitation.create({
        ownerId: userId,
        producerId,
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
          eventId: invitation.eventId,
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
