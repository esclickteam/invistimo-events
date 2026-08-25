import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireTransportationManagement } from "@/lib/guards/requireTransportation";
import { serializeDoc } from "@/lib/transportation/service";
import TransportRoute from "@/models/TransportRoute";
import TransportStop from "@/models/TransportStop";
import {
  TRANSPORT_DIRECTIONS,
  TRANSPORT_ROUTE_STATUSES,
} from "@/lib/transportation/types";
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

    const route = await TransportRoute.findOne({ _id: routeId, eventId }).lean();
    if (!route) {
      return NextResponse.json(
        { success: false, error: "ROUTE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const stops = await TransportStop.find({ eventId, routeId })
      .sort({ sortOrder: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      route: serializeDoc(route),
      stops: stops.map(serializeDoc),
    });
  } catch (err) {
    console.error("❌ GET transport route failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; routeId: string }> }
) {
  try {
    await connectDB();
    const { eventId, routeId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const route = await TransportRoute.findOne({ _id: routeId, eventId });
    if (!route) {
      return NextResponse.json(
        { success: false, error: "ROUTE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json();

    if (typeof body.name === "string" && body.name.trim()) {
      route.name = body.name.trim();
    }
    if (TRANSPORT_DIRECTIONS.includes(body.direction)) {
      route.direction = body.direction;
    }
    if (body.date !== undefined) {
      route.date = body.date ? new Date(body.date) : null;
    }
    if (typeof body.departureTime === "string") {
      const normalized = normalizeTimeInput(body.departureTime);
      if (body.departureTime.trim() && !normalized) {
        return NextResponse.json(
          { success: false, error: "INVALID_DEPARTURE_TIME" },
          { status: 400 }
        );
      }
      route.departureTime = normalized;
    }
    if (typeof body.returnTime === "string") {
      const normalized = normalizeTimeInput(body.returnTime);
      if (body.returnTime.trim() && !normalized) {
        return NextResponse.json(
          { success: false, error: "INVALID_RETURN_TIME" },
          { status: 400 }
        );
      }
      route.returnTime = normalized;
    }
    if (body.capacity !== undefined) {
      route.capacity = Math.max(0, Number(body.capacity || 0));
    }
    if (body.returnCapacity !== undefined) {
      route.returnCapacity = Math.max(0, Number(body.returnCapacity || 0));
    }
    if (typeof body.companyName === "string") {
      route.companyName = body.companyName.trim();
    }
    if (typeof body.driverName === "string") {
      route.driverName = body.driverName.trim();
    }
    if (typeof body.driverPhone === "string") {
      route.driverPhone = body.driverPhone.trim();
    }
    if (typeof body.vehicleNumber === "string") {
      route.vehicleNumber = body.vehicleNumber.trim();
    }
    if (typeof body.notes === "string") route.notes = body.notes.trim();
    if (typeof body.active === "boolean") route.active = body.active;
    if (TRANSPORT_ROUTE_STATUSES.includes(body.status)) {
      route.status = body.status;
    }
    if (body.sortOrder !== undefined) {
      route.sortOrder = Number(body.sortOrder || 0);
    }

    await route.save();

    return NextResponse.json({
      success: true,
      route: serializeDoc(route),
    });
  } catch (err) {
    console.error("❌ PATCH transport route failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; routeId: string }> }
) {
  try {
    await connectDB();
    const { eventId, routeId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const route = await TransportRoute.findOneAndDelete({
      _id: routeId,
      eventId,
    });

    if (!route) {
      return NextResponse.json(
        { success: false, error: "ROUTE_NOT_FOUND" },
        { status: 404 }
      );
    }

    await TransportStop.deleteMany({ eventId, routeId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE transport route failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
