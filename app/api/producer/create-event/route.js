import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

import Event from "@/models/Event";
import User from "@/models/User";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* =========================================================
   🔐 Auth helper
========================================================= */
async function getProducerFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const producerId = decoded?.id || decoded?._id;
    if (!producerId) return null;

    const producer = await User.findById(producerId).select("role email");
    if (!producer) return null;
    if (producer.role !== "producer" && producer.role !== "admin") return null;

    return producer;
  } catch {
    return null;
  }
}

/* =========================================================
   GET – Fetch producer events (for dashboard stats)
========================================================= */
export async function GET() {
  try {
    await connectDB();

    const producer = await getProducerFromToken();
    if (!producer) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const events = await Event.find({ producerId: producer._id })
      .select("date status")
      .lean();

    const enriched = await Promise.all(
      events.map(async (event) => {
        const totalGuests = await InvitationGuest.countDocuments({
          eventId: event._id,
        });

        const approvedCount = await InvitationGuest.countDocuments({
          eventId: event._id,
          rsvp: "approved",
        });

        return {
          _id: event._id,
          date: event.date,
          status: event.status,
          totalGuests,
          approvedCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      events: enriched,
    });
  } catch (err) {
    console.error("❌ GET producer events error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST – Create event
========================================================= */
export async function POST(req) {
  try {
    await connectDB();

    const producer = await getProducerFromToken();
    if (!producer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      userId,
      eventType,
      title,
      date,
      location,
      maxGuests,
    } = await req.json();

    if (!userId || !eventType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await User.findById(userId).select("email name");
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const existing = await Event.findOne({
      userId,
      producerId: producer._id,
      eventType,
      title: title || "",
      date: date || "",
    });

    if (existing) {
      return NextResponse.json({ success: true, event: existing });
    }

    const event = await Event.create({
      userId,
      producerId: producer._id,
      email: client.email,
      eventType,
      title: title || "",
      date: date || "",
      location: location || "",
      maxGuests: Number(maxGuests) || 200,
      paymentStatus: "paid",
      status: "active",
    });

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("❌ create-event error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
