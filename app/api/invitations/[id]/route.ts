import { NextResponse } from "next/server";
import db from "@/lib/db";

// ✅ חשוב: טוען את המודל של האורחים לפני ההזמנה
import "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

/* ============================================================
   📥 GET — שליפת הזמנה לפי מזהה
============================================================ */
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

/* ============================================================
   💾 PUT — עדכון הזמנה קיימת לפי מזהה
============================================================ */
export async function PUT(req: Request, context: any) {
  try {
    await db();

    // ⭐ params יכול להיות Promise
    const params = await context.params;
    const id = params?.id;

    console.log("📝 PUT INVITATION UPDATE ID:", id);

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { title, canvasData } = body;

    if (!canvasData) {
      return NextResponse.json(
        { success: false, error: "Missing canvas data" },
        { status: 400 }
      );
    }

    const updated = await Invitation.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        canvasData,
        updatedAt: new Date(),
      },
      { new: true }
    ).populate("guests");

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    console.log("✅ Invitation updated:", updated._id);

    return NextResponse.json({
      success: true,
      invitation: JSON.parse(JSON.stringify(updated)),
    });
  } catch (err) {
    console.error("❌ Error in PUT /api/invitations/[id]:", err);
    return NextResponse.json(
      { success: false, error: "Server error while updating" },
      { status: 500 }
    );
  }
}
