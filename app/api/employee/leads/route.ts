import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import CustomerFile from "@/models/CustomerFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function isEmployeeAllowed(user: any, auth: any) {
  const role = cleanString(user?.role || auth?.role).toLowerCase();
  const staffType = cleanString(
    user?.staffType || auth?.staffType,
  ).toLowerCase();

  return (
    role === "staff" ||
    role === "employee" ||
    role === "admin" ||
    staffType === "producer_staff" ||
    staffType === "general_staff" ||
    Boolean(staffType)
  );
}

async function requireEmployee(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);

  if (!auth?.userId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "אין הרשאה לצפייה בלידים",
        },
        { status: 401 },
      ),
    };
  }

  const employeeObjectId = toObjectId(auth.userId);

  if (!employeeObjectId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "INVALID_EMPLOYEE_ID",
          message: "משתמש עובד לא תקין",
        },
        { status: 400 },
      ),
    };
  }

  const currentUser = await User.findById(employeeObjectId)
    .select("_id name email role staffType")
    .lean();

  if (!currentUser) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "EMPLOYEE_NOT_FOUND",
          message: "עובד לא נמצא",
        },
        { status: 404 },
      ),
    };
  }

  if (!isEmployeeAllowed(currentUser, auth)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "אין הרשאה לצפייה בלידים",
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    auth,
    employeeObjectId,
    currentUser,
  };
}

function buildSearchFilter(q: string) {
  if (!q) return [];

  return [
    { fullName: { $regex: q, $options: "i" } },
    { email: { $regex: q, $options: "i" } },
    { phone: { $regex: q, $options: "i" } },
    { interestedService: { $regex: q, $options: "i" } },
    { packageName: { $regex: q, $options: "i" } },
    { leadSource: { $regex: q, $options: "i" } },
    { leadProvider: { $regex: q, $options: "i" } },
    { leadStatus: { $regex: q, $options: "i" } },
    { campaignName: { $regex: q, $options: "i" } },
    { adName: { $regex: q, $options: "i" } },
    { formName: { $regex: q, $options: "i" } },
    { notes: { $regex: q, $options: "i" } },
  ];
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const required = await requireEmployee(req);

    if (!required.ok) {
      return required.response;
    }

    const { searchParams } = new URL(req.url);
    const q = cleanString(searchParams.get("q"));

    const filter: any = {
      assignedStaffIds: required.employeeObjectId,
      $or: [
        { status: "lead" },
        { leadSource: { $exists: true, $ne: "" } },
        { leadProvider: { $exists: true, $ne: "" } },
        { facebookLeadId: { $exists: true, $ne: "" } },
        { source: "facebook_lead_make" },
        { source: "whatsapp" },
        { source: "whatsapp_inbox" },
      ],
    };

    const searchOr = buildSearchFilter(q);

    if (searchOr.length > 0) {
      filter.$and = [{ $or: searchOr }];
    }

    const leads = await CustomerFile.find(filter)
      .populate("assignedStaffIds", "_id name email role staffType")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(300)
      .lean();

    return NextResponse.json(
      {
        success: true,
        employeeId: String(required.employeeObjectId),
        leads,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("GET EMPLOYEE LEADS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "שגיאה בטעינת הלידים של העובד",
      },
      { status: 500 },
    );
  }
}
