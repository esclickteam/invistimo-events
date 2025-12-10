import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";

// ✅ חובה: לטעון את המודל של האורחים כדי ש-populate יעבוד
import "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET — קבלת הזמנה לפי shareId (לא לפי _id)
============================================================ */
export async function GET(
  req: Request,
  context: { params: Promise<{ shareId: string }> } // ⭐ ב־Next.js 16 חובה להשתמש ב־Promise
) {
  try {
    await db();

    // ⭐ חובה await על params
    const { shareId } = await context.params;

    console.log("📩 GET invitation by shareId:", shareId);

    if (!shareId || typeof shareId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid shareId" },
        { status: 400 }
      );
    }

    // 🔍 מוצא הזמנה לפי shareId ומבצע populate לאורחים
    const invitation = await Invitation.findOne({ shareId }).populate("guests");

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    // ⭐ מנקה את הנתונים לפני שליחה
    const cleanInvite = JSON.parse(JSON.stringify(invitation));

    return NextResponse.json(
      { success: true, invitation: cleanInvite },
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
