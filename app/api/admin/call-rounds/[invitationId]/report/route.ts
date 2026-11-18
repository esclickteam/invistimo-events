import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import User from "@/models/User";
import InvitationGuest from "@/models/InvitationGuest";
import CallTask from "@/models/CallTask";
import CallWorkOrder from "@/models/CallWorkOrder";
import CallAttempt from "@/models/CallAttempt";
import CallRecording from "@/models/CallRecording";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { buildCallRoundReport, filterCallRoundRows, summarizeCallRoundRows } from "@/lib/calls/buildCallRoundReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isManager(role: unknown) {
  return ["admin", "superadmin", "manager"].includes(String(role || "").toLowerCase());
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ invitationId: string }> }
) {
  await db();
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) {
    return NextResponse.json({ success: false, error: "לא נמצאה התחברות תקינה." }, { status: 401 });
  }
  const user: any = await User.findById(auth.userId).select("role").lean();
  if (!isManager(user?.role) && !isManager(auth.role)) {
    return NextResponse.json({ success: false, error: "הדוח זמין למנהלים בלבד." }, { status: 403 });
  }

  const { invitationId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(invitationId)) {
    return NextResponse.json({ success: false, error: "מזהה הזמנה לא תקין" }, { status: 400 });
  }
  const invitationObjectId = new mongoose.Types.ObjectId(invitationId);
  const round = Number(new URL(req.url).searchParams.get("round") || 0);
  const [guests, tasks, attempts, workOrders] = await Promise.all([
    InvitationGuest.find({ invitationId: invitationObjectId }).lean(),
    CallTask.find({ invitationId: invitationObjectId }).lean(),
    CallAttempt.find({ invitationId: invitationObjectId }).lean(),
    CallWorkOrder.find({ invitationId: invitationObjectId, type: "rsvp_calls" }).lean(),
  ]);
  const recordings = await CallRecording.find({
    "clientState.taskId": { $in: tasks.map((task: any) => String(task._id)) },
  })
    .select("callControlId clientState startedAt answeredAt endedAt durationSeconds hangupCause hangupSource sipCode")
    .limit(5000)
    .lean();
  const relatedRecordings = recordings;
  const report = buildCallRoundReport({
    round,
    guests,
    tasks,
    attempts,
    recordings: relatedRecordings,
    workOrders,
  });
  const params = new URL(req.url).searchParams;
  const rows = filterCallRoundRows(report.rows, {
    q: params.get("q") || "",
    agent: params.get("agent") || "",
    view: params.get("view") || "all",
  });
  return NextResponse.json({
    success: true,
    round,
    metrics: summarizeCallRoundRows(rows),
    rows,
    agents: Array.from(new Set(report.rows.map((row) => row.employeeName).filter((name) => name && name !== "—"))),
    updatedAt: new Date().toISOString(),
  });
}
