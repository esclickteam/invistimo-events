import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
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

const ROUND_TYPE_ORDER = [
  "save_the_date",
  "invitation_only",
  "rsvp",
  "reminder",
  "table",
  "thankyou",
  "custom",
];

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

function normalizeStatus(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isSameId(a: any, b: any) {
  if (!a || !b) return false;
  return String(a) === String(b);
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
      text: "Meta/WhatsApp לא מסרה את ההודעה בגלל מגבלת הודעות שיווקיות לנמען זה.",
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
    text: message || (normalizeStatus(item.status) === "failed" ? "ההודעה לא נמסרה לנמען זה." : ""),
  };
}

function getClientStatus(item: any) {
  const status = normalizeStatus(item.status);
  const providerStatus = normalizeStatus(item.providerStatus);

  if (providerStatus === "read" || item.readAt) return "נקרא";
  if (providerStatus === "delivered" || item.deliveredAt) return "נמסר";

  if (providerStatus === "failed" || status === "failed") {
    return "לא נמסר";
  }

  if (providerStatus === "sent" || status === "sent" || item.sentAt) {
    return "נשלח";
  }

  if (status === "pending" || status === "scheduled") return "ממתין";
  if (status === "sending" || status === "processing") return "בתהליך";
  if (status === "cancelled" || status === "canceled") return "בוטל";

  return "לא ידוע";
}

function getReportStatus(item: any) {
  const status = normalizeStatus(item.status);
  const providerStatus = normalizeStatus(item.providerStatus);

  if (providerStatus === "read" || item.readAt) return "read";
  if (providerStatus === "delivered" || item.deliveredAt) return "delivered";
  if (providerStatus === "failed" || status === "failed") return "failed";
  if (providerStatus === "sent" || status === "sent" || item.sentAt) return "sent";
  if (status === "sending" || status === "processing") return "sending";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "pending" || status === "scheduled") return "pending";
  return status || "pending";
}

function normalizeRoundType(item: any) {
  const type = String(item?.type || "").trim().toLowerCase();

  if (
    [
      "rsvp",
      "reminder",
      "thankyou",
      "table",
      "custom",
      "save_the_date",
      "invitation_only",
    ].includes(type)
  ) {
    return type;
  }

  const templateName = String(item?.templateName || "").toLowerCase();

  if (templateName.includes("save_the_date")) return "save_the_date";
  if (templateName.includes("event_invitation")) return "invitation_only";
  if (templateName.includes("thank")) return "thankyou";
  if (templateName.includes("table")) return "table";
  if (templateName.includes("reminder")) return "reminder";
  if (templateName.includes("rsvp")) return "rsvp";

  return type || "custom";
}

function normalizeRoundNumber(item: any, type: string) {
  const round = Number(item?.round || item?.roundNumber || 0);

  if (type === "rsvp") {
    if (round === 2 || round === 3) return round;
    return 1;
  }

  return round > 0 ? round : 1;
}

function getRoundTitle(type: string, round: number) {
  if (type === "rsvp" && round === 1) return "סבב 1 - הזמנה";
  if (type === "rsvp" && round === 2) return "סבב 2 - תזכורת אישור הגעה";
  if (type === "rsvp" && round === 3) return "סבב 3 - תזכורת אישור הגעה";
  if (type === "reminder" || type === "table") return "סבב תזכורת / מספר שולחן";
  if (type === "thankyou") return "סבב תודה";
  if (type === "save_the_date") return "Save the Date";
  if (type === "invitation_only") return "הזמנה (ללא RSVP)";
  if (type === "custom") return "סבב WhatsApp מותאם";

  return `סבב WhatsApp · ${type} ${round}`.trim();
}

function getRoundKey(type: string, round: number) {
  return `${type}:${round}`;
}

function getTimestamp(value: any) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function pickLatestQueueItem(current: any, next: any) {
  if (!current) return next;

  const nextTime = Math.max(
    getTimestamp(next.updatedAt),
    getTimestamp(next.sentAt),
    getTimestamp(next.deliveredAt),
    getTimestamp(next.readAt),
    getTimestamp(next.failedAt),
    getTimestamp(next.createdAt)
  );
  const currentTime = Math.max(
    getTimestamp(current.updatedAt),
    getTimestamp(current.sentAt),
    getTimestamp(current.deliveredAt),
    getTimestamp(current.readAt),
    getTimestamp(current.failedAt),
    getTimestamp(current.createdAt)
  );

  if (nextTime !== currentTime) {
    return nextTime > currentTime ? next : current;
  }

  const rank: Record<string, number> = {
    read: 60,
    delivered: 50,
    sent: 40,
    sending: 30,
    failed: 20,
    pending: 10,
    cancelled: 5,
  };

  const nextRank = rank[getReportStatus(next)] || 0;
  const currentRank = rank[getReportStatus(current)] || 0;

  return nextRank >= currentRank ? next : current;
}

