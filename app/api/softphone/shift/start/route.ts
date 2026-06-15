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

type StartShiftBody = {
  employeeId?: string;
  businessId?: string;
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

function getIsraelDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  const dateKey = `${year}-${month}-${day}`;
  const monthKey = `${year}-${month}`;

  return {
    dateKey,
    monthKey,
  };
}

async function findUserBusinessId(employeeId: string) {
  const database = mongoose.connection.db;
  if (!database) return "";

  const employeeObjectId = toObjectId(employeeId);

  const user = await database.collection("users").findOne({
    $or: employeeObjectId
      ? [{ _id: employeeObjectId }, { id: employeeId }]
      : [{ id: employeeId }],
  });

  const rawBusinessId = user?.businessId || user?.business || "";

  if (!rawBusinessId) return "";

  if (typeof rawBusinessId === "string") return rawBusinessId;

  return String(rawBusinessId?._id || rawBusinessId?.id || rawBusinessId || "");
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

function normalizeSession(session: any) {
  if (!session) return null;

  const raw = typeof session.toObject === "function" ? session.toObject() : session;

  return {
    ...raw,
    _id: String(raw._id || ""),
    employeeId: String(raw.employeeId || raw.employeeIdString || ""),
    businessId: raw.businessId ? String(raw.businessId) : raw.businessIdString || "",
    startedAt: raw.startedAt
      ? new Date(raw.startedAt).toISOString()
      : null,
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

    const body = (await request.json().catch(() => ({}))) as StartShiftBody;

    const requestedEmployeeId = cleanStr(body.employeeId);
    const requestedBusinessId = cleanStr(body.businessId);

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

    const businessId =
      requestedBusinessId && isAdminLike(authUser.role)
        ? requestedBusinessId
        : cleanStr(authUser.businessId) || (await findUserBusinessId(employeeId));

    const businessObjectId = businessId ? toObjectId(businessId) : null;

    const existingOpenSession = await SoftphoneWorkSession.findOne(
      buildEmployeeOpenSessionQuery(employeeId),
    )
      .sort({ startedAt: -1 })
      .lean();

    if (existingOpenSession) {
      return NextResponse.json({
        success: true,
        alreadyOpen: true,
        message: "SHIFT_ALREADY_OPEN",
        session: normalizeSession(existingOpenSession),
      });
    }

    const now = new Date();
    const { dateKey, monthKey } = getIsraelDateParts(now);

    const session = await SoftphoneWorkSession.create({
      employeeId: employeeObjectId,
      employeeIdString: employeeId,

      businessId: businessObjectId,
      businessIdString: businessId || "",

      date: dateKey,
      month: monthKey,

      startedAt: now,
      endedAt: null,
      totalMinutes: 0,

      status: "open",
      source: cleanStr(body.source) || "softphone",

      startMeta: {
        userAgent: request.headers.get("user-agent") || "",
        ip:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "",
        ...(body.meta && typeof body.meta === "object" ? body.meta : {}),
      },

      endMeta: {},
    });

    return NextResponse.json({
      success: true,
      alreadyOpen: false,
      message: "SHIFT_STARTED",
      session: normalizeSession(session),
    });
  } catch (error) {
    console.error("START SOFTPHONE SHIFT FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "שגיאה בהתחלת משמרת",
      },
      { status: 500 },
    );
  }
}