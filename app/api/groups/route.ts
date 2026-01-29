import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import Invitation from "@/models/Invitation";
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
    const { invitationId, name, color, expectedCount = 0 } = body;

    if (!invitationId || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // שליפת eventId מהזמנה
    const invitation = await Invitation
      .findById(invitationId)
      .select("eventId");

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    const order = await Group.countDocuments({ invitationId });

    const group = await Group.create({
      invitationId,
      eventId: invitation.eventId,
      name: name.trim(),
      color: color || null,
      expectedCount,
      order,
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

/* ============================================================
   PATCH — שיבוץ / הסרת קבוצה לשולחן
============================================================ */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { groupId, tableId } = await req.json();

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Missing groupId" },
        { status: 400 }
      );
    }

    const group = await Group.findByIdAndUpdate(
      groupId,
      {
        tableId: tableId || null,
        isSeated: !!tableId,
      },
      { new: true }
    ).lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, group });
  } catch (err) {
    console.error("PATCH /api/groups error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
