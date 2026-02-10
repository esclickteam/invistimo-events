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
       🔐 Auth – Producer
    ========================= */
    const auth = await getUserIdFromRequest(req);
    console.log("🟡 AUTH payload:", auth);

    if (!auth?.userId || auth.role !== "producer") {
      console.log("🔴 UNAUTHORIZED", auth);
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const producerObjectId = new mongoose.Types.ObjectId(auth.userId);
    console.log("🟢 Producer ObjectId:", producerObjectId.toString());

    /* =========================
       👥 Clients – לפי assignedProducerId בלבד
    ========================= */
    const clients = await User.find({
      assignedProducerId: producerObjectId,
      role: { $in: ["client", "user"] },
    })
      .select("name email phone createdAt assignedProducerId billingSource")
      .sort({ createdAt: -1 })
      .lean();

    console.log("🟢 Clients found:", clients.length);

    if (clients.length === 0) {
      console.log("⚠️ NO CLIENTS MATCH QUERY");
      return NextResponse.json({ success: true, clients: [] });
    }

    const clientIds = clients.map((c: any) => c._id);

    /* =========================
       🎉 Events
    ========================= */
    const events = await Event.find({
      userId: { $in: clientIds },
    })
      .select("_id userId date location")
      .lean();

    console.log("🟢 Events found:", events.length);

    // אם יש יותר מאירוע אחד ללקוח - האחרון לפי מערך events "ינצח"
    // (אם תרצי אפשר לשנות למיון לפי date/createdAt ולבחור event ספציפי)
    const eventsByUserId: Record<string, any> = Object.fromEntries(
      events.map((e: any) => [String(e.userId), e])
    );

    const eventIds = events.map((e: any) => e._id);

    /* =========================
       ✉️ Invitations
    ========================= */
    const invitations =
      eventIds.length > 0
        ? await Invitation.find({
            eventId: { $in: eventIds },
          })
            .select("_id eventId")
            .lean()
        : [];

    console.log("🟢 Invitations found:", invitations.length);

    const invitationsByEventId = invitations.reduce((acc: any, inv: any) => {
      const key = String(inv.eventId);
      acc[key] = acc[key] || [];
      acc[key].push(inv._id);
      return acc;
    }, {});

    const invitationIds = invitations.map((i: any) => i._id);

    /* =========================
       📊 Guests stats
    ========================= */
    const guestStats =
      invitationIds.length > 0
        ? await InvitationGuest.aggregate([
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
                arrivedCount: {
                  $sum: { $ifNull: ["$arrivedCount", 0] },
                },
                actualArrivedCount: {
                  $sum: { $ifNull: ["$actualArrivedCount", 0] },
                },
              },
            },
          ])
        : [];

    console.log("🟢 Guest stats rows:", guestStats.length);

    const statsByInvitationId: Record<
      string,
      {
        totalGuests: number;
        approvedCount: number;
        arrivedCount: number;
        actualArrivedCount: number;
      }
    > = Object.fromEntries(
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
       🔗 Merge Client + Event + Stats
    ========================= */
    const result = clients.map((client: any) => {
      const event = eventsByUserId[String(client._id)];

      if (!event) {
        return { ...client, event: null };
      }

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
          _id: String(event._id), // ✅ זה התיקון הקריטי
          date: event.date,
          location:
            typeof event.location === "object"
              ? event.location?.address || ""
              : event.location || "",
          totalGuests,
          approvedCount,
          arrivedCount,
          actualArrivedCount,
        },
      };
    });

    console.log("✅ FINAL RESULT COUNT:", result.length);

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
