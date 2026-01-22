import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    /* =========================
       🔐 Auth – Producer only
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
       📩 Fetch Invitations (clients source)
    ========================= */
    const invitations = await Invitation.find({ producerId })
      .populate({
        path: "userId", // optional – אם קיים יוזר
        select: "hasPaid plan planLimits",
        model: User,
      })
      .populate({
        path: "eventId",
        select: "date location status",
        model: Event,
      })
      .sort({ createdAt: -1 })
      .lean();

    /* =========================
       🧩 Normalize for frontend
    ========================= */
    const clients = invitations.map((inv) => ({
      id: inv._id,

      // 👤 Client (Invitation)
      name: inv.fullName,
      email: inv.email,
      phone: inv.phone,

      // 📅 Event
      eventDate: inv.eventId?.date || null,
      eventLocation: inv.eventId?.location || null,
      eventStatus: inv.eventId?.status || "draft",

      // 💳 User (if exists)
      hasPaid: inv.userId?.hasPaid || false,
      plan: inv.userId?.plan || "none",
      planLimits: inv.userId?.planLimits || null,

      createdAt: inv.createdAt,
    }));

    return NextResponse.json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error("❌ ERROR FETCHING PRODUCER CLIENTS:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
