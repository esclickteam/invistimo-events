import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

async function getAuthUser() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("authToken")?.value ||
    cookieStore.get("token")?.value ||
    cookieStore.get("adminToken")?.value ||
    null;

  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const userId =
      decoded?.userId ||
      decoded?.id ||
      decoded?._id ||
      decoded?.sub ||
      null;

    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
      return null;
    }

    const user = await User.findById(userId)
      .select("_id role email name")
      .lean();

    return user || null;
  } catch (error) {
    console.error("❌ WHATSAPP REPORT AUTH ERROR:", error);
    return null;
  }
}

function normalizeStatus(value: any) {
  return String(value || "").trim().toLowerCase();
}

function getFailureText(item: any) {
  const code = String(item.errorCode || item.failReason?.code || "");

  const message =
    item.errorMessage ||
    item.lastError ||
    item.failReason?.message ||
    item.failReason?.raw?.message ||
    item.failReason?.raw?.title ||
    "";

  if (code === "131049") {
    return {
      code: "131049",
      text:
        "Meta/WhatsApp לא מסרה את ההודעה בגלל מגבלת הודעות שיווקיות לנמען זה.",
    };
  }

  if (code === "131026") {
    return {
      code: "131026",
      text: "לא ניתן למסור את ההודעה למספר זה ב-WhatsApp.",
    };
  }

  if (code === "131047") {
    return {
      code: "131047",
      text: "לא ניתן למסור את ההודעה בגלל מגבלת חלון שיחה ב-WhatsApp.",
    };
  }

  return {
    code,
    text: message || "ההודעה לא נמסרה לנמען זה.",
  };
}

function getClientStatus(item: any) {
  const status = normalizeStatus(item.status);
  const providerStatus = normalizeStatus(item.providerStatus);

  if (providerStatus === "read") return "נקרא";
  if (providerStatus === "delivered") return "נמסר";

  if (providerStatus === "failed" || status === "failed") {
    return "לא נמסר";
  }

  if (providerStatus === "sent" || status === "sent") {
    return "נשלח";
  }

  if (status === "pending") return "ממתין";
  if (status === "sending" || status === "processing") return "בתהליך";
  if (status === "cancelled" || status === "canceled") return "בוטל";

  return "לא ידוע";
}

function getRoundTitle(item: any) {
  const type = String(item.type || "");
  const round = Number(item.round || item.roundNumber || 1);

  if (type === "rsvp" && round === 1) return "סבב 1 - הזמנה";
  if (type === "rsvp" && round === 2) return "סבב 2 - תזכורת אישור הגעה";
  if (type === "rsvp" && round === 3) return "סבב 3 - תזכורת אישור הגעה";

  return "סבב WhatsApp";
}

function getRoundKey(item: any) {
  const type = String(item.type || "custom");
  const round = Number(item.round || item.roundNumber || 1);
  const templateName = String(item.templateName || "");

  return `${type}:${round}:${templateName}`;
}

function isAdminRole(role: any) {
  const normalizedRole = String(role || "").toLowerCase();

  return [
    "admin",
    "superadmin",
    "staff",
    "support",
    "manager",
  ].includes(normalizedRole);
}

