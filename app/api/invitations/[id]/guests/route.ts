import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";

export const dynamic = "force-dynamic";

// ⚠ params בעייתי ב־Next — לכן context: any
export async function POST(req: Request, context: any) {
  try {
    await db();

    const { name, phone } = await req.json();
    const invitationId = context?.params?.id;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Missing invitation id" },
        { status: 400 }
      );
    }

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Missing guest name or phone" },
        { status: 400 }
      );
    }

    // 🛑 מניעת כפילויות: אורח עם אותו טלפון לאותו אירוע
    const existingGuest = await Guest.findOne({ phone, invitationId });

    if (existingGuest) {
      return NextResponse.json(
        {
          error: "Guest already exists for this event",
          guest: existingGuest,
        },
        { status: 409 } // 409 = Conflict
      );
    }

    // 🟢 יצירת אורח חדש
    const guest = await Guest.create({
      name,
      phone,
      invitationId,

      // ברירת מחדל ל־RSVP
      rsvp: "pending",
      guestsCount: 1,
      notes: "",
    });

    return NextResponse.json({ success: true, guest }, { status: 201 });
  } catch (err) {
    console.error("❌ Error in POST /api/invitations/[id]/guests:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
