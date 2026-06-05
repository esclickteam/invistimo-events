import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    const staffRole = String((staffUser as any).role || "");
    const staffType = String((staffUser as any).staffType || "");
    const employeeScope = String((staffUser as any).employeeScope || "");
    const effectiveRole = String((staffUser as any).effectiveRole || "");

    const isAllowedStaff =
      staffRole === "admin" ||
      effectiveRole === "system_staff" ||
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

    const targetUser = await User.findById(targetUserId)
      .select("_id role email name")
      .lean();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "TARGET_USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const targetRole = String((targetUser as any).role || "user");

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
      redirectTo: "/dashboard",
      targetUser: {
        _id: String((targetUser as any)._id),
        name: (targetUser as any).name || "",
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

    return response;
  } catch (error) {
    console.error("POST /api/staff/impersonate failed:", error);

    return NextResponse.json(
      { success: false, error: "IMPERSONATION_FAILED" },
      { status: 500 }
    );
  }
}