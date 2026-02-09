import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { connectDB } from "@/lib/db";

export async function GET() {
  await connectDB();

  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return Response.json({ success: false }, { status: 401 });
  }

  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

  if (decoded.role !== "staff") {
    return Response.json({ success: false }, { status: 403 });
  }

  const staff = await User.findById(decoded.userId).lean();
  if (!staff || staff.staffType !== "producer_staff") {
    return Response.json({ success: false }, { status: 403 });
  }

  const clientIds = (staff.assignedClientIds || []).map(
    (id: any) => new mongoose.Types.ObjectId(id)
  );

  if (clientIds.length === 0) {
    return Response.json({ success: true, clients: [] });
  }

  /* =========================
     👥 Clients
  ========================= */
  const clients = await User.find({
    _id: { $in: clientIds },
    role: { $in: ["client", "user"] },
  })
    .select("name email phone createdAt")
    .lean();

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

  return Response.json({ success: true, clients: result });
}
