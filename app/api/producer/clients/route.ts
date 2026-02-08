import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    /* =========================
       🔐 Auth – Producer
    ========================= */
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId || auth.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const producerId = auth.userId;

    /* =========================
       👥 Clients – לפי assignedProducerId
    ========================= */
    const clients = await User.find({
      role: "user",
      assignedProducerId: producerId,
    })
      .select("name email phone createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (!clients.length) {
      return NextResponse.json({ success: true, clients: [] });
    }

    const clientIds = clients.map((c) => c._id);

    /* =========================
       🎉 Events
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
       ✉️ Invitations
    ========================= */
    const invitations = await Invitation.find({
      eventId: { $in: eventIds },
    })
      .select("_id eventId")
      .lean();

    const invitationIds = invitations.map((i) => i._id);

    const invitationsByEventId = invitations.reduce((acc: any, inv: any) => {
      const key = String(inv.eventId);
      acc[key] = acc[key] || [];
      acc[key].push(inv._id);
      return acc;
    }, {});

    /* =========================
       📊 RSVP from InvitationGuest
    ========================= */
    const guestStats = await InvitationGuest.aggregate([
      {
        $match: {
          invitationId: { $in: invitationIds },
        },
      },
      {
        $group: {
          _id: "$invitationId",
          totalGuests: { $sum: "$guestsCount" },
          approvedCount: {
            $sum: {
              $cond: [{ $eq: ["$rsvp", "yes"] }, "$guestsCount", 0],
            },
          },
        },
      },
    ]);

    const statsByInvitationId = Object.fromEntries(
      guestStats.map((g: any) => [
        String(g._id),
        {
          totalGuests: g.totalGuests,
          approvedCount: g.approvedCount,
        },
      ])
    );

    /* =========================
       🔗 Merge Client + Event + Stats
    ========================= */
    const result = clients.map((client: any) => {
      const event = eventsByUserId[String(client._id)];
      if (!event) return { ...client, event: null };

      const invIds = invitationsByEventId[String(event._id)] || [];

      let totalGuests = 0;
      let approvedCount = 0;

      for (const invId of invIds) {
        const stats = statsByInvitationId[String(invId)];
        if (stats) {
          totalGuests += stats.totalGuests;
          approvedCount += stats.approvedCount;
        }
      }

      return {
        ...client,
        event: {
          date: event.date,
          location:
            typeof event.location === "object"
              ? event.location.address
              : event.location,
          totalGuests,
          approvedCount,
        },
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
