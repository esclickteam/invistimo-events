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
    await dbConnect();

    /* =========================
       🔐 Auth
    ========================= */
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    let clientQuery: any = {
      role: { $in: ["client", "user"] },
    };

    /* =========================
       👤 Producer
    ========================= */
    if (auth.role === "producer") {
      clientQuery.assignedProducerId = new mongoose.Types.ObjectId(auth.userId);
    }

    /* =========================
       👷 Producer staff
    ========================= */
    else if (auth.role === "staff") {
      const staff = await User.findById(auth.userId).lean();

      if (
        !staff ||
        staff.staffType !== "producer_staff" ||
        !Array.isArray(staff.assignedClientIds)
      ) {
        return NextResponse.json({ success: true, clients: [] });
      }

      clientQuery._id = { $in: staff.assignedClientIds };
    }

    else {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    /* =========================
       👥 Clients
    ========================= */
    const clients = await User.find(clientQuery)
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

    const invitationsByEventId = invitations.reduce((acc: any, inv: any) => {
      const key = String(inv.eventId);
      acc[key] = acc[key] || [];
      acc[key].push(inv._id);
      return acc;
    }, {});

    const invitationIds = invitations.map((i) => i._id);

    /* =========================
       📊 Guest stats
    ========================= */
    const guestStats = await InvitationGuest.aggregate([
      { $match: { invitationId: { $in: invitationIds } } },
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
      guestStats.map((g) => [
        String(g._id),
        {
          totalGuests: g.totalGuests || 0,
          approvedCount: g.approvedCount || 0,
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

      for (const invId of invIds) {
        const stats = statsByInvitationId[String(invId)];
        if (!stats) continue;
        totalGuests += stats.totalGuests;
        approvedCount += stats.approvedCount;
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

    return NextResponse.json({ success: true, clients: result });
  } catch (err) {
    console.error("❌ PRODUCER CLIENTS ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
