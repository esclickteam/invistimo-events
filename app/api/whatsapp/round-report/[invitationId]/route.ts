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
    null;

  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    if (!userId) return null;

    return User.findById(userId).select("_id role email name").lean();
  } catch {
    return null;
  }
}

function getFailureText(item: any) {
  const code = item.errorCode || item.failReason?.code || "";
  const message =
    item.errorMessage || item.lastError || item.failReason?.message || "";

  if (String(code) === "131049") {
    return {
      code: "131049",
      text:
        "Meta/WhatsApp לא מסרה את ההודעה בגלל מגבלת הודעות שיווקיות לנמען זה.",
    };
  }

  if (String(code) === "131026") {
    return {
      code: "131026",
      text: "לא ניתן למסור את ההודעה למספר זה ב-WhatsApp.",
    };
  }

  if (String(code) === "131047") {
    return {
      code: "131047",
      text: "לא ניתן למסור את ההודעה בגלל מגבלת חלון שיחה ב-WhatsApp.",
    };
  }

  return {
    code: String(code || ""),
    text: message || "ההודעה לא נמסרה לנמען זה.",
  };
}

function getClientStatus(item: any) {
  if (item.providerStatus === "read") return "נקרא";
  if (item.providerStatus === "delivered") return "נמסר";
  if (item.status === "sent" || item.providerStatus === "sent") return "נשלח";
  if (item.status === "failed" || item.providerStatus === "failed") return "לא נמסר";
  if (item.status === "pending") return "ממתין";
  if (item.status === "sending") return "בתהליך";
  if (item.status === "cancelled") return "בוטל";

  return "לא ידוע";
}

function getRoundTitle(item: any) {
  const type = item.type;
  const round = Number(item.round || item.roundNumber || 1);

  if (type === "rsvp" && round === 1) return "סבב 1 - הזמנה";
  if (type === "rsvp" && round === 2) return "סבב 2 - תזכורת אישור הגעה";
  if (type === "rsvp" && round === 3) return "סבב 3 - תזכורת אישור הגעה";
  if (type === "reminder" || type === "table") return "תזכורת אירוע / שולחן";
  if (type === "thankyou") return "הודעת תודה";

  return "הודעות אחרות";
}

function getRoundKey(item: any) {
  const type = item.type || "custom";
  const round = Number(item.round || item.roundNumber || 1);
  const templateName = item.templateName || "";

  return `${type}:${round}:${templateName}`;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const user: any = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { invitationId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INVITATION_ID" },
        { status: 400 }
      );
    }

    const invitation: any = await Invitation.findById(invitationId)
      .select("_id ownerId title")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const isAdmin =
      user.role === "admin" ||
      user.role === "superadmin" ||
      user.role === "staff";

    const isOwner = String(invitation.ownerId) === String(user._id);

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const queueItems: any[] = await WhatsappQueue.find({
      invitationId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const guestIds = queueItems.map((item) => item.guestId).filter(Boolean);

    const guests: any[] = await InvitationGuest.find({
      _id: { $in: guestIds },
    })
      .select("_id name phone rsvp")
      .lean();

    const guestsMap = new Map(
      guests.map((guest) => [String(guest._id), guest])
    );

    const roundsMap = new Map<string, any>();

    for (const item of queueItems) {
      const key = getRoundKey(item);
      const guest = guestsMap.get(String(item.guestId));

      if (!roundsMap.has(key)) {
        roundsMap.set(key, {
          key,
          title: getRoundTitle(item),
          type: item.type,
          round: item.round || item.roundNumber || 1,
          templateName: item.templateName,
          summary: {
            total: 0,
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
            pending: 0,
            sending: 0,
            cancelled: 0,
          },
          items: [],
        });
      }

      const group = roundsMap.get(key);

      group.summary.total += 1;

      if (item.status === "sent") group.summary.sent += 1;
      if (item.providerStatus === "delivered") group.summary.delivered += 1;
      if (item.providerStatus === "read") group.summary.read += 1;
      if (item.status === "failed" || item.providerStatus === "failed") {
        group.summary.failed += 1;
      }
      if (item.status === "pending") group.summary.pending += 1;
      if (item.status === "sending") group.summary.sending += 1;
      if (item.status === "cancelled") group.summary.cancelled += 1;

      const failed =
        item.status === "failed" || item.providerStatus === "failed";

      const failure = failed ? getFailureText(item) : null;

      group.items.push({
        id: String(item._id),
        guestId: item.guestId ? String(item.guestId) : null,
        guestName: guest?.name || "",
        phone: item.phone || guest?.phone || "",
        status: item.status,
        providerStatus: item.providerStatus,
        clientStatus: getClientStatus(item),
        sentAt: item.sentAt || null,
        deliveredAt: item.deliveredAt || null,
        readAt: item.readAt || null,
        failedAt: item.failedAt || null,
        createdAt: item.createdAt || null,
        attempts: item.attempts || 0,
        maxAttempts: item.maxAttempts || 1,
        errorCode: item.errorCode || item.failReason?.code || "",
        failure,
        admin: isAdmin
          ? {
              wamid: item.wamid || null,
              idempotencyKey: item.idempotencyKey || "",
              lastError: item.lastError || "",
              errorMessage: item.errorMessage || "",
              failReason: item.failReason || null,
            }
          : null,
      });
    }

    const rounds = Array.from(roundsMap.values()).sort((a, b) => {
      const typeOrder: Record<string, number> = {
        rsvp: 1,
        reminder: 2,
        table: 3,
        thankyou: 4,
        custom: 5,
      };

      const aType = typeOrder[a.type] || 99;
      const bType = typeOrder[b.type] || 99;

      if (aType !== bType) return aType - bType;

      return Number(a.round || 1) - Number(b.round || 1);
    });

    return NextResponse.json({
      success: true,
      isAdmin,
      rounds,
    });
  } catch (error: any) {
    console.error("❌ WHATSAPP ROUND REPORT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "REPORT_FAILED",
      },
      { status: 500 }
    );
  }
}