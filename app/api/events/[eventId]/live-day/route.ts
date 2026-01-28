import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    await db();

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params; // ⭐️ חובה await
    const { isLiveDay } = await req.json();

    const event = await Event.findByIdAndUpdate(
      eventId,
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
