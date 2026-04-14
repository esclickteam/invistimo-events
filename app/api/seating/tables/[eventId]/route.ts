import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import { requireSeating } from "@/lib/guards/requireSeating";

export const dynamic = "force-dynamic";

/** ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* 🔐 Guard אחיד – הרשאת הושבה */
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
       2️⃣ params (fallback)
    =============================== */
    const { eventId } = await context.params;

    if (!invitationIdFromQuery && !eventId) {
      return NextResponse.json(
        { success: false, error: "Missing invitationId or eventId" },
        { status: 400 }
      );
    }

    console.log("📤 LOAD SEATING TABLES:", {
      invitationIdFromQuery,
      eventId,
    });

    /* ===============================
       ⭐ 3️⃣ שליפה חכמה
       קודם invitationId → אח"כ eventId
    =============================== */
    let record = null;

    if (invitationIdFromQuery) {
      record = await SeatingTable.findOne({
        invitationId: invitationIdFromQuery,
      }).lean();
    }

    if (!record && eventId) {
      record = await SeatingTable.findOne({ eventId }).lean();
    }

    console.log("📦 RECORD FOUND:", {
      hasRecord: !!record,
      tables: record?.tables?.length ?? 0,
      zones: record?.zones?.length ?? 0,
      hasBackground: !!record?.background,
      canvasView: record?.canvasView ?? null,
    });

    /* ===============================
       4️⃣ החזרה לפרונט
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