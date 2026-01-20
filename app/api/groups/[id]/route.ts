import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/* ============================================
   PATCH — עדכון קבוצה
============================================ */
export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const data = await req.json();

    const group = await Group.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );

    return NextResponse.json({ success: true, group });
  } catch (err) {
    console.error("PATCH /groups/[id] error:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}

/* ============================================
   DELETE — מחיקת קבוצה
============================================ */
export async function DELETE(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    await Group.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /groups/[id] error:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
