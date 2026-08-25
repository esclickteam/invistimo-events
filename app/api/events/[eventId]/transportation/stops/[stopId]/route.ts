import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireTransportationManagement } from "@/lib/guards/requireTransportation";
import { serializeDoc } from "@/lib/transportation/service";
import TransportStop from "@/models/TransportStop";
import { TRANSPORT_STOP_TYPES } from "@/lib/transportation/types";
import { normalizeTimeInput } from "@/lib/transportation/time";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; stopId: string }> }
) {
  try {
    await connectDB();
    const { eventId, stopId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const stop = await TransportStop.findOne({ _id: stopId, eventId });
    if (!stop) {
      return NextResponse.json(
        { success: false, error: "STOP_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (typeof body.name === "string" && body.name.trim()) {
      stop.name = body.name.trim();
    }
    if (typeof body.address === "string") stop.address = body.address.trim();
    if (typeof body.time === "string") {
      const normalized = normalizeTimeInput(body.time);
      if (body.time.trim() && !normalized) {
        return NextResponse.json(
          { success: false, error: "INVALID_STOP_TIME" },
          { status: 400 }
        );
      }
      stop.time = normalized;
    }
    if (body.sortOrder !== undefined) stop.sortOrder = Number(body.sortOrder || 0);
    if (typeof body.notes === "string") stop.notes = body.notes.trim();
    if (typeof body.landmark === "string") stop.landmark = body.landmark.trim();
    if (typeof body.mapLink === "string") stop.mapLink = body.mapLink.trim();
    if (TRANSPORT_STOP_TYPES.includes(body.stopType)) {
      stop.stopType = body.stopType;
    }

    await stop.save();
    return NextResponse.json({ success: true, stop: serializeDoc(stop) });
  } catch (err) {
    console.error("❌ PATCH transport stop failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; stopId: string }> }
) {
  try {
    await connectDB();
    const { eventId, stopId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const stop = await TransportStop.findOneAndDelete({ _id: stopId, eventId });
    if (!stop) {
      return NextResponse.json(
        { success: false, error: "STOP_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE transport stop failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
