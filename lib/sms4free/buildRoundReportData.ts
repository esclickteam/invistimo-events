import mongoose from "mongoose";

import InvitationGuest from "@/models/InvitationGuest";
import ScheduledMessage from "@/models/ScheduledMessage";
import MessageLog from "@/models/MessageLog";
import {
  SMS_PROGRESS_RANK,
  SMS_ROUND_TYPE_ORDER,
  applySmsReportGuestFilters,
  emptySmsGuestSummary,
  emptySmsRoundSummary,
  getSmsMessageTypeLabel,
  getSmsRoundKey,
  getSmsRoundTitle,
  getSmsRoundTypeLabel,
  getSmsStatusLabel,
  getTimestamp,
  guestMatchesSmsAudience,
  inferSmsNotSentReason,
  mapRsvpFilterValue,
  mapRsvpLabel,
  mapScheduleStatusToReport,
  normalizePhoneDigits,
  normalizeSmsRoundNumber,
  normalizeSmsRoundType,
  normalizeSmsStatus,
  type SmsReportStatusKey,
} from "@/lib/sms4free/roundReport";

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

function defaultAudience(type: string, round: number) {
  return type === "rsvp" && (round === 2 || round === 3) ? "pending" : "all";
}

type BuildInput = {
  invitation: any;
  invitationId: string;
  isAdmin: boolean;
  filters?: {
    round?: string;
    status?: string;
    rsvp?: string;
    messageCount?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    includeHistory?: boolean;
    guestId?: string | null;
  };
};

export type SmsReportAttempt = {
  id: string;
  guestId: string | null;
  roundKey: string;
  roundTitle: string;
  roundType: string;
  messageTypeLabel: string;
  roundNumber: number;
  status: SmsReportStatusKey;
  statusLabel: string;
  providerStatus: string;
  createdAt: string | null;
  scheduledAt: string | null;
  attemptedAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string;
  providerMessageId: string;
  attempts: number;
  rsvp: string;
  rsvpLabel: string;
  source: "schedule" | "message_log";
  admin?: any;
};

/**
 * Guest-centric SMS report from InvitationGuest LEFT JOIN
 * ScheduledMessage(channel=sms) + MessageLog + invitation round markers.
 *
 * No delivery/read receipts in this codebase — SMS4FREE HTTP accept only.
 */
