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

    const params = await context.params;
    const id = params?.id;

    if (!id || id === "undefined" || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findById(id).populate("guests");

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, invitation: JSON.parse(JSON.stringify(invitation)) },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in GET /api/invitations/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================================
   💾 PUT — עדכון הזמנה קיימת
============================================================ */
export async function PUT(req: Request, context: any) {
  try {
    await db();

    const params = await context.params;
    const id = params?.id;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // ✅ חדש – פרטי אירוע
    const {
      title,
      type,
      date,
      location,
      canvasData,
    } = body;

    // ❗ canvasData חובה רק אם מנסים לעדכן אותו
    if ("canvasData" in body && !canvasData) {
      return NextResponse.json(
        { success: false, error: "Missing canvas data" },
        { status: 400 }
      );
    }

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    // 🧠 מעדכן רק מה שנשלח
    if (title !== undefined) updatePayload.title = title;
    if (type !== undefined) updatePayload.type = type;
    if (date !== undefined) updatePayload.date = date;
    if (location !== undefined) updatePayload.location = location;
    if (canvasData !== undefined) updatePayload.canvasData = canvasData;

    const updated = await Invitation.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true }
    ).populate("guests");

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

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
