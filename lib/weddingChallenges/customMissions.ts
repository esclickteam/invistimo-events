import { nanoid } from "nanoid";
import InvitationGuest from "@/models/InvitationGuest";
import WeddingChallengeAssignment from "@/models/WeddingChallengeAssignment";
import WeddingChallengeMission from "@/models/WeddingChallengeMission";
import { WEDDING_CHALLENGE_MISSIONS } from "./missionBank";
import { attendingGuestMongoFilter } from "./sourceType";
import type {
  CustomMissionTargeting,
  CustomMissionTargetingType,
  MissionCategory,
  MissionDefinition,
  MissionDifficulty,
  WeddingChallengesSourceType,
} from "./types";

const CATEGORIES: MissionCategory[] = [
  "dancefloor",
  "shots",
  "table",
  "chaos",
  "cheeky",
  "boss",
];

function asCategory(value: unknown): MissionCategory {
  const raw = String(value || "");
  return CATEGORIES.includes(raw as MissionCategory) ? (raw as MissionCategory) : "chaos";
}

function asDifficulty(value: unknown): MissionDifficulty {
  return value === "easy" || value === "hard" ? value : "medium";
}

function asTargetingType(value: unknown): CustomMissionTargetingType {
  if (
    value === "RANDOM_GUESTS" ||
    value === "SPECIFIC_TABLES" ||
    value === "SPECIFIC_GUESTS"
  ) {
    return value;
  }
  return "ALL_ELIGIBLE_GUESTS";
}

export function serializeCustomMission(doc: any): MissionDefinition & {
  targeting: CustomMissionTargeting;
  custom: true;
} {
  const targetingType = asTargetingType(doc.targetingType);
  const guestIds = Array.isArray(doc.targetingGuestIds)
    ? doc.targetingGuestIds.map(String)
    : [];
  const tableIds = Array.isArray(doc.targetingTableIds)
    ? doc.targetingTableIds.map(String)
    : [];

  return {
    id: String(doc.missionKey || doc.id),
    category: asCategory(doc.category),
    text: String(doc.text || "").trim(),
    difficulty: asDifficulty(doc.difficulty),
    requiresAlcohol: doc.requiresAlcohol === true || doc.category === "shots",
    minPeople: Number(doc.minPeople || 2),
    maxPeople: doc.maxPeople == null ? null : Number(doc.maxPeople),
    tableBased: doc.tableBased === true,
    cooldownWeight: Number(doc.cooldownWeight || 1),
    boss: doc.boss === true || doc.category === "boss",
    minTables: 0,
    hint: String(doc.hint || ""),
    active: doc.active !== false,
    source: "custom",
    weight: Number(doc.weight || 10),
    maxAssignments: doc.maxAssignments == null ? null : Number(doc.maxAssignments),
    assignedCount: Number(doc.assignedCount || 0),
    allowedGuestIds:
      targetingType === "SPECIFIC_GUESTS" || targetingType === "RANDOM_GUESTS"
        ? guestIds
        : null,
    allowedTableIds: targetingType === "SPECIFIC_TABLES" ? tableIds : null,
    custom: true,
    targeting: {
      type: targetingType,
      count: doc.targetingCount == null ? undefined : Number(doc.targetingCount),
      tableIds,
      guestIds,
    },
  };
}

export async function loadCustomMissionDefinitions(eventId: string): Promise<MissionDefinition[]> {
  const custom = await WeddingChallengeMission.find({ eventId }).lean();
  return custom.map((row) => serializeCustomMission(row));
}

export async function loadMissionsForEvent(eventId: string): Promise<MissionDefinition[]> {
  const custom = await loadCustomMissionDefinitions(eventId);
  return [
    ...WEDDING_CHALLENGE_MISSIONS.map((mission) => ({ ...mission, source: "default" as const })),
    ...custom,
  ];
}

export async function resolveTargetingGuestIds(params: {
  invitationId: string;
  sourceType: WeddingChallengesSourceType;
  targeting: CustomMissionTargeting;
}) {
  if (params.targeting.type === "SPECIFIC_GUESTS") {
    return (params.targeting.guestIds || []).map(String);
  }
  if (params.targeting.type !== "RANDOM_GUESTS") return [];
  const count = Math.max(1, Number(params.targeting.count || 1));
  const guests = await InvitationGuest.find({
    invitationId: params.invitationId,
    phone: { $exists: true, $nin: ["", null] },
    ...attendingGuestMongoFilter(params.sourceType),
  })
    .select("_id")
    .lean();
  const shuffled = [...guests].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((guest) => String(guest._id));
}

