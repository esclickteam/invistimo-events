import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Group from "@/models/Group";

/* ===============================
   GET /api/seating/groups/:invitationId
=============================== */
export async function GET(
  req: Request,
  { params }: { params: { invitationId: string } }
) {
  try {
    await dbConnect();

    const { invitationId } = params;

    if (!invitationId) {
      return NextResponse.json(
        { success: false, message: "invitationId חסר" },
        { status: 400 }
      );
    }

    const groups = await Group.find({ invitationId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      groups,
    });
  } catch (err) {
    console.error("❌ GET groups error:", err);
    return NextResponse.json(
      { success: false, message: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
