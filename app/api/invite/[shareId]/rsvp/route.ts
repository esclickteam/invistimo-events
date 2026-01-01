import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

/* ============================================================
   POST — עדכון RSVP לפי shareId + token של האורח
   כולל חישוב מחדש של הסטטיסטיקות
============================================================ */
export async function POST(
  req: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    await db();
    const { shareId } = await context.params;
    const { token, rsvp, guestsCount, notes } = await req.json();

    if (!shareId || !token) {
      return NextResponse.json(
        { success: false, error: "Missing shareId or token" },
        { status: 400 }
      );
    }

    // מוצא את ההזמנה
    const invitation = await Invitation.findOne({ shareId });
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    // מוצא את האורח לפי token והזמנה
    const guest = await InvitationGuest.findOne({
      token,
      invitationId: invitation._id,
    });
    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    // 🔄 עדכון בפועל של נתוני האורח
    if (rsvp) guest.rsvp = rsvp;
    if (guestsCount !== undefined) guest.guestsCount = guestsCount;
    if (notes !== undefined) guest.notes = notes;

    await guest.save();

    // 🧮 חישוב מחדש של הסטטיסטיקות
    const allGuests = await InvitationGuest.find({
      invitationId: invitation._id,
    });

    const totalYes = allGuests
      .filter((g) => g.rsvp === "yes")
      .reduce((sum, g) => sum + (g.guestsCount || 0), 0);

    const totalNo = allGuests.filter((g) => g.rsvp === "no").length;
    const totalPending = allGuests.filter((g) => g.rsvp === "pending").length;

    invitation.stats = {
      totalYes,
      totalNo,
      totalPending,
      totalGuests: allGuests.length,
    };

    await invitation.save();

    return NextResponse.json({
      success: true,
      guest,
      stats: invitation.stats,
    });
  } catch (err) {
    console.error("❌ RSVP update error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
