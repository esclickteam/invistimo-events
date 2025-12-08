import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

// מניעת Cache
export const dynamic = "force-dynamic";

/* ================================
   ✔️ GET - שליפת אורח יחיד (לא חובה)
================================ */
export async function GET(req: Request, context: any) {
  try {
    await db();
    const guestId = context.params.id;

    const guest = await Guest.findById(guestId);
    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    return NextResponse.json({ success: true, guest });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================================
   ✏️ PUT - עדכון אורח
   ✔ רק בעל האירוע יכול לערוך
   ✔ אורח לא יכול לערוך את עצמו
================================ */
export async function PUT(req: Request, context: any) {
  try {
    await db();

    const guestId = context.params.id;
    const body = await req.json();

    // שליפת האורח
    const guest = await Guest.findById(guestId);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // שליפת ההזמנה כדי לבדוק בעלות
    const invitation = await Invitation.findById(guest.invitationId);
    if (!invitation) {
      return NextResponse.json({ error: "Parent invitation not found" }, { status: 404 });
    }

    // בדיקת הרשאות: רק בעל האירוע
    const userId = await getUserIdFromRequest();
    if (!userId || userId.toString() !== invitation.ownerId.toString()) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // עדכון מותר לבעל האירוע:
    guest.name = body.name ?? guest.name;
    guest.phone = body.phone ?? guest.phone;
    guest.rsvp = body.rsvp ?? guest.rsvp;
    guest.guestsCount = body.guestsCount ?? guest.guestsCount;
    guest.notes = body.notes ?? guest.notes;

    await guest.save();

    return NextResponse.json({ success: true, guest });
  } catch (err) {
    console.error("PUT /guests/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================================
   ❌ DELETE - מחיקת אורח
   ✔ רק בעל האירוע יכול למחוק
================================ */
export async function DELETE(req: Request, context: any) {
  try {
    await db();

    const guestId = context.params.id;

    const guest = await Guest.findById(guestId);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // בדיקת בעלות על האירוע
    const invitation = await Invitation.findById(guest.invitationId);

    const userId = await getUserIdFromRequest();
    if (!userId || userId.toString() !== invitation.ownerId.toString()) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await guest.deleteOne();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /guests/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
