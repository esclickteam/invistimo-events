import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Group from "@/models/Group";
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
        { success: false, groups: [] },
        { status: 400 }
      );
    }

    /* ===============================
       1️⃣ לוודא שיש הזמנה לאירוע
    =============================== */
    const invitation = await Invitation.findOne({ eventId })
      .select("_id eventId")
      .lean();

    if (!invitation) {
      return NextResponse.json({
        success: true,
        groups: [],
      });
    }

    /* ===============================
       2️⃣ שליפת קבוצות לפי eventId
    =============================== */
    const groups = await Group.find({
      eventId: invitation.eventId,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      groups: Array.isArray(groups) ? groups : [],
    });
  } catch (err) {
    console.error("❌ Error loading seating groups:", err);
    return NextResponse.json(
      { success: false, groups: [], error: "Server error" },
      { status: 500 }
    );
  }
}