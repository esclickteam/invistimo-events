import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  recentDeletionRuns,
  runDryEventDeletion,
  scanEventDeletion,
  setDeletionHold,
  setEmergencyStop,
} from "@/lib/customers/eventDeletionRun";
import { liveDeletionPermitted } from "@/lib/customers/eventDeletionPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) return null;
  return auth;
}

function grouped(accounts: Awaited<ReturnType<typeof scanEventDeletion>>["accounts"]) {
  const rows = accounts.flatMap((account) =>
    account.events.map((event) => ({
      userId: account.userId,
      customerName: account.customerName,
      eventId: event.eventId,
      eventTitle: event.eventTitle,
      eventDate: event.eventDate,
      plannedDeletionAt: event.plannedDeletionAt,
      reminderRoundComplete: event.reminderRoundComplete,
      thankYouClear: event.thankYouClear,
      openWorkCount: event.openWork.length,
      bucket: event.bucket,
      eligible: event.eligible && event.bucket !== "future",
      reasons: [
        ...event.reasons,
        ...account.reasons.filter(
          (reason) => reason === "RETROACTIVE_HOLD" || reason === "OTHER_FUTURE_EVENT"
        ),
      ],
      accountDeletable: account.accountDeletable,
    }))
  );
  const take = (bucket: string) => rows.filter((row) => row.bucket === bucket && !(bucket !== "future" && row.reasons.includes("FUTURE_EVENT") && row.eligible));
  return {
    future: rows.filter((row) => row.bucket === "future"),
    active: take("active"),
    waiting: take("waiting"),
    eligible: rows.filter((row) => row.bucket === "eligible" && !row.reasons.includes("FUTURE_EVENT")),
    blocked: take("blocked"),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "אין הרשאה" }, { status: 403 });
  }
  await connectDB();
  const scanned = await scanEventDeletion();
  const runs = await recentDeletionRuns(15);
  return NextResponse.json({
    success: true,
    mode: "dry_run",
    liveDeletionEnabled: liveDeletionPermitted(),
    emergencyStop: scanned.control.emergencyStop,
    anomaly: scanned.batch.anomaly,
    groups: grouped(scanned.accounts),
    runs: runs.map((run) => ({
      id: String(run._id),
      mode: run.mode,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      emergencyStop: run.emergencyStop,
      anomaly: run.anomaly,
      eligibleAccounts: run.eligibleAccounts,
      executed: run.executed,
      entryCount: Array.isArray(run.entries) ? run.entries.length : 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "אין הרשאה" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  if (action === "execute" || action === "delete" || body?.execute === true) {
    return NextResponse.json(
      { success: false, error: "LIVE_DELETION_DISABLED", mode: "dry_run" },
      { status: 403 }
    );
  }

  await connectDB();
  if (action === "dry_run") {
    const result = await runDryEventDeletion();
    return NextResponse.json({
      success: true,
      mode: "dry_run",
      liveDeletionEnabled: false,
      executed: result.executed,
      emergencyStop: result.emergencyStop,
      anomaly: result.anomaly,
      runId: result.runId,
      groups: grouped(result.accounts),
    });
  }
  if (action === "emergency_stop") {
    const state = await setEmergencyStop(body?.stopped !== false);
    return NextResponse.json({ success: true, ...state });
  }
  if (action === "exempt" || action === "dispute" || action === "waive_failure") {
    await setDeletionHold({
      userId: body?.userId ? String(body.userId) : undefined,
      eventId: body?.eventId ? String(body.eventId) : undefined,
      exempt: action === "exempt" ? body?.value !== false : undefined,
      disputeOpen: action === "dispute" ? body?.value !== false : undefined,
      waiveFailure: action === "waive_failure" ? body?.value !== false : undefined,
    });
    return NextResponse.json({ success: true, mode: "dry_run", liveDeletionEnabled: false });
  }
  return NextResponse.json({ success: false, error: "UNKNOWN_ACTION" }, { status: 400 });
}
