import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export async function POST(req: Request) {
  try {
    await db();

    // ✔️ זיהוי משתמש
    const userId = await getUserIdFromRequest();
    console.log("USER ID →", userId);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✔️ קבלת גוף הבקשה
    const body = await req.json();
    const { title, canvasData } = body;

    if (!canvasData) {
      return NextResponse.json(
        { error: "Missing canvas data" },
        { status: 400 }
      );
    }

    // ✔️ יצירת shareId אקראי
    const shareId = nanoid(10);

    // ✔️ יצירת מסמך במונגו
    const newInvite = await Invitation.create({
      ownerId: userId,
      title: title || "Untitled Invitation",
      canvasData,
      shareId,
    });

    // ⭐⭐ חשוב מאוד:
    // Mongoose Document → JSON נקי, כדי למנוע undefined בצד לקוח
    const cleanInvite = JSON.parse(JSON.stringify(newInvite));

    console.log("🔥 NEW INVITATION CREATED:", cleanInvite);

    return NextResponse.json(
      { success: true, invitation: cleanInvite },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error creating invitation:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
