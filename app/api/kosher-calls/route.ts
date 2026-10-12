import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import { listActiveKosherPrefixRules } from "@/lib/kosherPhones/service";
import {
  KOSHER_MESSAGE_ROUND_ORIGIN,
  summarizeKosherAttempts,
  type KosherRoundNumber,
} from "@/lib/kosherPhones/match";
import {
  describeKosherNarration,
  ensureKosherNarration,
} from "@/lib/kosherPhones/narration";
import { retryFailedKosherCalls } from "@/lib/kosherPhones/dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadOwnedInvitation(userId: string, invitationId: string) {
  const invitation = await Invitation.findById(invitationId).lean();
  if (!invitation) return null;
  const ownerId = String(invitation.ownerId || invitation.userId || "");
  if (ownerId !== userId) return null;
  return invitation;
}

function disabled() {
  return NextResponse.json({ success: true, enabled: false });
}

export async function GET(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const invitationId = String(req.nextUrl.searchParams.get("invitationId") || "").trim();
    if (!invitationId) {
      return NextResponse.json({ success: false, error: "INVITATION_REQUIRED" }, { status: 400 });
    }

    const invitation = await loadOwnedInvitation(String(auth.userId), invitationId);
    if (!invitation) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const user = await User.findById(invitation.ownerId || auth.userId)
      .select("kosherRecordedCallsEnabled ivrConfig")
      .lean();
    if (user?.kosherRecordedCallsEnabled !== true) return disabled();

    const narration = describeKosherNarration({ invitation, user });
    const prefixes = await listActiveKosherPrefixRules();
    const attempts = await IvrCallAttempt.find({
      invitationId,
      origin: KOSHER_MESSAGE_ROUND_ORIGIN,
    })
      .select("round status answered rsvpResult rsvpApplied error")
      .lean();

    const rounds = {
      1: summarizeKosherAttempts(attempts.filter((row) => Number(row.round) === 1)),
      2: summarizeKosherAttempts(attempts.filter((row) => Number(row.round) === 2)),
      3: summarizeKosherAttempts(attempts.filter((row) => Number(row.round) === 3)),
    };

    return NextResponse.json({
      success: true,
      enabled: true,
      customName: String(invitation.kosherCallEventName || ""),
      spokenName: narration.spokenName,
      speechSource: narration.source,
      script: narration.script,
      audioUrl: narration.introAudioUrl,
      audioReady: narration.ready,
      audioError: narration.error,
      prefixes: prefixes.map((row) => row.prefix),
      rounds,
    });
  } catch (error) {
    console.error("kosher calls status failed", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const invitationId = String(body.invitationId || "").trim();
    const invitation = await loadOwnedInvitation(String(auth.userId), invitationId);
    if (!invitation) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const user = await User.findById(invitation.ownerId || auth.userId)
      .select("kosherRecordedCallsEnabled ivrConfig")
      .lean();
    if (user?.kosherRecordedCallsEnabled !== true) return disabled();

    const customName = String(body.kosherCallEventName ?? "").trim().slice(0, 120);
    await Invitation.updateOne(
      { _id: invitation._id },
      { $set: { kosherCallEventName: customName } }
    );
    const fresh = await Invitation.findById(invitation._id).lean();
    const narration = describeKosherNarration({ invitation: fresh, user });

    return NextResponse.json({
      success: true,
      enabled: true,
      customName,
      spokenName: narration.spokenName,
      script: narration.script,
      audioUrl: narration.introAudioUrl,
      audioReady: narration.ready,
      invitationTitle: String(fresh?.title || ""),
    });
  } catch (error) {
    console.error("kosher event name update failed", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const invitationId = String(body.invitationId || "").trim();
    const invitation = await loadOwnedInvitation(String(auth.userId), invitationId);
    if (!invitation) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const user = await User.findById(invitation.ownerId || auth.userId).lean();
    if (user?.kosherRecordedCallsEnabled !== true) return disabled();

    if (body.action === "retry") {
      const round = Number(body.round);
      if (round !== 1 && round !== 2 && round !== 3) {
        return NextResponse.json({ success: false, error: "ROUND_REQUIRED" }, { status: 400 });
      }
      const result = await retryFailedKosherCalls({
        invitationId,
        round: round as KosherRoundNumber,
        user,
        invitation,
      });
      return NextResponse.json({ success: result.ok, ...result });
    }

    const narration = await ensureKosherNarration({ invitation, user });
    return NextResponse.json({
      success: true,
      enabled: true,
      script: narration.script,
      spokenName: narration.spokenName,
      audioUrl: narration.introAudioUrl,
      audioReady: narration.ready,
      audioError: narration.ready ? "" : narration.error || "NARRATION_UNAVAILABLE",
    });
  } catch (error) {
    console.error("kosher narration prepare failed", error);
    return NextResponse.json(
      {
        success: false,
        audioReady: false,
        audioError: error instanceof Error ? error.message : "NARRATION_UNAVAILABLE",
      },
      { status: 500 }
    );
  }
}
