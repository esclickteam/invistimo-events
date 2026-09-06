import mongoose from "mongoose";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import WeddingChallengeAssignment from "@/models/WeddingChallengeAssignment";
import WeddingChallengeConfig, {
  serializeChallengeSettings,
} from "@/models/WeddingChallengeConfig";
import WeddingChallengeGuest from "@/models/WeddingChallengeGuest";
import { assignWeddingChallengeMission, tableRecentWindowMs } from "./assignment";
import { CATEGORY_LABELS, MAX_MISSIONS_PER_GUEST } from "./constants";
import {
  incrementCustomAssignment,
  loadCustomMissionDefinitions,
  loadMissionsForEvent,
} from "./customMissions";
import {
  userHasWeddingChallengesEntitlement,
  userHasWeddingChallengesGiveawayEntitlement,
} from "./entitlement";
import { entriesAwardedForCompletion, giveawayPublicCopy } from "./giveaway";
import { getMissionById } from "./missionBank";
import {
  gameWindowState,
  giveawayEntriesOpen,
  shouldRevealGiveaway,
  defaultWeddingChallengeSettings,
  normalizeWeddingChallengeSettings,
} from "./settings";
import { logGameWindowDecision } from "./gameWindow";
import type {
  AssignmentGuest,
  GuestLiveScreen,
  MissionDefinition,
  TableAssignmentSnapshot,
  WeddingChallengeSettings,
  WeddingChallengesSourceType,
} from "./types";
import {
  attendingGuestMongoFilter,
  guestIsEligibleForWeddingChallenges,
  inferWeddingChallengesSourceType,
} from "./sourceType";

