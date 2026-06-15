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

function getDayName(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("he-IL", {
    weekday: "long",
  });
}

function buildShiftLabel(input: {
  locationType: string;
  locationName: string;
  locationAddress: string;
}) {
  if (input.locationType === "home") return "בית";

  const name = cleanStr(input.locationName);
  const address = cleanStr(input.locationAddress);

  if (name && address) return `אולם: ${name} · ${address}`;
  if (name) return `אולם: ${name}`;
  if (address) return `אולם · ${address}`;

  return "אולם";
}

function normalizeShift(shift: any) {
  return {
    id: String(shift?._id || shift?.id || ""),
    employeeId: String(shift?.employeeIdString || shift?.employeeId || ""),
    employeeName: cleanStr(shift?.employeeName),
    employeeEmail: cleanStr(shift?.employeeEmail),
    employeePhone: cleanStr(shift?.employeePhone),

    date: cleanStr(shift?.date),
    dayName: cleanStr(shift?.dayName),
    month: cleanStr(shift?.month),

    scheduledStart: cleanStr(shift?.scheduledStart),
    scheduledEnd: cleanStr(shift?.scheduledEnd),

    locationType: cleanStr(shift?.locationType) || "home",
    locationName: cleanStr(shift?.locationName),
    locationAddress: cleanStr(shift?.locationAddress),

    shiftLabel: cleanStr(shift?.shiftLabel) || "משובץ",
    note: cleanStr(shift?.note),

    createdAt: shift?.createdAt || null,
    updatedAt: shift?.updatedAt || null,
  };
}

async function getEmployee(employeeId: string) {
  const database = mongoose.connection.db;
  if (!database) return null;

  const objectId = toObjectId(employeeId);

  return database.collection("users").findOne({
    $or: objectId
      ? [{ _id: objectId }, { id: employeeId }]
      : [{ id: employeeId }],
  });
}

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const month = normalizeMonth(cleanStr(url.searchParams.get("month")));
    const employeeId = cleanStr(url.searchParams.get("employeeId"));

    const query: Record<string, any> = {
      month,
    };

    if (employeeId) {
      const objectId = toObjectId(employeeId);

      query.$or = objectId
        ? [
            { employeeObjectId: objectId },
            { employeeId },
            { employeeIdString: employeeId },
          ]
        : [{ employeeId }, { employeeIdString: employeeId }];
    }

    const shifts = await database
      .collection(COLLECTION)
      .find(query)
      .sort({ date: 1, scheduledStart: 1, employeeName: 1 })
      .limit(2000)
      .toArray();

    return NextResponse.json({
      success: true,
      month,
      shifts: shifts.map(normalizeShift),
    });
  } catch (error) {
    console.error("GET ADMIN EMPLOYEE SHIFTS FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בטעינת שיבוצים",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));

    const employeeId = cleanStr(body.employeeId);
    const date = cleanStr(body.date);
    const scheduledStart = cleanStr(body.scheduledStart);
    const scheduledEnd = cleanStr(body.scheduledEnd);

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "חסר עובד לשיבוץ" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: "חסר תאריך משמרת" },
        { status: 400 }
      );
    }

    if (!scheduledStart || !scheduledEnd) {
      return NextResponse.json(
        { success: false, error: "חובה להזין שעת התחלה ושעת סיום" },
        { status: 400 }
      );
    }

    const locationType =
      cleanStr(body.locationType) === "hall" ? "hall" : "home";

    const locationName = cleanStr(body.locationName);
    const locationAddress = cleanStr(body.locationAddress);

    if (locationType === "hall" && !locationAddress) {
      return NextResponse.json(
        { success: false, error: "באולם חובה להזין מיקום/כתובת אולם" },
        { status: 400 }
      );
    }

    const employee = await getEmployee(employeeId);
    const employeeObjectId = toObjectId(employeeId);

    const employeeName =
      cleanStr(body.employeeName) ||
      cleanStr(employee?.name || employee?.fullName) ||
      "עובד ללא שם";

    const employeeEmail =
      cleanStr(body.employeeEmail) || cleanStr(employee?.email);

    const employeePhone =
      cleanStr(body.employeePhone) || cleanStr(employee?.phone);

    const month = date.slice(0, 7);
    const now = new Date();

    const shiftLabel = buildShiftLabel({
      locationType,
      locationName,
      locationAddress,
    });

    const doc: Record<string, any> = {
      employeeId,
      employeeIdString: employeeId,
      employeeName,
      employeeEmail,
      employeePhone,

      date,
      dayName: getDayName(date),
      month,

      scheduledStart,
      scheduledEnd,

      // השדות האלה נקראים בעמוד שעות עובד
      shiftStart: scheduledStart,
      shiftEnd: scheduledEnd,
      startTime: scheduledStart,
      endTime: scheduledEnd,

      locationType,
      locationName,
      locationAddress,

      // זה מה שיופיע בעמוד שעות תחת "שיבוץ"
      shiftLabel,

      note: cleanStr(body.note),

      updatedAt: now,
      updatedBy: authUser.id,
    };

    if (employeeObjectId) {
      doc.employeeObjectId = employeeObjectId;
    }

    const existing = await database.collection(COLLECTION).findOne({
      employeeIdString: employeeId,
      date,
    });

    if (existing?._id) {
      await database.collection(COLLECTION).updateOne(
        { _id: existing._id },
        {
          $set: doc,
        }
      );

      const updated = await database
        .collection(COLLECTION)
        .findOne({ _id: existing._id });

      return NextResponse.json({
        success: true,
        shift: normalizeShift(updated),
      });
    }

    const inserted = await database.collection(COLLECTION).insertOne({
      ...doc,
      createdAt: now,
      createdBy: authUser.id,
    });

    const shift = await database
      .collection(COLLECTION)
      .findOne({ _id: inserted.insertedId });

    return NextResponse.json({
      success: true,
      shift: normalizeShift(shift),
    });
  } catch (error) {
    console.error("POST ADMIN EMPLOYEE SHIFT FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בשמירת שיבוץ",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const url = new URL(request.url);
    const shiftId = cleanStr(url.searchParams.get("shiftId"));

    const objectId = toObjectId(shiftId);

    if (!objectId) {
      return NextResponse.json(
        { success: false, error: "מזהה שיבוץ לא תקין" },
        { status: 400 }
      );
    }

    await database.collection(COLLECTION).deleteOne({ _id: objectId });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE ADMIN EMPLOYEE SHIFT FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה במחיקת שיבוץ",
      },
      { status: 500 }
    );
  }
}