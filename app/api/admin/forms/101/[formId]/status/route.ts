import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import EmployeeForm101 from "@/models/EmployeeForm101";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    formId: string;
  }>;
};

function extractUserId(authResult: any) {
  if (!authResult) return "";

  if (typeof authResult === "string") {
    return authResult;
  }

  return String(
    authResult.userId ||
      authResult.id ||
      authResult._id ||
      authResult.sub ||
      ""
  );
}

async function requireAdmin(req: NextRequest) {
  const authResult = await getUserIdFromRequest(req);
  const userId = extractUserId(authResult);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const user = await User.findById(userId).lean();

  if (!user) return null;

  const role = String((user as any).role || "").toLowerCase();

  if (role !== "admin") {
    return null;
  }

  return user;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const admin = await requireAdmin(req);

    if (!admin) {
      return NextResponse.json(
        { error: "אין הרשאת אדמין" },
        { status: 403 }
      );
    }

    const { formId } = await context.params;

    if (!formId || !mongoose.Types.ObjectId.isValid(formId)) {
      return NextResponse.json(
        { error: "formId לא תקין" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const status = String(body?.status || "").trim();

    if (!["uploaded", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "סטטוס לא תקין" },
        { status: 400 }
      );
    }

    const updated = await EmployeeForm101.findByIdAndUpdate(
      formId,
      {
        status,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { error: "טופס לא נמצא" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      form: updated,
    });
  } catch (error) {
    console.error("ADMIN UPDATE FORM 101 STATUS FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בעדכון סטטוס טופס 101" },
      { status: 500 }
    );
  }
}