import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import Event from "@/models/Event";

// ✅ חובה: לטעון מודלים ל-populate
import "@/models/InvitationGuest";
import "@/models/Event";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — קבלת הזמנה לפי shareId
   אם מגיע token => מאתרים אורח לפי token
   מחזירים גם invitation וגם event (כולל location האמיתי)
============================================================ */
export async function GET(
  req: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    await db();

    const { shareId } = await context.params;

    if (!shareId || typeof shareId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid shareId" },
        { status: 400 }
      );
    }

    // ✅ token מה-URL: /invite/:shareId?token=...
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    /* ============================================================
       1) שליפת ההזמנה
    ============================================================ */
    const invitation = await Invitation.findOne({ shareId }).populate("guests");

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    /* ============================================================
       2) שליפת האירוע (שם נמצא location האמיתי)
    ============================================================ */
    const event = await Event.findById(invitation.eventId);

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    /* ============================================================
       3) אם יש token — אימות אורח
    ============================================================ */
    let guest = null;

    if (token) {
      guest = await InvitationGuest.findOne({ token }).lean();

      if (!guest || String(guest.invitationId) !== String(invitation._id)) {
        return NextResponse.json(
          { success: false, error: "INVALID_TOKEN" },
          { status: 404 }
        );
      }
    }

    /* ============================================================
       4) ניקוי לאובייקטים רגילים (lean-safe)
    ============================================================ */
    const cleanInvitation = JSON.parse(JSON.stringify(invitation));
    const cleanEvent = JSON.parse(JSON.stringify(event));
    const cleanGuest = guest ? JSON.parse(JSON.stringify(guest)) : null;

    /* ============================================================
       Response
    ============================================================ */
    return NextResponse.json(
      {
        success: true,
        invitation: cleanInvitation,
        event: cleanEvent, // ✅ כאן נמצא location עם lat/lng
        guest: cleanGuest,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in GET /api/invite/[shareId]:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
