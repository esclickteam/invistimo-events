import { normalizeGuestRsvp } from "@/lib/rsvpStatus";
import {
  BUILTIN_GROUPS,
  mapKnownGroupName,
  type BuiltinGroupId,
  type Season,
  type Weekday,
} from "../../app/(marketing)/info/guides/wedding-venue-guest-guarantee/calcLogic";

export type ArrivalGuestRow = {
  rsvp?: unknown;
  status?: unknown;
  guestsCount?: unknown;
  arrivedCount?: unknown;
  groupId?: unknown;
};

export type ArrivalSnapshot = {
  invited: number;
  confirmed: number;
  declined: number;
  undecided: number;
  pending: number;
  groups: Record<BuiltinGroupId, number>;
  unassigned: number;
  weekday: Weekday | null;
  season: Season | null;
};

const WEEKDAY_FROM_SHORT: Record<string, Weekday> = {
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
};

function heads(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

export function weekdayAndSeason(value: Date | null): { weekday: Weekday | null; season: Season | null } {
  if (!value || Number.isNaN(value.getTime())) return { weekday: null, season: null };
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    month: "numeric",
  }).formatToParts(value);
  const weekday = WEEKDAY_FROM_SHORT[parts.find((part) => part.type === "weekday")?.value || ""] || null;
  const month = Number(parts.find((part) => part.type === "month")?.value || 0);
  let season: Season | null = null;
  if (month === 12 || month <= 2) season = "winter";
  else if (month <= 5) season = "spring";
  else if (month <= 8) season = "summer";
  else if (month <= 11) season = "autumn";
  return { weekday, season };
}

function emptyGroups(): Record<BuiltinGroupId, number> {
  return {
    closeFamily: 0,
    extendedFamily: 0,
    closeFriends: 0,
    acquaintances: 0,
    workStudyArmy: 0,
    parentsFriends: 0,
  };
}

/**
 * Turns guest rows into counts only. Names, phones, and table assignments
 * are ignored even if they are present on the row.
 */
export function summarizeArrivalRows(
  rows: ArrivalGuestRow[],
  groupNames: Map<string, string>,
  eventDate: Date | null
): ArrivalSnapshot {
  const groups = emptyGroups();
  let unassigned = 0;
  let confirmed = 0;
  let declined = 0;
  let undecided = 0;
  let pending = 0;
  let invited = 0;

  for (const row of rows) {
    const count = heads(row.guestsCount, 1);
    const rsvp = normalizeGuestRsvp(row.rsvp ?? row.status);
    let confirmedHeads = 0;
    if (rsvp === "yes") {
      const arrived = heads(row.arrivedCount, 0);
      confirmedHeads = arrived > 0 ? arrived : count;
      confirmed += confirmedHeads;
    } else if (rsvp === "no") {
      declined += count;
    } else if (rsvp === "maybe") {
      undecided += count;
    } else {
      pending += count;
    }

    const rowHeads = Math.max(count, confirmedHeads);
    invited += rowHeads;
    const known = mapKnownGroupName(groupNames.get(String(row.groupId || "")) || "");
    if (known) groups[known] += rowHeads;
    else unassigned += rowHeads;
  }

  const grouped = BUILTIN_GROUPS.reduce((sum, group) => sum + groups[group.id], 0) + unassigned;
  if (grouped < invited) unassigned += invited - grouped;

  return {
    invited,
    confirmed,
    declined,
    undecided,
    pending,
    groups,
    unassigned,
    ...weekdayAndSeason(eventDate),
  };
}
