import { NextResponse } from "next/server";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import { CATEGORY_LABELS, CATEGORY_SHORT_LABELS } from "@/lib/weddingChallenges/constants";
import {
  createCustomMission,
  deleteCustomMission,
  loadCustomMissionDefinitions,
  updateCustomMission,
} from "@/lib/weddingChallenges/customMissions";
import { WEDDING_CHALLENGE_MISSIONS } from "@/lib/weddingChallenges/missionBank";
import { loadEventChallengeContext } from "@/lib/weddingChallenges/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function eventIdFrom(req: Request, body?: any) {
  if (body?.eventId) return String(body.eventId || "").trim();
  return String(new URL(req.url).searchParams.get("eventId") || "").trim();
}

function missionErrorStatus(error: string) {
  if (error === "TEXT_REQUIRED") return 400;
  if (error === "TABLES_REQUIRED" || error === "GUESTS_REQUIRED" || error === "COUNT_REQUIRED") {
    return 400;
  }
  return 400;
}

export async function GET(req: Request) {
  const eventId = eventIdFrom(req);
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  const context = await loadEventChallengeContext(eventId);
  if (!context) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const custom = await loadCustomMissionDefinitions(eventId);
  const defaults = WEDDING_CHALLENGE_MISSIONS.map((mission) => ({
    id: mission.id,
    category: mission.category,
    categoryLabel: CATEGORY_LABELS[mission.category],
    text: mission.text,
    difficulty: mission.difficulty,
    requiresAlcohol: mission.requiresAlcohol,
    boss: mission.boss,
    minPeople: mission.minPeople,
    tableBased: mission.tableBased,
    source: "default" as const,
    readOnly: true,
  }));

  return NextResponse.json({
    success: true,
    eventId,
    custom,
    defaults,
    defaultCount: defaults.length,
    categories: Object.entries(CATEGORY_SHORT_LABELS).map(([key, label]) => ({
      key,
      label,
    })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eventId = eventIdFrom(req, body);
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  try {
    const mission = await createCustomMission({
      eventId,
      invitationId: String(context.invitation._id),
      sourceType: context.sourceType,
      input: body.mission || body,
    });
    return NextResponse.json({ success: true, mission });
  } catch (error: any) {
    const code = String(error?.code || error?.message || "SAVE_FAILED");
    return NextResponse.json({ success: false, error: code }, { status: missionErrorStatus(code) });
  }
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eventId = eventIdFrom(req, body);
  const missionKey = String(body.missionKey || body.id || "").trim();
  if (!eventId || !missionKey) {
    return NextResponse.json({ success: false, error: "MISSION_REQUIRED" }, { status: 400 });
  }
  if (!missionKey.startsWith("custom-")) {
    return NextResponse.json({ success: false, error: "DEFAULT_MISSIONS_READONLY" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  try {
    const mission = await updateCustomMission({
      eventId,
      invitationId: String(context.invitation._id),
      sourceType: context.sourceType,
      missionKey,
      input: body.mission || body,
      retargetRandom: body.retargetRandom === true,
    });
    if (!mission) {
      return NextResponse.json({ success: false, error: "MISSION_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ success: true, mission });
  } catch (error: any) {
    const code = String(error?.code || error?.message || "SAVE_FAILED");
    return NextResponse.json({ success: false, error: code }, { status: missionErrorStatus(code) });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId || url.searchParams.get("eventId") || "").trim();
  const missionKey = String(body.missionKey || body.id || url.searchParams.get("missionKey") || "").trim();
  if (!eventId || !missionKey) {
    return NextResponse.json({ success: false, error: "MISSION_REQUIRED" }, { status: 400 });
  }
  if (!missionKey.startsWith("custom-")) {
    return NextResponse.json({ success: false, error: "DEFAULT_MISSIONS_READONLY" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  const result = await deleteCustomMission({ eventId, missionKey });
  if (!result) {
    return NextResponse.json({ success: false, error: "MISSION_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ success: true, ...result });
}
