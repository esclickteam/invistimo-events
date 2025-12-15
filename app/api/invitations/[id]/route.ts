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

    if (!id || typeof id !== "string") {
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
      {
        success: true,
        invitation: JSON.parse(JSON.stringify(invitation)),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in GET /api/invitations/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================================
   💾 PUT — עדכון הזמנה קיימת
   ✔ פרטי אירוע
   ✔ קנבס (לא חובה)
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

    // 🔥 התאמה מלאה למודל
    const {
      title,
      eventType,
      eventDate,
      canvasData,
    } = body;

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    // 🧠 מעדכן רק מה שנשלח
    if (title !== undefined) updatePayload.title = title;
    if (eventType !== undefined) updatePayload.eventType = eventType;
    if (eventDate !== undefined) updatePayload.eventDate = eventDate;

    // ❗ canvasData — רק אם באמת נשלח
    if (canvasData !== undefined) {
      updatePayload.canvasData = canvasData;
    }

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
