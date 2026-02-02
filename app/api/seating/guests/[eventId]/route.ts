import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { requireSeating } from "@/lib/guards/requireSeating";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* 🔐 Guard אחיד – בדיקת הרשאת הושבה */
    const guard = await requireSeating();
    if (!guard.ok) {
      return guard.response!;
    }

    /* ⭐ params */
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, guests: [] },
        { status: 400 }
      );
    }

    /* ===============================
       1️⃣ מציאת ההזמנה לפי eventId בלבד
       ⭐ קריטי להתחזות / מפיק
    =============================== */
    const invitation = await Invitation.findOne({ eventId })
      .select("_id")
      .lean();

    if (!invitation) {
      return NextResponse.json({
        success: true,
        guests: [],
      });
    }

    /* ===============================
       2️⃣ שליפת האורחים
    =============================== */
    const guests = await InvitationGuest.find({
      invitationId: invitation._id,
    })
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      guests: Array.isArray(guests) ? guests : [],
    });
  } catch (err) {
    console.error("❌ Error loading seating guests:", err);
    return NextResponse.json(
      { success: false, guests: [], error: "Server error" },
      { status: 500 }
    );
  }
}
