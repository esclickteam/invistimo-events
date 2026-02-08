import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   PATCH – UPDATE USER ASSIGNEES (ADMIN ONLY)
========================================================= */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "MISSING_USER_ID" },
        { status: 400 }
      );
    }

    /* ===== AUTH ===== */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* ===== BODY ===== */
    const body = await req.json();
    const { assignedProducerId, assignedStaffIds } = body ?? {};

    /* ===== UPDATE ===== */
    const user = await User.findByIdAndUpdate(
      id,
      {
        assignedProducerId: assignedProducerId || null,
        assignedStaffIds: Array.isArray(assignedStaffIds)
          ? assignedStaffIds
          : [],
      },
      { new: true }
    ).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("❌ ASSIGN UPDATE ERROR:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
