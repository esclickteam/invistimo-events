import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";

import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("🔵 [PRODUCER CLIENTS] called");

    await dbConnect();

    /* =========================
       🔐 Auth
    ========================= */
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    /* =========================
       🎯 Determine producer context
    ========================= */
    let producerId: string | null = null;

    // 👤 Producer
    if (auth.role === "producer") {
      producerId = auth.userId;
    }

    // 👷 Producer staff
    else if (
      auth.role === "staff" &&
      auth.staffType === "producer_staff" &&
      auth.assignedProducerId
    ) {
      producerId = auth.assignedProducerId;
    }

    if (!producerId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const producerObjectId = new mongoose.Types.ObjectId(producerId);

    /* =========================
       👥 Clients
    ========================= */
    const clients = await User.find({
      assignedProducerId: producerObjectId,
      role: { $in: ["client", "user"] },
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

    const invitationsByEventId = invitations.reduce<Record<string, string[]>>(
      (acc, inv) => {
        const key = String(inv.eventId);
        if (!acc[key]) acc[key] = [];
        acc[key].push(String(inv._id));
        return acc;
      },
      {}
    );

    const invitationIds = invitations.map((i) => i._id);

    /* =========================
       📊 Guest stats
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
      guestStats.map((g) => [
        String(g._id),
        {
          totalGuests: g.totalGuests || 0,
          approvedCount: g.approvedCount || 0,
        },
      ])
    );

    /* =========================
       🔗 Merge client + event + stats
    ========================= */
    const result = clients.map((client: any) => {
      const event = eventsByUserId[String(client._id)];

      if (!event) {
        return { ...client, event: null };
      }

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

    console.log("✅ clients returned:", result.length);

    return NextResponse.json({
      success: true,
      clients: result,
    });
  } catch (error) {
    console.error("❌ PRODUCER CLIENTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
