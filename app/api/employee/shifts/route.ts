import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "employeeshifts";

type AuthUser = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
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
      decoded.id || decoded._id || decoded.userId || decoded.sub || ""
    );

    if (!id) return null;

    return {
      id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name || decoded.fullName,
    };
  } catch {
    return null;
  }
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function normalizeMonth(value: string) {
  const month = cleanStr(value);
  return /^\d{4}-\d{2}$/.test(month) ? month : getCurrentMonthKey();
}

function normalizeShift(shift: any) {
  return {
    id: String(shift?._id || shift?.id || ""),

    employeeId: String(
      shift?.employeeIdString ||
        shift?.employeeId ||
        shift?.employeeObjectId ||
        ""
    ),
    employeeName: cleanStr(shift?.employeeName),
    employeeEmail: cleanStr(shift?.employeeEmail),
    employeePhone: cleanStr(shift?.employeePhone),

    date: cleanStr(shift?.date),
    dayName: cleanStr(shift?.dayName),
    month: cleanStr(shift?.month),

    scheduledStart: cleanStr(
      shift?.scheduledStart || shift?.shiftStart || shift?.startTime
    ),
    scheduledEnd: cleanStr(
      shift?.scheduledEnd || shift?.shiftEnd || shift?.endTime
    ),

    locationType: cleanStr(shift?.locationType) === "hall" ? "hall" : "home",
    locationName: cleanStr(shift?.locationName),
    locationAddress: cleanStr(shift?.locationAddress),

    shiftLabel: cleanStr(shift?.shiftLabel) || "משובץ",
    note: cleanStr(shift?.note),

    createdAt: shift?.createdAt || null,
    updatedAt: shift?.updatedAt || null,
  };
}

function getEmployeeQuery(userId: string) {
  const objectId = toObjectId(userId);

  const conditions: Record<string, any>[] = [
    { employeeId: userId },
    { employeeIdString: userId },
    { userId },
    { userIdString: userId },
    { workerId: userId },
    { staffId: userId },
    { assignedEmployeeId: userId },
    { assignedStaffId: userId },
  ];

  if (objectId) {
    conditions.unshift(
      { employeeObjectId: objectId },
      { employeeId: objectId },
      { userId: objectId },
      { workerId: objectId },
      { staffId: objectId },
      { assignedEmployeeId: objectId },
      { assignedStaffId: objectId }
    );
  }

  return conditions;
}

export async function GET(request: NextRequest) {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const database = mongoose.connection.db;

    if (!database) {
      return NextResponse.json(
        { success: false, error: "DATABASE_NOT_READY" },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const month = normalizeMonth(cleanStr(url.searchParams.get("month")));

    const shifts = await database
      .collection(COLLECTION)
      .find({
        month,
        $or: getEmployeeQuery(authUser.id),
      })
      .sort({ date: 1, scheduledStart: 1, scheduledEnd: 1, employeeName: 1 })
      .limit(1000)
      .toArray();

    return NextResponse.json({
      success: true,
      employeeId: authUser.id,
      month,
      shifts: shifts.map(normalizeShift),
    });
  } catch (error) {
    console.error("GET EMPLOYEE SHIFTS FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בטעינת השיבוצים",
      },
      { status: 500 }
    );
  }
}