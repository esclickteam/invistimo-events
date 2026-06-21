import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   Helpers
========================================================= */
function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function cleanId(value: unknown) {
  const id = String(value || "").trim();

  if (!id) return "";
  if (!mongoose.Types.ObjectId.isValid(id)) return "";

  return id;
}

function uniqueValidIds(values: unknown) {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => cleanId(value))
        .filter(Boolean)
    )
  );
}

function toObjectIds(ids: string[]) {
  return ids.map((id) => new mongoose.Types.ObjectId(id));
}

/* =========================================================
   PATCH – UPDATE USER ASSIGNEES (ADMIN ONLY)
========================================================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    /* ===== PARAMS ===== */
    const { id } = await context.params;
    const userId = cleanId(id);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "MISSING_USER_ID" },
        { status: 400 }
      );
    }

    /* ===== AUTH ===== */
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* ===== BODY ===== */
    const body = await req.json().catch(() => ({}));

    const assignedProducerId = cleanId(body?.assignedProducerId);
    const nextAssignedStaffIds = uniqueValidIds(body?.assignedStaffIds);

    /* ===== EXISTING USER ===== */
    const existingUser = await User.findById(userId)
      .select("_id assignedStaffIds")
      .lean();

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const previousAssignedStaffIds = uniqueValidIds(
      (existingUser as any).assignedStaffIds || []
    );

    const removedStaffIds = previousAssignedStaffIds.filter(
      (staffId) => !nextAssignedStaffIds.includes(staffId)
    );

    const addedStaffIds = nextAssignedStaffIds.filter(
      (staffId) => !previousAssignedStaffIds.includes(staffId)
    );

    /*
      מוודאים שמקצים רק משתמשים שהם באמת עובדים.
      כולל:
      - עובד מערכת general_staff
      - עובד הושבה seating_staff
      - עובד מפיק producer_staff
    */
    const validStaffUsers = await User.find({
      _id: { $in: toObjectIds(nextAssignedStaffIds) },
      role: "staff",
      staffType: {
        $in: ["general_staff", "producer_staff", "seating_staff"],
      },
    })
      .select("_id staffType employeeScope")
      .lean();

    const validStaffIds = validStaffUsers.map((staff) =>
      String((staff as any)._id)
    );

    /* ===== UPDATE USER ===== */
    const user = await User.findByIdAndUpdate(
      userId,
      {
        assignedProducerId: assignedProducerId || null,
        assignedStaffIds: toObjectIds(validStaffIds),
      },
      { new: true }
    ).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /*
      סנכרון דו־כיווני:
      1. עובד שהוקצה ללקוח מקבל את הלקוח ב־assignedClientIds
      2. עובד שהוסר מהלקוח — הלקוח נמחק לו מ־assignedClientIds

      זה קריטי במיוחד לעובד הושבה,
      כי ההרשאה שלו להיכנס ללקוח נבדקת לפי assignedClientIds / assignedStaffIds.
    */

    const validAddedStaffIds = addedStaffIds.filter((staffId) =>
      validStaffIds.includes(staffId)
    );

    const validCurrentStaffIdsSet = new Set(validStaffIds);

    const removedOrInvalidStaffIds = Array.from(
      new Set([
        ...removedStaffIds,
        ...nextAssignedStaffIds.filter(
          (staffId) => !validCurrentStaffIdsSet.has(staffId)
        ),
      ])
    );

    if (validAddedStaffIds.length > 0) {
      await User.updateMany(
        {
          _id: { $in: toObjectIds(validAddedStaffIds) },
          role: "staff",
        },
        {
          $addToSet: {
            assignedClientIds: new mongoose.Types.ObjectId(userId),
          },
        }
      );
    }

    if (removedOrInvalidStaffIds.length > 0) {
      await User.updateMany(
        {
          _id: { $in: toObjectIds(removedOrInvalidStaffIds) },
          role: "staff",
        },
        {
          $pull: {
            assignedClientIds: new mongoose.Types.ObjectId(userId),
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user,
        assigneesSync: {
          assignedStaffIds: validStaffIds,
          addedStaffIds: validAddedStaffIds,
          removedStaffIds: removedOrInvalidStaffIds,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("❌ ASSIGN UPDATE ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}