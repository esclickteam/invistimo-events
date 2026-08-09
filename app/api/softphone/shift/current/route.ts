import { NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import SoftphoneWorkSession from "@/models/SoftphoneWorkSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthUser = {
  id: string;
  role?: string;
};

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
      decoded.userId ||
        decoded.id ||
        decoded._id ||
        decoded.sub ||
        decoded.employeeId ||
        "",
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

function buildEmployeeOpenSessionQuery(employeeId: string) {
  const employeeObjectId = toObjectId(employeeId);

  return {
    $and: [
      {
        $or: employeeObjectId
          ? [
              { employeeId: employeeObjectId },
              { employeeIdString: employeeId },
              { userId: employeeObjectId },
              { userId: employeeId },
            ]
          : [{ employeeIdString: employeeId }, { userId: employeeId }],
      },
      {
        $or: [{ status: "open" }, { status: { $exists: false } }],
      },
      {
        $or: [{ endedAt: null }, { endedAt: { $exists: false } }],
      },
    ],
  };
}

function normalizeSession(session: any) {
  if (!session) return null;

  const raw =
    typeof session.toObject === "function" ? session.toObject() : session;

  return {
    ...raw,
    _id: String(raw._id || ""),
    employeeId: String(raw.employeeId || raw.employeeIdString || ""),
    businessId: raw.businessId
      ? String(raw.businessId)
      : raw.businessIdString || "",
    startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : null,
    endedAt: raw.endedAt ? new Date(raw.endedAt).toISOString() : null,
    status: raw.status || (raw.endedAt ? "closed" : "open"),
  };
}

export async function GET() {
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

    const openSession = await SoftphoneWorkSession.findOne(
      buildEmployeeOpenSessionQuery(authUser.id),
    )
      .sort({ startedAt: -1 })
      .lean();

    const session = normalizeSession(openSession);

    return NextResponse.json({
      success: true,
      open: Boolean(session && !session.endedAt),
      session: session && !session.endedAt ? session : null,
    });
  } catch (error) {
    console.error("GET CURRENT SOFTPHONE SHIFT FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "שגיאה בטעינת משמרת פתוחה",
      },
      { status: 500 },
    );
  }
}
