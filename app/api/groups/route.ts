import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export async function GET(req: Request) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false },
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
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ success: true, groups });
  } catch (err) {
    console.error("GET /api/groups error", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
