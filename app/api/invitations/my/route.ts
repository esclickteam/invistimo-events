import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // חיבור ל־DB
    await db();

    // זיהוי משתמש
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // שליפת הזמנה אחת של המשתמש
    const invitation = await Invitation.findOne({ ownerId: userId })
      .select(
        "eventType eventDate maxGuests usedMessages shareId"
      )
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
    }

    // החזרה מסודרת לפרונט
    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        usedMessages: invitation.usedMessages || 0,
      },
    });
  } catch (err) {
    console.error("❌ Error loading my invitation:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
