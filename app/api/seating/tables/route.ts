import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await db();

    const invitationId =
      req.nextUrl.searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Missing invitationId" },
        { status: 400 }
      );
    }

    // 1️⃣ שליפת ההזמנה
    const invitation = await Invitation.findById(invitationId)
      .select("eventId")
      .lean();

    if (!invitation?.eventId) {
      return NextResponse.json({ tables: [] });
    }

    // 2️⃣ שליפת השולחנות לפי eventId
    const seating = await SeatingTable.findOne({
      eventId: invitation.eventId,
    }).lean();

    return NextResponse.json({
      tables: seating?.tables || [],
      zones: seating?.zones || [],
      canvasView: seating?.canvasView || null,
    });
  } catch (err) {
    console.error("❌ seating tables error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
