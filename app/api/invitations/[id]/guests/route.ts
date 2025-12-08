import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

// POST → יצירת אורח חדש
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

    // 🛑 מניעת כפילות על בסיס מספר טלפון + אותו אירוע
    const existingGuest = await Guest.findOne({ phone, invitationId });

    if (existingGuest) {
      return NextResponse.json(
        {
          error: "Guest already exists for this event",
          guest: existingGuest,
        },
        { status: 409 }
      );
    }

    // 🆔 יצירת shareId אישי לאורח לטובת קישור ייחודי
    const shareId = nanoid(10);

    // 🟢 יצירת אורח חדש
    const guest = await Guest.create({
      name,
      phone,
      invitationId,
      rsvp: "pending",
      guestsCount: 1,
      notes: "",
      shareId, // ⭐ חשוב מאד — מזהה ייחודי לקישור
    });

    return NextResponse.json(
      { success: true, guest },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error in POST /api/invitations/[id]/guests:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
