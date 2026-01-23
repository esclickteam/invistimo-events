import { NextResponse } from "next/server";
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
   GET /api/events/:eventId/groups
============================================================ */
export async function GET(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) return unauthorized();

    const groups = await Group.find({ eventId: params.eventId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ success: true, groups });
  } catch (err) {
    return serverError(err);
  }
}

/* ============================================================
   POST – יצירת קבוצה חדשה
   POST /api/events/:eventId/groups
   body: { name: string, color?: string }
============================================================ */
export async function POST(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) return unauthorized();

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const color = body?.color ?? null;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Missing group name" },
        { status: 400 }
      );
    }

    const order = await Group.countDocuments({
      eventId: params.eventId,
    });

    const group = await Group.create({
      eventId: params.eventId,
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
   PATCH – עדכון קבוצה (שם / צבע / סדר)
   PATCH /api/events/:eventId/groups
   body: { groupId, name?, color?, order? }
============================================================ */
export async function PATCH(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) return unauthorized();

    const body = await req.json();
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
      { _id: groupId, eventId: params.eventId },
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
   DELETE /api/events/:eventId/groups
   body: { groupId }
============================================================ */
export async function DELETE(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) return unauthorized();

    const body = await req.json();
    const { groupId } = body || {};

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Missing groupId" },
        { status: 400 }
      );
    }

    const res = await Group.deleteOne({
      _id: groupId,
      eventId: params.eventId,
    });

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
