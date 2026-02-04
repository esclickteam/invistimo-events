import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import { requireSeating } from "@/lib/guards/requireSeating";

export const dynamic = "force-dynamic";

/** ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ eventId: string }>;
};

/* ======================================================
   GET – טעינת הושבה
====================================================== */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const guard = await requireSeating();
    if (!guard.ok) {
      return guard.response!;
    }

    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId" },
        { status: 400 }
      );
    }

    const record =
      (await SeatingTable.findOne({ eventId }).lean()) ||
      (await SeatingTable.findOne({ invitationId: eventId }).lean());

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

/* ======================================================
   PATCH – עדכון שם / מספר שולחן
====================================================== */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const guard = await requireSeating();
    if (!guard.ok) {
      return guard.response!;
    }

    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId" },
        { status: 400 }
      );
    }

    const { tableId, displayName } = await req.json();

    if (!tableId) {
      return NextResponse.json(
        { success: false, error: "Missing tableId" },
        { status: 400 }
      );
    }

    const record = await SeatingTable.findOne({
  invitationId: eventId, // ⭐ זה בעצם invitationId
  "tables.id": tableId,
});

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Table not found" },
        { status: 404 }
      );
    }

    const table = record.tables.find(
      (t: any) => String(t.id) === String(tableId)
    );

    if (!table) {
      return NextResponse.json(
        { success: false, error: "Table not found in record" },
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
