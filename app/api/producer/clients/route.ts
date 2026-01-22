import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    /* =========================
       🔐 Auth – מפיק מחובר
    ========================= */
    const auth = await getUserIdFromRequest();

    if (!auth?.userId || auth.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const producerId = auth.userId;

    /* =========================
       👥 Fetch clients
    ========================= */
    const clients = await User.find({
      role: "client",
      producerId,
    })
      .select("name email phone createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const clientIds = clients.map((c) => c._id);

    /* =========================
       🎉 Fetch events
    ========================= */
    const events = await Event.find({
      userId: { $in: clientIds },
    })
      .select("userId date location maxGuests approvedGuestsCount")
      .lean();

    const eventsByUserId = Object.fromEntries(
      events.map((e) => [String(e.userId), e])
    );

    /* =========================
       🔗 Merge
    ========================= */
    const result = clients.map((client) => {
      const event = eventsByUserId[String(client._id)];

      return {
        ...client,
        event: event
          ? {
              date: event.date,
              location:
                typeof event.location === "object"
                  ? event.location.address
                  : event.location,
              approvedCount: event.approvedGuestsCount || 0,
              totalGuests: event.maxGuests || 0,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      clients: result,
    });
  } catch (error) {
    console.error("❌ ERROR FETCHING PRODUCER CLIENTS:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
