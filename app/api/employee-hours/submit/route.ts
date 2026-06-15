import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";

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

type SubmitBody = {
  month?: string;
  employeeId?: string;
  rows?: {
    date?: string;
    note?: string;
  }[];
};

const APPROVAL_COLLECTION = "employeehoursapprovals";

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
  return normalized === "admin" || normalized === "staff" || normalized === "employee_admin";
}

function normalizeMonth(monthValue: string) {
  const month = cleanStr(monthValue);

  if (/^\d{4}-\d{2}$/.test(month)) {
    return month;
  }

  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeDate(value: unknown) {
  const text = cleanStr(value);

  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

async function findUserBusinessId(employeeId: string) {
  const database = mongoose.connection.db;
  if (!database) return "";

  const objectId = toObjectId(employeeId);

  const user = await database.collection("users").findOne({
    $or: objectId ? [{ _id: objectId }, { id: employeeId }] : [{ id: employeeId }],
  });

  const rawBusinessId = user?.businessId || user?.business || "";

  if (!rawBusinessId) return "";

  if (typeof rawBusinessId === "string") return rawBusinessId;

  return String(rawBusinessId?._id || rawBusinessId?.id || rawBusinessId || "");
}

function normalizeRows(rows: SubmitBody["rows"]) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const date = normalizeDate(row?.date);
      const note = cleanStr(row?.note);

      if (!date) return null;

      return {
        date,
        note,
        updatedAt: new Date(),
      };
    })
    .filter(Boolean);
}

function buildEmployeeQuery(employeeId: string, month: string) {
  const objectId = toObjectId(employeeId);

  return {
    month,
    $or: objectId
      ? [{ employeeId: objectId }, { employeeId }]
      : [{ employeeId }],
  };
}

export async function POST(request: NextRequest) {
  try {
    await db();

    const authUser = await getAuthUser();

    if (!authUser?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as SubmitBody;

    const requestedEmployeeId = cleanStr(body.employeeId);

    const employeeId =
      requestedEmployeeId && isAdminLike(authUser.role)
        ? requestedEmployeeId
        : authUser.id;

    const employeeObjectId = toObjectId(employeeId);
    const businessId = authUser.businessId || (await findUserBusinessId(employeeId));
    const businessObjectId = toObjectId(businessId);

    const month = normalizeMonth(body.month || "");
    const rows = normalizeRows(body.rows);

    const database = mongoose.connection.db;

    if (!database) {
      return NextResponse.json(
        { success: false, error: "DATABASE_NOT_CONNECTED" },
        { status: 500 },
      );
    }

    const collection = database.collection(APPROVAL_COLLECTION);

    const existing = await collection.findOne(buildEmployeeQuery(employeeId, month));

    if (
      existing?.status === "submitted" ||
      existing?.status === "approved"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            existing.status === "approved"
              ? "החודש כבר אושר ולא ניתן לשלוח מחדש"
              : "החודש כבר נשלח לאישור",
          status: existing.status,
        },
        { status: 409 },
      );
    }

    const now = new Date();

    const documentToSet = {
      employeeId: employeeObjectId || employeeId,
      employeeIdString: employeeId,

      businessId: businessObjectId || businessId || null,
      businessIdString: businessId || "",

      month,
      rows,

      status: "submitted",
      submittedAt: now,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: "",

      submittedBy: employeeObjectId || employeeId,
      submittedByString: employeeId,

      updatedAt: now,
    };

    const result = await collection.findOneAndUpdate(
      buildEmployeeQuery(employeeId, month),
      {
        $set: documentToSet,
        $setOnInsert: {
          createdAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );

    return NextResponse.json({
      success: true,
      status: "submitted",
      submittedAt: now.toISOString(),
      approval: result,
      summary: {
        month,
        status: "submitted",
        submittedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST EMPLOYEE HOURS SUBMIT FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "שגיאה בשליחת שעות לאישור",
      },
      { status: 500 },
    );
  }
}