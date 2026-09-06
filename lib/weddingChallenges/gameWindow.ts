import { DEFAULT_EVENT_TIMEZONE, formatInZone, utcToWallTimeInput, wallTimeInZoneToUtc } from "./timezone";
import type { WeddingChallengeSettings } from "./types";

export const WEDDING_CHALLENGES_WINDOW_LOG = "[wedding-challenges-window]";

export type GameWindowState = "unconfigured" | "not_started" | "active" | "ended";

export function parseEventDateOnly(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return utcToWallTimeInput(date, DEFAULT_EVENT_TIMEZONE).slice(0, 10) || null;
}

export function israelToday(now = new Date(), timeZone = DEFAULT_EVENT_TIMEZONE) {
  return utcToWallTimeInput(now, timeZone).slice(0, 10);
}

export function israelNowLabel(now = new Date(), timeZone = DEFAULT_EVENT_TIMEZONE) {
  return formatInZone(now, timeZone) || utcToWallTimeInput(now, timeZone);
}

export function isEventDatePast(
  eventDate: unknown,
  now = new Date(),
  timeZone = DEFAULT_EVENT_TIMEZONE
) {
  const date = parseEventDateOnly(eventDate);
  if (!date) return false;
  return date < israelToday(now, timeZone);
}

export function combineEventDateAndWallTime(
  eventDate: unknown,
  wallTime: string | null | undefined,
  timeZone = DEFAULT_EVENT_TIMEZONE
) {
  const date = parseEventDateOnly(eventDate);
  const time = String(wallTime || "").trim();
  if (!date || !time) return null;
  const clock = time.includes("T") ? time.slice(11, 16) : time.slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(clock)) return null;
  return wallTimeInZoneToUtc(`${date}T${clock}`, timeZone);
}

export function gameWindowState(
  settings: Pick<WeddingChallengeSettings, "startAt" | "endAt">,
  now = new Date()
): GameWindowState {
  const nowMs = now.getTime();
  const startMs = settings.startAt ? new Date(settings.startAt).getTime() : NaN;
  const endMs = settings.endAt ? new Date(settings.endAt).getTime() : NaN;
  const hasStart = Number.isFinite(startMs);
  const hasEnd = Number.isFinite(endMs);

  if (!hasStart && !hasEnd) return "unconfigured";
  if (hasStart && nowMs < startMs) return "not_started";
  // Ended only when endAt exists and now is actually after it.
  if (hasEnd && nowMs > endMs) return "ended";
  return "active";
}

export function gameWindowReason(
  settings: Pick<WeddingChallengeSettings, "startAt" | "endAt" | "enabled">,
  entitled: boolean,
  now = new Date()
) {
  if (!entitled) return "NOT_ENTITLED";
  if (!settings.enabled) return "NOT_ENABLED";
  const window = gameWindowState(settings, now);
  if (window === "unconfigured") return "WINDOW_UNCONFIGURED";
  if (window === "not_started") return "NOW_BEFORE_START_AT";
  if (window === "ended") return "NOW_AFTER_END_AT";
  return "WINDOW_ACTIVE";
}

export function logGameWindowDecision(params: {
  eventId?: string;
  sourceType?: string;
  entitled: boolean;
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
  timezone?: string;
  eventDate?: unknown;
  now?: Date;
  screen: string;
}) {
  const now = params.now || new Date();
  const timezone = params.timezone || DEFAULT_EVENT_TIMEZONE;
  const window = gameWindowState(
    { startAt: params.startAt, endAt: params.endAt },
    now
  );
  const reason = gameWindowReason(
    { startAt: params.startAt, endAt: params.endAt, enabled: params.enabled },
    params.entitled,
    now
  );
  const payload = {
    eventId: params.eventId || null,
    sourceType: params.sourceType || null,
    eventDate: params.eventDate || null,
    startAt: params.startAt,
    endAt: params.endAt,
    timezone,
    enabled: params.enabled,
    entitled: params.entitled,
    nowUtc: now.toISOString(),
    nowIsrael: israelNowLabel(now, timezone),
    window,
    reason,
    screen: params.screen,
    endedOnlyIfEndAtPassed: Boolean(params.endAt) && window === "ended",
  };
  if (window === "ended" || params.screen === "ended") {
    console.info(WEDDING_CHALLENGES_WINDOW_LOG, "GAME_ENDED", payload);
  } else if (window === "not_started" || params.screen === "not_started") {
    console.info(WEDDING_CHALLENGES_WINDOW_LOG, "GAME_NOT_STARTED", payload);
  } else if (window === "unconfigured" || params.screen === "unconfigured") {
    console.info(WEDDING_CHALLENGES_WINDOW_LOG, "GAME_UNCONFIGURED", payload);
  } else {
    console.info(WEDDING_CHALLENGES_WINDOW_LOG, "GAME_ACTIVE", payload);
  }
  return payload;
}

export function adminGameStatus(params: {
  entitled: boolean;
  settings: WeddingChallengeSettings;
  smsStatus?: string;
  now?: Date;
}): "needs_setup" | "scheduled" | "ready" | "live" | "ended" {
  const now = params.now || new Date();
  if (!params.entitled) return "needs_setup";
  const window = gameWindowState(params.settings, now);
  if (window === "ended") return "ended";
  if (window === "active") return "live";
  if (params.smsStatus === "scheduled") return "scheduled";
  if (window === "unconfigured" || !params.settings.startAt || !params.settings.endAt) {
    return "needs_setup";
  }
  if (window === "not_started") return "ready";
  return "ready";
}