export function validateCustomMissionInput(input: Record<string, unknown>) {
  const text = String(input.text || "").trim();
  if (text.length < 4) {
    return { ok: false as const, error: "TEXT_REQUIRED" };
  }
  const targetingType = asTargetingType(input.targetingType || (input.targeting as any)?.type);
  const tableIds = (((input.targeting as any)?.tableIds || input.targetingTableIds || []) as unknown[])
    .map(String)
    .filter(Boolean);
  const guestIds = (((input.targeting as any)?.guestIds || input.targetingGuestIds || []) as unknown[])
    .map(String)
    .filter(Boolean);
  const count = Number((input.targeting as any)?.count ?? input.targetingCount ?? 0);
  if (targetingType === "SPECIFIC_TABLES" && tableIds.length === 0) {
    return { ok: false as const, error: "TABLES_REQUIRED" };
  }
  if (targetingType === "SPECIFIC_GUESTS" && guestIds.length === 0) {
    return { ok: false as const, error: "GUESTS_REQUIRED" };
  }
  if (targetingType === "RANDOM_GUESTS" && (!Number.isFinite(count) || count < 1)) {
    return { ok: false as const, error: "COUNT_REQUIRED" };
  }
  return { ok: true as const };
}

function targetingFromInput(input: Record<string, unknown>): CustomMissionTargeting {
  const targetingType = asTargetingType(input.targetingType || (input.targeting as any)?.type);
  return {
    type: targetingType,
    count: Number((input.targeting as any)?.count ?? input.targetingCount ?? 0) || undefined,
    tableIds: ((input.targeting as any)?.tableIds || input.targetingTableIds || []) as string[],
    guestIds: ((input.targeting as any)?.guestIds || input.targetingGuestIds || []) as string[],
  };
}

export async function createCustomMission(params: {
  eventId: string;
  invitationId: string;
  sourceType: WeddingChallengesSourceType;
  input: Record<string, unknown>;
}) {
  const valid = validateCustomMissionInput(params.input);
  if (!valid.ok) {
    throw Object.assign(new Error(valid.error), { code: valid.error });
  }

  const targeting = targetingFromInput(params.input);
  const targetingType = targeting.type;
  if (targetingType === "RANDOM_GUESTS") {
    targeting.guestIds = await resolveTargetingGuestIds({
      invitationId: params.invitationId,
      sourceType: params.sourceType,
      targeting,
    });
  }

  const category = asCategory(params.input.category);
  const doc = await WeddingChallengeMission.create({
    eventId: params.eventId,
    missionKey: `custom-${nanoid(10)}`,
    text: String(params.input.text || "").trim(),
    category,
    difficulty: asDifficulty(params.input.difficulty),
    requiresAlcohol: params.input.requiresAlcohol === true || category === "shots",
    boss: params.input.boss === true || category === "boss",
    minPeople: Number(params.input.minPeople || 2),
    maxPeople: params.input.maxPeople == null || params.input.maxPeople === "" ? null : Number(params.input.maxPeople),
    tableBased: params.input.tableBased === true,
    active: params.input.active !== false,
    weight: Math.min(100, Math.max(1, Number(params.input.weight || 10))),
    cooldownWeight: category === "boss" || params.input.boss ? 4 : 1,
    maxAssignments:
      params.input.maxAssignments == null || params.input.maxAssignments === ""
        ? null
        : Number(params.input.maxAssignments),
    hint: String(params.input.hint || "").trim(),
    targetingType,
    targetingCount: targeting.count ?? null,
    targetingTableIds: targeting.tableIds || [],
    targetingGuestIds: targeting.guestIds || [],
  });
  return serializeCustomMission(doc);
}

