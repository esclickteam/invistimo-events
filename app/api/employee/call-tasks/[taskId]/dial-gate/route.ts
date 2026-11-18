import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import CallTask from "@/models/CallTask";
import CallAttempt from "@/models/CallAttempt";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  canHangUpNow,
  retryDecision,
  type AttemptSnapshot,
} from "@/lib/calls/callAttemptPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toSnapshot(row: any): AttemptSnapshot {
  return {
    id: String(row.callControlId || ""),
    taskId: String(row.taskId || ""),
    startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
    answeredAt: row.answeredAt ? new Date(row.answeredAt).toISOString() : null,
    endedAt: row.endedAt ? new Date(row.endedAt).toISOString() : null,
    durationMs: typeof row.durationMs === "number" ? row.durationMs : null,
    preciseDuration: Boolean(row.preciseDuration),
    telnyxAnswered: Boolean(row.telnyxAnswered),
    answerType: row.answerType || "",
    telnyxResult: row.telnyxResult || "",
    sipCode: row.sipCode || "",
    hangupCause: row.hangupCause || "",
    hangupSource: row.hangupSource || "",
    agentHangupRequestedAt: row.agentHangupRequestedAt
      ? new Date(row.agentHangupRequestedAt).toISOString()
      : null,
    outcome: row.outcome || "awaiting_provider",
  };
}

async function loadOwnedTask(req: NextRequest, taskId: string) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || !mongoose.Types.ObjectId.isValid(taskId)) return null;
  const ownerIds: Array<string | mongoose.Types.ObjectId> = [String(auth.userId)];
  if (mongoose.Types.ObjectId.isValid(String(auth.userId))) {
    ownerIds.push(new mongoose.Types.ObjectId(String(auth.userId)));
  }
  const task = await CallTask.findOne({
    _id: taskId,
    $or: [
      { assignedToEmployeeId: { $in: ownerIds } },
      { assignedEmployeeId: { $in: ownerIds } },
      { employeeId: { $in: ownerIds } },
    ],
  }).lean();
  return (task as any) || null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  await db();
  const { taskId } = await context.params;
  const task = await loadOwnedTask(req, taskId);
  if (!task) {
    return NextResponse.json({ success: false, error: "המשימה לא זמינה לנציגה הזו" }, { status: 404 });
  }
  const attempts = (await CallAttempt.find({ taskId: task._id }).sort({ startedAt: 1 }).lean()).map(toSnapshot);
  const active = [...attempts].reverse().find((attempt) => attempt.startedAt && !attempt.endedAt) || null;
  const now = Date.now();
  const hangup = canHangUpNow(active, now);
  const retry = retryDecision(attempts, now);
  const elapsedMs = active?.startedAt ? Math.max(0, now - Date.parse(active.startedAt)) : 0;
  return NextResponse.json({
    success: true,
    elapsedMs,
    answered: Boolean(active?.answeredAt),
    ended: Boolean(active?.endedAt),
    canHangup: hangup.allowed,
    hangupReason: hangup.reason,
    canDial: !task.managerException && !retry.waiting && !retry.manager,
    retryAt: retry.retryAt,
    managerException: Boolean(task.managerException),
    message: task.managerException
      ? task.managerExceptionReason || "המשימה ממתינה למנהל"
      : active && !active.endedAt
        ? hangup.reason
        : retry.reason || (attempts.some((attempt) => attempt.outcome === "early_hangup")
            ? "הניסיון לא הושלם. יש לחייג שוב לאותו אורח."
            : attempts.some((attempt) => attempt.outcome === "busy")
              ? "הקו תפוס — נדרש ניסיון נוסף"
              : ""),
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  await db();
  const { taskId } = await context.params;
  const task = await loadOwnedTask(req, taskId);
  if (!task) {
    return NextResponse.json({ success: false, error: "המשימה לא זמינה לנציגה הזו" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const attempts = (await CallAttempt.find({ taskId: task._id }).sort({ startedAt: 1 }).lean()).map(toSnapshot);
  const active = [...attempts].reverse().find((attempt) => attempt.startedAt && !attempt.endedAt) || null;
  const emergency = body?.emergency === true;
  const gate = canHangUpNow(active, Date.now());
  if (!emergency && !gate.allowed) {
    return NextResponse.json({ success: false, error: gate.reason }, { status: 409 });
  }
  if (active) {
    await CallAttempt.updateOne(
      { callControlId: active.id },
      {
        $set: {
          agentHangupRequestedAt: new Date(),
          hangupInitiator: emergency ? "ניתוק חירום" : "נציגה",
        },
      }
    );
  }
  return NextResponse.json({
    success: true,
    qualified: !emergency && gate.allowed,
    message: emergency ? "ניתוק החירום נשמר ולא נספר כניסיון תקין." : "",
  });
}
