import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import WhatsappQueue from "@/models/WhatsappQueue";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import {
  ROUND_TYPE_ORDER,
  PROGRESS_RANK,
  STATUS_RANK,
  emptyGuestSummary,
  emptyRoundSummary,
  getFailureText,
  getMessageActivityAt,
  getMessageTypeLabel,
  getReportStatus,
  getRoundKey,
  getRoundTitle,
  getRoundTypeLabel,
  getStatusLabel,
  getTimestamp,
  inferNotSentReason,
  isAttemptedStatus,
  isReceivedStatus,
  mapRsvpFilterValue,
  mapRsvpLabel,
  normalizePhoneDigits,
  normalizeRoundNumber,
  normalizeRoundType,
  pickLatestQueueItem,
  type ReportStatusKey,
} from "@/lib/whatsapp/roundReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
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

function invitationIdQuery(invitationObjectId: mongoose.Types.ObjectId) {
  return {
    $or: [
      { invitationId: invitationObjectId },
      { invitationId: String(invitationObjectId) },
    ],
  };
}

function getGuestIdentityKey(guest: any) {
  if (guest?._id) return `guest:${String(guest._id)}`;
  const phone = normalizePhoneDigits(guest?.phone);
  if (phone) return `phone:${phone}`;
  return `orphan:${String(guest?.name || "unknown")}`;
}