function emptySummary() {
  return {
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    pending: 0,
    sending: 0,
    cancelled: 0,
    failedButResponded: 0,
    failedAndStillPending: 0,
  };
}

function invitationIdQuery(invitationObjectId: mongoose.Types.ObjectId) {
  return {
    $or: [
      { invitationId: invitationObjectId },
      { invitationId: String(invitationObjectId) },
    ],
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return noStoreJson(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא נמצאה התחברות תקינה.",
        },
        401
      );
    }

    const user: any = await User.findById(auth.userId)
      .select("_id role email name")
      .lean();

    if (!user) {
      return noStoreJson(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא נמצאה התחברות תקינה.",
        },
        401
      );
    }

    const { invitationId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return noStoreJson(
        {
          success: false,
          error: "INVALID_INVITATION_ID",
          message: "מזהה ההזמנה לא תקין.",
        },
        400
      );
    }

    const invitationObjectId = new mongoose.Types.ObjectId(invitationId);

    const invitation: any = await Invitation.findById(invitationObjectId)
      .select("_id ownerId userId createdBy producerId title eventDate")
      .lean();

    if (!invitation) {
      return noStoreJson(
        {
          success: false,
          error: "INVITATION_NOT_FOUND",
          message: "ההזמנה לא נמצאה.",
        },
        404
      );
    }

    const isAdmin =
      isAdminRole(user.role) ||
      isAdminRole(auth.role) ||
      Boolean(auth.impersonatedByAdmin) ||
      auth.impersonationRole === "admin";

    const isOwner =
      isSameId(invitation.ownerId, user._id) ||
      isSameId(invitation.userId, user._id) ||
      isSameId(invitation.createdBy, user._id) ||
      isSameId(invitation.producerId, user._id);

    if (!isAdmin && !isOwner) {
      return noStoreJson(
        {
          success: false,
          error: "FORBIDDEN",
          message: "אין הרשאה לצפות בדוח הזה.",
        },
        403
      );
    }

    const ownerId = invitation.ownerId || invitation.userId || null;

    const relatedInvitations: any[] = isAdmin && ownerId
      ? await Invitation.find({
          $or: [
            { _id: invitationObjectId },
            { ownerId },
            { userId: ownerId },
          ],
        })
          .select("_id title eventDate ownerId")
          .sort({ eventDate: -1, updatedAt: -1, createdAt: -1 })
          .lean()
      : [invitation];

    const invitationIds = relatedInvitations
      .map((item) => item._id)
      .filter(Boolean);

    const queueQuery =
      invitationIds.length > 1
        ? {
            $or: invitationIds.flatMap((id) => [
              { invitationId: id },
              { invitationId: String(id) },
            ]),
          }
        : invitationIdQuery(invitationObjectId);

    const queueItems: any[] = await WhatsappQueue.find(queueQuery)
      .sort({
        createdAt: -1,
        updatedAt: -1,
      })
      .lean();

    const guestIds = Array.from(
      new Set(
        queueItems
          .map((item) => item.guestId)
          .filter(Boolean)
          .map((id) => String(id))
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      )
    );

    const guests: any[] = guestIds.length
      ? await InvitationGuest.find({
          _id: { $in: guestIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
          .select("_id name phone rsvp guestsCount arrivedCount invitationId")
          .lean()
      : [];

    const guestsMap = new Map(guests.map((guest) => [String(guest._id), guest]));

    const invitationTitleById = new Map(
      relatedInvitations.map((item) => [
        String(item._id),
        String(item.title || "").trim(),
      ])
    );

    const multipleEvents = new Set(
      queueItems.map((item) => String(item.invitationId || invitationId))
    ).size > 1;

    const roundsMap = new Map<string, any>();
    const latestByGuest = new Map<string, any>();

    for (const item of queueItems) {
      const type = normalizeRoundType(item);
      const round = normalizeRoundNumber(item, type);
      const itemInvitationId = String(item.invitationId || invitationId);
      const guestKey = item.guestId
        ? String(item.guestId)
        : `phone:${String(item.phone || "")}`;
      const uniqueKey = `${itemInvitationId}:${type}:${round}:${guestKey}`;
      const existing = latestByGuest.get(uniqueKey);
      latestByGuest.set(uniqueKey, pickLatestQueueItem(existing, item));
    }

    for (const item of latestByGuest.values()) {
      const type = normalizeRoundType(item);
      const round = normalizeRoundNumber(item, type);
      const itemInvitationId = String(item.invitationId || invitationId);
      const key = multipleEvents
        ? `${itemInvitationId}:${getRoundKey(type, round)}`
        : getRoundKey(type, round);

      const guest = item.guestId ? guestsMap.get(String(item.guestId)) : null;
      const invitationTitle = invitationTitleById.get(itemInvitationId) || "";
      const baseTitle = getRoundTitle(type, round);

      if (!roundsMap.has(key)) {
        roundsMap.set(key, {
          key,
          title: multipleEvents && invitationTitle
            ? `${baseTitle} · ${invitationTitle}`
            : baseTitle,
          type,
          round,
          templateName: item.templateName || "",
          invitationId: itemInvitationId,
          summary: emptySummary(),
          items: [],
        });
      }

      const group = roundsMap.get(key);
      const reportStatus = getReportStatus(item);
      const guestRsvp = String(guest?.rsvp || "pending");
      const failure = reportStatus === "failed" ? getFailureText(item) : null;

      group.summary.total += 1;

      if (reportStatus === "read") {
        group.summary.read += 1;
        group.summary.delivered += 1;
        group.summary.sent += 1;
      } else if (reportStatus === "delivered") {
        group.summary.delivered += 1;
        group.summary.sent += 1;
      } else if (reportStatus === "sent") {
        group.summary.sent += 1;
      } else if (reportStatus === "failed") {
        group.summary.failed += 1;
      } else if (reportStatus === "pending") {
        group.summary.pending += 1;
      } else if (reportStatus === "sending") {
        group.summary.sending += 1;
      } else if (reportStatus === "cancelled") {
        group.summary.cancelled += 1;
      }

      if (reportStatus === "failed" && guestRsvp !== "pending") {
        group.summary.failedButResponded += 1;
      }

      if (reportStatus === "failed" && guestRsvp === "pending") {
        group.summary.failedAndStillPending += 1;
      }

      const mappedItem = {
        id: String(item._id),
        guestId: item.guestId ? String(item.guestId) : null,
        guestName: guest?.name || item.payload?.name || "",
        name: guest?.name || item.payload?.name || "",
        phone: item.phone || guest?.phone || "",
        rsvp: guestRsvp,
        guestsCount: guest?.guestsCount || 0,
        arrivedCount: guest?.arrivedCount || 0,

        status: getReportStatus(item),
        rawStatus: item.status || "",
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
        errorMessage: failure?.text || item.errorMessage || item.lastError || "",
        failure,

        messageId: item.wamid || "",

        admin: isAdmin
          ? {
              wamid: item.wamid || null,
              idempotencyKey: item.idempotencyKey || "",
              lastError: item.lastError || "",
              errorMessage: item.errorMessage || "",
              failReason: item.failReason || null,
              scheduleId: item.scheduleId ? String(item.scheduleId) : null,
              lastAttemptAt: item.lastAttemptAt || null,
              templateName: item.templateName || "",
            }
          : null,
      };

      group.items.push(mappedItem);

      if (!group.templateName && item.templateName) {
        group.templateName = item.templateName;
      }
    }

    const rounds = Array.from(roundsMap.values())
      .map((group) => {
        group.items.sort((a: any, b: any) => {
          const nameA = String(a.guestName || "").trim();
          const nameB = String(b.guestName || "").trim();
          return nameA.localeCompare(nameB, "he");
        });

        group.recipients = group.items;
        group.total = group.summary.total;
        group.sent = group.summary.sent;
        group.delivered = group.summary.delivered;
        group.read = group.summary.read;
        group.failed = group.summary.failed;
        group.pending = group.summary.pending;

        return group;
      })
      .sort((a, b) => {
        const typeA = ROUND_TYPE_ORDER.indexOf(a.type);
        const typeB = ROUND_TYPE_ORDER.indexOf(b.type);
        const safeTypeA = typeA === -1 ? 99 : typeA;
        const safeTypeB = typeB === -1 ? 99 : typeB;

        if (safeTypeA !== safeTypeB) return safeTypeA - safeTypeB;
        if (Number(a.round) !== Number(b.round)) {
          return Number(a.round || 1) - Number(b.round || 1);
        }

        return String(a.title).localeCompare(String(b.title), "he");
      });

    return noStoreJson({
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

    return noStoreJson(
      {
        success: false,
        error: error?.message || "REPORT_FAILED",
        message: "טעינת דוח WhatsApp נכשלה.",
      },
      500
    );
  }
}
