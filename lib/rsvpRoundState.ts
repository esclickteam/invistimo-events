export type RsvpRound = 1 | 2 | 3;
export type MessageChannel = "sms" | "whatsapp";

export type RsvpRoundExecution = {
  executionId: string;
  channel: MessageChannel | string | null;
  sentAt: Date | string | null;
  sentCount?: number | null;
  source?: string | null;
  closedAt?: Date | string | null;
  closedReason?: string | null;
};

export type RsvpRoundActiveState = {
  executionId: string;
  channel: MessageChannel | string | null;
  sentAt: Date | string | null;
  sentCount?: number | null;
  source?: string | null;
  reopenedAt?: Date | string | null;
  reopenCount?: number;
  executions?: RsvpRoundExecution[];
};

export type RsvpRoundSentSnapshot = {
  done: boolean;
  sentAt: string | null;
  channel: string | null;
  reopened: boolean;
  reopenedAt: string | null;
  reopenCount: number;
  executionId: string | null;
  originalSentAt: string | null;
  executions: RsvpRoundExecution[];
};

export function normalizeRsvpRound(round: unknown): RsvpRound | null {
  const value = Number(round);

  if (value === 1 || value === 2 || value === 3) {
    return value;
  }

  return null;
}

export function getRoundKey(round: RsvpRound) {
  return `round${round}` as "round1" | "round2" | "round3";
}

export function asDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function asIso(value: unknown) {
  const date = asDate(value);
  return date ? date.toISOString() : null;
}

function makeExecutionIdFallback() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeExecutions(value: unknown): RsvpRoundExecution[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const sentAt = asDate((item as any).sentAt);
      if (!sentAt) return null;
      return {
        executionId: String((item as any).executionId || makeExecutionIdFallback()),
        channel: (item as any).channel || null,
        sentAt,
        sentCount:
          typeof (item as any).sentCount === "number"
            ? (item as any).sentCount
            : null,
        source: (item as any).source || null,
        closedAt: asDate((item as any).closedAt),
        closedReason: (item as any).closedReason || null,
      } as RsvpRoundExecution;
    })
    .filter(Boolean) as RsvpRoundExecution[];
}

/**
 * מקור אמת משולב ל־execution הפעיל בלבד.
 * היסטוריית שליחות קודמות (executions) לא מסמנת את הסבב כ־done.
 */
export function getRsvpRoundSentSnapshot(
  invitation: any,
  round: RsvpRound | number
): RsvpRoundSentSnapshot {
  const normalized = normalizeRsvpRound(round);

  if (!normalized) {
    return {
      done: false,
      sentAt: null,
      channel: null,
      reopened: false,
      reopenedAt: null,
      reopenCount: 0,
      executionId: null,
      originalSentAt: null,
      executions: [],
    };
  }

  const key = getRoundKey(normalized);
  const roundData = invitation?.rsvpRoundSent?.[key] || null;
  const legacyRoundData = invitation?.rsvpRoundsSent?.[key] || null;
  const executions = normalizeExecutions(roundData?.executions);

  const reopenedAt = asDate(roundData?.reopenedAt);

  const activeSentAt =
    asDate(roundData?.sentAt) ||
    (!reopenedAt ? asDate(legacyRoundData?.sentAt) : null) ||
    asDate(roundData instanceof Date ? roundData : null) ||
    asDate(roundData?.sentAtSms) ||
    asDate(roundData?.sentAtWhatsapp) ||
    asDate(roundData?.smsSentAt) ||
    asDate(roundData?.whatsappSentAt) ||
    null;

  // אחרי reopen מפורש — לא נופלים לשדות legacy ישנים שנשארו בטעות.
  const legacySentAt =
    reopenedAt || executions.length > 0
      ? null
      : asDate(invitation?.[`rsvpRound${normalized}SentAt`]) ||
        asDate(invitation?.[`rsvpRound${normalized}sentAt`]) ||
        asDate(invitation?.[`rsvpSmsRound${normalized}SentAt`]) ||
        asDate(invitation?.[`rsvpSmsRound${normalized}sentAt`]) ||
        asDate(invitation?.[`rsvpWhatsappRound${normalized}SentAt`]) ||
        asDate(invitation?.[`rsvpWhatsappRound${normalized}sentAt`]) ||
        null;

  const sentAt = activeSentAt || legacySentAt;

  const channel =
    (sentAt
      ? roundData?.channel ||
        legacyRoundData?.channel ||
        (invitation?.[`rsvpWhatsappRound${normalized}SentAt`] ||
        invitation?.[`rsvpWhatsappRound${normalized}sentAt`]
          ? "whatsapp"
          : null) ||
        (invitation?.[`rsvpSmsRound${normalized}SentAt`] ||
        invitation?.[`rsvpSmsRound${normalized}sentAt`]
          ? "sms"
          : null)
      : null) || null;

  const activeSentCount = Number(
    roundData?.sentCount || legacyRoundData?.sentCount || 0
  );

  const done = Boolean(
    sentAt ||
      (activeSentCount > 0 && !reopenedAt) ||
      (roundData === true && !reopenedAt)
  );

  const originalSentAt =
    asIso(executions[0]?.sentAt) || (done ? asIso(sentAt) : null) || null;

  return {
    done,
    sentAt: sentAt ? sentAt.toISOString() : null,
    channel,
    reopened: Boolean(reopenedAt && !done),
    reopenedAt: asIso(reopenedAt),
    reopenCount: Number(roundData?.reopenCount || executions.length || 0),
    executionId:
      (typeof roundData?.executionId === "string" && roundData.executionId) ||
      null,
    originalSentAt,
    executions,
  };
}

