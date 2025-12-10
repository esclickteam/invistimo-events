import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";

/** ⭐ חובה ב־Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    // חייבים await אחרת זה יוצר ERROR בבילד
    const { invitationId } = await context.params;

    const record = await SeatingTable.findOne({ invitationId });

    return NextResponse.json({
      success: true,
      tables: record?.tables || [],
    });
  } catch (err) {
    console.error("❌ Load seating tables error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
