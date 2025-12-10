import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db();

    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 🟢 מחזירים הזמנה אחת בלבד של המשתמש
    const invitation = await Invitation.findOne({ ownerId: userId });

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (err) {
    console.error("❌ Error loading my invitation:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
