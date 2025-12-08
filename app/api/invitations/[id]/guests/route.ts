import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

/* ==========================================================
   טיפוס לגרסאות Next.js 16+
   (params הוא Promise ולכן נדרש await)
========================================================== */
type RouteContext = {
  params: Promise<{ id: string }>;
};

/* ==========================================================
   POST — יצירת אורח חדש להזמנה
========================================================== */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: invitationId } = await params; // ✅ await חובה

  try {
    await db();

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

    // 🔎 בדיקת כפילות — אותו טלפון באותה הזמנה
    const existingGuest = await InvitationGuest.findOne({ phone, invitationId });

    if (existingGuest) {
      return NextResponse.json(
        {
          error: "Guest already exists for this event",
          guest: existingGuest,
        },
        { status: 409 }
      );
    }

    // 🆔 token ייחודי לקישור RSVP אישי
    const token = nanoid(12);

    // 🟢 יצירת אורח חדש
    const guest = await InvitationGuest.create({
      name,
      phone,
      invitationId,
      rsvp: "pending",
      guestsCount: 1,
      notes: "",
      token, // ⭐ מזהה ייחודי לצורך קישור אישי
    });

    return NextResponse.json({ success: true, guest }, { status: 201 });
  } catch (err) {
    console.error("❌ Error in POST /api/invitations/[id]/guests:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
