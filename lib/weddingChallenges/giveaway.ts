import { entriesForMission, shouldRevealGiveaway } from "./settings";
import type { WeddingChallengeSettings } from "./types";
import { WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE } from "./constants";

export type GiveawayEntryRow = {
  guestId: string;
  guestName: string;
  entries: number;
};

export function clampGiveawayEntries(params: {
  current: number;
  add: number;
  maxEntriesPerGuest: number | null;
}) {
  const next = Math.max(0, params.current) + Math.max(0, params.add);
  if (!params.maxEntriesPerGuest) return next;
  return Math.min(params.maxEntriesPerGuest, next);
}

export function entriesAwardedForCompletion(params: {
  settings: WeddingChallengeSettings;
  boss: boolean;
}) {
  return entriesForMission({
    boss: params.boss,
    bossEntries: params.settings.giveaway.bossEntries,
  });
}

export function pickWeightedWinner(
  rows: GiveawayEntryRow[],
  random: () => number = Math.random
): GiveawayEntryRow | null {
  const eligible = rows.filter((row) => row.entries > 0);
  if (!eligible.length) return null;

  const total = eligible.reduce((sum, row) => sum + row.entries, 0);
  let cursor = random() * total;
  for (const row of eligible) {
    cursor -= row.entries;
    if (cursor <= 0) return row;
  }
  return eligible[eligible.length - 1] || null;
}

export function giveawayPublicCopy(params: {
  settings: WeddingChallengeSettings;
  completedCount: number;
  entries: number;
  revealed: boolean;
}) {
  if (!WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE || !params.settings.giveaway.enabled) {
    return { visible: false, title: "", body: "", entriesLine: "" };
  }

  const visible =
    params.revealed ||
    shouldRevealGiveaway({
      settings: params.settings,
      completedCount: params.completedCount,
    });

  if (!visible) {
    return { visible: false, title: "", body: "", entriesLine: "" };
  }

  return {
    visible: true,
    title: "הפתעה 🎁",
    body: "כל משימה שהשלמתם מכניסה אתכם להגרלה",
    entriesLine:
      params.entries > 0
        ? `צברתם ${params.entries} כניסות להגרלה 🎁`
        : "כל משימה שהשלמתם מכניסה אתכם להגרלה 🎁",
  };
}

export function winnerAnnouncementCopy(params: {
  winnerName: string;
  prizeText: string;
}) {
  const prize = params.prizeText.trim();
  return {
    title: "יש זוכה 🎉",
    body: prize
      ? `${params.winnerName} זכה/תה ב${prize}`
      : `${params.winnerName} זכה/תה בהגרלה`,
  };
}
