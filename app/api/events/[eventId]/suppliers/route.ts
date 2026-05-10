import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * ⚠️ IMPORTANT
 * Side-effect imports כדי לכפות רישום מודלים ב-mongoose
 * (חובה ב-Next.js App Router + populate)
 */
import "@/models/Supplier";
import "@/models/EventSupplier";

import EventSupplier from "@/models/EventSupplier";

/* =========================================================
   GET – כל הספקים של האירוע
========================================================= */
export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
    }>;
  }
) {
  try {
    await db();

    const { eventId } = await context.params;

    const rows = await EventSupplier.find({ eventId })
      .populate("supplierId") // ✅ בטוח – Supplier כבר רשום
      .lean();

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET event suppliers error:", error);
    return NextResponse.json(
      { error: "Failed loading suppliers" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST – הוספת שורת ספק לאירוע
========================================================= */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    await db();

    const { eventId } = await context.params;
    const body = await request.json();

    const { categoryId, category, sub } = body;

    if (!categoryId || !category || !sub) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const row = await EventSupplier.create({
      eventId,
      categoryId,
      category,
      sub,
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error("POST event supplier error:", error);
    return NextResponse.json(
      { error: "Failed creating event supplier" },
      { status: 500 }
    );
  }
}
