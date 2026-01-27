import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LiveArrival from "@/models/LiveArrival";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // 🔐 אימות – חייב להיות מחובר
    const auth = await getUserIdFromRequest(req);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 📥 פרמטרים
    const invitationId = req.nextUrl.searchParams.get("invitationId");
    if (!invitationId) {
      return NextResponse.json(
        { error: "Missing invitationId" },
        { status: 400 }
      );
    }

    // 📊 שליפת הגעה בפועל
    const rows = await LiveArrival.find({ invitationId })
      .select("guestId arrivedCount -_id")
      .lean();

    return NextResponse.json({
      success: true,
      arrivals: rows,
    });
  } catch (e) {
    console.error("❌ GET /api/live-arrivals failed:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
