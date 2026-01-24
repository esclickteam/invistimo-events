import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const cookieStore = await cookies();
const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { budgetTotal } = body;

    const event = await Event.findOneAndUpdate(
      { _id: id, userId },
      { $set: { budgetTotal: Number(budgetTotal) || 0 } },
      { new: true }
    );

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("❌ PATCH /api/events/[id] failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
