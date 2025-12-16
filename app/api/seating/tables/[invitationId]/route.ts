import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";

export const dynamic = "force-dynamic";

/** ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* ===============================
       1️⃣ params (חובה await)
    =============================== */
    const { invitationId } = await context.params;

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "Missing invitationId" },
        { status: 400 }
      );
    }

    /* ===============================
       2️⃣ שליפת הושבה מה־DB
       ⚠️ בלי סינון, בלי map, בלי filter
    =============================== */
    const record = await SeatingTable.findOne({ invitationId });

    /* ===============================
       3️⃣ החזרה מלאה לפרונט
       כולל:
       - שולחנות
       - רקע
       - zones (אלמנטים)
    =============================== */
    return NextResponse.json({
      success: true,
      tables: record?.tables || [],
      background: record?.background ?? null, // ✅ כדי ש-init יקבל background מה־DB
      zones: record?.zones || [], // ✅ זה מה שחסר לך בפועל
    });
  } catch (err) {
    console.error("❌ Load seating tables error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
