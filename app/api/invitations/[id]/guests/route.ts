import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

/* ==========================================================
   טיפוס נכון לגרסאות Next.js 14–16
========================================================== */
interface RouteContext {
  params: { id: string };
}

/* ==========================================================
   POST — יצירת מוזמן חדש להזמנה
========================================================== */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    await db();

    const invitationId = params.id; // 👈 אין צורך ב-await
    const { name, phone } = await req.json();

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

    // 🔎 בדיקת כפילות
    const existingGuest = await InvitationGuest.findOne({ phone, invitationId });
    if (existingGuest) {
      return NextResponse.json(
        { error: "Guest already exists for this event", guest: existingGuest },
        { status: 409 }
      );
    }

    // 🆔 token ייחודי לקישור RSVP אישי
    const token = nanoid(12);

    // 🟢 יצירת מוזמן חדש
    const guest = await InvitationGuest.create({
      name,
      phone,
      invitationId,
      rsvp: "pending",
      guestsCount: 1,
      notes: "",
      token,
    });

    return NextResponse.json({ success: true, guest }, { status: 201 });
  } catch (err) {
    console.error("❌ Error in POST /api/invitations/[id]/guests:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
