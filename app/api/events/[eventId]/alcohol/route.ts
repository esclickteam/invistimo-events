import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import EventAlcohol from "@/models/EventAlcohol";

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  await connectDB();

  const alcohol = await EventAlcohol.find({ eventId: params.eventId })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({ success: true, alcohol });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  await connectDB();

  const body = await req.json();

  const doc = await EventAlcohol.create({
    eventId: params.eventId,
    category: body.category,
    brand: body.brand,
    flavor: body.flavor,
    total: body.total,
    allocations: [],
  });

  return NextResponse.json({ success: true, alcohol: doc });
}