function idOf(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

function tableKey(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

export async function getOrCreateChallengeConfig(params: {
  eventId: string;
  invitationId?: string | null;
  ownerUserId: string;
  sourceType?: WeddingChallengesSourceType;
}) {
  const existing = await WeddingChallengeConfig.findOne({
    eventId: params.eventId,
  });

  if (existing) {
    existing.settings = normalizeWeddingChallengeSettings(existing.settings);
    if (params.invitationId && !existing.invitationId) {
      existing.invitationId = params.invitationId;
    }
    if (!existing.sourceType && params.sourceType) {
      existing.sourceType = params.sourceType;
    }
    return existing;
  }

  return WeddingChallengeConfig.create({
    eventId: params.eventId,
    invitationId: params.invitationId || null,
    ownerUserId: params.ownerUserId,
    sourceType: params.sourceType || "EXISTING_EVENT",
    settings: defaultWeddingChallengeSettings(),
  });
}

export function resolveChallengeSourceType(params: {
  config?: { sourceType?: unknown } | null;
  event?: { productType?: unknown } | null;
  invitation?: { standaloneGame?: unknown } | null;
}): WeddingChallengesSourceType {
  return inferWeddingChallengesSourceType({
    sourceType: params.config?.sourceType,
    eventProductType: params.event?.productType,
    standaloneGame: params.invitation?.standaloneGame,
  });
}

export async function loadEventChallengeContext(eventId: string) {
  const event = await Event.findById(eventId).lean();
  if (!event || event.status === "archived") return null;

  const invitation = await Invitation.findOne({ eventId: event._id }).lean();
  const owner = await User.findById(event.userId).lean();
  const config = await getOrCreateChallengeConfig({
    eventId: String(event._id),
    invitationId: invitation?._id ? String(invitation._id) : null,
    ownerUserId: String(event.userId),
    sourceType: inferWeddingChallengesSourceType({
      eventProductType: (event as { productType?: unknown }).productType,
      standaloneGame: (invitation as { standaloneGame?: unknown } | null)?.standaloneGame,
    }),
  });

  const sourceType = resolveChallengeSourceType({ config, event, invitation });
  if (config.sourceType !== sourceType) {
    config.sourceType = sourceType;
    await config.save();
  }

  return {
    event,
    invitation,
    owner,
    config,
    sourceType,
    settings: serializeChallengeSettings(config.settings),
    entitled: userHasWeddingChallengesEntitlement(owner),
    giveawayEntitled: userHasWeddingChallengesGiveawayEntitlement(owner),
  };
}

export async function loadLiveGuestByToken(token: string) {
  const clean = String(token || "").trim();
  if (!clean) return null;

  const invitationGuest = await InvitationGuest.findOne({ token: clean }).lean();
  if (!invitationGuest) return null;

  const invitation = await Invitation.findById(invitationGuest.invitationId).lean();
  if (!invitation?.eventId) return null;

  const context = await loadEventChallengeContext(String(invitation.eventId));
  if (!context) return null;

  if (
    !guestIsEligibleForWeddingChallenges({
      sourceType: context.sourceType,
      rsvp: invitationGuest.rsvp,
    })
  ) {
    return null;
  }

  return { ...context, invitationGuest, invitation };
}

async function tableSnapshot(params: {
  eventId: string;
  invitationId: string;
  tableId: string | null;
  settings: WeddingChallengeSettings;
}): Promise<TableAssignmentSnapshot> {
  const tableId = tableKey(params.tableId);
  const tableAware = Boolean(tableId);
  const now = Date.now();
  const recentMs = tableRecentWindowMs(params.settings.tableCooldownMinutes);
  const recentSince = new Date(now - recentMs);
  const recentLimit = Math.max(8, params.settings.tableCooldownMissions * 4);

  const [tableSize, active, recent, eventTableIds] = await Promise.all([
    tableAware
      ? InvitationGuest.countDocuments({
          invitationId: params.invitationId,
          tableId,
        })
      : Promise.resolve(0),
    tableAware
      ? WeddingChallengeAssignment.find({
          eventId: params.eventId,
          tableId,
          status: { $in: ["assigned", "revealed"] },
        })
          .select("missionId category assignedAt")
          .lean()
      : Promise.resolve([]),
    WeddingChallengeAssignment.find({
      eventId: params.eventId,
      ...(tableAware ? { tableId } : {}),
      assignedAt: { $gte: recentSince },
    })
      .sort({ assignedAt: -1 })
      .limit(recentLimit)
      .select("missionId category assignedAt")
      .lean(),
    InvitationGuest.distinct("tableId", {
      invitationId: params.invitationId,
      tableId: { $nin: [null, ""] },
    }),
  ]);

  const cooldownCount = params.settings.tableCooldownMissions;
  const recentForCooldown = cooldownCount
    ? recent.slice(0, cooldownCount)
    : recent;

  return {
    tableId,
    tableAware,
    tableSize: Number(tableSize || 0),
    activeGuestCount: active.length,
    eventTableCount: Array.isArray(eventTableIds)
      ? eventTableIds.filter(Boolean).length
      : 0,
    activeMissionIds: tableAware ? active.map((row) => String(row.missionId)) : [],
    recentMissionIds: recentForCooldown.map((row) => String(row.missionId)),
    recentCategories: recentForCooldown.map((row) => row.category),
  };
}

async function ensureProgress(params: {
  eventId: string;
  invitationId: string;
  invitationGuest: any;
}) {
  const guestId = String(params.invitationGuest._id);
  const existing = await WeddingChallengeGuest.findOne({
    eventId: params.eventId,
    guestId,
  });

  if (existing) {
    if (!existing.token) existing.token = params.invitationGuest.token;
    existing.tableId = tableKey(params.invitationGuest.tableId);
    existing.isAdult = params.invitationGuest.isAdult !== false;
    return existing;
  }

  return WeddingChallengeGuest.create({
    eventId: params.eventId,
    invitationId: params.invitationId,
    guestId,
    token: params.invitationGuest.token,
    tableId: tableKey(params.invitationGuest.tableId),
    isAdult: params.invitationGuest.isAdult !== false,
  });
}

function assignmentGuestFromDoc(doc: any): AssignmentGuest {
  return {
    guestId: String(doc.guestId),
    tableId: tableKey(doc.tableId),
    isAdult: doc.isAdult !== false,
    completedMissionIds: Array.isArray(doc.completedMissionIds)
      ? doc.completedMissionIds.map(String)
      : [],
    skippedMissionIds: Array.isArray(doc.skippedMissionIds)
      ? doc.skippedMissionIds.map(String)
      : [],
    lastMissionCategory: doc.lastMissionCategory || null,
    recentCategories: [],
    completedCount: Number(doc.completedCount || 0),
    lastCompletedAt: doc.lastCompletedAt
      ? new Date(doc.lastCompletedAt).toISOString()
      : null,
  };
}

function publicMission(mission: MissionDefinition | null) {
  if (!mission) return null;
  return {
    id: mission.id,
    category: mission.category,
    categoryLabel: CATEGORY_LABELS[mission.category],
    text: mission.text,
    hint: mission.hint || "",
    boss: mission.boss,
    requiresAlcohol: mission.requiresAlcohol,
  };
}

function liveScreen(params: {
  settings: WeddingChallengeSettings;
  entitled: boolean;
  enabled: boolean;
  completedCount: number;
  maxMissions: number;
  hasActive: boolean;
  revealed: boolean;
  winnerName: string;
  giveawayJustRevealed: boolean;
}): GuestLiveScreen {
  const window = gameWindowState(params.settings);
  if (!params.entitled || !params.enabled || window === "unconfigured") {
    return "unconfigured";
  }
  if (window === "not_started") return "not_started";
  if (window === "ended") {
    if (params.settings.giveaway.winnerName) return "winner";
    return "ended";
  }
  if (params.winnerName && params.settings.giveaway.drawnAt) return "winner";
  if (params.giveawayJustRevealed) return "giveaway_revealed";
  if (params.completedCount >= params.maxMissions) return "max_reached";
  if (!params.hasActive && params.completedCount > 0) return "no_more";
  if (params.hasActive && params.revealed) return "mission_revealed";
  if (!params.hasActive && params.completedCount === 0) return "intro";
  return "intro";
}

export async function buildLivePayload(params: {
  invitationGuest: any;
  invitation: any;
  event: any;
  owner: any;
  settings: WeddingChallengeSettings;
  progress: any;
  assignment?: any | null;
  justCompleted?: boolean;
  giveawayJustRevealed?: boolean;
  sourceType?: string;
}) {
  const entitled = userHasWeddingChallengesEntitlement(params.owner);
  const giveawayEntitled = userHasWeddingChallengesGiveawayEntitlement(params.owner);
  const settings = params.settings;
  const maxMissions = Math.min(
    MAX_MISSIONS_PER_GUEST,
    Number(settings.maxMissionsPerGuest || MAX_MISSIONS_PER_GUEST)
  );
  const extras = await loadCustomMissionDefinitions(String(params.event._id));
  const mission = params.assignment
    ? getMissionById(String(params.assignment.missionId), extras)
    : params.progress.activeMissionId
      ? getMissionById(String(params.progress.activeMissionId), extras)
      : null;

  const completedCount = Number(params.progress.completedCount || 0);
  const revealed = Boolean(params.assignment?.revealedAt || params.assignment?.status === "revealed");
  const giveawayVisible =
    giveawayEntitled &&
    settings.giveaway.enabled &&
    (Boolean(params.progress.giveawayRevealedAt) ||
      shouldRevealGiveaway({ settings, completedCount }));

  const giveaway = giveawayPublicCopy({
    settings: {
      ...settings,
      giveaway: { ...settings.giveaway, enabled: giveawayEntitled && settings.giveaway.enabled },
    },
    completedCount,
    entries: Number(params.progress.giveawayEntries || 0),
    revealed: giveawayVisible,
  });

  const coupleNames = String(params.invitation?.title || params.event?.title || "").trim();
  const screen = liveScreen({
    settings,
    entitled,
    enabled: settings.enabled,
    completedCount,
    maxMissions,
    hasActive: Boolean(mission),
    revealed,
    winnerName: settings.giveaway.winnerName,
    giveawayJustRevealed: Boolean(params.giveawayJustRevealed),
  });
  const finalScreen =
    params.justCompleted && screen !== "giveaway_revealed" && screen !== "max_reached"
      ? "completed"
      : screen;

  logGameWindowDecision({
    eventId: String(params.event?._id || ""),
    sourceType: params.sourceType || "",
    entitled,
    enabled: settings.enabled,
    startAt: settings.startAt,
    endAt: settings.endAt,
    timezone: settings.sms.timezone,
    eventDate: params.event?.date,
    screen: finalScreen,
  });

  return {
    success: true,
    screen: finalScreen,
    coupleNames,
    guestName: String(params.invitationGuest?.name || ""),
    completedCount,
    maxMissions,
    skipEnabled: settings.skipEnabled && Number(params.progress.skipCount || 0) < settings.maxSkipsPerGuest,
    skipRemaining: Math.max(
      0,
      settings.maxSkipsPerGuest - Number(params.progress.skipCount || 0)
    ),
    mission: revealed || screen === "mission_revealed" ? publicMission(mission) : mission
      ? {
          id: mission.id,
          category: mission.category,
          categoryLabel: CATEGORY_LABELS[mission.category],
          text: "",
          hint: "",
          boss: mission.boss,
          requiresAlcohol: false,
          hidden: true,
        }
      : null,
    giveaway,
    winner: settings.giveaway.winnerName
      ? {
          name: settings.giveaway.winnerName,
          prizeText: settings.giveaway.prizeText,
        }
      : null,
  };
}

export async function assignNextMissionForGuest(params: {
  eventId: string;
  invitationId: string;
  invitationGuest: any;
  settings: WeddingChallengeSettings;
  forceNew?: boolean;
  createIfMissing?: boolean;
}) {
  const progress = await ensureProgress(params);
  const maxMissions = Math.min(
    MAX_MISSIONS_PER_GUEST,
    Number(params.settings.maxMissionsPerGuest || MAX_MISSIONS_PER_GUEST)
  );

  if (Number(progress.completedCount || 0) >= maxMissions) {
    return { progress, assignment: null, reason: "max_reached" as const };
  }

  if (progress.activeAssignmentId && !params.forceNew) {
    const current = await WeddingChallengeAssignment.findById(progress.activeAssignmentId);
    if (current && ["assigned", "revealed"].includes(current.status)) {
      return { progress, assignment: current, reason: "existing" as const };
    }
  }

  if (params.createIfMissing === false) {
    return { progress, assignment: null, reason: "none_eligible" as const };
  }

  const snapshot = await tableSnapshot({
    eventId: params.eventId,
    invitationId: params.invitationId,
    tableId: tableKey(params.invitationGuest.tableId),
    settings: params.settings,
  });

  const [recentGuest, missions] = await Promise.all([
    WeddingChallengeAssignment.find({
      eventId: params.eventId,
      guestId: progress.guestId,
    })
      .sort({ assignedAt: -1 })
      .limit(5)
      .select("category")
      .lean(),
    loadMissionsForEvent(params.eventId),
  ]);

  let chosen: MissionDefinition | null = null;
  let attempts = 0;
  const extraExcluded: string[] = [];

  while (attempts < 4) {
    const result = assignWeddingChallengeMission({
      guest: {
        ...assignmentGuestFromDoc(progress),
        recentCategories: recentGuest.map((row) => row.category),
        completedMissionIds: [
          ...assignmentGuestFromDoc(progress).completedMissionIds,
          ...extraExcluded,
        ],
      },
      table: {
        ...snapshot,
        activeMissionIds: [...snapshot.activeMissionIds, ...extraExcluded],
      },
      settings: params.settings,
      missions,
    });
    chosen = result.mission;
    if (!chosen) break;

    const clash = snapshot.tableAware
      ? await WeddingChallengeAssignment.findOne({
          eventId: params.eventId,
          tableId: snapshot.tableId,
          missionId: chosen.id,
          status: { $in: ["assigned", "revealed"] },
        }).lean()
      : null;

    if (!clash) break;
    extraExcluded.push(chosen.id);
    attempts += 1;
    chosen = null;
  }

  if (!chosen) {
    progress.activeMissionId = null;
    progress.activeAssignmentId = null;
    await progress.save();
    return { progress, assignment: null, reason: "none_eligible" as const };
  }

  const assignment = await WeddingChallengeAssignment.create({
    eventId: params.eventId,
    invitationId: params.invitationId,
    guestId: progress.guestId,
    tableId: snapshot.tableId,
    missionId: chosen.id,
    category: chosen.category,
    status: "assigned",
    assignedAt: new Date(),
    boss: chosen.boss,
  });

  progress.activeMissionId = chosen.id;
  progress.activeAssignmentId = assignment._id;
  progress.lastAssignedAt = new Date();
  progress.tableId = snapshot.tableId;
  await progress.save();
  await incrementCustomAssignment(chosen.id);

  return { progress, assignment, reason: "assigned" as const, mission: chosen };
}

export async function revealActiveMission(progress: any) {
  if (!progress.activeAssignmentId) return null;
  const assignment = await WeddingChallengeAssignment.findById(progress.activeAssignmentId);
  if (!assignment) return null;
  if (!assignment.revealedAt) {
    assignment.revealedAt = new Date();
    assignment.status = "revealed";
    await assignment.save();
  }
  return assignment;
}

export async function completeActiveMission(params: {
  progress: any;
  settings: WeddingChallengeSettings;
  giveawayEntitled: boolean;
}) {
  if (!params.progress.activeAssignmentId) return { assignment: null, giveawayJustRevealed: false };
  const assignment = await WeddingChallengeAssignment.findById(params.progress.activeAssignmentId);
  if (!assignment || !["assigned", "revealed"].includes(assignment.status)) {
    return { assignment: null, giveawayJustRevealed: false };
  }

  const extras = await loadCustomMissionDefinitions(String(params.progress.eventId));
  const mission = getMissionById(String(assignment.missionId), extras);
  const awarded =
    params.giveawayEntitled &&
    params.settings.giveaway.enabled &&
    giveawayEntriesOpen(params.settings)
      ? entriesAwardedForCompletion({
          settings: params.settings,
          boss: Boolean(mission?.boss || assignment.boss),
        })
      : 0;

  assignment.status = "completed";
  assignment.completedAt = new Date();
  assignment.giveawayEntriesAwarded = awarded;
  await assignment.save();

  const completedIds = new Set(
    (params.progress.completedMissionIds || []).map(String)
  );
  completedIds.add(String(assignment.missionId));

  params.progress.completedMissionIds = [...completedIds];
  params.progress.completedCount = Math.min(
    MAX_MISSIONS_PER_GUEST,
    Number(params.progress.completedCount || 0) + 1
  );
  params.progress.lastMissionCategory = assignment.category;
  params.progress.lastCompletedAt = new Date();
  params.progress.activeMissionId = null;
  params.progress.activeAssignmentId = null;
  if (awarded > 0) {
    const max = params.settings.giveaway.maxEntriesPerGuest;
    const next = Number(params.progress.giveawayEntries || 0) + awarded;
    params.progress.giveawayEntries = max ? Math.min(max, next) : next;
  }

  const shouldReveal =
    params.giveawayEntitled &&
    params.settings.giveaway.enabled &&
    shouldRevealGiveaway({
      settings: params.settings,
      completedCount: params.progress.completedCount,
    });
  const giveawayJustRevealed = shouldReveal && !params.progress.giveawayRevealedAt;
  if (shouldReveal && !params.progress.giveawayRevealedAt) {
    params.progress.giveawayRevealedAt = new Date();
  }

  await params.progress.save();
  return { assignment, giveawayJustRevealed };
}

export async function skipActiveMission(params: {
  progress: any;
  settings: WeddingChallengeSettings;
}) {
  if (!params.settings.skipEnabled) return { ok: false as const, reason: "disabled" };
  if (Number(params.progress.skipCount || 0) >= params.settings.maxSkipsPerGuest) {
    return { ok: false as const, reason: "limit" };
  }
  if (!params.progress.activeAssignmentId) return { ok: false as const, reason: "none" };

  const assignment = await WeddingChallengeAssignment.findById(params.progress.activeAssignmentId);
  if (!assignment) return { ok: false as const, reason: "none" };

  assignment.status = "skipped";
  assignment.skippedAt = new Date();
  await assignment.save();

  const skipped = new Set((params.progress.skippedMissionIds || []).map(String));
  skipped.add(String(assignment.missionId));
  params.progress.skippedMissionIds = [...skipped];
  params.progress.skipCount = Number(params.progress.skipCount || 0) + 1;
  params.progress.activeMissionId = null;
  params.progress.activeAssignmentId = null;
  await params.progress.save();

  return { ok: true as const, assignment };
}

export function objectIdOrNull(value: unknown) {
  const text = String(value || "").trim();
  if (!text || !mongoose.Types.ObjectId.isValid(text)) return null;
  return new mongoose.Types.ObjectId(text);
}

export { idOf, tableKey, publicMission, attendingGuestMongoFilter };
