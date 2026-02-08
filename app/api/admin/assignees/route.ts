import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/* =========================================================
   PATCH – UPDATE USER ASSIGNEES
========================================================= */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    /* ===== AUTH ===== */
    const cookieStore = await cookies();
const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const userId = params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid user id" },
        { status: 400 }
      );
    }

    /* ===== BODY ===== */
    const body = await req.json();
    const { assignedProducerId, assignedStaffIds } = body;

    // ולידציה רכה – בדיוק למה שה־UI שולח
    if (
      assignedProducerId !== null &&
      assignedProducerId !== undefined &&
      !mongoose.Types.ObjectId.isValid(assignedProducerId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid assignedProducerId" },
        { status: 400 }
      );
    }

    if (
      assignedStaffIds !== undefined &&
      !Array.isArray(assignedStaffIds)
    ) {
      return NextResponse.json(
        { success: false, error: "assignedStaffIds must be array" },
        { status: 400 }
      );
    }

    /* ===== UPDATE ===== */
    const update: any = {};

    if (assignedProducerId !== undefined) {
      update.assignedProducerId = assignedProducerId || null;
    }

    if (assignedStaffIds !== undefined) {
      update.assignedStaffIds = assignedStaffIds;
    }

    await User.findByIdAndUpdate(userId, update, { new: true });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ ASSIGNEES PATCH ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
