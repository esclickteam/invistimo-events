import type {
  EnabledCategories,
  GiveawayRevealMode,
  WeddingChallengeSettings,
} from "./types";
import {
  DEFAULT_MAX_MISSIONS_PER_GUEST,
  DEFAULT_MAX_SKIPS_PER_GUEST,
  DEFAULT_TABLE_COOLDOWN_MINUTES,
  DEFAULT_TABLE_COOLDOWN_MISSIONS,
  MAX_MISSIONS_PER_GUEST,
} from "./constants";

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
    enabled: false,
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
      revealMode: "after_first",
      bossEntries: 2,
      maxEntriesPerGuest: null,
      autoDrawAtEnd: true,
      revealedByAdmin: false,
      winnerGuestId: null,
      winnerName: "",
      drawnAt: null,
    },
    sms: {
      template: "full",
      sentAt: null,
      sentCount: 0,
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

  return {
    enabled: asBoolean(raw?.enabled, false),
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
      revealMode,
      bossEntries: raw?.giveaway?.bossEntries === 3 ? 3 : 2,
      maxEntriesPerGuest:
        raw?.giveaway?.maxEntriesPerGuest == null
          ? null
          : asNumber(raw.giveaway.maxEntriesPerGuest, 0, 1, 20),
      autoDrawAtEnd: asBoolean(raw?.giveaway?.autoDrawAtEnd, true),
      revealedByAdmin: asBoolean(raw?.giveaway?.revealedByAdmin, false),
      winnerGuestId: raw?.giveaway?.winnerGuestId
        ? String(raw.giveaway.winnerGuestId)
        : null,
      winnerName: String(raw?.giveaway?.winnerName || "").trim(),
      drawnAt: asDateString(raw?.giveaway?.drawnAt),
    },
    sms: {
      template: raw?.sms?.template === "short" ? "short" : "full",
      sentAt: asDateString(raw?.sms?.sentAt),
      sentCount: asNumber(raw?.sms?.sentCount, 0, 0),
    },
  };
}

export function gameWindowState(
  settings: WeddingChallengeSettings,
  now = new Date()
): "not_started" | "active" | "ended" {
  const nowMs = now.getTime();
  if (settings.startAt) {
    const start = new Date(settings.startAt).getTime();
    if (Number.isFinite(start) && nowMs < start) return "not_started";
  }
  if (settings.endAt) {
    const end = new Date(settings.endAt).getTime();
    if (Number.isFinite(end) && nowMs > end) return "ended";
  }
  return "active";
}

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

export function entriesForMission(params: {
  boss: boolean;
  bossEntries: 2 | 3;
}): number {
  return params.boss ? params.bossEntries : 1;
}
