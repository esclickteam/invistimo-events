import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* ============================================================
   PATCH /api/groups/:id
============================================================ */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();

    const group = await Group.findByIdAndUpdate(
      params.id,
      data,
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
    console.error("PATCH /api/groups/:id error:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE /api/groups/:id
============================================================ */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const group = await Group.findByIdAndDelete(params.id);

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/groups/:id error:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
