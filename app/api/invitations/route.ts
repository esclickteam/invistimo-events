import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";  // נתיב נכון

export async function POST(req: Request) {
  try {
    await db();

    // ✅ קריאה נכונה לפונקציה (חובה await ולא מעבירים req!)
    const userId = await getUserIdFromRequest();

    console.log("USER ID →", userId);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, canvasData } = body;

    if (!canvasData) {
      return NextResponse.json(
        { error: "Missing canvas data" },
        { status: 400 }
      );
    }

    const shareId = nanoid(10);

    // יצירת ההזמנה
    const newInvite = await Invitation.create({
      ownerId: userId,
      title: title || "Untitled Invitation",
      canvasData,
      shareId,
    });

    return NextResponse.json(
      { success: true, invitation: newInvite },
      { status: 201 }
    );

  } catch (err) {
    console.error("❌ Error creating invitation:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
