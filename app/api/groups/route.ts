import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* ============================================================
   GET — שליפת קבוצות לפי invitationId
============================================================ */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "Missing invitationId" },
        { status: 400 }
      );
    }

    const groups = await Group.find({ invitationId })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ success: true, groups });
  } catch (err) {
    console.error("GET /api/groups error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST — יצירת קבוצה חדשה
============================================================ */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { invitationId, name, color } = body;

    if (!invitationId || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const count = await Group.countDocuments({ invitationId });

    const group = await Group.create({
      invitationId,
      name: name.trim(),
      color: color || null,
      order: count, // שומר סדר יצירה
    });

    return NextResponse.json({ success: true, group });
  } catch (err) {
    console.error("POST /api/groups error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
