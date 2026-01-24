import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import EventAlcohol from "@/models/EventAlcohol";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();

    const { eventId } = await params;

    const alcohol = await EventAlcohol.find({ eventId })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ success: true, alcohol }, { status: 200 });
  } catch (err) {
    console.error("❌ GET /api/events/[eventId]/alcohol failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();

    const { eventId } = await params;
    const body = await req.json();

    const doc = await EventAlcohol.create({
      eventId,
      category: body.category ?? "",
      brand: body.brand ?? "",
      flavor: body.flavor ?? "",
      total: Number(body.total ?? 1),
      allocations: [],
    });

    return NextResponse.json({ success: true, alcohol: doc }, { status: 201 });
  } catch (err) {
    console.error("❌ POST /api/events/[eventId]/alcohol failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
