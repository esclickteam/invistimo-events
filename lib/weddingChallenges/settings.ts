import type {
  EnabledCategories,
  GiveawayDrawMode,
  GiveawayRevealMode,
  SmsScheduleStatus,
  WeddingChallengeSettings,
} from "./types";
import {
  DEFAULT_MAX_MISSIONS_PER_GUEST,
  DEFAULT_MAX_SKIPS_PER_GUEST,
  DEFAULT_TABLE_COOLDOWN_MINUTES,
  DEFAULT_TABLE_COOLDOWN_MISSIONS,
  MAX_MISSIONS_PER_GUEST,
} from "./constants";
import { countdownLabel, DEFAULT_EVENT_TIMEZONE, formatInZone, utcToWallTimeInput } from "./timezone";

export const DEFAULT_ENABLED_CATEGORIES: EnabledCategories = {
  dancefloor: true,
  shots: true,
  table: true,
  chaos: true,
  cheeky: true,
  boss: true,
};

export function defaultWeddingChallengeSettings(
  overrides?: Partial<WeddingChallengeSettings>
): WeddingChallengeSettings {
  return {
    enabled: true,
    startAt: null,
    endAt: null,
    maxMissionsPerGuest: DEFAULT_MAX_MISSIONS_PER_GUEST,
    allowAlcoholMissions: true,
    pacingMode: "immediate",
    cooldownMinutes: 0,
    tableCooldownMinutes: DEFAULT_TABLE_COOLDOWN_MINUTES,
    tableCooldownMissions: DEFAULT_TABLE_COOLDOWN_MISSIONS,
    skipEnabled: true,
    maxSkipsPerGuest: DEFAULT_MAX_SKIPS_PER_GUEST,
    enabledCategories: { ...DEFAULT_ENABLED_CATEGORIES },
    giveaway: {
      enabled: false,
      prizeText: "",
      prizeCost: 0,
      prizeProvider: "NONE",
      prizeValue: 0,
      prizeCurrency: "ILS",
      prizeFulfillmentStatus: "PENDING",
      revealMode: "after_first",
      bossEntries: 2,
      maxEntriesPerGuest: null,
      autoDrawAtEnd: true,
      drawMode: "MANUAL_DRAW",
      drawAt: null,
      entriesCutoffAt: null,
      locked: false,
      revealedByAdmin: false,
      winnerGuestId: null,
      winnerName: "",
      drawnAt: null,
    },
    sms: {
      template: "full",
      timezone: DEFAULT_EVENT_TIMEZONE,
      scheduledAt: null,
      status: "idle",
      sentAt: null,
      sentCount: 0,
      cancelledAt: null,
      lastError: null,
      lastAttemptAt: null,
    },
    ...overrides,
  };
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number, min?: number, max?: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  let next = n;
  if (typeof min === "number") next = Math.max(min, next);
  if (typeof max === "number") next = Math.min(max, next);
  return next;
}

