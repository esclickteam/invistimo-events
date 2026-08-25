import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { planSingleGuestWrite } from "@/lib/invitationGuestWrites";

/* ============================================================
   POST — עדכון RSVP לפי shareId + token של האורח
   ❗️ מעדכן רק arrivedCount (מגיעים)
   ❗️ לא נוגע ב-guestsCount (מוזמנים)
============================================================ */
export async function POST(
  req: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    await db();

    const { shareId } = await context.params;

    // ❗ arrivedCount בלבד
    const { token, rsvp, arrivedCount, notes } = await req.json();

    if (!shareId || !token) {
      return NextResponse.json(
        { success: false, error: "Missing shareId or token" },
        { status: 400 }
      );
    }

    /* ============================================================
       שליפת ההזמנה
    ============================================================ */
    const invitation = await Invitation.findOne({ shareId });
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    /* ============================================================
       שליפת האורח לפי token
    ============================================================ */
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

    /* ============================================================
       עדכון נתוני האורח
       ❗️ guestsCount (מוזמנים) — לא נוגעים
    ============================================================ */
    const nextRsvp =
      rsvp === "yes" || rsvp === "no" || rsvp === "pending"
        ? rsvp
        : String(guest.rsvp || "pending");

    const nextNotes = notes !== undefined ? notes : guest.notes;
    const nextArrivedCount =
      nextRsvp === "yes"
        ? typeof arrivedCount === "number" && arrivedCount >= 0
          ? arrivedCount
          : guest.arrivedCount
        : 0;

    const writePlan = planSingleGuestWrite({
      source: "invite.rsvp",
      guestId: String(guest._id),
      invitationId: String(invitation._id),
      current: {
        rsvp: guest.rsvp,
        notes: guest.notes,
        arrivedCount: guest.arrivedCount,
      },
      next: {
        rsvp: nextRsvp,
        notes: nextNotes,
        arrivedCount: nextArrivedCount,
      },
      keys: ["rsvp", "notes", "arrivedCount"],
    });

    if (writePlan.shouldWrite) {
      guest.rsvp = nextRsvp;
      if (notes !== undefined) {
        guest.notes = notes;
      }
      guest.arrivedCount = nextArrivedCount;
      await guest.save();
    } else {
      return NextResponse.json({
        success: true,
        guest,
        stats: invitation.stats,
        skippedWrite: true,
      });
    }

    /* ============================================================
       חישוב סטטיסטיקות כלליות להזמנה
    ============================================================ */
    const allGuests = await InvitationGuest.find({
      invitationId: invitation._id,
    });

    // ✅ סה"כ מוזמנים (קבוע — לפי הזמנות, לא אישורים)
    const totalInvited = allGuests.reduce(
      (sum, g) => sum + (g.guestsCount || 0),
      0
    );

    // ✅ סה"כ מגיעים בפועל
    const totalArrived = allGuests.reduce(
      (sum, g) => sum + (g.arrivedCount || 0),
      0
    );

    // סטטוס RSVP לפי אורחים (לא לפי כמות אנשים)
    const totalYes = allGuests.filter((g) => g.rsvp === "yes").length;
    const totalNo = allGuests.filter((g) => g.rsvp === "no").length;
    const totalPending = allGuests.filter((g) => g.rsvp === "pending").length;

    invitation.stats = {
      totalInvited,   // מוזמנים
      totalArrived,   // מגיעים
      totalYes,
      totalNo,
      totalPending,
    };

    await invitation.save();

    /* ============================================================
       Response
    ============================================================ */
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
