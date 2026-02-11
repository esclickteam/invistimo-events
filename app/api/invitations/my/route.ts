import { NextResponse } from "next/server";
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
function toStr(v: any) {
  return v?.toString?.() ?? String(v);
}

function uniqueStrings(arr: any[]) {
  return Array.from(
    new Set((arr || []).filter(Boolean).map((x) => toStr(x)))
  );
}

/* ============================================================
   GET — מחזיר את ההזמנה של המשתמש (אם קיימת)
============================================================ */
export async function GET(req: Request) {
  try {
    await db();

    // 🔐 Auth (כולל התחזות)
    const auth: any = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = toStr(auth.userId);
    const role = auth.role;

    const user: any = await User.findById(userId)
      .select("createdByProducer role staffType assignedClientIds assignedProducerId")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const isProducer = role === "producer";
    const isProducerStaff =
      role === "user" && user?.staffType === "producer_staff";

    // כל ה-clientIds שהמשתמש הנוכחי רשאי לראות
    let allowedClientIds: string[] = [userId];

    if (isProducer) {
      // מפיק רואה את כל הלקוחות שלו
      const producerClients = await User.find({
        assignedProducerId: userId,
        role: { $in: ["client", "user"] },
        staffType: { $ne: "producer_staff" }, // לא עובדים
      })
        .select("_id")
        .lean();

      allowedClientIds = uniqueStrings([
        userId,
        ...producerClients.map((c: any) => c._id),
      ]);
    } else if (isProducerStaff) {
      // עובד מפיק רואה רק לקוחות משויכים אליו
      const rawAssigned = Array.isArray(user?.assignedClientIds)
        ? user.assignedClientIds
        : [];

      allowedClientIds = uniqueStrings(rawAssigned);

      // fallback היסטורי אם יש createdByProducer בלבד
      if (allowedClientIds.length === 0 && user?.createdByProducer) {
        const producerClients = await User.find({
          assignedProducerId: user.createdByProducer,
          role: { $in: ["client", "user"] },
          staffType: { $ne: "producer_staff" },
        })
          .select("_id")
          .lean();

        allowedClientIds = uniqueStrings(producerClients.map((c: any) => c._id));
      }
    } else if (!isProducer && user?.createdByProducer) {
      // לקוח/יוזר רגיל שנוצר ע"י מפיק – נשמור תאימות לאחור
      allowedClientIds = uniqueStrings([userId]);
    }

    // אם אין לקוחות מורשים לעובד מפיק -> אין הזמנה
    if (isProducerStaff && allowedClientIds.length === 0) {
      return NextResponse.json({
        success: true,
        invitation: null,
      });
    }

    /**
     * סדר עדיפויות:
     * 1) ownerId של לקוח מורשה
     * 2) producerId (רלוונטי למפיק/סביבות legacy)
     */
    const invitation = await Invitation.findOne({
      eventId: { $ne: null },
      $or: [
        { ownerId: { $in: allowedClientIds } },
        ...(isProducer ? [{ producerId: userId }] : []),
        ...(!isProducer && user?.createdByProducer
          ? [{ producerId: toStr(user.createdByProducer) }]
          : []),
      ],
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
        updatedAt
      `)
      .lean();

    if (!invitation) {
      return NextResponse.json({
        success: true,
        invitation: null,
      });
    }

    const event = invitation.eventId
      ? await Event.findById(invitation.eventId)
          .select("location userId")
          .lean()
      : null;

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        eventLocation: (event as any)?.location || null,
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

    const auth: any = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const authUserId = toStr(auth.userId);

    const authUser: any = await User.findById(authUserId)
      .select(
        "email guests maxMessages createdByProducer role staffType assignedClientIds assignedProducerId"
      )
      .lean();

    if (!authUser) {
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

    const isProducer = auth.role === "producer";
    const isProducerStaff =
      auth.role === "user" && authUser?.staffType === "producer_staff";

    // מי ה-owner של האירוע שעבורו יוצרים invitation
    let ownerIdForInvitation = authUserId;

    if (isProducerStaff) {
      const assignedClientIds = uniqueStrings(authUser?.assignedClientIds || []);

      if (assignedClientIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "NO_ASSIGNED_CLIENTS" },
          { status: 403 }
        );
      }

      const event = await Event.findById(eventId).select("_id userId maxGuests").lean();
      if (!event) {
        return NextResponse.json(
          { success: false, error: "EVENT_NOT_FOUND" },
          { status: 404 }
        );
      }

      const eventOwnerId = toStr((event as any).userId);
      if (!assignedClientIds.includes(eventOwnerId)) {
        return NextResponse.json(
          { success: false, error: "EVENT_NOT_ASSIGNED_TO_STAFF" },
          { status: 403 }
        );
      }

      ownerIdForInvitation = eventOwnerId;
    }

    if (isProducer) {
      // מפיק יכול ליצור invitation לאירוע של לקוח שלו
      const event = await Event.findById(eventId).select("_id userId maxGuests").lean();
      if (!event) {
        return NextResponse.json(
          { success: false, error: "EVENT_NOT_FOUND" },
          { status: 404 }
        );
      }

      const eventOwnerId = toStr((event as any).userId);

      const isMyClient = await User.exists({
        _id: eventOwnerId,
        assignedProducerId: authUserId,
      });

      if (!isMyClient) {
        return NextResponse.json(
          { success: false, error: "EVENT_NOT_OWNED_BY_PRODUCER_CLIENT" },
          { status: 403 }
        );
      }

      ownerIdForInvitation = eventOwnerId;
    }

    if (!isProducer && !isProducerStaff) {
      // לקוח רגיל – האירוע חייב להיות שלו
      const event = await Event.findOne({ _id: eventId, userId: authUserId }).lean();
      if (!event) {
        return NextResponse.json(
          { success: false, error: "EVENT_NOT_FOUND" },
          { status: 404 }
        );
      }
      ownerIdForInvitation = authUserId;
    }

    const ownerUser: any = await User.findById(ownerIdForInvitation)
      .select("guests maxMessages createdByProducer")
      .lean();

    const eventForLimits: any = await Event.findById(eventId)
      .select("_id maxGuests userId")
      .lean();

    if (!eventForLimits) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // producerId לקישור העסקי
    const producerId =
      isProducer
        ? authUserId
        : ownerUser?.createdByProducer
        ? toStr(ownerUser.createdByProducer)
        : authUser?.createdByProducer
        ? toStr(authUser.createdByProducer)
        : null;

    let invitation: any = await Invitation.findOne({
      eventId: eventForLimits._id,
      ownerId: ownerIdForInvitation,
    }).lean();

    if (!invitation) {
      invitation = await Invitation.create({
        ownerId: ownerIdForInvitation,
        producerId,
        eventId: eventForLimits._id,
        guests: [],
        maxGuests:
          Number(ownerUser?.guests) || Number(eventForLimits?.maxGuests) || 100,
        maxMessages: Number(ownerUser?.maxMessages) || 300,
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
          ownerId: invitation.ownerId ?? null,
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
