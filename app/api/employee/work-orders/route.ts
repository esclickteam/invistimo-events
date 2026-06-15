import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
import CallWorkOrder from "@/models/CallWorkOrder";
import CallTask from "@/models/CallTask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Types
============================================================ */

type AuthUser = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
};

type TaskStatusCount = {
  total: number;
  pending: number;
  in_progress: number;
  confirmed: number;
  declined: number;
  no_answer: number;
  callback: number;
  wrong_number: number;
  completed: number;
  cancelled: number;
};

/* ============================================================
   Helpers
============================================================ */

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function extractIdString(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return String(value);
  }

  if (typeof value === "object") {
    const anyValue = value as any;

    if (anyValue._id) return extractIdString(anyValue._id);
    if (anyValue.id) return extractIdString(anyValue.id);
    if (anyValue.$oid) return extractIdString(anyValue.$oid);
  }

  return String(value || "");
}

function toObjectId(value: unknown) {
  const id = extractIdString(value);

  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  return new mongoose.Types.ObjectId(id);
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  );
}

function getTodayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate()
  )}`;
}

function normalizeDateKey(value: unknown) {
  const raw = cleanStr(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (raw) {
    const date = new Date(raw);

    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
        date.getDate()
      )}`;
    }
  }

  return getTodayKey();
}

function startOfDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function endOfDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function isDoneStatus(status: string) {
  return [
    "confirmed",
    "declined",
    "no_answer",
    "callback",
    "wrong_number",
    "completed",
    "cancelled",
  ].includes(status);
}

function emptyCounts(): TaskStatusCount {
  return {
    total: 0,
    pending: 0,
    in_progress: 0,
    confirmed: 0,
    declined: 0,
    no_answer: 0,
    callback: 0,
    wrong_number: 0,
    completed: 0,
    cancelled: 0,
  };
}

function addCount(target: TaskStatusCount, status: string, count: number) {
  target.total += count;

  if (status in target) {
    target[status as keyof TaskStatusCount] += count;
  }
}

function getCompletedFromCounts(counts: TaskStatusCount) {
  return (
    counts.confirmed +
    counts.declined +
    counts.no_answer +
    counts.callback +
    counts.wrong_number +
    counts.completed +
    counts.cancelled
  );
}

function serializeWorkOrder(order: any, counts: TaskStatusCount) {
  const completed = getCompletedFromCounts(counts);
  const remaining = Math.max(0, counts.total - completed);

  const progressPercent =
    counts.total > 0 ? Math.round((completed / counts.total) * 100) : 0;

  return {
    id: String(order?._id || ""),
    _id: String(order?._id || ""),

    type: order?.type || "rsvp_calls",
    status: order?.status || "open",

    title: cleanStr(order?.title),
    description: cleanStr(order?.description),

    invitationId: String(order?.invitationId || ""),

    clientName: cleanStr(order?.clientName),
    clientEmail: cleanStr(order?.clientEmail),

    eventName: cleanStr(order?.eventName),
    eventDate: order?.eventDate || null,

    round: Number(order?.round || 1),
    sourceAudience: cleanStr(order?.sourceAudience),

    workDate: order?.workDate || null,
    configuredRoundAt: order?.configuredRoundAt || null,
    autoOpenAt: order?.autoOpenAt || null,
    timezone: cleanStr(order?.timezone) || "Asia/Jerusalem",

    myTasksTotal: counts.total,
    myTasksCompleted: completed,
    myTasksRemaining: remaining,
    myProgressPercent: progressPercent,

    myPendingTasks: counts.pending,
    myInProgressTasks: counts.in_progress,
    myConfirmedTasks: counts.confirmed,
    myDeclinedTasks: counts.declined,
    myNoAnswerTasks: counts.no_answer,
    myCallbackTasks: counts.callback,
    myWrongNumberTasks: counts.wrong_number,
    myCancelledTasks: counts.cancelled,

    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
  };
}

/* ============================================================
   Auth
============================================================ */

async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("token")?.value ||
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("authToken")?.value ||
    cookieStore.get("jwt")?.value ||
    cookieStore.get("session")?.value ||
    "";

  if (!token) return null;

  const secret = getJwtSecret();

  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as any;

    const id = String(
      decoded.id || decoded._id || decoded.userId || decoded.sub || ""
    );

    if (!id) return null;

    return {
      id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

async function requireEmployee() {
  const auth = await getAuthUser();

  if (!auth?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "לא מחובר",
        },
        { status: 401 }
      ),
    };
  }

  const userObjectId = toObjectId(auth.id);

  const userConditions: any[] = [];

  if (userObjectId) {
    userConditions.push({ _id: userObjectId });
  }

  userConditions.push({ id: auth.id });

  if (auth.email) {
    userConditions.push({ email: auth.email.toLowerCase() });
  }

  const currentUser = await User.findOne({
    $or: userConditions,
  })
    .select("_id id name email role")
    .lean();

  if (!currentUser) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "משתמש לא נמצא",
        },
        { status: 404 }
      ),
    };
  }

  const employeeObjectId = toObjectId((currentUser as any)._id);

  if (!employeeObjectId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "מזהה עובד לא תקין",
        },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true as const,
    auth,
    currentUser,
    employeeId: employeeObjectId,
    employeeIdString: String(employeeObjectId),
  };
}

