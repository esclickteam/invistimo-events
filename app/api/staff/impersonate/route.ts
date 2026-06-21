import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getRoleDashboardPath(role: string) {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "producer") return "/producer/dashboard";
  if (normalizedRole === "admin") return "/admin/dashboard";
  if (normalizedRole === "staff") return "/staff/dashboard";
  if (normalizedRole === "venue_owner") return "/venue/dashboard";

  // לקוח / user / client
  return "/dashboard";
}

function normalizeId(value: unknown) {
  return String(value || "").trim();
}

function normalizeIds(values: unknown) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => normalizeId(value))
    .filter(Boolean);
}

function includesId(values: unknown, id: string) {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return false;

  return normalizeIds(values).includes(normalizedId);
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: "JWT_SECRET_MISSING" },
        { status: 500 }
      );
    }

    const auth = await getUserIdFromRequest(request);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const staffUser = await User.findById(auth.userId)
      .select(
        "role staffType employeeScope isSystemStaff effectiveRole assignedClientIds"
      )
      .lean();

    if (!staffUser) {
      return NextResponse.json(
        { success: false, error: "STAFF_NOT_FOUND" },
        { status: 404 }
      );
    }

    const authRole = String(auth.role || "");
    const authStaffType = String(auth.staffType || "");
    const authEmployeeScope = String(auth.employeeScope || "");

    const staffRole = String((staffUser as any).role || "");
    const staffType = String((staffUser as any).staffType || "");
    const employeeScope = String((staffUser as any).employeeScope || "");
    const effectiveRole = String((staffUser as any).effectiveRole || "");

    const isAdmin =
      authRole === "admin" ||
      staffRole === "admin";

    const isGeneralSystemStaff =
      effectiveRole === "system_staff" ||
      (authRole === "staff" &&
        authStaffType === "general_staff" &&
        authEmployeeScope === "system") ||
      (staffRole === "staff" &&
        staffType === "general_staff" &&
        employeeScope === "system") ||
      (staffUser as any).isSystemStaff === true;

    const isSeatingStaff =
      (authRole === "staff" &&
        authStaffType === "seating_staff" &&
        authEmployeeScope === "system") ||
      (staffRole === "staff" &&
        staffType === "seating_staff" &&
        employeeScope === "system");

    const isAllowedStaff =
      isAdmin ||
      isGeneralSystemStaff ||
      isSeatingStaff;

    if (!isAllowedStaff) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const targetUserId = String(body?.targetUserId || "").trim();

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "TARGET_USER_ID_REQUIRED" },
        { status: 400 }
      );
    }

    if (targetUserId === String(auth.userId)) {
      return NextResponse.json(
        { success: false, error: "CANNOT_IMPERSONATE_SELF" },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(targetUserId)
      .select("_id role email name firstName lastName assignedStaffIds")
      .lean();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "TARGET_USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /*
      עובד הושבה:
      מותר לו להיכנס רק ללקוחות שהוקצו אליו.

      תומך בשני כיוונים:
      1. אצל העובד: assignedClientIds כולל את הלקוח
      2. אצל הלקוח: assignedStaffIds כולל את העובד
    */
    if (isSeatingStaff && !isAdmin) {
      const staffAssignedClientIds = (staffUser as any).assignedClientIds || [];
      const targetAssignedStaffIds = (targetUser as any).assignedStaffIds || [];

      const staffHasClient = includesId(staffAssignedClientIds, targetUserId);
      const clientHasStaff = includesId(targetAssignedStaffIds, String(auth.userId));

      if (!staffHasClient && !clientHasStaff) {
        return NextResponse.json(
          {
            success: false,
            error: "SEATING_STAFF_CLIENT_NOT_ASSIGNED",
            message: "אין לעובד ההושבה הרשאה להיכנס ללקוח הזה",
          },
          { status: 403 }
        );
      }
    }

    const targetRole = String((targetUser as any).role || "user");

    const targetName =
      (targetUser as any).name ||
      [(targetUser as any).firstName, (targetUser as any).lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    const impersonationToken = jwt.sign(
      {
        userId: String((targetUser as any)._id),
        role: targetRole,

        // מצב התחזות
        impersonated: true,
        impersonatedBy: String(auth.userId),
        impersonationRole: auth.role,

        // מידע על העובד המקורי
        impersonationStaffType: staffType || authStaffType || null,
        impersonationEmployeeScope: employeeScope || authEmployeeScope || null,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    const response = NextResponse.json({
      success: true,
      redirectTo: getRoleDashboardPath(targetRole),
      targetUser: {
        _id: String((targetUser as any)._id),
        name: targetName || "",
        email: (targetUser as any).email || "",
        role: targetRole,
      },
    });

    response.cookies.set("impersonationToken", impersonationToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2,
    });

    // cookie גלוי לפרונט כדי לדעת להציג את המסופון גם בדשבורד הלקוח
    response.cookies.set("staffImpersonationActive", "true", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2,
    });

    // מזהה העובד המקורי — גלוי לפרונט אם נרצה להציג "את מחוברת כעובדת"
    response.cookies.set("staffOriginalUserId", String(auth.userId), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2,
    });

    response.cookies.set("staffOriginalType", staffType || authStaffType || "", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2,
    });

    return response;
  } catch (error) {
    console.error("POST /api/staff/impersonate failed:", error);

    return NextResponse.json(
      { success: false, error: "IMPERSONATION_FAILED" },
      { status: 500 }
    );
  }
}