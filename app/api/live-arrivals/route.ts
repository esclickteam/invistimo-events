import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LiveArrival from "@/models/LiveArrival";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // 🔐 אימות – חייב להיות מחובר (מפיק)
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
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

    // ✅ המרה ל־Map: { [guestId]: arrivedCount }
    const arrivalMap: Record<string, number> = {};

    for (const row of rows) {
      arrivalMap[String(row.guestId)] =
        typeof row.arrivedCount === "number" ? row.arrivedCount : 0;
    }

    return NextResponse.json({
      success: true,
      arrivalMap,
    });
  } catch (e) {
    console.error("❌ GET /api/live-arrivals failed:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