/* ============================================================
   Data
============================================================ */

async function getEmployeeWorkOrderCounts(input: {
  employeeId: Types.ObjectId;
  query: any;
}) {
  const rows = await CallTask.aggregate([
    {
      $match: {
        assignedToEmployeeId: input.employeeId,
        ...input.query,
      },
    },
    {
      $group: {
        _id: {
          workOrderId: "$workOrderId",
          status: "$status",
        },
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const map = new Map<string, TaskStatusCount>();

  for (const row of rows) {
    const workOrderId = String(row?._id?.workOrderId || "");
    const status = String(row?._id?.status || "pending");
    const count = Number(row?.count || 0);

    if (!workOrderId) continue;

    const current = map.get(workOrderId) || emptyCounts();

    addCount(current, status, count);

    map.set(workOrderId, current);
  }

  return map;
}

function buildTaskQueryFromSearchParams(searchParams: URLSearchParams) {
  const taskQuery: any = {};

  const status = cleanStr(searchParams.get("status"));
  const round = Number(searchParams.get("round") || 0);
  const invitationId = cleanStr(searchParams.get("invitationId"));

  const date = cleanStr(searchParams.get("date"));
  const from = cleanStr(searchParams.get("from"));
  const to = cleanStr(searchParams.get("to"));

  const includeAllDates =
    searchParams.get("all") === "1" ||
    searchParams.get("all") === "true" ||
    searchParams.get("date") === "all";

  if (status) {
    taskQuery.status = status;
  }

  if (round === 1 || round === 2 || round === 3) {
    taskQuery.round = round;
  }

  if (invitationId) {
    const objectId = toObjectId(invitationId);
    taskQuery.invitationId = objectId || invitationId;
  }

  if (!includeAllDates) {
    if (date) {
      const dateKey = normalizeDateKey(date);

      taskQuery.workDate = {
        $gte: startOfDateKey(dateKey),
        $lte: endOfDateKey(dateKey),
      };
    } else if (from || to) {
      const fromKey = normalizeDateKey(from || getTodayKey());
      const toKey = normalizeDateKey(to || fromKey);

      taskQuery.workDate = {
        $gte: startOfDateKey(fromKey),
        $lte: endOfDateKey(toKey),
      };
    } else {
      const todayKey = getTodayKey();

      taskQuery.workDate = {
        $gte: startOfDateKey(todayKey),
        $lte: endOfDateKey(todayKey),
      };
    }
  }

  return taskQuery;
}

/* ============================================================
   GET - הוראות העבודה של העובד המחובר
============================================================ */

export async function GET(req: NextRequest) {
  try {
    await db();

    const employee = await requireEmployee();

    if (!employee.ok) {
      return employee.response;
    }

    const { searchParams } = new URL(req.url);

    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") || 100))
    );

    const taskQuery = buildTaskQueryFromSearchParams(searchParams);

    const countsMap = await getEmployeeWorkOrderCounts({
      employeeId: employee.employeeId,
      query: taskQuery,
    });

    const workOrderIds = Array.from(countsMap.keys())
      .map((id) => toObjectId(id))
      .filter(Boolean) as Types.ObjectId[];

    if (!workOrderIds.length) {
      return NextResponse.json({
        success: true,
        employee: {
          id: employee.employeeIdString,
          name: cleanStr((employee.currentUser as any)?.name),
          email: cleanStr((employee.currentUser as any)?.email),
          role: cleanStr((employee.currentUser as any)?.role),
        },
        count: 0,
        summary: emptyCounts(),
        workOrders: [],
      });
    }

    const workOrders = await CallWorkOrder.find({
      _id: {
        $in: workOrderIds,
      },
      type: "rsvp_calls",
    })
      .sort({
        workDate: -1,
        round: 1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    const summary = emptyCounts();

    for (const counts of countsMap.values()) {
      summary.total += counts.total;
      summary.pending += counts.pending;
      summary.in_progress += counts.in_progress;
      summary.confirmed += counts.confirmed;
      summary.declined += counts.declined;
      summary.no_answer += counts.no_answer;
      summary.callback += counts.callback;
      summary.wrong_number += counts.wrong_number;
      summary.completed += counts.completed;
      summary.cancelled += counts.cancelled;
    }

    const serialized = workOrders.map((order: any) => {
      const id = String(order?._id || "");
      const counts = countsMap.get(id) || emptyCounts();

      return serializeWorkOrder(order, counts);
    });

    const activeWorkOrders = serialized.filter(
      (order) => order.myTasksRemaining > 0
    );

    const completedWorkOrders = serialized.filter(
      (order) => order.myTasksRemaining <= 0 && order.myTasksTotal > 0
    );

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.employeeIdString,
        name: cleanStr((employee.currentUser as any)?.name),
        email: cleanStr((employee.currentUser as any)?.email),
        role: cleanStr((employee.currentUser as any)?.role),
      },
      count: serialized.length,
      summary: {
        ...summary,
        completedLogical: getCompletedFromCounts(summary),
        remaining: Math.max(0, summary.total - getCompletedFromCounts(summary)),
      },
      workOrders: serialized,
      activeWorkOrders,
      completedWorkOrders,
    });
  } catch (error: any) {
    console.error("GET /api/employee/work-orders failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בטעינת הוראות העבודה",
      },
      { status: 500 }
    );
  }
}