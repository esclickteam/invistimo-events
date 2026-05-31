import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import SoftphoneAgentStatus from "@/models/SoftphoneAgentStatus";
import SoftphoneStatusLog from "@/models/SoftphoneStatusLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AgentStatus =
  | "available"
  | "dialing"
  | "ringing"
  | "in_call"
  | "after_call"
  | "break"
  | "unavailable"
  | "offline";

const ALLOWED_STATUSES: AgentStatus[] = [
  "available",
  "dialing",
  "ringing",
  "in_call",
  "after_call",
  "break",
  "unavailable",
  "offline",
];

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function secondsBetween(start?: Date | string | null, end = new Date()) {
  if (!start) return 0;

  const startDate = new Date(start);
  const diff = Math.floor((end.getTime() - startDate.getTime()) / 1000);

  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function isSystemStaff(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    (auth?.role === "staff" &&
      auth?.staffType === "general_staff" &&
      auth?.employeeScope === "system")
  );
}

function addDurationByStatus(target: any, status: string, seconds: number) {
  if (!seconds || seconds <= 0) return;

  if (status === "available") {
    target.todayAvailableSeconds = Number(target.todayAvailableSeconds || 0) + seconds;
  }

  if (status === "dialing") {
    target.todayDialingSeconds = Number(target.todayDialingSeconds || 0) + seconds;
  }

  if (status === "ringing") {
    target.todayRingingSeconds = Number(target.todayRingingSeconds || 0) + seconds;
  }

  if (status === "in_call") {
    target.todayTalkSeconds = Number(target.todayTalkSeconds || 0) + seconds;
  }

  if (status === "after_call") {
    target.todayAfterCallSeconds =
      Number(target.todayAfterCallSeconds || 0) + seconds;
  }

  if (status === "break") {
    target.todayBreakSeconds = Number(target.todayBreakSeconds || 0) + seconds;
  }

  if (status === "unavailable") {
    target.todayUnavailableSeconds =
      Number(target.todayUnavailableSeconds || 0) + seconds;
  }

  if (status === "offline") {
    target.todayOfflineSeconds = Number(target.todayOfflineSeconds || 0) + seconds;
  }
}

