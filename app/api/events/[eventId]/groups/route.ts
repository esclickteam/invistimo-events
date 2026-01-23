import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* ============================================================
   Helpers
============================================================ */
function unauthorized() {
  return NextResponse.json({ success: false }, { status: 401 });
}

function serverError(err: unknown) {
  console.error("❌ Groups API error:", err);
  return NextResponse.json({ success: false }, { status: 500 });
}

/* ============================================================
   GET – כל הקבוצות של אירוע
============================================================ */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) return unauthorized();

    const groups = await Group.find({ eventId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ success: true, groups });
  } catch (err) {
    return serverError(err);
  }
}

/* ============================================================
   POST – יצירת קבוצה
============================================================ */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) return unauthorized();

    const body = await request.json();
    const name = String(body?.name || "").trim();
    const color = body?.color ?? null;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Missing group name" },
        { status: 400 }
      );
    }

    const order = await Group.countDocuments({ eventId });

    const group = await Group.create({
      eventId,
      name,
      color,
      order,
    });

    return NextResponse.json({ success: true, group });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Group name already exists" },
        { status: 409 }
      );
    }
    return serverError(err);
  }
}

/* ============================================================
   PATCH – עדכון קבוצה
============================================================ */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) return unauthorized();

    const body = await request.json();
    const { groupId, name, color, order } = body || {};

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Missing groupId" },
        { status: 400 }
      );
    }

    const update: any = {};
    if (typeof name === "string") update.name = name.trim();
    if (color !== undefined) update.color = color;
    if (typeof order === "number") update.order = order;

    const group = await Group.findOneAndUpdate(
      { _id: groupId, eventId },
      { $set: update },
      { new: true }
    );

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, group });
  } catch (err) {
    return serverError(err);
  }
}

/* ============================================================
   DELETE – מחיקת קבוצה
============================================================ */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) return unauthorized();

    const body = await request.json();
    const { groupId } = body || {};

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Missing groupId" },
        { status: 400 }
      );
    }

    const res = await Group.deleteOne({ _id: groupId, eventId });

    if (res.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