export function isRsvpRoundAlreadySent(invitation: any, round: RsvpRound) {
  return getRsvpRoundSentSnapshot(invitation, round).done;
}

export function getRsvpRoundLockInfo(invitation: any, round: RsvpRound) {
  const snapshot = getRsvpRoundSentSnapshot(invitation, round);

  return {
    round,
    locked: snapshot.done,
    sentAt: snapshot.sentAt,
    channel: snapshot.channel,
    reopened: snapshot.reopened,
    reopenedAt: snapshot.reopenedAt,
    reopenCount: snapshot.reopenCount,
    executionId: snapshot.executionId,
    originalSentAt: snapshot.originalSentAt,
  };
}

export function getActiveRsvpRoundExecutionId(
  invitation: any,
  round: RsvpRound | number
) {
  return getRsvpRoundSentSnapshot(invitation, round).executionId;
}

/**
 * בונה את אובייקט הסבב הפעיל אחרי שליחה בפועל,
 * תוך שמירה על היסטוריית executions קודמים.
 */
export function buildRsvpRoundSentMarkState(params: {
  invitation: any;
  round: RsvpRound;
  channel: MessageChannel;
  sentCount?: number;
  source?: string;
  now?: Date;
  executionIdFactory?: () => string;
}): RsvpRoundActiveState {
  const {
    invitation,
    round,
    channel,
    sentCount = 0,
    source = "send",
    executionIdFactory = makeExecutionIdFallback,
  } = params;
  const now = params.now || new Date();
  const key = getRoundKey(round);
  const existing = invitation?.rsvpRoundSent?.[key] || {};
  const executions = normalizeExecutions(existing.executions);

  return {
    executionId:
      (typeof existing.executionId === "string" && existing.executionId) ||
      executionIdFactory(),
    channel,
    sentAt: now,
    sentCount,
    source,
    reopenedAt: existing.reopenedAt || null,
    reopenCount: Number(existing.reopenCount || executions.length || 0),
    executions,
  };
}

export function buildReopenedRsvpRoundState(params: {
  invitation: any;
  round: RsvpRound;
  now?: Date;
  closedReason?: string;
  executionIdFactory?: () => string;
}) {
  const {
    invitation,
    round,
    closedReason = "admin_reopen",
    executionIdFactory = makeExecutionIdFallback,
  } = params;
  const now = params.now || new Date();
  const key = getRoundKey(round);
  const existing = invitation?.rsvpRoundSent?.[key] || {};
  const legacy = invitation?.rsvpRoundsSent?.[key] || {};
  const snapshot = getRsvpRoundSentSnapshot(invitation, round);
  const history = normalizeExecutions(existing.executions);

  if (snapshot.done) {
    history.push({
      executionId:
        (typeof existing.executionId === "string" && existing.executionId) ||
        executionIdFactory(),
      channel: snapshot.channel,
      sentAt: snapshot.sentAt,
      sentCount:
        typeof existing.sentCount === "number"
          ? existing.sentCount
          : typeof legacy.sentCount === "number"
            ? legacy.sentCount
            : null,
      source: existing.source || null,
      closedAt: now,
      closedReason,
    });
  }

  const newExecutionId = executionIdFactory();

  return {
    newExecutionId,
    archivedExecutions: history.length,
    activeState: {
      executionId: newExecutionId,
      channel: null,
      sentAt: null,
      sentCount: 0,
      source: null,
      reopenedAt: now,
      reopenCount: history.length,
      executions: history,
    } as RsvpRoundActiveState,
    legacyUnsetFields: [
      `rsvpRound${round}SentAt`,
      `rsvpRound${round}sentAt`,
      `rsvpRoundSentAt.round${round}`,
      `rsvpSmsRound${round}SentAt`,
      `rsvpSmsRound${round}sentAt`,
      `rsvpWhatsappRound${round}SentAt`,
      `rsvpWhatsappRound${round}sentAt`,
      `rsvpRound${round}ScheduledAt`,
      `rsvpRound${round}scheduledAt`,
      `rsvpSmsRound${round}ScheduledAt`,
      `rsvpSmsRound${round}scheduledAt`,
      `rsvpWhatsappRound${round}ScheduledAt`,
      `rsvpWhatsappRound${round}scheduledAt`,
      `messageLocks.rsvpRound${round}`,
      `messageLocks.rsvpRound${round}Sms`,
      `messageLocks.rsvpRound${round}Whatsapp`,
      `messageLocks.rsvpSmsRound${round}`,
      `messageLocks.rsvpWhatsappRound${round}`,
      `adminMessageRoundLocks.rsvp_${round}`,
    ],
  };
}