export async function buildSmsRoundReportData(input: BuildInput) {
  const { invitation, invitationId, isAdmin, filters = {} } = input;
  const invitationObjectId = new mongoose.Types.ObjectId(invitationId);

  const roundFilter = filters.round || "all";
  const statusFilter = filters.status || "all";
  const rsvpFilter = filters.rsvp || "all";
  const messageCountFilter = filters.messageCount || "all";
  const searchFilter = filters.search || "";
  const includeHistory = filters.includeHistory !== false;
  const page = Math.max(1, Number(filters.page || 1));
  const pageSizeRaw = Number(filters.pageSize || 0);
  const pageSize =
    pageSizeRaw > 0 ? Math.min(Math.max(pageSizeRaw, 10), 500) : 0;

  const [allGuests, schedules, messageLogs]: [any[], any[], any[]] =
    await Promise.all([
      InvitationGuest.find(invitationIdQuery(invitationObjectId))
        .select(
          "_id name phone rsvp guestsCount arrivedCount invitationId createdAt updatedAt tableName tableNumber"
        )
        .lean(),
      ScheduledMessage.find({
        ...invitationIdQuery(invitationObjectId),
        channel: "sms",
      })
        .sort({ createdAt: -1, updatedAt: -1 })
        .lean(),
      MessageLog.find(invitationIdQuery(invitationObjectId))
        .sort({ sentAt: -1, createdAt: -1 })
        .lean(),
    ]);

  const guestsMap = new Map(allGuests.map((g) => [String(g._id), g]));

  type RoundMeta = {
    key: string;
    title: string;
    type: string;
    typeLabel: string;
    round: number;
    summary: ReturnType<typeof emptySmsRoundSummary>;
    firstActivityAt: number;
    hasSentActivity: boolean;
    hasPerGuestTracking: boolean;
    audienceFilter: string;
    scheduleIds: string[];
  };

  const roundsMap = new Map<string, RoundMeta>();

  function ensureRound(
    type: string,
    round: number,
    extras?: Partial<RoundMeta>
  ) {
    const key = getSmsRoundKey(type, round);
    if (!roundsMap.has(key)) {
      roundsMap.set(key, {
        key,
        title: getSmsRoundTitle(type, round),
        type,
        typeLabel: getSmsRoundTypeLabel(type),
        round,
        summary: emptySmsRoundSummary(),
        firstActivityAt: 0,
        hasSentActivity: false,
        hasPerGuestTracking: false,
        audienceFilter: defaultAudience(type, round),
        scheduleIds: [],
      });
    }
    const meta = roundsMap.get(key)!;
    if (extras) {
      if (extras.audienceFilter) meta.audienceFilter = extras.audienceFilter;
      if (extras.hasSentActivity) meta.hasSentActivity = true;
      if (extras.hasPerGuestTracking) meta.hasPerGuestTracking = true;
      if (
        extras.firstActivityAt &&
        (!meta.firstActivityAt ||
          extras.firstActivityAt < meta.firstActivityAt)
      ) {
        meta.firstActivityAt = extras.firstActivityAt;
      }
    }
    return meta;
  }

  for (const round of [1, 2, 3] as const) {
    const sentAt =
      invitation?.[`rsvpSmsRound${round}SentAt`] ||
      (invitation?.rsvpRoundSent?.[`round${round}`]?.channel === "sms"
        ? invitation.rsvpRoundSent[`round${round}`].sentAt
        : null) ||
      (invitation?.rsvpRoundsSent?.[`round${round}`]?.channel === "sms"
        ? invitation.rsvpRoundsSent[`round${round}`].sentAt
        : null);

    const scheduledAt = invitation?.[`rsvpSmsRound${round}ScheduledAt`];

    if (sentAt || scheduledAt) {
      const ts = getTimestamp(sentAt || scheduledAt);
      ensureRound("rsvp", round, {
        audienceFilter: round === 1 ? "all" : "pending",
        hasSentActivity: Boolean(sentAt),
        firstActivityAt: ts || undefined,
      });
    }
  }

  if (invitation?.reminderSentAt) {
    ensureRound("reminder", 1, {
      hasSentActivity: true,
      firstActivityAt: getTimestamp(invitation.reminderSentAt) || undefined,
    });
  }

  const attemptsByGuest = new Map<string, SmsReportAttempt[]>();

  function pushAttempt(guestKey: string, attempt: SmsReportAttempt) {
    if (!attemptsByGuest.has(guestKey)) attemptsByGuest.set(guestKey, []);
    attemptsByGuest.get(guestKey)!.push(attempt);
  }

  for (const schedule of schedules) {
    const type = normalizeSmsRoundType(schedule);
    const round = normalizeSmsRoundNumber(schedule, type);
    const roundKey = getSmsRoundKey(type, round);
    const audience = String(
      schedule.filter || defaultAudience(type, round)
    );
    const meta = ensureRound(type, round, { audienceFilter: audience });

    const scheduleId = String(schedule._id);
    if (!meta.scheduleIds.includes(scheduleId)) {
      meta.scheduleIds.push(scheduleId);
    }

    const activity = Math.max(
      getTimestamp(schedule.sentAt),
      getTimestamp(schedule.scheduledAt),
      getTimestamp(schedule.updatedAt),
      getTimestamp(schedule.createdAt)
    );
    if (activity && (!meta.firstActivityAt || activity < meta.firstActivityAt)) {
      meta.firstActivityAt = activity;
    }

    const scheduleStatus = mapScheduleStatusToReport(schedule.status);
    const sentIds = new Set(
      (schedule.sentGuestIds || []).map((id: any) => String(id))
    );

    if (sentIds.size > 0 || scheduleStatus === "sent") {
      meta.hasSentActivity = true;
    }
    if (sentIds.size > 0) meta.hasPerGuestTracking = true;

    const scheduleGuestIds = Array.isArray(schedule.guestIds)
      ? schedule.guestIds.map((id: any) => String(id))
      : [];

    for (const guest of allGuests) {
      const guestId = String(guest._id);
      const eligible =
        scheduleGuestIds.length > 0
          ? scheduleGuestIds.includes(guestId)
          : guestMatchesSmsAudience(guest, schedule.filter, type, round);

      const wasSent = sentIds.has(guestId);
      if (!eligible && !wasSent) continue;

      let status: SmsReportStatusKey | null = null;
      let errorMessage = "";
      let sentAt: string | null = null;
      let failedAt: string | null = null;
      let attemptedAt: string | null = null;

      if (wasSent) {
        status = "sent";
        sentAt = schedule.sentAt
          ? new Date(schedule.sentAt).toISOString()
          : null;
        attemptedAt = sentAt;
      } else if (scheduleStatus === "scheduled") {
        status = "scheduled";
        attemptedAt = schedule.scheduledAt
          ? new Date(schedule.scheduledAt).toISOString()
          : null;
      } else if (scheduleStatus === "sending") {
        status = "sending";
        attemptedAt = schedule.lastAttemptAt
          ? new Date(schedule.lastAttemptAt).toISOString()
          : null;
      } else if (scheduleStatus === "failed") {
        status = "failed";
        failedAt = schedule.updatedAt
          ? new Date(schedule.updatedAt).toISOString()
          : null;
        errorMessage = String(schedule.error || "");
        attemptedAt = failedAt;
      } else if (scheduleStatus === "cancelled") {
        status = "cancelled";
      } else {
        // Completed send without this guest in sentGuestIds — no attempt row;
        // roundStatuses will infer not_sent.
        continue;
      }

      pushAttempt(getGuestIdentityKey(guest), {
        id: `schedule:${scheduleId}:${guestId}`,
        guestId,
        roundKey,
        roundTitle: getSmsRoundTitle(type, round),
        roundType: type,
        messageTypeLabel: getSmsMessageTypeLabel(type, round),
        roundNumber: round,
        status,
        statusLabel: getSmsStatusLabel(status),
        providerStatus: status === "sent" ? "accepted" : String(schedule.status || ""),
        createdAt: schedule.createdAt
          ? new Date(schedule.createdAt).toISOString()
          : null,
        scheduledAt: schedule.scheduledAt
          ? new Date(schedule.scheduledAt).toISOString()
          : null,
        attemptedAt,
        sentAt,
        failedAt,
        errorMessage,
        providerMessageId: "",
        attempts: 1,
        rsvp: mapRsvpFilterValue(guest.rsvp),
        rsvpLabel: mapRsvpLabel(guest.rsvp),
        source: "schedule",
        admin: isAdmin
          ? {
              scheduleId,
              scheduleStatus: schedule.status || "",
              scheduleError: schedule.error || "",
            }
          : undefined,
      });
    }
  }

  // MessageLog = legacy / immediate SMS sends (no channel field; schema is SMS-only)
  for (const log of messageLogs) {
    const guest =
      (log.guestId && guestsMap.get(String(log.guestId))) || null;
    if (!guest) continue;

    const type = normalizeSmsRoundType(log);
    const round = normalizeSmsRoundNumber(log, type);
    const roundKey = getSmsRoundKey(type, round);
    const meta = ensureRound(type, round, {
      hasSentActivity: true,
      hasPerGuestTracking: true,
      firstActivityAt: getTimestamp(log.sentAt) || undefined,
    });

    const guestKey = getGuestIdentityKey(guest);
    const existing = attemptsByGuest.get(guestKey) || [];
    const logTs = getTimestamp(log.sentAt);
    const duplicate = existing.some((attempt) => {
      if (attempt.roundKey !== roundKey || attempt.status !== "sent") {
        return false;
      }
      if (!logTs) return true;
      const attemptTs = getTimestamp(attempt.sentAt || attempt.attemptedAt);
      return !attemptTs || Math.abs(attemptTs - logTs) < 5 * 60 * 1000;
    });
    if (duplicate) continue;

    const logStatus: SmsReportStatusKey =
      normalizeSmsStatus(log.status) === "failed" ? "failed" : "sent";
    const sentAt = log.sentAt ? new Date(log.sentAt).toISOString() : null;

    pushAttempt(guestKey, {
      id: `log:${String(log._id)}`,
      guestId: String(guest._id),
      roundKey,
      roundTitle: getSmsRoundTitle(type, round),
      roundType: type,
      messageTypeLabel: getSmsMessageTypeLabel(type, round),
      roundNumber: round,
      status: logStatus,
      statusLabel: getSmsStatusLabel(logStatus),
      providerStatus: logStatus,
      createdAt: sentAt,
      scheduledAt: null,
      attemptedAt: sentAt,
      sentAt: logStatus === "sent" ? sentAt : null,
      failedAt: logStatus === "failed" ? sentAt : null,
      errorMessage: logStatus === "failed" ? "שליחת SMS נכשלה" : "",
      providerMessageId: "",
      attempts: 1,
      rsvp: mapRsvpFilterValue(guest.rsvp),
      rsvpLabel: mapRsvpLabel(guest.rsvp),
      source: "message_log",
    });
  }

  const knownRounds = Array.from(roundsMap.values()).sort((a, b) => {
    const typeA = SMS_ROUND_TYPE_ORDER.indexOf(a.type as any);
    const typeB = SMS_ROUND_TYPE_ORDER.indexOf(b.type as any);
    const safeA = typeA === -1 ? 99 : typeA;
    const safeB = typeB === -1 ? 99 : typeB;
    if (safeA !== safeB) return safeA - safeB;
    return Number(a.round || 1) - Number(b.round || 1);
  });

  function earliestRoundActivity() {
    const values = knownRounds
      .map((r) => r.firstActivityAt)
      .filter((n) => n > 0);
    return values.length ? Math.min(...values) : 0;
  }

  const guestsAggregated: any[] = [];

  for (const guest of allGuests) {
    const guestKey = getGuestIdentityKey(guest);
    const messages = (attemptsByGuest.get(guestKey) || [])
      .slice()
      .sort(
        (a, b) =>
          getTimestamp(a.attemptedAt || a.createdAt) -
          getTimestamp(b.attemptedAt || b.createdAt)
      );

    const latestByRound = new Map<string, SmsReportAttempt>();
    const bestByRound = new Map<string, SmsReportStatusKey>();

    for (const attempt of messages) {
      const existing = latestByRound.get(attempt.roundKey);
      if (
        !existing ||
        getTimestamp(attempt.attemptedAt || attempt.createdAt) >=
          getTimestamp(existing.attemptedAt || existing.createdAt)
      ) {
        latestByRound.set(attempt.roundKey, attempt);
      }

      const currentBest = bestByRound.get(attempt.roundKey) || "not_sent";
      if (
        SMS_PROGRESS_RANK[attempt.status] > SMS_PROGRESS_RANK[currentBest]
      ) {
        bestByRound.set(attempt.roundKey, attempt.status);
      }
    }

    const roundStatuses = knownRounds.map((roundMeta) => {
      const latest = latestByRound.get(roundMeta.key);
      const best = bestByRound.get(roundMeta.key);

      if (latest) {
        const status = best || latest.status;
        return {
          roundKey: roundMeta.key,
          title: roundMeta.title,
          type: roundMeta.type,
          typeLabel: roundMeta.typeLabel,
          round: roundMeta.round,
          status,
          statusLabel: getSmsStatusLabel(status),
          lastAttemptStatus: latest.status,
          lastAttemptStatusLabel: latest.statusLabel,
          hasMessage: true,
          sentAt: latest.sentAt,
          failedAt: latest.failedAt,
          errorMessage: latest.errorMessage || "",
          notSentReason:
            status === "not_sent" ? latest.errorMessage || null : null,
        };
      }

      const inferred = inferSmsNotSentReason({
        guest,
        roundMeta: {
          type: roundMeta.type,
          round: roundMeta.round,
          hasSentActivity: roundMeta.hasSentActivity,
          firstActivityAt: roundMeta.firstActivityAt,
          audienceFilter: roundMeta.audienceFilter,
          hasPerGuestTracking: roundMeta.hasPerGuestTracking,
        },
      });

      return {
        roundKey: roundMeta.key,
        title: roundMeta.title,
        type: roundMeta.type,
        typeLabel: roundMeta.typeLabel,
        round: roundMeta.round,
        status: "not_sent" as SmsReportStatusKey,
        statusLabel: getSmsStatusLabel("not_sent"),
        lastAttemptStatus: "not_sent" as SmsReportStatusKey,
        lastAttemptStatusLabel: getSmsStatusLabel("not_sent"),
        hasMessage: false,
        sentAt: null,
        failedAt: null,
        errorMessage: "",
        notSentReason: inferred.text,
      };
    });

    let overallStatus: SmsReportStatusKey = "not_sent";
    let lastStatus: SmsReportStatusKey = "not_sent";
    let lastMessageAt: string | null = null;
    let lastRoundTitle: string | null = null;
    let everFailed = false;
    let failedCount = 0;
    let receivedCount = 0;
    let pendingCount = 0;
    let scheduledCount = 0;
    let bestAny: SmsReportStatusKey = "not_sent";

    for (const msg of messages) {
      if (SMS_PROGRESS_RANK[msg.status] > SMS_PROGRESS_RANK[overallStatus]) {
        overallStatus = msg.status;
      }
      if (SMS_PROGRESS_RANK[msg.status] >= SMS_PROGRESS_RANK[bestAny]) {
        bestAny = msg.status;
      }
      if (msg.status === "sent") receivedCount += 1;
      if (msg.status === "failed") {
        everFailed = true;
        failedCount += 1;
      }
      if (msg.status === "pending" || msg.status === "sending") {
        pendingCount += 1;
      }
      if (msg.status === "scheduled") scheduledCount += 1;
    }

    if (overallStatus === "not_sent" && messages.length > 0) {
      overallStatus = bestAny;
    }

    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      lastStatus = last.status;
      lastMessageAt =
        last.sentAt || last.failedAt || last.scheduledAt || last.createdAt;
      lastRoundTitle = last.roundTitle;
    }

    let notSentReason: string | null = null;
    if (messages.length === 0) {
      if (!knownRounds.length) {
        notSentReason = inferSmsNotSentReason({
          guest,
          roundMeta: null,
        }).text;
      } else {
        const anyRound = knownRounds[0];
        notSentReason = inferSmsNotSentReason({
          guest,
          roundMeta: {
            type: anyRound.type,
            round: anyRound.round,
            hasSentActivity: knownRounds.some((r) => r.hasSentActivity),
            firstActivityAt: earliestRoundActivity(),
            audienceFilter: anyRound.audienceFilter,
            hasPerGuestTracking: knownRounds.some(
              (r) => r.hasPerGuestTracking
            ),
          },
        }).text;
      }
    }

    guestsAggregated.push({
      id: String(guest._id),
      guestId: String(guest._id),
      identityKey: guestKey,
      name: guest.name || "",
      phone: guest.phone || "",
      rsvp: mapRsvpFilterValue(guest.rsvp),
      rsvpLabel: mapRsvpLabel(guest.rsvp),
      createdAt: guest.createdAt || null,
      messagesCount: messages.length,
      receivedCount,
      failedCount,
      pendingCount,
      scheduledCount,
      overallStatus,
      overallStatusLabel: getSmsStatusLabel(overallStatus),
      lastStatus,
      lastStatusLabel: getSmsStatusLabel(lastStatus),
      lastMessageAt,
      lastRoundTitle,
      everSent: receivedCount > 0,
      everFailed,
      notSentReason,
      lastError:
        messages
          .slice()
          .reverse()
          .find((m) => m.errorMessage)?.errorMessage ||
        notSentReason ||
        "",
      roundStatuses,
      roundsSentCount: roundStatuses.filter((r) => r.status === "sent").length,
      roundsTotal: knownRounds.length,
      messages: includeHistory ? messages : undefined,
    });

    // Unique-guest round KPIs (best status per guest per round — retries don't inflate)
    for (const roundStatus of roundStatuses) {
      const group = roundsMap.get(roundStatus.roundKey);
      if (!group) continue;
      group.summary.intended += 1;

      const status = roundStatus.status as SmsReportStatusKey;
      if (status === "sent") group.summary.sent += 1;
      else if (status === "failed") group.summary.failed += 1;
      else if (status === "scheduled") group.summary.scheduled += 1;
      else if (status === "pending" || status === "sending") {
        group.summary.pending += 1;
      } else if (status === "cancelled") group.summary.cancelled += 1;
      else group.summary.notSent += 1;
    }
  }

  for (const attempts of attemptsByGuest.values()) {
    for (const attempt of attempts) {
      const group = roundsMap.get(attempt.roundKey);
      if (group) group.summary.totalAttempts += 1;
    }
  }

  guestsAggregated.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "he")
  );

  const summary = emptySmsGuestSummary();
  summary.totalGuests = guestsAggregated.length;
  for (const guest of guestsAggregated) {
    if (guest.receivedCount > 0) {
      summary.receivedAtLeastOne += 1;
      summary.sentAtLeastOnce += 1;
    }
    if (guest.receivedCount === 0) summary.receivedNone += 1;
    if (guest.everFailed) summary.failedAtLeastOnce += 1;
    if (guest.pendingCount > 0) summary.pending += 1;
    if (guest.scheduledCount > 0) summary.scheduled += 1;
    if (guest.messagesCount >= 2) summary.receivedMultiple += 1;
    summary.totalSmsAttempts += guest.messagesCount;
  }

  const rounds = knownRounds.map((group) => ({
    key: group.key,
    title: group.title,
    type: group.type,
    typeLabel: group.typeLabel,
    round: group.round,
    summary: group.summary,
    intended: group.summary.intended,
    sent: group.summary.sent,
    failed: group.summary.failed,
    pending: group.summary.pending,
    scheduled: group.summary.scheduled,
    cancelled: group.summary.cancelled,
    notSent: group.summary.notSent,
    total: group.summary.sent + group.summary.failed,
    totalAttempts: group.summary.totalAttempts,
    hasPerGuestTracking: group.hasPerGuestTracking,
  }));

  const filteredGuests = applySmsReportGuestFilters(guestsAggregated, {
    roundKey: roundFilter,
    status: statusFilter,
    rsvp: rsvpFilter,
    messageCount: messageCountFilter,
    search: searchFilter,
  });

  const guestIdParam = filters.guestId;
  if (guestIdParam) {
    const one =
      guestsAggregated.find(
        (g) =>
          g.id === guestIdParam ||
          g.guestId === guestIdParam ||
          g.identityKey === guestIdParam
      ) || null;

    return {
      invitation: {
        _id: String(invitation._id),
        title: invitation.title || "",
        eventDate: invitation.eventDate || null,
      },
      provider: "SMS4FREE",
      capabilities: {
        deliveryReceipts: false,
        readReceipts: false,
        statusPolling: false,
      },
      guest: one,
      lastUpdated: new Date().toISOString(),
      summary,
      rounds,
      guests: one ? [one] : [],
      pagination: {
        page: 1,
        pageSize: 1,
        total: one ? 1 : 0,
        totalPages: 1,
        unfilteredTotal: guestsAggregated.length,
      },
      filters: {
        round: roundFilter,
        status: statusFilter,
        rsvp: rsvpFilter,
        messageCount: messageCountFilter,
        search: searchFilter,
      },
      totalSchedules: schedules.length,
      totalMessageLogs: messageLogs.length,
    };
  }

  const totalFiltered = filteredGuests.length;
  const totalPages = pageSize
    ? Math.max(1, Math.ceil(totalFiltered / pageSize))
    : 1;
  const start = pageSize ? (page - 1) * pageSize : 0;
  const pagedGuests = pageSize
    ? filteredGuests.slice(start, start + pageSize)
    : filteredGuests;

  const lastUpdatedCandidates = [
    ...schedules.map((s) => getTimestamp(s.updatedAt)),
    ...schedules.map((s) => getTimestamp(s.sentAt)),
    ...messageLogs.map((l) => getTimestamp(l.sentAt)),
    ...allGuests.map((g) => getTimestamp(g.updatedAt)),
  ].filter((n) => n > 0);

  const lastUpdatedMs = lastUpdatedCandidates.length
    ? Math.max(...lastUpdatedCandidates)
    : Date.now();

  return {
    invitation: {
      _id: String(invitation._id),
      title: invitation.title || "",
      eventDate: invitation.eventDate || null,
    },
    provider: "SMS4FREE",
    capabilities: {
      deliveryReceipts: false,
      readReceipts: false,
      statusPolling: false,
      perGuestTracking: schedules.some(
        (s) => Array.isArray(s.sentGuestIds) && s.sentGuestIds.length > 0
      ),
    },
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
    totalSchedules: schedules.length,
    totalMessageLogs: messageLogs.length,
  };
}