function isSameId(a: any, b: any) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const user: any = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא נמצאה התחברות תקינה.",
        },
        { status: 401 }
      );
    }

    const { invitationId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_INVITATION_ID",
          message: "מזהה ההזמנה לא תקין.",
        },
        { status: 400 }
      );
    }

    const invitationObjectId = new mongoose.Types.ObjectId(invitationId);

    const invitation: any = await Invitation.findById(invitationObjectId)
      .select("_id ownerId userId createdBy producerId title")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "INVITATION_NOT_FOUND",
          message: "ההזמנה לא נמצאה.",
        },
        { status: 404 }
      );
    }

    const isAdmin = isAdminRole(user.role);

    const isOwner =
      isSameId(invitation.ownerId, user._id) ||
      isSameId(invitation.userId, user._id) ||
      isSameId(invitation.createdBy, user._id) ||
      isSameId(invitation.producerId, user._id);

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "אין הרשאה לצפות בדוח הזה.",
          debug: {
            userId: String(user._id),
            userRole: String(user.role || ""),
            invitationOwnerId: invitation.ownerId
              ? String(invitation.ownerId)
              : null,
            invitationUserId: invitation.userId
              ? String(invitation.userId)
              : null,
          },
        },
        { status: 403 }
      );
    }

    const queueItems: any[] = await WhatsappQueue.find({
      invitationId: invitationObjectId,
      type: "rsvp",
      round: { $in: [1, 2, 3] },
    })
      .sort({
        round: 1,
        createdAt: -1,
      })
      .lean();

    const guestIds = queueItems
      .map((item) => item.guestId)
      .filter(Boolean)
      .filter((id) => mongoose.Types.ObjectId.isValid(String(id)));

    const guests: any[] = await InvitationGuest.find({
      _id: { $in: guestIds },
    })
      .select("_id name phone rsvp guestsCount arrivedCount")
      .lean();

    const guestsMap = new Map(
      guests.map((guest) => [String(guest._id), guest])
    );

    const roundsMap = new Map<string, any>();

    for (const item of queueItems) {
      const key = getRoundKey(item);
      const guest = item.guestId
        ? guestsMap.get(String(item.guestId))
        : null;

      if (!roundsMap.has(key)) {
        roundsMap.set(key, {
          key,
          title: getRoundTitle(item),
          type: item.type || "rsvp",
          round: Number(item.round || item.roundNumber || 1),
          templateName: item.templateName || "",
          summary: {
            total: 0,
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
            pending: 0,
            sending: 0,
            cancelled: 0,

            // תוספת חשובה לאדמין:
            failedButResponded: 0,
            failedAndStillPending: 0,
          },
          items: [],
        });
      }

      const group = roundsMap.get(key);

      const status = normalizeStatus(item.status);
      const providerStatus = normalizeStatus(item.providerStatus);

      const failed =
        status === "failed" ||
        providerStatus === "failed";

      const delivered = providerStatus === "delivered";
      const read = providerStatus === "read";
      const sent =
        !failed &&
        (status === "sent" ||
          providerStatus === "sent" ||
          delivered ||
          read);

      const pending = status === "pending";
      const sending = status === "sending" || status === "processing";
      const cancelled = status === "cancelled" || status === "canceled";

      group.summary.total += 1;

      if (sent) group.summary.sent += 1;
      if (delivered) group.summary.delivered += 1;
      if (read) group.summary.read += 1;
      if (failed) group.summary.failed += 1;
      if (pending) group.summary.pending += 1;
      if (sending) group.summary.sending += 1;
      if (cancelled) group.summary.cancelled += 1;

      const guestRsvp = String(guest?.rsvp || "pending");

      if (failed && guestRsvp !== "pending") {
        group.summary.failedButResponded += 1;
      }

      if (failed && guestRsvp === "pending") {
        group.summary.failedAndStillPending += 1;
      }

      const failure = failed ? getFailureText(item) : null;

      group.items.push({
        id: String(item._id),
        guestId: item.guestId ? String(item.guestId) : null,
        guestName: guest?.name || item.payload?.name || "",
        phone: item.phone || guest?.phone || "",
        rsvp: guestRsvp,
        guestsCount: guest?.guestsCount || 0,
        arrivedCount: guest?.arrivedCount || 0,

        status: item.status || "",
        providerStatus: item.providerStatus || "",
        clientStatus: getClientStatus(item),

        sentAt: item.sentAt || null,
        deliveredAt: item.deliveredAt || null,
        readAt: item.readAt || null,
        failedAt: item.failedAt || null,
        createdAt: item.createdAt || null,
        updatedAt: item.updatedAt || null,

        attempts: Number(item.attempts || 0),
        maxAttempts: Number(item.maxAttempts || 1),

        errorCode: item.errorCode || item.failReason?.code || "",
        failure,

        admin: isAdmin
          ? {
              wamid: item.wamid || null,
              idempotencyKey: item.idempotencyKey || "",
              lastError: item.lastError || "",
              errorMessage: item.errorMessage || "",
              failReason: item.failReason || null,
              scheduleId: item.scheduleId ? String(item.scheduleId) : null,
              lastAttemptAt: item.lastAttemptAt || null,
            }
          : null,
      });
    }

    const rounds = Array.from(roundsMap.values()).sort((a, b) => {
      return Number(a.round || 1) - Number(b.round || 1);
    });

    return NextResponse.json({
      success: true,
      isAdmin,
      invitation: {
        _id: String(invitation._id),
        title: invitation.title || "",
      },
      totalQueueItems: queueItems.length,
      rounds,
    });
  } catch (error: any) {
    console.error("❌ WHATSAPP ROUND REPORT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "REPORT_FAILED",
        message: "טעינת דוח WhatsApp נכשלה.",
      },
      { status: 500 }
    );
  }
}