import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params; // ✅ לפי הטיפוס ש-Next מצפה לו אצלך

  try {
    await db();

    const body = await req.json();
    const { rsvp, guestsCount, notes } = body;

    // ✅ ולידציה בסיסית
    if (!rsvp || !["yes", "no", "pending"].includes(rsvp)) {
      return NextResponse.json(
        { success: false, error: "Invalid RSVP value" },
        { status: 400 }
      );
    }

    // ✅ guestsCount תקין
    let validatedGuestsCount = guestsCount;
    if (rsvp === "no") validatedGuestsCount = 0;
    else if (!validatedGuestsCount || validatedGuestsCount < 1)
      validatedGuestsCount = 1;

    const guest = await InvitationGuest.findOne({ token });
    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    guest.rsvp = rsvp;
    guest.guestsCount = validatedGuestsCount;

    // ✅ notes: תומך גם במערך וגם במחרוזת
    if (typeof notes === "string") guest.notes = notes;
    else if (Array.isArray(notes)) guest.notes = notes.join(", ");
    else guest.notes = "";

    await guest.save();

    return NextResponse.json({ success: true, guest }, { status: 200 });
  } catch (err) {
    console.error("❌ respondByToken error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
