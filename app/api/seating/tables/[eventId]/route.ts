import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import { requireSeating } from "@/lib/guards/requireSeating";

export const dynamic = "force-dynamic";

/* ======================================================
   GET – טעינת הושבה לפי היוזר
====================================================== */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const guard = await requireSeating();
    if (!guard.ok) {
      return guard.response!;
    }

    const userId = guard.userId;

    // 🔹 Seating אחד ליוזר
    let record = await SeatingTable.findOne({ userId }).lean();

    // 🔹 אם עדיין אין – מחזירים ריק (או אפשר ליצור)
    if (!record) {
      return NextResponse.json({
        success: true,
        tables: [],
        background: null,
        zones: [],
        canvasView: null,
      });
    }

    return NextResponse.json({
      success: true,
      tables: record.tables || [],
      background: record.background ?? null,
      zones: record.zones || [],
      canvasView: record.canvasView ?? null,
    });
  } catch (err) {
    console.error("❌ Load seating tables error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

/* ======================================================
   PATCH – עדכון שם שולחן לפי היוזר
====================================================== */
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    const guard = await requireSeating();
    if (!guard.ok) {
      return guard.response!;
    }

    const userId = guard.userId;
    const { tableId, displayName } = await req.json();

    if (!tableId) {
      return NextResponse.json(
        { success: false, error: "Missing tableId" },
        { status: 400 }
      );
    }

    // 🔹 מביאים Seating של היוזר
    let record = await SeatingTable.findOne({ userId });

    // 🔹 אם אין עדיין Seating – יוצרים אחד
    if (!record) {
      record = await SeatingTable.create({
        userId,
        tables: [],
        zones: [],
        canvasView: null,
        background: null,
      });
    }

    const table = record.tables.find(
      (t: any) => String(t.id) === String(tableId)
    );

    if (!table) {
      return NextResponse.json(
        { success: false, error: "Table not found" },
        { status: 404 }
      );
    }

    table.displayName = displayName;

    await record.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Update table displayName error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