export async function updateCustomMission(params: {
  eventId: string;
  invitationId: string;
  sourceType: WeddingChallengesSourceType;
  missionKey: string;
  input: Record<string, unknown>;
  retargetRandom?: boolean;
}) {
  const doc = await WeddingChallengeMission.findOne({
    eventId: params.eventId,
    missionKey: params.missionKey,
  });
  if (!doc) return null;

  const merged: Record<string, unknown> = {
    text: params.input.text ?? doc.text,
    category: params.input.category ?? doc.category,
    difficulty: params.input.difficulty ?? doc.difficulty,
    requiresAlcohol: params.input.requiresAlcohol ?? doc.requiresAlcohol,
    boss: params.input.boss ?? doc.boss,
    minPeople: params.input.minPeople ?? doc.minPeople,
    maxPeople: params.input.maxPeople ?? doc.maxPeople,
    tableBased: params.input.tableBased ?? doc.tableBased,
    active: params.input.active ?? doc.active,
    weight: params.input.weight ?? doc.weight,
    maxAssignments: params.input.maxAssignments ?? doc.maxAssignments,
    hint: params.input.hint ?? doc.hint,
    targetingType: params.input.targetingType ?? (params.input.targeting as any)?.type ?? doc.targetingType,
    targetingCount: (params.input.targeting as any)?.count ?? params.input.targetingCount ?? doc.targetingCount,
    targetingTableIds: (params.input.targeting as any)?.tableIds ?? params.input.targetingTableIds ?? doc.targetingTableIds,
    targetingGuestIds: (params.input.targeting as any)?.guestIds ?? params.input.targetingGuestIds ?? doc.targetingGuestIds,
  };

  const valid = validateCustomMissionInput(merged);
  if (!valid.ok) {
    throw Object.assign(new Error(valid.error), { code: valid.error });
  }

  const targeting = targetingFromInput(merged);
  const targetingType = targeting.type;
  const shouldRetarget =
    targetingType === "RANDOM_GUESTS" &&
    (params.retargetRandom ||
      doc.targetingType !== "RANDOM_GUESTS" ||
      Number(doc.targetingCount || 0) !== Number(targeting.count || 0));

  if (shouldRetarget) {
    targeting.guestIds = await resolveTargetingGuestIds({
      invitationId: params.invitationId,
      sourceType: params.sourceType,
      targeting,
    });
  } else if (targetingType === "RANDOM_GUESTS") {
    targeting.guestIds = Array.isArray(doc.targetingGuestIds)
      ? doc.targetingGuestIds.map(String)
      : [];
  }

  const category = asCategory(merged.category);
  doc.text = String(merged.text || "").trim();
  doc.category = category;
  doc.difficulty = asDifficulty(merged.difficulty);
  doc.requiresAlcohol = merged.requiresAlcohol === true || category === "shots";
  doc.boss = merged.boss === true || category === "boss";
  doc.minPeople = Number(merged.minPeople || 2);
  doc.maxPeople =
    merged.maxPeople == null || merged.maxPeople === "" ? null : Number(merged.maxPeople);
  doc.tableBased = merged.tableBased === true;
  doc.active = merged.active !== false;
  doc.weight = Math.min(100, Math.max(1, Number(merged.weight || 10)));
  doc.cooldownWeight = category === "boss" || merged.boss ? 4 : 1;
  doc.maxAssignments =
    merged.maxAssignments == null || merged.maxAssignments === ""
      ? null
      : Number(merged.maxAssignments);
  doc.hint = String(merged.hint || "").trim();
  doc.targetingType = targetingType;
  doc.targetingCount = targeting.count ?? null;
  doc.targetingTableIds = targeting.tableIds || [];
  doc.targetingGuestIds = targeting.guestIds || [];
  await doc.save();
  return serializeCustomMission(doc);
}

export async function deleteCustomMission(params: { eventId: string; missionKey: string }) {
  const assigned = await WeddingChallengeAssignment.countDocuments({
    eventId: params.eventId,
    missionId: params.missionKey,
  });
  if (assigned > 0) {
    const doc = await WeddingChallengeMission.findOneAndUpdate(
      { eventId: params.eventId, missionKey: params.missionKey },
      { $set: { active: false } },
      { new: true }
    );
    return doc ? { ok: true as const, disabled: true as const, mission: serializeCustomMission(doc) } : null;
  }
  const deleted = await WeddingChallengeMission.findOneAndDelete({
    eventId: params.eventId,
    missionKey: params.missionKey,
  });
  return deleted ? { ok: true as const, deleted: true as const } : null;
}

export async function incrementCustomAssignment(missionId: string) {
  if (!String(missionId || "").startsWith("custom-")) return;
  await WeddingChallengeMission.updateOne(
    { missionKey: missionId },
    { $inc: { assignedCount: 1 } }
  );
}

export async function countAssignments(eventId: string, missionId: string) {
  return WeddingChallengeAssignment.countDocuments({
    eventId,
    missionId,
    status: { $in: ["assigned", "revealed", "completed"] },
  });
}
