import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // 🔐 אימות
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const user = await User.findById(auth.userId).lean();
    if (!user?.planLimits?.seatingEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Seating not allowed for this plan",
        },
        { status: 403 }
      );
    }

    // 🎯 invitationId מה-query
    const invitationId =
      req.nextUrl.searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "Missing invitationId" },
        { status: 400 }
      );
    }

    // 📦 שליפת הושבה לפי invitationId
    const record = await SeatingTable.findOne({
      invitationId,
    }).lean();

    return NextResponse.json({
      success: true,
      tables: record?.tables || [],
      background: record?.background ?? null,
      zones: record?.zones || [],
      canvasView: record?.canvasView ?? null,
    });
  } catch (err) {
    console.error("❌ Load seating tables error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
