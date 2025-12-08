import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db();

    // קבלת בעל האירוע מתוך ה־cookie
    const userId = await getUserIdFromRequest();
    if (!userId) {
      console.log("❌ No userId from cookies");
      return NextResponse.json({ guests: [] });
    }

    // פלט כל ההזמנות של המשתמש
    const invitations = await Invitation.find({ ownerId: userId }).select("_id");

    if (!invitations.length) {
      console.log("❌ No invitations found for user", userId);
      return NextResponse.json({ guests: [] });
    }

    const ids = invitations.map((i) => i._id);

    // שליפת כל האורחים לכל ההזמנות
    const guests = await Guest.find({
      invitationId: { $in: ids },
    }).sort({ createdAt: -1 });

    return NextResponse.json({ guests });
  } catch (err) {
    console.error("🔥 ERROR in GET /api/guests:", err);
    return NextResponse.json({ guests: [] });
  }
}