function mapQueueItemForReport(item: any, guest: any, isAdmin: boolean) {
  const type = normalizeRoundType(item);
  const round = normalizeRoundNumber(item, type);
  const reportStatus = getReportStatus(item);
  const failure = reportStatus === "failed" ? getFailureText(item) : null;
  const guestRsvp = String(guest?.rsvp || item?.payload?.rsvp || "pending");

  return {
    id: String(item._id),
    guestId: item.guestId ? String(item.guestId) : guest?._id ? String(guest._id) : null,
    guestName: guest?.name || item.payload?.name || "",
    name: guest?.name || item.payload?.name || "",
    phone: item.phone || guest?.phone || "",
    rsvp: guestRsvp,
    rsvpLabel: mapRsvpLabel(guestRsvp),
    guestsCount: guest?.guestsCount || 0,
    arrivedCount: guest?.arrivedCount || 0,

    roundKey: getRoundKey(type, round),
    roundTitle: getRoundTitle(type, round),
    roundType: type,
    roundTypeLabel: getRoundTypeLabel(type),
    messageTypeLabel: getMessageTypeLabel(type, round),
    roundNumber: round,
    templateName: item.templateName || "",

    status: reportStatus,
    statusLabel: getStatusLabel(reportStatus),
    rawStatus: item.status || "",
    providerStatus: item.providerStatus || "",
    /** Backward-compatible Hebrew label used by older UI */
    clientStatus: getStatusLabel(reportStatus),

    sentAt: item.sentAt || null,
    deliveredAt: item.deliveredAt || null,
    readAt: item.readAt || null,
    failedAt: item.failedAt || null,
    scheduledAt: item.scheduledAt || null,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    attemptedAt:
      item.sentAt ||
      item.failedAt ||
      item.scheduledAt ||
      item.createdAt ||
      null,

    attempts: Number(item.attempts || 0),
    maxAttempts: Number(item.maxAttempts || 1),

    errorCode: item.errorCode || item.failReason?.code || "",
    errorMessage: failure?.text || item.errorMessage || item.lastError || "",
    failure,

    messageId: item.wamid || "",
    activityAt: getMessageActivityAt(item) || null,

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
}

function applyGuestFilters(
  guests: any[],
  {
    roundKey,
    status,
    rsvp,
    messageCount,
    search,
  }: {
    roundKey?: string;
    status?: string;
    rsvp?: string;
    messageCount?: string;
    search?: string;
  }
) {
  const q = String(search || "")
    .trim()
    .toLowerCase();
  const qDigits = q.replace(/\D/g, "");

  return guests.filter((guest) => {
    if (roundKey && roundKey !== "all") {
      const roundHit = guest.roundStatuses?.find(
        (item: any) => item.roundKey === roundKey
      );
      // When filtering by round, keep guests who appear in event (all),
      // but require a known status for that round (including not_sent).
      if (!roundHit) return false;
    }

    if (status && status !== "all") {
      const statusKey = String(status).toLowerCase();
      if (roundKey && roundKey !== "all") {
        const roundHit = guest.roundStatuses?.find(
          (item: any) => item.roundKey === roundKey
        );
        if (String(roundHit?.status || "") !== statusKey) return false;
      } else if (statusKey === "failed") {
        if (!guest.everFailed && guest.lastStatus !== "failed") return false;
      } else if (statusKey === "not_sent") {
        // All-rounds: guests who never received a successful send
        if (guest.receivedCount > 0) return false;
      } else if (statusKey === "scheduled" || statusKey === "pending") {
        if (guest.pendingCount <= 0 && guest.lastStatus !== statusKey) {
          return false;
        }
      } else {
        // Match best-ever overall status (and last for failed already handled)
        if (guest.overallStatus !== statusKey && guest.lastStatus !== statusKey) {
          return false;
        }
      }
    }

    if (rsvp && rsvp !== "all") {
      if (guest.rsvp !== rsvp) return false;
    }

    if (messageCount && messageCount !== "all") {
      if (messageCount === "0" && guest.messagesCount !== 0) return false;
      if (messageCount === "1" && guest.messagesCount !== 1) return false;
      if (messageCount === "1+" && guest.messagesCount < 1) return false;
      if (
        (messageCount === "2+" || messageCount === "2") &&
        guest.messagesCount < 2
      ) {
        return false;
      }
    }

    if (q || qDigits) {
      const name = String(guest.name || "").toLowerCase();
      const phone = String(guest.phone || "").replace(/\D/g, "");
      const overall = String(guest.overallStatusLabel || "").toLowerCase();
      const last = String(guest.lastStatusLabel || "").toLowerCase();
      const error = String(guest.lastError || "").toLowerCase();
      const reason = String(guest.notSentReason || "").toLowerCase();

      const matchName = q ? name.includes(q) : false;
      const matchPhone = qDigits ? phone.includes(qDigits) : false;
      const matchStatus =
        q && (overall.includes(q) || last.includes(q) || reason.includes(q));
      const matchError = q ? error.includes(q) : false;

      if (!(matchName || matchPhone || matchStatus || matchError)) {
        return false;
      }
    }

    return true;
  });
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

    const url = new URL(req.url);
    const includeHistory = url.searchParams.get("includeHistory") !== "0";
    const roundFilter = url.searchParams.get("round") || "all";
    const statusFilter = url.searchParams.get("status") || "all";
    const rsvpFilter = url.searchParams.get("rsvp") || "all";
    const messageCountFilter = url.searchParams.get("messageCount") || "all";
    const searchFilter = url.searchParams.get("search") || "";
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSizeRaw = Number(url.searchParams.get("pageSize") || 0);
    const pageSize =
      pageSizeRaw > 0 ? Math.min(Math.max(pageSizeRaw, 10), 500) : 0;

    const [allGuests, queueItems]: [any[], any[]] = await Promise.all([
      InvitationGuest.find(invitationIdQuery(invitationObjectId))
        .select(
          "_id name phone rsvp guestsCount arrivedCount invitationId createdAt updatedAt"
        )
        .lean(),
      WhatsappQueue.find(invitationIdQuery(invitationObjectId))
        .sort({
          createdAt: -1,
          updatedAt: -1,
        })
        .lean(),
    ]);

    const guestsMap = new Map(
      allGuests.map((guest) => [String(guest._id), guest])
    );

    // Queue items without guestId — attach by phone when possible
    const guestsByPhone = new Map<string, any>();
    for (const guest of allGuests) {
      const phone = normalizePhoneDigits(guest.phone);
      if (phone && !guestsByPhone.has(phone)) {
        guestsByPhone.set(phone, guest);
      }
    }

    // Deduplicate queue items per guest+round (latest wins for round rollup),
    // but keep full history list separately.
    const latestByGuestRound = new Map<string, any>();
    const messagesByGuestKey = new Map<string, any[]>();
    const orphanQueueGuests = new Map<string, any>();

    for (const item of queueItems) {
      const type = normalizeRoundType(item);
      const round = normalizeRoundNumber(item, type);
      const phone = normalizePhoneDigits(item.phone);

      let guest =
        (item.guestId && guestsMap.get(String(item.guestId))) ||
        (phone ? guestsByPhone.get(phone) : null) ||
        null;

      if (!guest) {
        const orphanKey = item.guestId
          ? `guest:${String(item.guestId)}`
          : phone
            ? `phone:${phone}`
            : `queue:${String(item._id)}`;

        if (!orphanQueueGuests.has(orphanKey)) {
          orphanQueueGuests.set(orphanKey, {
            _id: item.guestId || null,
            name: item.payload?.name || "",
            phone: item.phone || "",
            rsvp: "pending",
            guestsCount: 0,
            arrivedCount: 0,
            createdAt: item.createdAt || null,
            __orphan: true,
            __orphanKey: orphanKey,
          });
        }
        guest = orphanQueueGuests.get(orphanKey);
      }

      const guestKey = guest.__orphanKey || getGuestIdentityKey(guest);
      const roundKey = getRoundKey(type, round);
      const uniqueKey = `${guestKey}:${roundKey}`;

      latestByGuestRound.set(
        uniqueKey,
        pickLatestQueueItem(latestByGuestRound.get(uniqueKey), item)
      );

      if (!messagesByGuestKey.has(guestKey)) {
        messagesByGuestKey.set(guestKey, []);
      }
      messagesByGuestKey.get(guestKey)!.push(item);
    }

    // Discover rounds from queue + build round meta for not-sent reasons
    const roundsMap = new Map<string, any>();

    for (const item of latestByGuestRound.values()) {
      const type = normalizeRoundType(item);
      const round = normalizeRoundNumber(item, type);
      const key = getRoundKey(type, round);

      if (!roundsMap.has(key)) {
        roundsMap.set(key, {
          key,
          title: getRoundTitle(type, round),
          type,
          typeLabel: getRoundTypeLabel(type),
          round,
          templateName: item.templateName || "",
          invitationId: String(item.invitationId || invitationId),
          summary: emptyRoundSummary(),
          items: [],
          firstActivityAt: getMessageActivityAt(item),
          hasAnyMessages: true,
          audienceFilter:
            type === "rsvp" && (round === 2 || round === 3) ? "pending" : "all",
        });
      } else {
        const group = roundsMap.get(key);
        const activity = getMessageActivityAt(item);
        if (activity > 0 && (group.firstActivityAt === 0 || activity < group.firstActivityAt)) {
          group.firstActivityAt = activity;
        }
        if (!group.templateName && item.templateName) {
          group.templateName = item.templateName;
        }
      }
    }

    const knownRounds = Array.from(roundsMap.values()).sort((a, b) => {
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

    const guestSource = [
      ...allGuests,
      ...Array.from(orphanQueueGuests.values()),
    ];

    const guestsAggregated: any[] = [];

    for (const guest of guestSource) {
      const guestKey = guest.__orphanKey || getGuestIdentityKey(guest);
      const rawMessages = messagesByGuestKey.get(guestKey) || [];

      // Deduplicate identical queue docs by id, sort oldest → newest for timeline
      const seenIds = new Set<string>();
      const uniqueMessages = rawMessages
        .filter((item) => {
          const id = String(item._id);
          if (seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        })
        .sort(
          (a, b) => getMessageActivityAt(a) - getMessageActivityAt(b) ||
            getTimestamp(a.createdAt) - getTimestamp(b.createdAt)
        );

      const mappedMessages = uniqueMessages.map((item) =>
        mapQueueItemForReport(item, guest, isAdmin)
      );

      // One entry per round (latest message for that round)
      const roundStatuses = knownRounds.map((roundMeta) => {
        const latest = latestByGuestRound.get(`${guestKey}:${roundMeta.key}`);
        if (latest) {
          const mapped = mapQueueItemForReport(latest, guest, isAdmin);
          return {
            roundKey: roundMeta.key,
            title: roundMeta.title,
            type: roundMeta.type,
            typeLabel: roundMeta.typeLabel,
            round: roundMeta.round,
            status: mapped.status as ReportStatusKey,
            statusLabel: mapped.statusLabel,
            hasMessage: true,
            sentAt: mapped.sentAt,
            deliveredAt: mapped.deliveredAt,
            readAt: mapped.readAt,
            failedAt: mapped.failedAt,
            errorMessage: mapped.errorMessage || "",
            messageId: mapped.messageId || "",
            notSentReason: null as string | null,
            notSentReasonKey: null as string | null,
          };
        }

        const inferred = inferNotSentReason({
          guest,
          roundMeta: {
            type: roundMeta.type,
            round: roundMeta.round,
            hasAnyMessages: Boolean(roundMeta.hasAnyMessages),
            firstActivityAt: Number(roundMeta.firstActivityAt || 0),
            audienceFilter: roundMeta.audienceFilter,
          },
        });

        return {
          roundKey: roundMeta.key,
          title: roundMeta.title,
          type: roundMeta.type,
          typeLabel: roundMeta.typeLabel,
          round: roundMeta.round,
          status: "not_sent" as ReportStatusKey,
          statusLabel: getStatusLabel("not_sent"),
          hasMessage: false,
          sentAt: null,
          deliveredAt: null,
          readAt: null,
          failedAt: null,
          errorMessage: "",
          messageId: "",
          notSentReason: inferred.text,
          notSentReasonKey: inferred.key,
        };
      });

      let overallStatus: ReportStatusKey = "not_sent";
      let lastStatus: ReportStatusKey = "not_sent";
      let lastMessageAt: string | null = null;
      let lastMessage: any = null;
      let everDelivered = false;
      let everRead = false;
      let everFailed = false;
      let failedCount = 0;
      let receivedCount = 0;
      let pendingCount = 0;
      let bestAnyStatus: ReportStatusKey = "not_sent";

      for (const msg of mappedMessages) {
        const status = msg.status as ReportStatusKey;

        if (PROGRESS_RANK[status] > PROGRESS_RANK[overallStatus]) {
          overallStatus = status;
        }
        if ((STATUS_RANK[status] || 0) >= (STATUS_RANK[bestAnyStatus] || 0)) {
          // Prefer non-failed when ranks tie-ish: keep highest rank
          bestAnyStatus = status;
        }

        if (status === "delivered" || status === "read") everDelivered = true;
        if (status === "read") everRead = true;
        if (status === "failed") {
          everFailed = true;
          failedCount += 1;
        }
        if (isReceivedStatus(status)) receivedCount += 1;
        if (status === "pending" || status === "scheduled" || status === "sending") {
          pendingCount += 1;
        }
      }

      // If nothing successful was ever achieved but messages exist,
      // surface the strongest real attempt status (e.g. failed / pending).
      if (overallStatus === "not_sent" && mappedMessages.length > 0) {
        overallStatus = bestAnyStatus;
      }

      if (mappedMessages.length > 0) {
        lastMessage = mappedMessages[mappedMessages.length - 1];
        lastStatus = lastMessage.status as ReportStatusKey;
        lastMessageAt =
          lastMessage.sentAt ||
          lastMessage.failedAt ||
          lastMessage.scheduledAt ||
          lastMessage.createdAt ||
          null;
      }

      // If no messages at all — infer a global not-sent reason
      let notSentReason: string | null = null;
      let notSentReasonKey: string | null = null;

      if (mappedMessages.length === 0) {
        const anyRound = knownRounds[0]
          ? {
              type: knownRounds[0].type,
              round: knownRounds[0].round,
              hasAnyMessages: knownRounds.some((r) => r.hasAnyMessages),
              firstActivityAt: Math.min(
                ...knownRounds
                  .map((r) => Number(r.firstActivityAt || 0))
                  .filter((n) => n > 0),
                Number.POSITIVE_INFINITY
              ),
              audienceFilter: knownRounds[0].audienceFilter,
            }
          : null;

        const inferred = inferNotSentReason({
          guest,
          roundMeta:
            anyRound && Number.isFinite(anyRound.firstActivityAt)
              ? {
                  ...anyRound,
                  firstActivityAt:
                    anyRound.firstActivityAt === Number.POSITIVE_INFINITY
                      ? 0
                      : anyRound.firstActivityAt,
                }
              : anyRound
                ? { ...anyRound, firstActivityAt: 0, hasAnyMessages: false }
                : null,
        });

        // Prefer phone problems even when no rounds exist yet
        if (!knownRounds.length) {
          const phoneOnly = inferNotSentReason({ guest, roundMeta: null });
          notSentReason = phoneOnly.text;
          notSentReasonKey = phoneOnly.key;
        } else {
          notSentReason = inferred.text;
          notSentReasonKey = inferred.key;
        }
      }

      const guestRow = {
        id: guest._id ? String(guest._id) : guestKey,
        guestId: guest._id ? String(guest._id) : null,
        identityKey: guestKey,
        name: guest.name || "",
        phone: guest.phone || "",
        rsvp: mapRsvpFilterValue(guest.rsvp),
        rsvpLabel: mapRsvpLabel(guest.rsvp),
        guestsCount: guest.guestsCount || 0,
        arrivedCount: guest.arrivedCount || 0,
        createdAt: guest.createdAt || null,

        messagesCount: mappedMessages.length,
        receivedCount,
        pendingCount,
        failedCount,

        overallStatus,
        overallStatusLabel: getStatusLabel(overallStatus),
        lastStatus,
        lastStatusLabel: getStatusLabel(lastStatus),
        lastMessageAt,
        lastRoundKey: lastMessage?.roundKey || null,
        lastRoundTitle: lastMessage?.roundTitle || null,

        everDelivered,
        everRead,
        everFailed,
        everSent: receivedCount > 0 || everFailed,

        notSentReason,
        notSentReasonKey,
        lastError:
          lastMessage?.errorMessage ||
          mappedMessages.find((m) => m.errorMessage)?.errorMessage ||
          notSentReason ||
          "",

        roundStatuses,
        roundsSentCount: roundStatuses.filter((r) =>
          isAttemptedStatus(r.status) || isReceivedStatus(r.status)
        ).length,
        roundsTotal: knownRounds.length,

        messages: includeHistory ? mappedMessages : undefined,
      };

      guestsAggregated.push(guestRow);

      // Fill per-round legacy items + summaries from latest-per-guest-round
      for (const roundStatus of roundStatuses) {
        const group = roundsMap.get(roundStatus.roundKey);
        if (!group) continue;

        group.summary.intended += 1;

        if (!roundStatus.hasMessage) {
          group.summary.notSent += 1;
          continue;
        }

        const latest = latestByGuestRound.get(
          `${guestKey}:${roundStatus.roundKey}`
        );
        if (!latest) continue;

        const mapped = mapQueueItemForReport(latest, guest, isAdmin);
        const reportStatus = mapped.status as ReportStatusKey;
        const guestRsvp = String(guest?.rsvp || "pending");

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
        } else if (reportStatus === "scheduled") {
          group.summary.scheduled += 1;
          group.summary.pending += 1;
        } else if (reportStatus === "sending") {
          group.summary.sending += 1;
          group.summary.pending += 1;
        } else if (reportStatus === "cancelled") {
          group.summary.cancelled += 1;
        } else if (reportStatus === "not_sent") {
          group.summary.notSent += 1;
        }

        if (reportStatus === "failed" && guestRsvp !== "pending") {
          group.summary.failedButResponded += 1;
        }
        if (reportStatus === "failed" && guestRsvp === "pending") {
          group.summary.failedAndStillPending += 1;
        }

        group.items.push(mapped);
      }
    }

    guestsAggregated.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "he")
    );

    const summary = emptyGuestSummary();
    summary.totalGuests = guestsAggregated.length;

    for (const guest of guestsAggregated) {
      if (guest.receivedCount > 0 || guest.everFailed) {
        // "קיבלו לפחות הודעה אחת" = at least one successful send attempt
        if (guest.receivedCount > 0) summary.receivedAtLeastOne += 1;
      }
      if (guest.receivedCount === 0) summary.receivedNone += 1;
      if (guest.everRead) summary.readAtLeastOnce += 1;
      if (guest.everDelivered) summary.deliveredAtLeastOnce += 1;
      if (guest.everFailed) summary.failedAtLeastOnce += 1;
      if (guest.messagesCount >= 2) summary.receivedMultiple += 1;
      if (guest.pendingCount > 0) summary.pending += 1;
    }

    const rounds = knownRounds.map((group) => {
      group.items.sort((a: any, b: any) => {
        const nameA = String(a.guestName || "").trim();
        const nameB = String(b.guestName || "").trim();
        return nameA.localeCompare(nameB, "he");
      });

      group.recipients = group.items;
      group.total = group.summary.total;
      group.intended = group.summary.intended;
      group.sent = group.summary.sent;
      group.delivered = group.summary.delivered;
      group.read = group.summary.read;
      group.failed = group.summary.failed;
      group.pending = group.summary.pending;
      group.notSent = group.summary.notSent;
      group.scheduled = group.summary.scheduled;

      // Strip internal fields
      const {
        firstActivityAt: _fa,
        hasAnyMessages: _ham,
        audienceFilter: _af,
        ...publicRound
      } = group;

      return publicRound;
    });

    const filteredGuests = applyGuestFilters(guestsAggregated, {
      roundKey: roundFilter,
      status: statusFilter,
      rsvp: rsvpFilter,
      messageCount: messageCountFilter,
      search: searchFilter,
    });

    const totalFiltered = filteredGuests.length;
    const effectivePageSize = pageSize || totalFiltered || 1;
    const totalPages = pageSize
      ? Math.max(1, Math.ceil(totalFiltered / pageSize))
      : 1;
    const start = pageSize ? (page - 1) * pageSize : 0;
    const pagedGuests = pageSize
      ? filteredGuests.slice(start, start + pageSize)
      : filteredGuests;

    // Optional single-guest history payload (same aggregation, one guest)
    const guestIdParam = url.searchParams.get("guestId");
    if (guestIdParam) {
      const one =
        guestsAggregated.find(
          (g) =>
            g.id === guestIdParam ||
            g.guestId === guestIdParam ||
            g.identityKey === guestIdParam
        ) || null;

      return noStoreJson({
        success: true,
        isAdmin,
        invitation: {
          _id: String(invitation._id),
          title: invitation.title || "",
          eventDate: invitation.eventDate || null,
        },
        guest: one || null,
        lastUpdated: new Date().toISOString(),
      });
    }

    const lastUpdatedCandidates = [
      ...queueItems.map((item) => getTimestamp(item.updatedAt)),
      ...queueItems.map((item) => getTimestamp(item.readAt)),
      ...queueItems.map((item) => getTimestamp(item.deliveredAt)),
      ...allGuests.map((guest) => getTimestamp(guest.updatedAt)),
    ].filter((n) => n > 0);

    const lastUpdatedMs = lastUpdatedCandidates.length
      ? Math.max(...lastUpdatedCandidates)
      : Date.now();

    return noStoreJson({
      success: true,
      isAdmin,
      invitation: {
        _id: String(invitation._id),
        title: invitation.title || "",
        eventDate: invitation.eventDate || null,
      },
      totalQueueItems: queueItems.length,
      totalGuests: guestsAggregated.length,
      summary,
      rounds,
      guests: pagedGuests,
      pagination: {
        page: pageSize ? page : 1,
        pageSize: pageSize || totalFiltered,
        total: totalFiltered,
        totalPages,
        unfilteredTotal: guestsAggregated.length,
      },
      lastUpdated: new Date(lastUpdatedMs).toISOString(),
      filters: {
        round: roundFilter,
        status: statusFilter,
        rsvp: rsvpFilter,
        messageCount: messageCountFilter,
        search: searchFilter,
      },
      // Keep old top-level shape consumers working
      view: "guest_centric",
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
