import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isLiveDay } = await req.json();

    const event = await Event.findOneAndUpdate(
      { _id: params.eventId },
      { isLiveDay: Boolean(isLiveDay) },
      { new: true }
    );

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("LIVE DAY PATCH ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
