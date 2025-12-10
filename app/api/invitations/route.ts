import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await db();

    // ✔️ זיהוי בעל ההזמנה
    const userId = await getUserIdFromRequest();
    console.log("USER ID →", userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✔️ קבלת גוף הבקשה
    const body = await req.json();
    const { title, canvasData, previewImage } = body;

    if (!canvasData) {
      return NextResponse.json(
        { success: false, error: "Missing canvas data" },
        { status: 400 }
      );
    }

    // ✔️ יצירת מזהה ציבורי להזמנה
    const shareId = nanoid(10);

    // ✔️ יצירת מסמך במונגו
    const newInvite = await Invitation.create({
      ownerId: userId,
      title: title || "Untitled Invitation",
      canvasData,
      previewImage: previewImage || null,
      shareId,
      guests: [], // נוצר ריק בתחילת הדרך
    });

    // ⭐ המרת מסמך mongoose ל־JSON נקי
    const cleanInvite = JSON.parse(JSON.stringify(newInvite));

    console.log("🔥 NEW INVITATION CREATED:", cleanInvite);

    return NextResponse.json(
      { success: true, invitation: cleanInvite },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error creating invitation:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
