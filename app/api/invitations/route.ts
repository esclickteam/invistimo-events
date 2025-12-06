import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "../../../lib/getUserIdFromRequest";  // עדכון הנתיב המתואם


export async function POST(req: Request) {
  try {
    await db();

    // ✅ חילוץ מזהה המשתמש מה-cookie
    const userId = getUserIdFromRequest(req);

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

    // ✅ יצירת הזמנה חדשה עבור בעל האירוע המחובר
    const newInvite = await Invitation.create({
      ownerId: userId, // 💡 זה מה שהיה חסר קודם
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