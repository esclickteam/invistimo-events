// app/api/events/[eventId]/suppliers/route.ts
import { NextResponse } from "next/server";
import EventSupplier from "@/models/EventSupplier";
import db from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  await db();
  const rows = await EventSupplier.find({ eventId: params.eventId })
    .populate("supplierId")
    .lean();

  return NextResponse.json(rows);
}

export async function POST(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  await db();
  const body = await req.json();
  const row = await EventSupplier.create({
    ...body,
    eventId: params.eventId,
  });
  return NextResponse.json(row);
}
