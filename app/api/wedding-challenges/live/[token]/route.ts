import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  assignNextMissionForGuest,
  buildLivePayload,
  completeActiveMission,
  loadLiveGuestByToken,
  revealActiveMission,
  skipActiveMission,
} from "@/lib/weddingChallenges/service";
import { gameWindowState } from "@/lib/weddingChallenges/settings";
import { userHasWeddingChallengesGiveawayEntitlement } from "@/lib/weddingChallenges/entitlement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  await db();
  const live = await loadLiveGuestByToken(token);
  if (!live) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }

  if (!live.entitled || !live.settings.enabled) {
    return NextResponse.json(
      await buildLivePayload({
        ...live,
        progress: {
          completedCount: 0,
          giveawayEntries: 0,
          skipCount: 0,
        },
      })
    );
  }

  const window = gameWindowState(live.settings);
  let assigned = {
    progress: { completedCount: 0 } as any,
    assignment: null as any,
  };

  if (window === "active") {
    assigned = await assignNextMissionForGuest({
      eventId: String(live.event._id),
      invitationId: String(live.invitation._id),
      invitationGuest: live.invitationGuest,
      settings: live.settings,
      createIfMissing: false,
    });

    const needsFirstCard =
      !assigned.assignment && Number(assigned.progress.completedCount || 0) === 0;
    const canAutoDeal = live.settings.pacingMode !== "admin";

    if (needsFirstCard || canAutoDeal) {
      assigned = await assignNextMissionForGuest({
        eventId: String(live.event._id),
        invitationId: String(live.invitation._id),
        invitationGuest: live.invitationGuest,
        settings: live.settings,
      });
    }
  }

  return NextResponse.json(
    await buildLivePayload({
      ...live,
      progress: assigned.progress,
      assignment: assigned.assignment,
    })
  );
}

export async function POST(req: Request, context: RouteContext) {
  const { token } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  await db();
  const live = await loadLiveGuestByToken(token);
  if (!live) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }

  if (!live.entitled || !live.settings.enabled || gameWindowState(live.settings) !== "active") {
    return NextResponse.json({ success: false, error: "GAME_CLOSED" }, { status: 400 });
  }

  const current = await assignNextMissionForGuest({
    eventId: String(live.event._id),
    invitationId: String(live.invitation._id),
    invitationGuest: live.invitationGuest,
    settings: live.settings,
    createIfMissing: false,
  });

  if (action === "scratch") {
    const assignment = await revealActiveMission(current.progress);
    return NextResponse.json(
      await buildLivePayload({
        ...live,
        progress: current.progress,
        assignment,
      })
    );
  }

  if (action === "complete") {
    const result = await completeActiveMission({
      progress: current.progress,
      settings: live.settings,
      giveawayEntitled: userHasWeddingChallengesGiveawayEntitlement(live.owner),
    });

    let next = { progress: current.progress, assignment: null as any };
    if (live.settings.pacingMode === "immediate") {
      next = await assignNextMissionForGuest({
        eventId: String(live.event._id),
        invitationId: String(live.invitation._id),
        invitationGuest: live.invitationGuest,
        settings: live.settings,
        forceNew: true,
      });
    }

    return NextResponse.json(
      await buildLivePayload({
        ...live,
        progress: next.progress,
        assignment: next.assignment,
        justCompleted: true,
        giveawayJustRevealed: result.giveawayJustRevealed,
      })
    );
  }

  if (action === "next") {
    if (live.settings.pacingMode === "admin") {
      return NextResponse.json({ success: false, error: "ADMIN_RELEASE_REQUIRED" }, { status: 400 });
    }
    const next = await assignNextMissionForGuest({
      eventId: String(live.event._id),
      invitationId: String(live.invitation._id),
      invitationGuest: live.invitationGuest,
      settings: live.settings,
      forceNew: true,
    });
    return NextResponse.json(
      await buildLivePayload({
        ...live,
        progress: next.progress,
        assignment: next.assignment,
      })
    );
  }

  if (action === "skip") {
    const skipped = await skipActiveMission({
      progress: current.progress,
      settings: live.settings,
    });
    if (!skipped.ok) {
      return NextResponse.json({ success: false, error: skipped.reason }, { status: 400 });
    }
    const next = await assignNextMissionForGuest({
      eventId: String(live.event._id),
      invitationId: String(live.invitation._id),
      invitationGuest: live.invitationGuest,
      settings: live.settings,
      forceNew: true,
    });
    return NextResponse.json(
      await buildLivePayload({
        ...live,
        progress: next.progress,
        assignment: next.assignment,
      })
    );
  }

  return NextResponse.json({ success: false, error: "UNKNOWN_ACTION" }, { status: 400 });
}
