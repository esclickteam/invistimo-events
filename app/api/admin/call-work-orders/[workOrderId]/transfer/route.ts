import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
import CallWorkOrder from "@/models/CallWorkOrder";
import CallTask from "@/models/CallTask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthUser = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
};

const TRANSFERABLE_TASK_STATUSES = [
  "pending",
  "open",
  "assigned",
  "active",
  "in_progress",
  "no_answer",
  "callback",
  "will_reply_message",
  "needs_fix",
  "wrong_number",
];

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractIdString(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") return value;

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

function isAdminRole(role?: string) {
  const normalized = cleanStr(role).toLowerCase();

  return (
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "owner"
  );
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  );
}

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
      decoded.id ||
        decoded._id ||
        decoded.userId ||
        decoded.sub ||
        ""
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

async function requireAdmin() {
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

  if (userObjectId) userConditions.push({ _id: userObjectId });
  userConditions.push({ id: auth.id });

  if (auth.email) {
    userConditions.push({ email: auth.email.toLowerCase() });
  }

  const currentUser = await User.findOne({
    $or: userConditions,
  })
    .select("_id id name email role")
    .lean();

  const role = cleanStr((currentUser as any)?.role || auth.role);

  if (!isAdminRole(role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "אין הרשאת אדמין",
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    auth,
    currentUser,
    userId: String((currentUser as any)?._id || auth.id),
  };
}

async function findEmployee(userId: mongoose.Types.ObjectId) {
  const user = await User.findById(userId)
    .select("_id id name email phone role staffType employeeScope")
    .lean();

  if (!user) return null;

  const role = cleanStr((user as any).role).toLowerCase();
  const staffType = cleanStr((user as any).staffType);
  const employeeScope = cleanStr((user as any).employeeScope);

  const isEmployee =
    role === "employee" ||
    role === "staff" ||
    role === "general_staff" ||
    Boolean(staffType) ||
    Boolean(employeeScope);

  if (!isEmployee) return null;

  return user;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workOrderId: string }> }
) {
  try {
    await db();

    const admin = await requireAdmin();

    if (!admin.ok) {
      return admin.response;
    }

    const { workOrderId } = await context.params;
    const workOrderObjectId = toObjectId(workOrderId);

    if (!workOrderObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "מזהה הוראת עבודה לא תקין",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const fromEmployeeObjectId = toObjectId(body?.fromEmployeeId);
    const toEmployeeObjectId = toObjectId(body?.toEmployeeId);
    const reason = cleanStr(body?.reason);

    if (!fromEmployeeObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "חסר עובד שמעבירים ממנו",
        },
        { status: 400 }
      );
    }

    if (!toEmployeeObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "חסר עובד שאליו מעבירים",
        },
        { status: 400 }
      );
    }

    if (String(fromEmployeeObjectId) === String(toEmployeeObjectId)) {
      return NextResponse.json(
        {
          success: false,
          error: "אי אפשר להעביר לאותו עובד",
        },
        { status: 400 }
      );
    }

    const workOrder = await CallWorkOrder.findById(workOrderObjectId).lean();

    if (!workOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "הוראת העבודה לא נמצאה",
        },
        { status: 404 }
      );
    }

    const fromEmployee = await findEmployee(fromEmployeeObjectId);

    if (!fromEmployee) {
      return NextResponse.json(
        {
          success: false,
          error: "העובד שמעבירים ממנו לא נמצא או אינו עובד",
        },
        { status: 404 }
      );
    }

    const toEmployee = await findEmployee(toEmployeeObjectId);

    if (!toEmployee) {
      return NextResponse.json(
        {
          success: false,
          error: "העובד שאליו מעבירים לא נמצא או אינו עובד",
        },
        { status: 404 }
      );
    }

    const tasksToTransferCount = await CallTask.countDocuments({
      workOrderId: workOrderObjectId,
      assignedToEmployeeId: fromEmployeeObjectId,
      status: {
        $in: TRANSFERABLE_TASK_STATUSES,
      },
    });

    if (tasksToTransferCount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאו משימות פתוחות לעובד הזה בהוראת העבודה",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const adminObjectId = toObjectId(admin.userId);

    const updateResult = await (CallTask as any).updateMany(
      {
        workOrderId: workOrderObjectId,
        assignedToEmployeeId: fromEmployeeObjectId,
        status: {
          $in: TRANSFERABLE_TASK_STATUSES,
        },
      },
      {
        $set: {
          previousAssignedEmployeeId: fromEmployeeObjectId,

          assignedToEmployeeId: toEmployeeObjectId,
          assignedEmployeeId: toEmployeeObjectId,
          employeeId: toEmployeeObjectId,

          assignedAt: now,
          reassignedAt: now,
          reassignedByUserId: adminObjectId || null,
          reassignedReason: reason || "העברה ידנית על ידי אדמין",
          updatedAt: now,
        },
      }
    );

    const remainingForOldEmployee = await CallTask.countDocuments({
      workOrderId: workOrderObjectId,
      assignedToEmployeeId: fromEmployeeObjectId,
      status: {
        $in: TRANSFERABLE_TASK_STATUSES,
      },
    });

    await CallWorkOrder.updateOne(
  {
    _id: workOrderObjectId,
  },
  {
    $addToSet: {
      assignedEmployeeIds: toEmployeeObjectId,
    },
    $set: {
      distributionStrategy: "manual",
      lastReassignedAt: now,
      updatedAt: now,
    },
  }
);

if (remainingForOldEmployee === 0) {
  await CallWorkOrder.updateOne(
    {
      _id: workOrderObjectId,
    },
    {
      $pull: {
        assignedEmployeeIds: fromEmployeeObjectId,
      },
      $set: {
        updatedAt: now,
      },
    }
  );
}

    const freshWorkOrder = await CallWorkOrder.findById(
      workOrderObjectId
    ).lean();

    return NextResponse.json({
      success: true,
      message: "הוראת העבודה הועברה לעובד החדש",
      transferredTasks: Number((updateResult as any)?.modifiedCount || 0),
      fromEmployeeId: String(fromEmployeeObjectId),
      toEmployeeId: String(toEmployeeObjectId),
      fromEmployeeName: cleanStr((fromEmployee as any)?.name),
      toEmployeeName: cleanStr((toEmployee as any)?.name),
      workOrder: freshWorkOrder,
    });
  } catch (error: any) {
    console.error(
      "POST /api/admin/call-work-orders/[workOrderId]/transfer failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בהעברת הוראת עבודה",
      },
      { status: 500 }
    );
  }
}