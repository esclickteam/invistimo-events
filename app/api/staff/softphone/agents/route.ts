import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import SoftphoneAgentStatus from "@/models/SoftphoneAgentStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function ensureStatusForAgent(agent: any) {
  const now = new Date();
  const dayKey = getDayKey(now);

  let status = await SoftphoneAgentStatus.findOne({
    agentId: agent._id,
  }).lean();

  if (!status) {
    const created = await SoftphoneAgentStatus.create({
      agentId: agent._id,
      status: "offline",
      statusStartedAt: now,
      dayKey,
      lastSeenAt: now,
    });

    status = created.toObject();
  }

  return status;
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

    const agents = await User.find({
      role: "staff",
      staffType: "general_staff",
      employeeScope: "system",
      isDemoUser: { $ne: true },
    })
      .select("name email phone role staffType employeeScope isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const rows = await Promise.all(
      agents.map(async (agent: any) => {
        const status = await ensureStatusForAgent(agent);

        return {
          agentId: String(agent._id),
          name: agent.name || "",
          email: agent.email || "",
          phone: agent.phone || "",
          role: agent.role,
          staffType: agent.staffType || null,
          employeeScope: agent.employeeScope || null,
          isActive: agent.isActive === true,

          status: status?.status || "offline",
          statusStartedAt: status?.statusStartedAt || null,
          currentCallId: status?.currentCallId
            ? String(status.currentCallId)
            : null,

          dayKey: status?.dayKey || getDayKey(),

          todayAvailableSeconds: status?.todayAvailableSeconds || 0,
          todayDialingSeconds: status?.todayDialingSeconds || 0,
          todayRingingSeconds: status?.todayRingingSeconds || 0,
          todayTalkSeconds: status?.todayTalkSeconds || 0,
          todayAfterCallSeconds: status?.todayAfterCallSeconds || 0,
          todayBreakSeconds: status?.todayBreakSeconds || 0,
          todayUnavailableSeconds: status?.todayUnavailableSeconds || 0,
          todayOfflineSeconds: status?.todayOfflineSeconds || 0,

          totalCallsToday: status?.totalCallsToday || 0,
          answeredCallsToday: status?.answeredCallsToday || 0,
          missedCallsToday: status?.missedCallsToday || 0,
          failedCallsToday: status?.failedCallsToday || 0,

          liveStatusSeconds: secondsBetween(status?.statusStartedAt),
          lastSeenAt: status?.lastSeenAt || null,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        agents: rows,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("❌ GET SOFTPHONE AGENTS ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}