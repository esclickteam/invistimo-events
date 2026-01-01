import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";

// ✅ חובה: לטעון את המודל של האורחים כדי ש-populate יעבוד
import "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — קבלת הזמנה לפי shareId
   אם מגיע token => מאתרים אורח לפי token ומחזירים גם אותו
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

    // ✅ קוראים token מה-URL: /invite/:shareId?token=...
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    // 1) תמיד נביא הזמנה לפי shareId (הבסיס)
    const invitation = await Invitation.findOne({ shareId }).populate("guests");

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    // 2) אם יש token — נאתר את האורח ונאמת שהוא שייך להזמנה הזו
    let guest = null;

    if (token) {
      guest = await InvitationGuest.findOne({ token }).lean();

      // token לא קיים / לא שייך להזמנה הזו
      if (!guest || String(guest.invitationId) !== String(invitation._id)) {
        return NextResponse.json(
          { success: false, error: "INVALID_TOKEN" },
          { status: 404 }
        );
      }
    }

    const cleanInvite = JSON.parse(JSON.stringify(invitation));

    return NextResponse.json(
      {
        success: true,
        invitation: cleanInvite,
        guest: guest ? JSON.parse(JSON.stringify(guest)) : null,
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
