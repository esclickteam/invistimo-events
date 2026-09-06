import {
  ACTIVE_TABLE_WINDOW_MS,
  BOSS_MIN_COMPLETED_BEFORE,
  CATEGORY_WEIGHTS,
  MAX_MISSIONS_PER_GUEST,
} from "./constants";
import { WEDDING_CHALLENGE_MISSIONS } from "./missionBank";
import type {
  AssignmentInput,
  AssignmentResult,
  MissionCategory,
  MissionDefinition,
} from "./types";

function nowMs(value?: Date | string) {
  if (!value) return Date.now();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
}

function clampMaxMissions(value: number) {
  return Math.min(MAX_MISSIONS_PER_GUEST, Math.max(1, Number(value) || 1));
}

function enabledWeight(
  category: MissionCategory,
  enabled: AssignmentInput["settings"]["enabledCategories"],
  alcoholEnabled: boolean
) {
  if (!enabled[category]) return 0;
  if (category === "shots" && !alcoholEnabled) return 0;
  return CATEGORY_WEIGHTS[category];
}

function lastCompletedTooSoon(guest: AssignmentInput["guest"], cooldownMinutes: number, now: number) {
  if (!cooldownMinutes || !guest.lastCompletedAt) return false;
  const last = new Date(guest.lastCompletedAt).getTime();
  if (!Number.isFinite(last)) return false;
  return now - last < cooldownMinutes * 60 * 1000;
}

function guestCategoryStreak(recent: MissionCategory[], category: MissionCategory) {
  let streak = 0;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    if (recent[i] !== category) break;
    streak += 1;
  }
  return streak;
}

function isEligible(
  mission: MissionDefinition,
  input: AssignmentInput,
  excluded: Set<string>,
  options: {
    ignoreTableCooldown: boolean;
    ignoreCategoryStreak: boolean;
    ignoreTableBasedSize: boolean;
  }
) {
  const { guest, table, settings } = input;

  if (mission.active === false) return false;
  if (excluded.has(mission.id)) return false;
  if (!settings.enabledCategories[mission.category]) return false;
  if (guest.completedMissionIds.includes(mission.id)) return false;
  if (guest.skippedMissionIds.includes(mission.id)) return false;

  if (mission.requiresAlcohol) {
    if (!settings.allowAlcoholMissions || !guest.isAdult) return false;
  }

  if (mission.boss && guest.completedCount < BOSS_MIN_COMPLETED_BEFORE) {
    return false;
  }

  if (mission.minTables > 0 && table.eventTableCount < mission.minTables) {
    return false;
  }

  if (table.activeMissionIds.includes(mission.id)) return false;

  if (!options.ignoreTableCooldown && table.recentMissionIds.includes(mission.id)) {
    return false;
  }

  if (!options.ignoreTableBasedSize && mission.tableBased) {
    if (table.tableSize > 0 && table.tableSize < mission.minPeople) return false;
    if (table.activeGuestCount > 0 && table.activeGuestCount < 2 && mission.minPeople >= 5) {
      return false;
    }
  }

  if (!options.ignoreCategoryStreak) {
    const streak = guestCategoryStreak(guest.recentCategories, mission.category);
    if (streak >= 2) return false;

    const tableStreak = guestCategoryStreak(table.recentCategories, mission.category);
    if (tableStreak >= 3) return false;
  }

  return true;
}

function pickWeighted(
  missions: MissionDefinition[],
  input: AssignmentInput,
  random: () => number
) {
  const { guest, settings } = input;
  const lastCategory = guest.lastMissionCategory;

  const weighted = missions.map((mission) => {
    let weight = enabledWeight(
      mission.category,
      settings.enabledCategories,
      settings.allowAlcoholMissions
    );

    if (weight <= 0) weight = 1;

    if (lastCategory && mission.category === lastCategory) {
      weight *= 0.45;
    }

    if (input.table.recentCategories.includes(mission.category)) {
      weight *= 0.7;
    }

    if (mission.boss) {
      weight *= 0.55;
    }

    weight *= 1 / Math.max(1, mission.cooldownWeight);

    return { mission, weight };
  });

  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return missions[0] || null;

  let cursor = random() * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.mission;
  }

  return weighted[weighted.length - 1]?.mission || null;
}

export function assignWeddingChallengeMission(
  input: AssignmentInput
): AssignmentResult {
  const now = nowMs(input.now);
  const random = input.random || Math.random;
  const missions = (input.missions || WEDDING_CHALLENGE_MISSIONS).filter(
    (mission) => mission.active !== false
  );

  const maxMissions = clampMaxMissions(input.settings.maxMissionsPerGuest);
  const excluded = new Set<string>();

  if (input.guest.completedCount >= maxMissions) {
    return {
      mission: null,
      reason: "max_reached",
      excludedMissionIds: [...excluded],
      relaxationLevel: 0,
    };
  }

  if (lastCompletedTooSoon(input.guest, input.settings.cooldownMinutes, now)) {
    return {
      mission: null,
      reason: "none_eligible",
      excludedMissionIds: [...excluded],
      relaxationLevel: 0,
    };
  }

  const anyCategoryEnabled = Object.values(input.settings.enabledCategories).some(Boolean);
  if (!anyCategoryEnabled) {
    return {
      mission: null,
      reason: "categories_disabled",
      excludedMissionIds: [...excluded],
      relaxationLevel: 0,
    };
  }

  const relaxations = [
    { ignoreTableCooldown: false, ignoreCategoryStreak: false, ignoreTableBasedSize: false },
    { ignoreTableCooldown: true, ignoreCategoryStreak: false, ignoreTableBasedSize: false },
    { ignoreTableCooldown: true, ignoreCategoryStreak: true, ignoreTableBasedSize: false },
    { ignoreTableCooldown: true, ignoreCategoryStreak: true, ignoreTableBasedSize: true },
  ];

  for (let level = 0; level < relaxations.length; level += 1) {
    const options = relaxations[level];
    const eligible = missions.filter((mission) =>
      isEligible(mission, input, excluded, options)
    );

    if (!eligible.length) continue;

    const mission = pickWeighted(eligible, input, random);
    if (!mission) continue;

    return {
      mission,
      reason: "assigned",
      excludedMissionIds: [...excluded],
      relaxationLevel: level,
    };
  }

  const alcoholOnlyBlocked =
    !input.settings.allowAlcoholMissions &&
    missions.every((mission) => mission.requiresAlcohol || !input.settings.enabledCategories[mission.category]);

  return {
    mission: null,
    reason: alcoholOnlyBlocked ? "alcohol_blocked" : "none_eligible",
    excludedMissionIds: [...excluded],
    relaxationLevel: relaxations.length,
  };
}

export function tableRecentWindowMs(tableCooldownMinutes: number) {
  if (tableCooldownMinutes > 0) return tableCooldownMinutes * 60 * 1000;
  return ACTIVE_TABLE_WINDOW_MS;
}
