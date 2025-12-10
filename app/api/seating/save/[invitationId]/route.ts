import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";

/* ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

/* ⭐ POST — שמירת הושבה */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    // ⭐ חובה לפתור את ה־params:
    const { invitationId } = await context.params;

    const body = await req.json();
    const { tables } = body;

    if (!tables) {
      return NextResponse.json(
        { success: false, error: "No tables provided" },
        { status: 400 }
      );
    }

    // ⭐ שמירה / עדכון של שולחנות לפי invitationId
    const saved = await SeatingTable.findOneAndUpdate(
      { invitationId },
      { tables },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      saved,
    });
  } catch (err) {
    console.error("❌ Save seating error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
