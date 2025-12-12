import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    await db();

    const body = await req.json();
    const { rsvp, guestsCount, notes } = body;

    const guest = await InvitationGuest.findOne({ token });
    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    guest.rsvp = rsvp;
    guest.guestsCount = guestsCount;

    // ✅ תיקון קריטי
    if (typeof notes === "string") {
      guest.notes = notes;
    } else if (Array.isArray(notes)) {
      guest.notes = notes.join(", ");
    } else {
      guest.notes = "";
    }

    await guest.save();

    return NextResponse.json({ success: true, guest });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
