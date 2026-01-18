import { NextResponse } from "next/server";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { error: "missing invitationId" },
        { status: 400 }
      );
    }

    // 1️⃣ מפת הושבה
    const seating = await SeatingTable.findOne({ invitationId });

    // 2️⃣ מוזמנים שאישרו הגעה
    const guests = await InvitationGuest.find({
      invitationId,
      rsvp: "yes",
    });

    return NextResponse.json({
      tables: (seating?.tables || []).map((t) => ({
        id: t._id.toString(),
        name: t.name,
        capacity: t.capacity,
      })),
      guests: guests.map((g) => ({
        id: g._id.toString(),
        name: g.name,
        tableId: g.tableId?.toString(),
        approved: g.count,
        arrived: 0, // לייב מתחיל מאפס
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );
  }
}
