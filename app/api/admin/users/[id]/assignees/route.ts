import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   Helpers
========================================================= */
function isValidObjectId(value: unknown): boolean {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

function toObjectId(value: string) {
  return new mongoose.Types.ObjectId(value);
}

/* =========================================================
   PATCH – UPDATE USER ASSIGNEES (ADMIN ONLY)
   Route: /api/admin/users/[id]/assignees
========================================================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    /* ===== PARAMS ===== */
    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "INVALID_USER_ID" },
        { status: 400 }
      );
    }

    /* ===== AUTH ===== */
    const cookieStore = await cookies();
    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { success: false, error: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* ===== BODY ===== */
    const body = await req.json().catch(() => ({}));
    const rawAssignedProducerId = body?.assignedProducerId ?? null;
    const rawAssignedStaffIds = Array.isArray(body?.assignedStaffIds)
      ? body.assignedStaffIds
      : [];

    // Normalize producer id
    const assignedProducerId: string | null =
      rawAssignedProducerId && isValidObjectId(String(rawAssignedProducerId))
        ? String(rawAssignedProducerId)
        : null;

    // Normalize + dedupe staff ids
    const assignedStaffIds: string[] = Array.from(
      new Set(
        rawAssignedStaffIds
          .map((v: unknown) => String(v))
          .filter((v: string) => isValidObjectId(v))
      )
    );

    const clientObjectId = toObjectId(id);

    /* ===== Ensure target user exists ===== */
    const targetUser = await User.findById(id)
      .select("_id role assignedStaffIds assignedProducerId")
      .lean();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // אם תרצי להגביל רק ללקוח/יוזר:
    // if (!["client", "user"].includes(String(targetUser.role))) {
    //   return NextResponse.json(
    //     { success: false, error: "TARGET_MUST_BE_CLIENT_OR_USER" },
    //     { status: 400 }
    //   );
    // }

    /* ===== Validate producer (optional but recommended) ===== */
    if (assignedProducerId) {
      const producerExists = await User.exists({
        _id: toObjectId(assignedProducerId),
        role: "producer",
      });

      if (!producerExists) {
        return NextResponse.json(
          { success: false, error: "INVALID_ASSIGNED_PRODUCER" },
          { status: 400 }
        );
      }
    }

    /* ===== Validate staff users ===== */
    if (assignedStaffIds.length > 0) {
      const staffCount = await User.countDocuments({
        _id: { $in: assignedStaffIds.map(toObjectId) },
        $or: [
          { role: "staff" },
          { role: "user", staffType: { $in: ["producer_staff", "producer-staff", "staff"] } },
        ],
      });

      if (staffCount !== assignedStaffIds.length) {
        return NextResponse.json(
          { success: false, error: "INVALID_ASSIGNED_STAFF_IDS" },
          { status: 400 }
        );
      }
    }

    /* =========================================================
       1) Update target user assignees
    ========================================================= */
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          assignedProducerId: assignedProducerId ? toObjectId(assignedProducerId) : null,
          assignedStaffIds: assignedStaffIds.map(toObjectId),
        },
      },
      { new: true }
    )
      .select("_id name email role assignedProducerId assignedStaffIds")
      .lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND_AFTER_UPDATE" },
        { status: 404 }
      );
    }

    /* =========================================================
       2) Sync reverse relation on staff.assignedClientIds
          - remove client from all staff first
          - add client only to selected staff
    ========================================================= */
    await User.updateMany(
      {
        $or: [
          { role: "staff" },
          { role: "user", staffType: { $in: ["producer_staff", "producer-staff", "staff"] } },
        ],
      },
      { $pull: { assignedClientIds: clientObjectId } }
    );

    if (assignedStaffIds.length > 0) {
      await User.updateMany(
        { _id: { $in: assignedStaffIds.map(toObjectId) } },
        { $addToSet: { assignedClientIds: clientObjectId } }
      );
    }

    /* ===== Return useful payload ===== */
    return NextResponse.json({
      success: true,
      user: updatedUser,
      debug: {
        assignedProducerId,
        assignedStaffIds,
        syncedClientId: id,
      },
    });
  } catch (err) {
    console.error("❌ ASSIGN UPDATE ERROR:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
