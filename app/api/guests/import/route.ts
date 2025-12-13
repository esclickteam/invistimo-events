import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/* ============================================================
   POST — ייבוא אורחים מאקסל
============================================================ */
export async function POST(req: Request) {
  try {
    const { invitationId, guests } = await req.json();

    if (!invitationId || !Array.isArray(guests)) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    await db();

    // 🟢 אימות בעל האירוע
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.ownerId.toString() !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: "Not authorized for this invitation" },
        { status: 403 }
      );
    }

    // 🟢 עיבוד נתוני האורחים
    const formattedGuests = guests.map((g: any) => ({
      invitationId,
      name: g.name || g["שם"] || "אורח ללא שם",
      phone: g.phone || g["טלפון"] || "",
      relation: g.relation || g["קרבה"] || "",
      rsvp:
        g.rsvp ||
        g["סטטוס"] ||
        "pending", // ערכים אפשריים: yes / no / pending
      guestsCount: Number(g.guestsCount || g["כמות משתתפים"] || 1),
      notes: g.notes || g["הערות"] || "",
      token: crypto.randomUUID(),
    }));

    // 🟢 שמירה למסד
    await InvitationGuest.insertMany(formattedGuests);

    return NextResponse.json({
      success: true,
      count: formattedGuests.length,
    });
  } catch (err) {
    console.error("❌ Import Excel error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
