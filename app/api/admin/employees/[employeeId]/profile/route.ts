import { NextRequest, NextResponse } from "next/server";
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

function normalizeEmployee(user: any, employeeId: string) {
  const firstName = cleanStr(user?.firstName);
  const lastName = cleanStr(user?.lastName);
  const combinedName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    id: employeeId,
    name:
      cleanStr(user?.name) ||
      cleanStr(user?.fullName) ||
      combinedName ||
      "עובד ללא שם",
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
  };
}

async function findEmployee(employeeId: string) {
  const database = mongoose.connection.db;
  if (!database) return null;

  const objectId = toObjectId(employeeId);

  return database.collection("users").findOne({
    $or: objectId
      ? [{ _id: objectId }, { id: employeeId }]
      : [{ id: employeeId }],
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id || !isAdmin(authUser.role)) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const employeeId = decodeURIComponent(cleanStr(params.employeeId));

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה עובד" },
        { status: 400 }
      );
    }

    const user = await findEmployee(employeeId);

    return NextResponse.json({
      success: true,
      employee: normalizeEmployee(user || {}, employeeId),
    });
  } catch (error) {
    console.error("GET ADMIN EMPLOYEE PROFILE FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בטעינת פרטי עובד",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id || !isAdmin(authUser.role)) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const employeeId = decodeURIComponent(cleanStr(params.employeeId));

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה עובד" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const database = mongoose.connection.db;

    if (!database) {
      return NextResponse.json(
        { success: false, error: "DATABASE_NOT_READY" },
        { status: 500 }
      );
    }

    const objectId = toObjectId(employeeId);
    const now = new Date();

    const setDoc: Record<string, any> = {
      updatedAt: now,
      employeeProfileUpdatedAt: now,
    };

    if ("name" in body) {
      setDoc.name = cleanStr(body.name);
      setDoc.fullName = cleanStr(body.name);
    }

    if ("email" in body) setDoc.email = cleanStr(body.email);
    if ("phone" in body) setDoc.phone = cleanStr(body.phone);

    if ("address" in body) {
      setDoc.address = cleanStr(body.address);
      setDoc.employeeAddress = cleanStr(body.address);
    }

    if ("idNumber" in body) {
      setDoc.idNumber = cleanStr(body.idNumber);
      setDoc.employeeIdNumber = cleanStr(body.idNumber);
    }

    if ("startDate" in body) {
      setDoc.startDate = cleanStr(body.startDate);
      setDoc.employeeStartDate = cleanStr(body.startDate);
      setDoc.employmentStartDate = cleanStr(body.startDate);
    }

    if ("endDate" in body) {
      setDoc.endDate = cleanStr(body.endDate);
      setDoc.employeeEndDate = cleanStr(body.endDate);
      setDoc.employmentEndDate = cleanStr(body.endDate);
    }

    if ("hourlyRate" in body) {
      const hourlyRate = Number(body.hourlyRate || 0);
      setDoc.hourlyRate = Number.isFinite(hourlyRate) ? hourlyRate : 0;
      setDoc.employeeHourlyRate = Number.isFinite(hourlyRate) ? hourlyRate : 0;
    }

    await database.collection("users").updateOne(
      objectId ? { _id: objectId } : { id: employeeId },
      {
        $set: setDoc,
        $setOnInsert: {
          id: employeeId,
          role: "employee",
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const user = await findEmployee(employeeId);

    return NextResponse.json({
      success: true,
      employee: normalizeEmployee(user || {}, employeeId),
    });
  } catch (error) {
    console.error("PATCH ADMIN EMPLOYEE PROFILE FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בשמירת פרטי עובד",
      },
      { status: 500 }
    );
  }
}