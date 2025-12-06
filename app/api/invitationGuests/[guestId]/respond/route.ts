import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";

export async function POST(
  req: Request,
  context: { params: { guestId: string } }
) {
  try {
    await db();

    const { guestId } = context.params;
    const body = await req.json();
    const { rsvp, guestsCount, notes } = body;

    const guest = await Guest.findByIdAndUpdate(
      guestId,
      { rsvp, guestsCount, notes },
      { new: true }
    );

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, guest });
  } catch (err) {
    console.error("❌ Error in POST /api/invitationGuests/[guestId]/respond:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
