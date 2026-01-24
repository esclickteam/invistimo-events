import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

import EventSupplier from "@/models/EventSupplier";
import Supplier from "@/models/Supplier"; // ✅ חובה בשביל populate

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
  await db();

  const { eventId } = await context.params;

  const rows = await EventSupplier.find({ eventId })
    .populate("supplierId") // עכשיו Supplier רשום
    .lean();

  return NextResponse.json(rows);
}

/* =========================================================
   POST – הוספת שורת ספק לאירוע
========================================================= */

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
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
}

