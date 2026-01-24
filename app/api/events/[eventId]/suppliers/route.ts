import { NextRequest, NextResponse } from "next/server";
import EventSupplier from "@/models/EventSupplier";
import db from "@/lib/db";

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
    .populate("supplierId")
    .lean();

  return NextResponse.json(rows);
}

/* =========================================================
   POST – הוספת שורת ספק לאירוע
========================================================= */

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
    }>;
  }
) {
  await db();

  const { eventId } = await context.params;
  const body = await request.json();

  const row = await EventSupplier.create({
    ...body,
    eventId,
  });

  return NextResponse.json(row);
}
