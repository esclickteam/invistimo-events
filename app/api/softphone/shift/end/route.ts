import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import SoftphoneWorkSession from "@/models/SoftphoneWorkSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthUser = {
  id: string;
  _id?: string;
  userId?: string;
  role?: string;
  businessId?: string;
  email?: string;
  name?: string;
};

type EndShiftBody = {
  employeeId?: string;
  source?: string;
  meta?: Record<string, unknown>;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toObjectId(value: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
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
        decoded.employeeId ||
        "",
    );

    if (!id) return null;

    return {
      id,
      _id: decoded._id,
      userId: decoded.userId,
      role: decoded.role,
      businessId: decoded.businessId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

function isAdminLike(role?: string) {
  const normalized = String(role || "").toLowerCase();

  return (
    normalized === "admin" ||
    normalized === "staff" ||
    normalized === "employee_admin"
  );
}

function buildEmployeeOpenSessionQuery(employeeId: string) {
  const employeeObjectId = toObjectId(employeeId);

  return {
    status: "open",
    $or: employeeObjectId
      ? [{ employeeId: employeeObjectId }, { employeeIdString: employeeId }]
      : [{ employeeIdString: employeeId }],
  };
}

function calculateTotalMinutes(startedAt: Date, endedAt: Date) {
  const diffMs = endedAt.getTime() - startedAt.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;

  return Math.round(diffMs / 60000);
}

function normalizeSession(session: any) {
  if (!session) return null;

  const raw = typeof session.toObject === "function" ? session.toObject() : session;

  return {
    ...raw,
    _id: String(raw._id || ""),
    employeeId: String(raw.employeeId || raw.employeeIdString || ""),
    businessId: raw.businessId ? String(raw.businessId) : raw.businessIdString || "",
    startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : null,
    endedAt: raw.endedAt ? new Date(raw.endedAt).toISOString() : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as EndShiftBody;

    const requestedEmployeeId = cleanStr(body.employeeId);

    const employeeId =
      requestedEmployeeId && isAdminLike(authUser.role)
        ? requestedEmployeeId
        : authUser.id;

    const employeeObjectId = toObjectId(employeeId);

    if (!employeeObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EMPLOYEE_ID",
        },
        { status: 400 },
      );
    }

    const openSession = await SoftphoneWorkSession.findOne(
      buildEmployeeOpenSessionQuery(employeeId),
    ).sort({ startedAt: -1 });

    if (!openSession) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_OPEN_SHIFT_FOUND",
          message: "לא נמצאה משמרת פתוחה לסיום",
        },
        { status: 404 },
      );
    }

    const now = new Date();
    const startedAt = new Date(openSession.startedAt);
    const totalMinutes = calculateTotalMinutes(startedAt, now);

    openSession.endedAt = now;
    openSession.totalMinutes = totalMinutes;
    openSession.status = "closed";
    openSession.source = cleanStr(body.source) || openSession.source || "softphone";
    openSession.endMeta = {
      userAgent: request.headers.get("user-agent") || "",
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "",
      ...(body.meta && typeof body.meta === "object" ? body.meta : {}),
    };

    await openSession.save();

    return NextResponse.json({
      success: true,
      message: "SHIFT_ENDED",
      session: normalizeSession(openSession),
      summary: {
        startedAt: startedAt.toISOString(),
        endedAt: now.toISOString(),
        totalMinutes,
        totalHours: Number((totalMinutes / 60).toFixed(2)),
      },
    });
  } catch (error) {
    console.error("END SOFTPHONE SHIFT FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בסיום משמרת",
      },
      { status: 500 },
    );
  }
}