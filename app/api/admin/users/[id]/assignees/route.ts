import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectDB();

    /* =========================
       Params
    ========================= */
    const { id } = context.params;

    /* =========================
       Auth
    ========================= */
    const token = req.cookies.get("authToken")?.value;

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

    /* =========================
       Body
    ========================= */
    const { assignedProducerId, assignedStaffIds } = await req.json();

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

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("❌ ASSIGN UPDATE ERROR:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
