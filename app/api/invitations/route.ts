import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await db();

    /* ===============================
       🔐 זיהוי משתמש
    =============================== */
    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    /* ===============================
       🧠 טעינת יוזר אמיתי מה־DB
    =============================== */
    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ===============================
       📦 גוף הבקשה
    =============================== */
    const body = await req.json();
    const { title, canvasData, previewImage } = body;

    if (!canvasData) {
      return NextResponse.json(
        { success: false, error: "Missing canvas data" },
        { status: 400 }
      );
    }

    /* ===============================
       🧮 הגבלות לפי היוזר האמיתי
    =============================== */
    const maxGuests = Number(user.guests) || 100;
    const maxMessages = Number(user.maxMessages) || 300;

    /* ===============================
       🔗 יצירת shareId
    =============================== */
    const shareId = nanoid(10);

    /* ===============================
       🧾 יצירת ההזמנה
    =============================== */
    const newInvite = await Invitation.create({
      ownerId: userId,
      title: title || "Untitled Invitation",
      canvasData,
      previewImage: previewImage || null,
      shareId,

      guests: [],

      maxGuests,          // ✅ כאן התיקון הקריטי
      maxMessages,
      sentSmsCount: 0,
      remainingMessages: maxMessages,
    });

    /* ===============================
       🧼 ניקוי mongoose → JSON
    =============================== */
    const cleanInvite = JSON.parse(JSON.stringify(newInvite));

    console.log("🔥 NEW INVITATION CREATED:", {
      inviteId: cleanInvite._id,
      ownerId: userId,
      maxGuests,
      maxMessages,
    });

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
