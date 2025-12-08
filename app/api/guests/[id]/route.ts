import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================
   GET — שליפת אורח יחיד (אופציונלי לדשבורד)
============================================ */
export async function GET(req: Request, context: any) {
  try {
    await db();
    const guestId = context.params.id;

    const guest = await Guest.findById(guestId);
    if (!guest)
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("GET /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================
   PUT — עדכון אורח
   ✔ רק בעל האירוע יכול לבצע עדכון
============================================ */
export async function PUT(req: Request, context: any) {
  try {
    await db();
    const guestId = context.params.id;
    const body = await req.json();

    const guest = await Guest.findById(guestId);
    if (!guest)
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    // שליפה של ההזמנה שהאורח שייך אליה
    const invitation = await Invitation.findById(guest.invitationId);
    if (!invitation)
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    // בדיקת בעלות (מאוד חשוב!)
    const userId = await getUserIdFromRequest();
    if (!userId || userId.toString() !== invitation.ownerId.toString()) {
      return NextResponse.json(
        { error: "Not authorized to edit this guest" },
        { status: 403 }
      );
    }

    // ביצוע העדכון
    guest.name = body.name ?? guest.name;
    guest.phone = body.phone ?? guest.phone;
    guest.rsvp = body.rsvp ?? guest.rsvp;
    guest.guestsCount = body.guestsCount ?? guest.guestsCount;
    guest.notes = body.notes ?? guest.notes;

    await guest.save();

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("PUT /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================
   DELETE — מחיקת אורח
   ✔ רק בעל האירוע יכול למחוק אורח
============================================ */
export async function DELETE(req: Request, context: any) {
  try {
    await db();
    const guestId = context.params.id;

    const guest = await Guest.findById(guestId);
    if (!guest)
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    // בדיקה שהאורח שייך לאירוע
    const invitation = await Invitation.findById(guest.invitationId);
    if (!invitation)
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    // בדיקת בעלות (רק בעל האירוע)
    const userId = await getUserIdFromRequest();
    if (!userId || userId.toString() !== invitation.ownerId.toString()) {
      return NextResponse.json(
        { error: "Not authorized to delete this guest" },
        { status: 403 }
      );
    }

    await guest.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
