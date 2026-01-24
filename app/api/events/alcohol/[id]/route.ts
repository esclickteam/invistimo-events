import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import EventAlcohol from "@/models/EventAlcohol";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const body = await req.json();

  const updated = await EventAlcohol.findByIdAndUpdate(
    params.id,
    body,
    { new: true }
  );

  return NextResponse.json({ success: true, alcohol: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  await EventAlcohol.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
