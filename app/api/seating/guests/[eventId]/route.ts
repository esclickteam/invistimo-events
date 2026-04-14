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

    /* 🔐 Guard */
    const guard = await requireSeating();
    if (!guard.ok) {
      return guard.response!;
    }

    /* ===============================
       ⭐ 1️⃣ query params (חדש!)
    =============================== */
    const { searchParams } = new URL(req.url);
    const invitationIdFromQuery = searchParams.get("invitationId");

    /* ===============================
       2️⃣ params fallback
    =============================== */
    const { eventId } = await context.params;

    if (!invitationIdFromQuery && !eventId) {
      return NextResponse.json(
        { success: false, guests: [] },
        { status: 400 }
      );
    }

    console.log("📤 LOAD GUESTS:", {
      invitationIdFromQuery,
      eventId,
    });

    /* ===============================
       ⭐ 3️⃣ קביעת invitationId אמיתי
    =============================== */
    let invitationId = invitationIdFromQuery;

    // fallback אם אין invitationId
    if (!invitationId && eventId) {
      const invitation = await Invitation.findOne({ eventId })
        .select("_id")
        .lean();

      if (invitation?._id) {
        invitationId = String(invitation._id);
      }
    }

    if (!invitationId) {
      return NextResponse.json({
        success: true,
        guests: [],
      });
    }

    /* ===============================
       4️⃣ שליפת האורחים
    =============================== */
    const guests = await InvitationGuest.find({
      invitationId,
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