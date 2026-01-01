import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

export async function POST(req: Request, context: { params: Promise<{ shareId: string }> }) {
  try {
    await db();
    const { shareId } = await context.params;
    const { token, rsvp, guestsCount, notes } = await req.json();

    const invitation = await Invitation.findOne({ shareId });
    if (!invitation) {
      return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404 });
    }

    const guest = await InvitationGuest.findOne({ token, invitationId: invitation._id });
    if (!guest) {
      return NextResponse.json({ success: false, error: "Guest not found" }, { status: 404 });
    }

    // עדכון בפועל
    if (rsvp) guest.rsvp = rsvp;
    if (guestsCount) guest.guestsCount = guestsCount;
    if (notes) guest.notes = notes;

    await guest.save();

    return NextResponse.json({ success: true, guest });
  } catch (err) {
    console.error("❌ RSVP update error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
