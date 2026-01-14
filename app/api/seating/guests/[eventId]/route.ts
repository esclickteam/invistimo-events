import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* ============================================================
   GET – Load seating guests (PRO ONLY)
   ⭐ מחזיר את כל האורחים של האירוע
============================================================ */
type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* ===============================
       🔐 אימות משתמש
    =============================== */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", guests: [] },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    /* ===============================
       🔐 בדיקת חבילה (Seating)
    =============================== */
    const user = await User.findById(userId).lean();
    if (!user?.planLimits?.seatingEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "SEATING_NOT_ALLOWED",
          guests: [],
        },
        { status: 403 }
      );
    }

    /* ===============================
       ⭐ eventId מה־params
    =============================== */
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: true, guests: [] },
        { status: 200 }
      );
    }

    /* ===============================
       1️⃣ מציאת ההזמנה של האירוע
    =============================== */
    const invitation = await Invitation.findOne({
      ownerId: userId,
      eventId,
    })
      .select("_id")
      .lean();

    if (!invitation) {
      return NextResponse.json({
        success: true,
        guests: [],
      });
    }

    /* ===============================
       2️⃣ שליפת כל האורחים (ללא סינון)
    =============================== */
    const guests = await InvitationGuest.find({
      invitationId: invitation._id,
    })
      .select({
        _id: 1,
        name: 1,
        phone: 1,
        guestsCount: 1,
        arrivedCount: 1,
        rsvp: 1,
        tableNumber: 1,
        tableName: 1,
        token: 1,
      })
      .sort({ createdAt: 1 }) // סדר יציב
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      guests,
    });
  } catch (err) {
    console.error("❌ Error loading seating guests:", err);
    return NextResponse.json(
      {
        success: false,
        guests: [],
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
