import { NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthUser = {
  id: string;
  role?: string;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
    };
  } catch {
    return null;
  }
}

function isAdmin(role?: string) {
  const normalized = String(role || "").toLowerCase();

  return (
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "owner"
  );
}

function getEmployeeId(user: any) {
  return String(user?._id || user?.id || "");
}

function getEmployeeName(user: any) {
  const name = cleanStr(user?.name || user?.fullName);
  if (name) return name;

  const combined = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ");

  return cleanStr(combined) || "עובד ללא שם";
}

function isEmployeeUser(user: any) {
  const role = String(user?.role || "").toLowerCase();

  if (
    role === "employee" ||
    role === "staff" ||
    role === "worker" ||
    role.includes("employee") ||
    role.includes("staff") ||
    role.includes("worker")
  ) {
    return true;
  }

  return Boolean(
    user?.employeeProfileUpdatedAt ||
      user?.employeeStartDate ||
      user?.employmentStartDate ||
      user?.employeeEndDate ||
      user?.employmentEndDate ||
      user?.employeeAddress ||
      user?.employeeIdNumber ||
      user?.employeeHourlyRate ||
      user?.hourlyRate
  );
}

function normalizeEmployee(user: any) {
  return {
    id: getEmployeeId(user),
    name: getEmployeeName(user),

    email: cleanStr(user?.email),
    phone: cleanStr(user?.phone),

    address: cleanStr(user?.address || user?.employeeAddress),

    idNumber: cleanStr(user?.idNumber || user?.employeeIdNumber),

    startDate: cleanStr(
      user?.startDate || user?.employeeStartDate || user?.employmentStartDate
    ),

    endDate: cleanStr(
      user?.endDate || user?.employeeEndDate || user?.employmentEndDate
    ),

    hourlyRate: Number(user?.hourlyRate || user?.employeeHourlyRate || 0),

    role: cleanStr(user?.role),
    status: cleanStr(user?.status),

    updatedAt: cleanStr(
      user?.employeeProfileUpdatedAt || user?.updatedAt || user?.createdAt
    ),
  };
}

export async function GET() {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id || !isAdmin(authUser.role)) {
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

    const users = await database
      .collection("users")
      .find({})
      .sort({ employeeProfileUpdatedAt: -1, updatedAt: -1, createdAt: -1 })
      .limit(1000)
      .toArray();

    const employees = users
      .filter((user) => getEmployeeId(user))
      .filter(isEmployeeUser)
      .map(normalizeEmployee)
      .sort((a, b) => {
        const aDate = new Date(a.updatedAt || 0).getTime();
        const bDate = new Date(b.updatedAt || 0).getTime();
        return bDate - aDate;
      });

    return NextResponse.json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("GET ADMIN EMPLOYEES FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בטעינת עובדים",
      },
      { status: 500 }
    );
  }
}