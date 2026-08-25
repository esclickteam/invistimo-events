import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireTransportationManagement } from "@/lib/guards/requireTransportation";
import { getOrCreateEventTransportation, serializeDoc } from "@/lib/transportation/service";
import TransportRoute from "@/models/TransportRoute";
import { TRANSPORT_DIRECTIONS } from "@/lib/transportation/types";
import { normalizeTimeInput } from "@/lib/transportation/time";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();
    const { eventId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const routes = await TransportRoute.find({ eventId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      routes: routes.map(serializeDoc),
    });
  } catch (err) {
    console.error("❌ GET transport routes failed:", err);
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
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    await getOrCreateEventTransportation(eventId);
    const body = await req.json();

    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "NAME_REQUIRED" },
        { status: 400 }
      );
    }

    const direction = TRANSPORT_DIRECTIONS.includes(body.direction)
      ? body.direction
      : "outbound";

    const capacity = Math.max(0, Number(body.capacity ?? 50));
    const returnCapacity = Math.max(
      0,
      Number(
        body.returnCapacity !== undefined && body.returnCapacity !== ""
          ? body.returnCapacity
          : capacity
      )
    );

    const departureTime = normalizeTimeInput(String(body.departureTime || ""));
    const returnTime = normalizeTimeInput(String(body.returnTime || ""));
    if (body.departureTime && !departureTime) {
      return NextResponse.json(
        { success: false, error: "INVALID_DEPARTURE_TIME" },
        { status: 400 }
      );
    }
    if (body.returnTime && !returnTime) {
      return NextResponse.json(
        { success: false, error: "INVALID_RETURN_TIME" },
        { status: 400 }
      );
    }

    const count = await TransportRoute.countDocuments({ eventId });

    const route = await TransportRoute.create({
      eventId,
      name,
      direction,
      date: body.date ? new Date(body.date) : null,
      departureTime,
      returnTime,
      capacity,
      reservedSeats: 0,
      returnCapacity: direction === "round_trip" ? returnCapacity : capacity,
      returnReservedSeats: 0,
      companyName: String(body.companyName || "").trim(),
      driverName: String(body.driverName || "").trim(),
      driverPhone: String(body.driverPhone || "").trim(),
      vehicleNumber: String(body.vehicleNumber || "").trim(),
      notes: String(body.notes || "").trim(),
      active: body.active !== false,
      status: body.status || "scheduled",
      sortOrder: Number.isFinite(Number(body.sortOrder))
        ? Number(body.sortOrder)
        : count,
    });

    return NextResponse.json(
      { success: true, route: serializeDoc(route) },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST transport route failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
