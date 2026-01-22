import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import InvitationGuest from "@/models/InvitationGuest";
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

    if (clients.length === 0) {
      return NextResponse.json({ success: true, clients: [] });
    }

    const clientIds = clients.map((c) => c._id);

    /* =========================
       🎉 Fetch events
    ========================= */
    const events = await Event.find({
      userId: { $in: clientIds },
    })
      .select("_id userId date location")
      .lean();

    const eventsByUserId = Object.fromEntries(
      events.map((e) => [String(e.userId), e])
    );

    const eventIds = events.map((e) => e._id);

    /* =========================
       📊 RSVP stats (SOURCE OF TRUTH)
    ========================= */
    const guestStats = await InvitationGuest.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
        },
      },
      {
        $group: {
          _id: "$eventId",
          totalGuests: { $sum: 1 },
          approvedCount: {
            $sum: {
              $cond: [{ $eq: ["$rsvp", "approved"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const statsByEventId = Object.fromEntries(
      guestStats.map((g) => [
        String(g._id),
        {
          totalGuests: g.totalGuests,
          approvedCount: g.approvedCount,
        },
      ])
    );

    /* =========================
       🔗 Merge to final response
    ========================= */
    const result = clients.map((client) => {
      const event = eventsByUserId[String(client._id)];
      const stats = event ? statsByEventId[String(event._id)] : null;

      return {
        ...client,
        event: event
          ? {
              date: event.date,
              location:
                typeof event.location === "object"
                  ? event.location.address
                  : event.location,
              approvedCount: stats?.approvedCount || 0,
              totalGuests: stats?.totalGuests || 0,
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
