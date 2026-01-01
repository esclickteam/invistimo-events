import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/** ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
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

    /* 🔐 בדיקת חבילה – הושבה */
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
       בלי סינון, בלי map, בלי filter
    =============================== */
    const record = await SeatingTable.findOne({ invitationId });

    /* ===============================
       3️⃣ החזרה מלאה לפרונט
    =============================== */
    return NextResponse.json({
      success: true,
      tables: record?.tables || [],
      background: record?.background ?? null,
      zones: record?.zones || [],
      canvasView: record?.canvasView ?? null, // ✅ תוספת בלבד
    });
  } catch (err) {
    console.error("❌ Load seating tables error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
