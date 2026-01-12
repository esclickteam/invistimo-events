import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params; // ✅ חובה await
    const userId = await getUserIdFromRequest(req);
    const body = await req.json();

    const event = await Event.findOneAndUpdate(
      { _id: id, userId }, // 🔐 אבטחה
      body,
      { new: true }
    );

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (err) {
    console.error("❌ Update event failed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