async function getOrCreateAgentStatus(agentId: string) {
  const now = new Date();
  const dayKey = getDayKey(now);

  let agentStatus = await SoftphoneAgentStatus.findOne({ agentId });

  if (!agentStatus) {
    agentStatus = await SoftphoneAgentStatus.create({
      agentId,
      status: "available",
      statusStartedAt: now,
      dayKey,
      lastSeenAt: now,
    });

    return agentStatus;
  }

  if (agentStatus.dayKey !== dayKey) {
    agentStatus.dayKey = dayKey;

    agentStatus.todayAvailableSeconds = 0;
    agentStatus.todayDialingSeconds = 0;
    agentStatus.todayRingingSeconds = 0;
    agentStatus.todayTalkSeconds = 0;
    agentStatus.todayAfterCallSeconds = 0;
    agentStatus.todayBreakSeconds = 0;
    agentStatus.todayUnavailableSeconds = 0;
    agentStatus.todayOfflineSeconds = 0;

    agentStatus.totalCallsToday = 0;
    agentStatus.answeredCallsToday = 0;
    agentStatus.missedCallsToday = 0;
    agentStatus.failedCallsToday = 0;

    agentStatus.status = "available";
    agentStatus.statusStartedAt = now;
    agentStatus.currentCallId = null;
    agentStatus.lastSeenAt = now;

    await agentStatus.save();
  }

  return agentStatus;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isSystemStaff(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const currentUser = await User.findById(auth.userId)
      .select("name email role staffType employeeScope")
      .lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const agentStatus = await getOrCreateAgentStatus(String(auth.userId));

    agentStatus.lastSeenAt = new Date();
    await agentStatus.save();

    return NextResponse.json(
      {
        success: true,
        agent: {
          agentId: String(auth.userId),
          name: (currentUser as any).name || "",
          email: (currentUser as any).email || "",
          status: agentStatus.status,
          statusStartedAt: agentStatus.statusStartedAt,
          currentCallId: agentStatus.currentCallId
            ? String(agentStatus.currentCallId)
            : null,
          dayKey: agentStatus.dayKey,

          todayAvailableSeconds: agentStatus.todayAvailableSeconds || 0,
          todayDialingSeconds: agentStatus.todayDialingSeconds || 0,
          todayRingingSeconds: agentStatus.todayRingingSeconds || 0,
          todayTalkSeconds: agentStatus.todayTalkSeconds || 0,
          todayAfterCallSeconds: agentStatus.todayAfterCallSeconds || 0,
          todayBreakSeconds: agentStatus.todayBreakSeconds || 0,
          todayUnavailableSeconds: agentStatus.todayUnavailableSeconds || 0,
          todayOfflineSeconds: agentStatus.todayOfflineSeconds || 0,

          totalCallsToday: agentStatus.totalCallsToday || 0,
          answeredCallsToday: agentStatus.answeredCallsToday || 0,
          missedCallsToday: agentStatus.missedCallsToday || 0,
          failedCallsToday: agentStatus.failedCallsToday || 0,

          liveStatusSeconds: secondsBetween(agentStatus.statusStartedAt),
          lastSeenAt: agentStatus.lastSeenAt,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("❌ GET SOFTPHONE STATUS ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isSystemStaff(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);

    const nextStatus = String(body?.status || "").trim() as AgentStatus;
    const callId = body?.callId || null;

    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      return NextResponse.json(
        { success: false, error: "INVALID_STATUS" },
        { status: 400 }
      );
    }

    const now = new Date();
    const dayKey = getDayKey(now);

    const agentStatus = await getOrCreateAgentStatus(String(auth.userId));

    const previousStatus = String(agentStatus.status || "offline");
    const previousStartedAt = agentStatus.statusStartedAt || now;
    const durationSeconds = secondsBetween(previousStartedAt, now);

    if (agentStatus.dayKey === dayKey) {
      addDurationByStatus(agentStatus, previousStatus, durationSeconds);
    }

    if (previousStatus !== nextStatus) {
      await SoftphoneStatusLog.create({
        agentId: auth.userId,
        fromStatus: previousStatus,
        toStatus: nextStatus,
        startedAt: previousStartedAt,
        endedAt: now,
        durationSeconds,
        dayKey,
        callId: agentStatus.currentCallId || callId || null,
      });
    }

    agentStatus.status = nextStatus;
    agentStatus.statusStartedAt = now;
    agentStatus.currentCallId = callId || null;
    agentStatus.dayKey = dayKey;
    agentStatus.lastSeenAt = now;

    await agentStatus.save();

    return NextResponse.json(
      {
        success: true,
        agent: {
          agentId: String(auth.userId),
          status: agentStatus.status,
          statusStartedAt: agentStatus.statusStartedAt,
          currentCallId: agentStatus.currentCallId
            ? String(agentStatus.currentCallId)
            : null,
          dayKey: agentStatus.dayKey,

          todayAvailableSeconds: agentStatus.todayAvailableSeconds || 0,
          todayDialingSeconds: agentStatus.todayDialingSeconds || 0,
          todayRingingSeconds: agentStatus.todayRingingSeconds || 0,
          todayTalkSeconds: agentStatus.todayTalkSeconds || 0,
          todayAfterCallSeconds: agentStatus.todayAfterCallSeconds || 0,
          todayBreakSeconds: agentStatus.todayBreakSeconds || 0,
          todayUnavailableSeconds: agentStatus.todayUnavailableSeconds || 0,
          todayOfflineSeconds: agentStatus.todayOfflineSeconds || 0,

          totalCallsToday: agentStatus.totalCallsToday || 0,
          answeredCallsToday: agentStatus.answeredCallsToday || 0,
          missedCallsToday: agentStatus.missedCallsToday || 0,
          failedCallsToday: agentStatus.failedCallsToday || 0,

          liveStatusSeconds: 0,
          lastSeenAt: agentStatus.lastSeenAt,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("❌ POST SOFTPHONE STATUS ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}