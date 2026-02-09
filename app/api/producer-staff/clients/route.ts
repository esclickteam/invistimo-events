import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { connectDB } from "@/lib/db";

export async function GET() {
  console.log("🔵 [STAFF PRODUCER CLIENTS] Route called");

  await connectDB();
  console.log("🟢 DB connected");

  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  console.log("🍪 TOKEN EXISTS:", !!token);

  if (!token) {
    console.log("❌ NO TOKEN");
    return Response.json({ success: false }, { status: 401 });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    console.log("❌ JWT VERIFY FAILED", err);
    return Response.json({ success: false }, { status: 401 });
  }

  console.log("🧩 DECODED JWT:", decoded);

  if (decoded.role !== "staff") {
    console.log("❌ NOT STAFF");
    return Response.json({ success: false }, { status: 403 });
  }

  console.log("👤 STAFF USER ID:", decoded.userId);

  const staff = await User.findById(decoded.userId).lean();
  console.log("👤 STAFF DOC:", staff);

  if (!staff) {
    console.log("❌ STAFF NOT FOUND");
    return Response.json({ success: false }, { status: 403 });
  }

  if (staff.staffType !== "producer_staff") {
    console.log("❌ NOT PRODUCER STAFF:", staff.staffType);
    return Response.json({ success: false }, { status: 403 });
  }

  const clientIds = staff.assignedClientIds || [];
  console.log("🧾 ASSIGNED CLIENT IDS:", clientIds);
  console.log(
    "🧾 CLIENT IDS TYPES:",
    clientIds.map((id: any) => ({
      value: id,
      type: typeof id,
      isObjectId: id instanceof mongoose.Types.ObjectId,
    }))
  );

  if (clientIds.length === 0) {
    console.log("⚠️ NO ASSIGNED CLIENT IDS");
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

  console.log("👥 CLIENTS FOUND:", clients.length);
  console.log("👥 CLIENT IDS:", clients.map((c) => String(c._id)));

  /* =========================
     🎉 Events
  ========================= */
  const events = await Event.find({
    userId: { $in: clientIds },
  })
    .select("_id userId date location")
    .lean();

  console.log("🎉 EVENTS FOUND:", events.length);
  console.log(
    "🎉 EVENTS USER IDS:",
    events.map((e) => String(e.userId))
  );

  const eventsByUserId = Object.fromEntries(
    events.map((e) => [String(e.userId), e])
  );

  const eventIds = events.map((e) => e._id);
  console.log("🎉 EVENT IDS:", eventIds.map(String));

  /* =========================
     ✉️ Invitations
  ========================= */
  const invitations = await Invitation.find({
    eventId: { $in: eventIds },
  })
    .select("_id eventId")
    .lean();

  console.log("✉️ INVITATIONS FOUND:", invitations.length);

  const invitationsByEventId = invitations.reduce((acc: any, inv: any) => {
    const key = String(inv.eventId);
    acc[key] = acc[key] || [];
    acc[key].push(inv._id);
    return acc;
  }, {});

  const invitationIds = invitations.map((i) => i._id);
  console.log("✉️ INVITATION IDS:", invitationIds.map(String));

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

  console.log("📊 GUEST STATS ROWS:", guestStats.length);

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
      console.log("⚠️ CLIENT WITHOUT EVENT:", String(client._id));
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

  console.log("✅ FINAL RESULT COUNT:", result.length);

  return Response.json({ success: true, clients: result });
}
