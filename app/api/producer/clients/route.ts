import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import InvitationGuest from "@/models/InvitationGuest";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    /* =========================
       🔐 Auth – מפיק מחובר
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
       👥 Fetch clients (לא מסננים!)
    ========================= */
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
       📊 חישובי אישרו הגעה
       ⚠️ רק אם יש event
    ========================= */
    const result = await Promise.all(
      clients.map(async (client) => {
        let approvedCount = 0;

        if (client.eventId && client.eventId._id) {
          const guests = await InvitationGuest.find({
            eventId: client.eventId._id,
            rsvp: "yes",
          }).lean();

          approvedCount = guests.reduce(
            (sum, g) => sum + Number(g.guestsCount || 0),
            0
          );
        }

        return {
          ...client,

          // 👇 זה בדיוק מה שה־UI מצפה לו
          event: client.eventId
            ? {
                date: client.eventId.date ?? null,
                location: client.eventId.location ?? null,
                totalGuests: client.eventId.maxGuests ?? 0,
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