function asDateString(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function normalizeWeddingChallengeSettings(
  raw?: Partial<WeddingChallengeSettings> | null
): WeddingChallengeSettings {
  const base = defaultWeddingChallengeSettings();
  const categories = (raw?.enabledCategories || {}) as Partial<EnabledCategories>;

  const maxMissions = Math.min(
    MAX_MISSIONS_PER_GUEST,
    asNumber(raw?.maxMissionsPerGuest, DEFAULT_MAX_MISSIONS_PER_GUEST, 1, MAX_MISSIONS_PER_GUEST)
  );

  const revealMode: GiveawayRevealMode =
    raw?.giveaway?.revealMode === "after_second" ||
    raw?.giveaway?.revealMode === "manual"
      ? raw.giveaway.revealMode
      : "after_first";

  const pacing =
    raw?.pacingMode === "timed" || raw?.pacingMode === "admin"
      ? raw.pacingMode
      : "immediate";

  const drawMode: GiveawayDrawMode =
    raw?.giveaway?.drawMode === "AUTO_DRAW_AT_TIME" ? "AUTO_DRAW_AT_TIME" : "MANUAL_DRAW";

  const smsSentCount = asNumber(raw?.sms?.sentCount, 0, 0);
  const smsStatusRaw = String(raw?.sms?.status || "");
  const smsStatus: SmsScheduleStatus =
    smsSentCount > 0 && (Boolean(raw?.sms?.sentAt) || smsStatusRaw === "sent")
      ? "sent"
      : smsStatusRaw === "sent" && smsSentCount <= 0
        ? "failed"
        : smsStatusRaw === "scheduled" ||
            smsStatusRaw === "sending" ||
            smsStatusRaw === "sent" ||
            smsStatusRaw === "failed" ||
            smsStatusRaw === "cancelled"
          ? smsStatusRaw
          : "idle";

  return {
    enabled: asBoolean(raw?.enabled, true),
    startAt: asDateString(raw?.startAt),
    endAt: asDateString(raw?.endAt),
    maxMissionsPerGuest: maxMissions,
    allowAlcoholMissions: asBoolean(raw?.allowAlcoholMissions, true),
    pacingMode: pacing,
    cooldownMinutes: asNumber(raw?.cooldownMinutes, 0, 0, 120),
    tableCooldownMinutes: asNumber(
      raw?.tableCooldownMinutes,
      DEFAULT_TABLE_COOLDOWN_MINUTES,
      0,
      120
    ),
    tableCooldownMissions: asNumber(
      raw?.tableCooldownMissions,
      DEFAULT_TABLE_COOLDOWN_MISSIONS,
      0,
      10
    ),
    skipEnabled: asBoolean(raw?.skipEnabled, true),
    maxSkipsPerGuest: asNumber(raw?.maxSkipsPerGuest, DEFAULT_MAX_SKIPS_PER_GUEST, 0, 2),
    enabledCategories: {
      dancefloor: asBoolean(categories.dancefloor, true),
      shots: asBoolean(categories.shots, true),
      table: asBoolean(categories.table, true),
      chaos: asBoolean(categories.chaos, true),
      cheeky: asBoolean(categories.cheeky, true),
      boss: asBoolean(categories.boss, true),
    },
    giveaway: {
      enabled: asBoolean(raw?.giveaway?.enabled, false),
      prizeText: String(raw?.giveaway?.prizeText || "").trim(),
      prizeCost: asNumber(raw?.giveaway?.prizeCost, 0, 0),
      prizeProvider: raw?.giveaway?.prizeProvider === "BUYME" ? "BUYME" : "NONE",
      prizeValue: asNumber(raw?.giveaway?.prizeValue ?? raw?.giveaway?.prizeCost, 0, 0),
      prizeCurrency: "ILS",
      prizeFulfillmentStatus:
        raw?.giveaway?.prizeFulfillmentStatus === "READY" ||
        raw?.giveaway?.prizeFulfillmentStatus === "SENT" ||
        raw?.giveaway?.prizeFulfillmentStatus === "FAILED"
          ? raw.giveaway.prizeFulfillmentStatus
          : "PENDING",
      revealMode,
      bossEntries: raw?.giveaway?.bossEntries === 3 ? 3 : 2,
      maxEntriesPerGuest:
        raw?.giveaway?.maxEntriesPerGuest == null
          ? null
          : asNumber(raw.giveaway.maxEntriesPerGuest, 0, 1, 20),
      autoDrawAtEnd: drawMode === "AUTO_DRAW_AT_TIME" ? true : asBoolean(raw?.giveaway?.autoDrawAtEnd, false),
      drawMode,
      drawAt: asDateString(raw?.giveaway?.drawAt),
      entriesCutoffAt: asDateString(raw?.giveaway?.entriesCutoffAt),
      locked: asBoolean(raw?.giveaway?.locked, Boolean(raw?.giveaway?.drawnAt)),
      revealedByAdmin: asBoolean(raw?.giveaway?.revealedByAdmin, false),
      winnerGuestId: raw?.giveaway?.winnerGuestId
        ? String(raw.giveaway.winnerGuestId)
        : null,
      winnerName: String(raw?.giveaway?.winnerName || "").trim(),
      drawnAt: asDateString(raw?.giveaway?.drawnAt),
    },
    sms: {
      template: raw?.sms?.template === "short" ? "short" : "full",
      timezone: String(raw?.sms?.timezone || DEFAULT_EVENT_TIMEZONE).trim() || DEFAULT_EVENT_TIMEZONE,
      scheduledAt: asDateString(raw?.sms?.scheduledAt),
      status: smsStatus,
      sentAt: smsSentCount > 0 ? asDateString(raw?.sms?.sentAt) : null,
      sentCount: smsSentCount,
      cancelledAt: asDateString(raw?.sms?.cancelledAt),
      lastError: String(raw?.sms?.lastError || "").trim() || null,
      lastAttemptAt: asDateString(raw?.sms?.lastAttemptAt),
    },
  };
}

export { gameWindowState } from "./gameWindow";

export function shouldRevealGiveaway(params: {
  settings: WeddingChallengeSettings;
  completedCount: number;
}): boolean {
  const { settings, completedCount } = params;
  if (!settings.giveaway.enabled) return false;
  if (settings.giveaway.revealMode === "manual") {
    return settings.giveaway.revealedByAdmin;
  }
  if (settings.giveaway.revealMode === "after_second") {
    return completedCount >= 2;
  }
  return completedCount >= 1;
}

export function giveawayEntriesOpen(
  settings: WeddingChallengeSettings,
  now = new Date()
) {
  if (!settings.giveaway.enabled) return false;
  if (settings.giveaway.locked || settings.giveaway.drawnAt) return false;
  const cutoff = settings.giveaway.entriesCutoffAt || settings.giveaway.drawAt;
  if (cutoff) {
    const at = new Date(cutoff).getTime();
    if (Number.isFinite(at) && now.getTime() >= at) return false;
  }
  return true;
}

export function entriesForMission(params: {
  boss: boolean;
  bossEntries: 2 | 3;
}): number {
  return params.boss ? params.bossEntries : 1;
}

export function giveawayAdminStatus(
  settings: WeddingChallengeSettings,
  now = new Date()
) {
  const giveaway = settings.giveaway;
  const timezone = settings.sms.timezone || DEFAULT_EVENT_TIMEZONE;
  const locked = Boolean(giveaway.locked || giveaway.drawnAt);
  const cutoff = giveaway.entriesCutoffAt || giveaway.drawAt;
  const entriesOpen = giveawayEntriesOpen(settings, now);
  let status: "disabled" | "manual" | "scheduled" | "due" | "drawn" = "disabled";
  if (!giveaway.enabled) {
    status = "disabled";
  } else if (locked) {
    status = "drawn";
  } else if (giveaway.drawMode === "AUTO_DRAW_AT_TIME" && giveaway.drawAt) {
    status = new Date(giveaway.drawAt).getTime() <= now.getTime() ? "due" : "scheduled";
  } else {
    status = "manual";
  }

  return {
    status,
    drawMode: giveaway.drawMode,
    drawAt: giveaway.drawAt,
    drawAtLabel: formatInZone(giveaway.drawAt, timezone),
    entriesCutoffAt: cutoff,
    entriesCutoffLabel: formatInZone(cutoff, timezone),
    countdown: countdownLabel(giveaway.drawAt, now),
    entriesOpen,
    locked,
    winnerName: giveaway.winnerName,
    drawnAt: giveaway.drawnAt,
    drawnAtLabel: formatInZone(giveaway.drawnAt, timezone),
  };
}

export function openingSmsAlreadySent(
  settings: Pick<WeddingChallengeSettings, "sms">,
  force?: boolean
) {
  if (force) return false;
  const sentCount = Number(settings.sms.sentCount || 0);
  if (sentCount <= 0) return false;
  return settings.sms.status === "sent" || Boolean(settings.sms.sentAt);
}

export function smsSchedulePublic(settings: WeddingChallengeSettings) {
  const timezone = settings.sms.timezone || DEFAULT_EVENT_TIMEZONE;
  const alreadySent = openingSmsAlreadySent(settings);
  const failed =
    settings.sms.status === "failed" || Boolean(settings.sms.lastError && !alreadySent);
  return {
    timezone,
    status: settings.sms.status,
    scheduledAt: settings.sms.scheduledAt,
    scheduledAtLocal: utcToWallTimeInput(settings.sms.scheduledAt, timezone),
    scheduledAtLabel: formatInZone(settings.sms.scheduledAt, timezone),
    sentAt: settings.sms.sentAt,
    sentAtLocal: utcToWallTimeInput(settings.sms.sentAt, timezone),
    sentAtLabel: formatInZone(settings.sms.sentAt, timezone),
    sentCount: settings.sms.sentCount,
    cancelledAt: settings.sms.cancelledAt,
    lastError: settings.sms.lastError,
    lastAttemptAt: settings.sms.lastAttemptAt,
    alreadySent,
    failed,
    canEdit: !alreadySent && settings.sms.status !== "sending",
    canCancel: !alreadySent && settings.sms.status === "scheduled",
    canSendNow: !alreadySent && settings.sms.status !== "sending",
    canRetry: !alreadySent && settings.sms.status !== "sending",
  };
}
