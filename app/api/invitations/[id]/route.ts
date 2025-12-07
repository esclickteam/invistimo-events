import { NextResponse } from "next/server";
import db from "@/lib/db";

// ✅ חשוב: טוען את המודל של האורחים לפני ההזמנה
import "@/models/InvitationGuest";

import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: any) {
  try {
    await db();

    // ⭐ params יכול להיות Promise
    const params = await context.params;
    const id = params?.id;

    console.log("📌 GET INVITATION BY ID:", id);

    // ⭐ בדיקת תקינות ID
    if (!id || id === "undefined" || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    // ✅ כעת populate עובד — כי InvitationGuest נטען
    const invitation = await Invitation.findById(id).populate("guests");

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // ⭐ מנקה את האובייקט לפני שליחה
    const cleanInvite = JSON.parse(JSON.stringify(invitation));

    return NextResponse.json(
      { success: true, invitation: cleanInvite },
      { status: 200 }
    );

  } catch (err) {
    console.error("❌ Error in GET /api/invitations/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
