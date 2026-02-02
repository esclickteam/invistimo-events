import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* 🔐 זיהוי משתמש */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    /* 🔐 שליפת משתמש */
    const user = await User.findById(userId).lean();

    /* ⭐ בדיקת חבילה – מדולגת לאדמין בהתחזות */
    if (user?.impersonated !== true) {
      if (!user?.planLimits?.seatingEnabled) {
        return NextResponse.json(
          {
            success: false,
            error: "Seating is not included in your plan",
            code: "SEATING_NOT_ALLOWED",
          },
          { status: 403 }
        );
      }
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
       ⭐ קריטי להתחזות
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
