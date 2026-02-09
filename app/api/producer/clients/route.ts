import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";

import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("🔵 [PRODUCER CLIENTS] Route called");

    await dbConnect();
    console.log("🟢 DB connected");

    /* =========================
       🔐 Auth
    ========================= */
    const auth = await getUserIdFromRequest(req);
    console.log("🟡 AUTH payload:", auth);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    /* =========================
       👤 Load user from DB
    ========================= */
    const currentUser = await User.findById(auth.userId)
      .select("role staffType assignedClientIds")
      .lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 401 }
      );
    }

    const isProducer =
      currentUser.role === "producer";

    const isProducerStaff =
      currentUser.role === "staff" &&
      currentUser.staffType === "producer_staff";

    if (!isProducer && !isProducerStaff) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    /* =========================
       👥 Build clients query
    ========================= */
    const clientsQuery: any = {
      role: { $in: ["client", "user"] },
    };

    // 👑 Producer → כל הלקוחות שלו
    if (isProducer) {
      clientsQuery.assignedProducerId = new mongoose.Types.ObjectId(
        auth.userId
      );
    }

    // 👷 Producer Staff → רק לקוחות מוקצים
    if (isProducerStaff) {
      clientsQuery._id = {
        $in: (currentUser.assignedClientIds || []).map(
          (id: any) => new mongoose.Types.ObjectId(id)
        ),
      };
    }

    /* =========================
       👥 Clients
    ========================= */
    const clients = await User.find(clientsQuery)
      .select("name email phone createdAt assignedProducerId billingSource")
      .sort({ createdAt: -1 })
      .lean();

    if (clients.length === 0) {
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

    const invitationsByEventId = invitations.reduce((acc: any, inv: any) => {
      const key = String(inv.eventId);
      acc[key] = acc[key] || [];
      acc[key].push(inv._id);
      return acc;
    }, {});

    const invitationIds = invitations.map((i) => i._id);

    /* =========================
       📊 Guests stats
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
          arrivedCount: { $sum: { $ifNull: ["$arrivedCount", 0] } },
          actualArrivedCount: {
            $sum: { $ifNull: ["$actualArrivedCount", 0] },
          },
        },
      },
    ]);

    const statsByInvitationId = Object.fromEntries(
      guestStats.map((g: any) => [
        String(g._id),
        {
          totalGuests: g.totalGuests || 0,
          approvedCount: g.approvedCount || 0,
          arrivedCount: g.arrivedCount || 0,
          actualArrivedCount: g.actualArrivedCount || 0,
        },
      ])
    );

    /* =========================
       🔗 Merge
    ========================= */
    const result = clients.map((client: any) => {
      const event = eventsByUserId[String(client._id)];
      if (!event) return { ...client, event: null };

      const invIds = invitationsByEventId[String(event._id)] || [];

      let totalGuests = 0;
      let approvedCount = 0;
      let arrivedCount = 0;
      let actualArrivedCount = 0;

      for (const invId of invIds) {
        const stats = statsByInvitationId[String(invId)];
        if (!stats) continue;

        totalGuests += stats.totalGuests;
        approvedCount += stats.approvedCount;
        arrivedCount += stats.arrivedCount;
        actualArrivedCount += stats.actualArrivedCount;
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
          arrivedCount,
          actualArrivedCount,
        },
      };
    });

    return NextResponse.json({ success: true, clients: result });
  } catch (error) {
    console.error("❌ ERROR FETCHING PRODUCER CLIENTS:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
