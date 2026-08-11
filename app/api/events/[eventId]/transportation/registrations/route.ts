import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireTransportationManagement } from "@/lib/guards/requireTransportation";
import {
  getOrCreateEventTransportation,
  isValidObjectId,
  serializeDoc,
} from "@/lib/transportation/service";
import { assertRouteHasCapacity } from "@/lib/transportation/capacity";
import TransportRegistration from "@/models/TransportRegistration";
import TransportRoute from "@/models/TransportRoute";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

async function validateRegistrationPayload(
  eventId: string,
  body: any,
  excludeRegistrationId?: string
) {
  const name = String(body.name || "").trim();
  const passengerCount = Math.max(1, Number(body.passengerCount || 1));
  const needsOutbound = Boolean(body.needsOutbound);
  const needsReturn = Boolean(body.needsReturn);

  if (!name) {
    return { ok: false as const, status: 400, error: "NAME_REQUIRED" };
  }

  if (!needsOutbound && !needsReturn) {
    return {
      ok: false as const,
      status: 400,
      error: "TRANSPORT_DIRECTION_REQUIRED",
    };
  }

  let outboundRouteId = body.outboundRouteId || null;
  let outboundStopId = body.outboundStopId || null;
  let returnRouteId = body.returnRouteId || null;
  let returnStopId = body.returnStopId || null;

  if (needsOutbound) {
    if (!isValidObjectId(outboundRouteId)) {
      return { ok: false as const, status: 400, error: "OUTBOUND_ROUTE_REQUIRED" };
    }
    const route = await TransportRoute.findOne({
      _id: outboundRouteId,
      eventId,
      active: true,
    }).lean();
    if (!route || (route.direction !== "outbound" && route.direction !== "round_trip")) {
      return { ok: false as const, status: 400, error: "INVALID_OUTBOUND_ROUTE" };
    }
    const cap = await assertRouteHasCapacity({
      eventId,
      routeId: String(outboundRouteId),
      direction: "outbound",
      passengerCount,
      excludeRegistrationId,
    });
    if (!cap.ok) {
      return {
        ok: false as const,
        status: 409,
        error: cap.code,
        details: cap,
      };
    }
  } else {
    outboundRouteId = null;
    outboundStopId = null;
  }

  if (needsReturn) {
    if (!isValidObjectId(returnRouteId)) {
      return { ok: false as const, status: 400, error: "RETURN_ROUTE_REQUIRED" };
    }
    const route = await TransportRoute.findOne({
      _id: returnRouteId,
      eventId,
      active: true,
    }).lean();
    if (!route || (route.direction !== "return" && route.direction !== "round_trip")) {
      return { ok: false as const, status: 400, error: "INVALID_RETURN_ROUTE" };
    }
    const cap = await assertRouteHasCapacity({
      eventId,
      routeId: String(returnRouteId),
      direction: "return",
      passengerCount,
      excludeRegistrationId,
    });
    if (!cap.ok) {
      return {
        ok: false as const,
        status: 409,
        error: cap.code,
        details: cap,
      };
    }
  } else {
    returnRouteId = null;
    returnStopId = null;
  }

  return {
    ok: true as const,
    data: {
      name,
      phone: String(body.phone || "").trim(),
      passengerCount,
      needsOutbound,
      outboundRouteId,
      outboundStopId: isValidObjectId(outboundStopId) ? outboundStopId : null,
      needsReturn,
      returnRouteId,
      returnStopId: isValidObjectId(returnStopId) ? returnStopId : null,
      notes: String(body.notes || "").trim(),
      invitationGuestId: isValidObjectId(body.invitationGuestId)
        ? body.invitationGuestId
        : null,
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();
    const { eventId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();
    const routeId = searchParams.get("routeId");
    const stopId = searchParams.get("stopId");
    const direction = searchParams.get("direction"); // outbound | return | none
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = { eventId };
    if (status) filter.status = status;
    else filter.status = { $in: ["registered", "cancelled"] };

    if (routeId) {
      filter.$or = [
        { outboundRouteId: routeId },
        { returnRouteId: routeId },
      ];
    }
    if (stopId) {
      filter.$or = [
        ...(Array.isArray(filter.$or) ? (filter.$or as any[]) : []),
        { outboundStopId: stopId },
        { returnStopId: stopId },
      ];
    }
    if (direction === "outbound") filter.needsOutbound = true;
    if (direction === "return") filter.needsReturn = true;
    if (direction === "none") {
      filter.needsOutbound = false;
      filter.needsReturn = false;
    }

    if (q) {
      filter.$and = [
        {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
          ],
        },
      ];
    }

    const registrations = await TransportRegistration.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      registrations: registrations.map(serializeDoc),
    });
  } catch (err) {
    console.error("❌ GET transport registrations failed:", err);
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
    const validated = await validateRegistrationPayload(eventId, body);
    if (!validated.ok) {
      return NextResponse.json(
        {
          success: false,
          error: validated.error,
          details: (validated as any).details,
        },
        { status: validated.status }
      );
    }

    const data = validated.data;

    // Avoid duplicate active registration for same invitation guest
    if (data.invitationGuestId) {
      const existing = await TransportRegistration.findOne({
        eventId,
        invitationGuestId: data.invitationGuestId,
        status: "registered",
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "GUEST_ALREADY_REGISTERED",
            registrationId: String(existing._id),
          },
          { status: 409 }
        );
      }

      const guest = await InvitationGuest.findById(data.invitationGuestId)
        .select("name phone")
        .lean();
      if (guest) {
        if (!data.name) data.name = guest.name;
        if (!data.phone && guest.phone) data.phone = guest.phone;
      }
    }

    const registration = await TransportRegistration.create({
      eventId,
      ...data,
      status: "registered",
      outboundBoardStatus: data.needsOutbound ? "registered" : "not_needed",
      returnBoardStatus: data.needsReturn ? "registered" : "not_needed",
    });

    return NextResponse.json(
      { success: true, registration: serializeDoc(registration) },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { success: false, error: "GUEST_ALREADY_REGISTERED" },
        { status: 409 }
      );
    }
    console.error("❌ POST transport registration failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
