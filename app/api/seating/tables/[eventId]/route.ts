import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/** ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ eventId: string }>;
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

    /* 🔐 שליפת משתמש */
    const user = await User.findById(userId).lean();

    /**
     * ⭐ אדמין בהתחזות = מתנהג כלקוח
     * → מדלגים על בדיקת החבילה
     */
    if (user?.impersonated !== true) {
  const hasSeating =
    user?.plan === "premium" ||
    user?.planLimits?.seatingEnabled === true;

  if (!hasSeating) {
    return NextResponse.json(
      {
        success: false,
        error: "Seating is not included in your plan",
        code: "SEATING_NOT_ALLOWED",
      },
      { status: 403 }
    );
  }
}

    /* ===============================
       1️⃣ params (חובה await)
    =============================== */
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId" },
        { status: 400 }
      );
    }

    console.log("📤 LOAD SEATING TABLES:", { userId, eventId });

    /* ===============================
       2️⃣ שליפת הושבה לפי eventId
       מסמך אחד = אירוע אחד
    =============================== */
    const record =
      (await SeatingTable.findOne({ eventId }).lean()) ||
      (await SeatingTable.findOne({ invitationId: eventId }).lean());

    console.log("📦 RECORD FOUND:", {
      hasRecord: !!record,
      tables: record?.tables?.length ?? 0,
      zones: record?.zones?.length ?? 0,
      hasBackground: !!record?.background,
      canvasView: record?.canvasView ?? null,
    });

    /* ===============================
       3️⃣ החזרה מלאה לפרונט
    =============================== */
    return NextResponse.json({
      success: true,
      tables: record?.tables || [],
      background: record?.background ?? null,
      zones: record?.zones || [],
      canvasView: record?.canvasView ?? null,
    });
  } catch (err) {
    console.error("❌ Load seating tables error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
