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

    const auth = await getUserIdFromRequest();
    if (!auth?.userId || auth.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const producerId = auth.userId;

    const clients = await User.find({
      role: "client",
      producerId,
    })
      .populate({
        path: "eventId",
        select: "date location maxGuests",
      })
      .sort({ createdAt: -1 })
      .lean();

    /* =========================
       חישובי אישרו הגעה
    ========================= */
    const result = await Promise.all(
      clients.map(async (client) => {
        let approvedCount = 0;

        if (client.eventId?._id) {
          const guests = await InvitationGuest.find({
            eventId: client.eventId._id,
            rsvp: "yes",
          }).lean();

          approvedCount = guests.reduce(
            (s, g) => s + Number(g.guestsCount || 0),
            0
          );
        }

        return {
          ...client,
          event: client.eventId
            ? {
                date: client.eventId.date,
                location: client.eventId.location,
                totalGuests: client.eventId.maxGuests || 0,
                approvedCount,
              }
            : null,
        };
      })
    );

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
