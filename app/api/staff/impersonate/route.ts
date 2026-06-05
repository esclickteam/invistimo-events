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
      .select("role staffType employeeScope isSystemStaff effectiveRole")
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

    const isAllowedStaff =
      authRole === "admin" ||
      staffRole === "admin" ||
      effectiveRole === "system_staff" ||
      (authRole === "staff" &&
        authStaffType === "general_staff" &&
        authEmployeeScope === "system") ||
      (staffRole === "staff" &&
        staffType === "general_staff" &&
        employeeScope === "system") ||
      (staffUser as any).isSystemStaff === true;

    if (!isAllowedStaff) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const targetUserId = String(body?.targetUserId || "");

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
      .select("_id role email name firstName lastName")
      .lean();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "TARGET_USER_NOT_FOUND" },
        { status: 404 }
      );
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
        impersonated: true,
        impersonatedBy: String(auth.userId),
        impersonationRole: auth.role,
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

    return response;
  } catch (error) {
    console.error("POST /api/staff/impersonate failed:", error);

    return NextResponse.json(
      { success: false, error: "IMPERSONATION_FAILED" },
      { status: 500 }
    );
  }
}