import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET – Load seating guests (PRO ONLY)
============================================================ */
type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
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

    /* 🔐 בדיקת חבילה */
    const user = await User.findById(userId).lean();
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

    /* ⭐ params הוא Promise ב־Next 16 */
    const { invitationId } = await context.params;

    if (!invitationId) {
      return NextResponse.json(
        { success: false, guests: [] },
        { status: 400 }
      );
    }

    /* ✅ שליפה – רק למורשים */
    const guests = await InvitationGuest.find({ invitationId })
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
