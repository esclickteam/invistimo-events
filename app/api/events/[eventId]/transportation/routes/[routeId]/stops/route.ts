import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireTransportationManagement } from "@/lib/guards/requireTransportation";
import { serializeDoc } from "@/lib/transportation/service";
import TransportRoute from "@/models/TransportRoute";
import TransportStop from "@/models/TransportStop";
import { TRANSPORT_STOP_TYPES } from "@/lib/transportation/types";
import { normalizeTimeInput } from "@/lib/transportation/time";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; routeId: string }> }
) {
  try {
    await connectDB();
    const { eventId, routeId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const stops = await TransportStop.find({ eventId, routeId })
      .sort({ sortOrder: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      stops: stops.map(serializeDoc),
    });
  } catch (err) {
    console.error("❌ GET transport stops failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; routeId: string }> }
) {
  try {
    await connectDB();
    const { eventId, routeId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const route = await TransportRoute.findOne({ _id: routeId, eventId }).lean();
    if (!route) {
      return NextResponse.json(
        { success: false, error: "ROUTE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Bulk reorder
    if (Array.isArray(body.orderedStopIds)) {
      const ids: string[] = body.orderedStopIds.map(String);
      await Promise.all(
        ids.map((id, index) =>
          TransportStop.updateOne(
            { _id: id, eventId, routeId },
            { $set: { sortOrder: index } }
          )
        )
      );
      const stops = await TransportStop.find({ eventId, routeId })
        .sort({ sortOrder: 1 })
        .lean();
      return NextResponse.json({
        success: true,
        stops: stops.map(serializeDoc),
      });
    }

    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "NAME_REQUIRED" },
        { status: 400 }
      );
    }

    const count = await TransportStop.countDocuments({ eventId, routeId });
    const stopType = TRANSPORT_STOP_TYPES.includes(body.stopType)
      ? body.stopType
      : route.direction === "return"
        ? "dropoff"
        : "pickup";

    const time = normalizeTimeInput(String(body.time || ""));
    if (body.time && String(body.time).trim() && !time) {
      return NextResponse.json(
        { success: false, error: "INVALID_STOP_TIME" },
        { status: 400 }
      );
    }

    const stop = await TransportStop.create({
      eventId,
      routeId,
      name,
      address: String(body.address || "").trim(),
      time,
      sortOrder: Number.isFinite(Number(body.sortOrder))
        ? Number(body.sortOrder)
        : count,
      notes: String(body.notes || "").trim(),
      landmark: String(body.landmark || "").trim(),
      mapLink: String(body.mapLink || "").trim(),
      stopType,
    });

    return NextResponse.json(
      { success: true, stop: serializeDoc(stop) },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST transport stop failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
