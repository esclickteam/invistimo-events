import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import EventTransportation from "@/models/EventTransportation";
import TransportRoute from "@/models/TransportRoute";
import TransportStop from "@/models/TransportStop";
import TransportRegistration from "@/models/TransportRegistration";
import InvitationGuest from "@/models/InvitationGuest";
import { userHasTransportationEntitlement } from "@/lib/transportation/entitlement";
import { assertRouteHasCapacity } from "@/lib/transportation/capacity";
import { isValidObjectId, serializeDoc } from "@/lib/transportation/service";
import { getCapacityLevel } from "@/lib/transportation/types";
import { countRoutePassengers } from "@/lib/transportation/capacity";

export const dynamic = "force-dynamic";

async function resolvePublicTransportContext(shareId: string) {
  const invitation = await Invitation.findOne({ shareId })
    .select("_id eventId ownerId userId")
    .lean();

  if (!invitation?.eventId) {
    return { ok: false as const, status: 404, error: "INVITATION_NOT_FOUND" };
  }

  const event = await Event.findById(invitation.eventId)
    .select("_id userId status")
    .lean();

  if (!event || event.status === "archived") {
    return { ok: false as const, status: 404, error: "EVENT_NOT_FOUND" };
  }

  const owner = await User.findById(event.userId).lean();
  if (!userHasTransportationEntitlement(owner as any)) {
    return { ok: false as const, status: 404, error: "TRANSPORTATION_UNAVAILABLE" };
  }

  const settings = await EventTransportation.findOne({
    eventId: event._id,
  }).lean();

  if (!settings?.enabled || !settings.guestRegistrationEnabled) {
    return { ok: false as const, status: 404, error: "TRANSPORTATION_UNAVAILABLE" };
  }

  return {
    ok: true as const,
    invitation,
    event,
    settings,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    await connectDB();
    const { shareId } = await params;
    const ctx = await resolvePublicTransportContext(shareId);
    if (!ctx.ok) {
      return NextResponse.json(
        { success: false, error: ctx.error, available: false },
        { status: ctx.status }
      );
    }

    const eventId = String(ctx.event._id);
    const { searchParams } = new URL(req.url);
    const guestToken = searchParams.get("token");

    const [routes, stops] = await Promise.all([
      TransportRoute.find({ eventId, active: true })
        .sort({ sortOrder: 1 })
        .lean(),
      TransportStop.find({ eventId }).sort({ sortOrder: 1 }).lean(),
    ]);

    const routePayload = await Promise.all(
      routes.map(async (route) => {
        const direction =
          route.direction === "return" ? "return" : "outbound";
        const registered = await countRoutePassengers(
          eventId,
          String(route._id),
          direction as "outbound" | "return"
        );
        // For round_trip return capacity, also expose return seats separately via same capacity
        const capacity = Number(route.capacity || 0);
        return {
          _id: String(route._id),
          name: route.name,
          direction: route.direction,
          departureTime: route.departureTime || "",
          returnTime: route.returnTime || "",
          capacity,
          registered,
          remaining: Math.max(0, capacity - registered),
          level: getCapacityLevel(registered, capacity),
          full: registered >= capacity,
        };
      })
    );

    let existingRegistration = null;
    let guestPrefill: { invitationGuestId: string; name: string; phone: string } | null =
      null;

    if (guestToken) {
      const guest = await InvitationGuest.findOne({ token: guestToken })
        .select("_id name phone invitationId")
        .lean();

      if (guest && String(guest.invitationId) === String(ctx.invitation._id)) {
        guestPrefill = {
          invitationGuestId: String(guest._id),
          name: guest.name || "",
          phone: guest.phone || "",
        };

        const reg = await TransportRegistration.findOne({
          eventId,
          invitationGuestId: guest._id,
          status: "registered",
        }).lean();

        if (reg) existingRegistration = serializeDoc(reg);
      }
    }

    return NextResponse.json({
      success: true,
      available: true,
      settings: {
        enabled: true,
        guestRegistrationEnabled: true,
        notes: ctx.settings.notes || "",
      },
      routes: routePayload,
      stops: stops.map((s) => ({
        _id: String(s._id),
        routeId: String(s.routeId),
        name: s.name,
        address: s.address || "",
        time: s.time || "",
        sortOrder: s.sortOrder,
        landmark: s.landmark || "",
        mapLink: s.mapLink || "",
        stopType: s.stopType,
        notes: s.notes || "",
      })),
      guestPrefill,
      existingRegistration,
    });
  } catch (err) {
    console.error("❌ GET public transportation failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    await connectDB();
    const { shareId } = await params;
    const ctx = await resolvePublicTransportContext(shareId);
    if (!ctx.ok) {
      return NextResponse.json(
        { success: false, error: ctx.error },
        { status: ctx.status }
      );
    }

    const eventId = String(ctx.event._id);
    const body = await req.json();

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const passengerCount = Math.max(1, Number(body.passengerCount || 1));
    const needsOutbound = Boolean(body.needsOutbound);
    const needsReturn = Boolean(body.needsReturn);
    const notes = String(body.notes || "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "NAME_REQUIRED" },
        { status: 400 }
      );
    }
    if (!needsOutbound && !needsReturn) {
      return NextResponse.json(
        { success: false, error: "TRANSPORT_DIRECTION_REQUIRED" },
        { status: 400 }
      );
    }

    let invitationGuestId: string | null = null;
    if (body.token) {
      const guest = await InvitationGuest.findOne({ token: String(body.token) })
        .select("_id invitationId name phone")
        .lean();
      if (guest && String(guest.invitationId) === String(ctx.invitation._id)) {
        invitationGuestId = String(guest._id);
      }
    } else if (isValidObjectId(body.invitationGuestId)) {
      const guest = await InvitationGuest.findById(body.invitationGuestId)
        .select("_id invitationId")
        .lean();
      if (guest && String(guest.invitationId) === String(ctx.invitation._id)) {
        invitationGuestId = String(guest._id);
      }
    }

    if (invitationGuestId) {
      const existing = await TransportRegistration.findOne({
        eventId,
        invitationGuestId,
        status: "registered",
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "GUEST_ALREADY_REGISTERED",
            registration: serializeDoc(existing),
          },
          { status: 409 }
        );
      }
    }

    let outboundRouteId = needsOutbound ? body.outboundRouteId : null;
    let outboundStopId = needsOutbound ? body.outboundStopId : null;
    let returnRouteId = needsReturn ? body.returnRouteId : null;
    let returnStopId = needsReturn ? body.returnStopId : null;

    if (needsOutbound) {
      if (!isValidObjectId(outboundRouteId)) {
        return NextResponse.json(
          { success: false, error: "OUTBOUND_ROUTE_REQUIRED" },
          { status: 400 }
        );
      }
      const cap = await assertRouteHasCapacity({
        eventId,
        routeId: String(outboundRouteId),
        direction: "outbound",
        passengerCount,
      });
      if (!cap.ok) {
        return NextResponse.json(
          { success: false, error: cap.code, details: cap },
          { status: 409 }
        );
      }
    }

    if (needsReturn) {
      if (!isValidObjectId(returnRouteId)) {
        return NextResponse.json(
          { success: false, error: "RETURN_ROUTE_REQUIRED" },
          { status: 400 }
        );
      }
      const cap = await assertRouteHasCapacity({
        eventId,
        routeId: String(returnRouteId),
        direction: "return",
        passengerCount,
      });
      if (!cap.ok) {
        return NextResponse.json(
          { success: false, error: cap.code, details: cap },
          { status: 409 }
        );
      }
    }

    const registration = await TransportRegistration.create({
      eventId,
      invitationGuestId,
      name,
      phone,
      passengerCount,
      needsOutbound,
      outboundRouteId: needsOutbound ? outboundRouteId : null,
      outboundStopId:
        needsOutbound && isValidObjectId(outboundStopId)
          ? outboundStopId
          : null,
      needsReturn,
      returnRouteId: needsReturn ? returnRouteId : null,
      returnStopId:
        needsReturn && isValidObjectId(returnStopId) ? returnStopId : null,
      notes,
      status: "registered",
      outboundBoardStatus: needsOutbound ? "registered" : "not_needed",
      returnBoardStatus: needsReturn ? "registered" : "not_needed",
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
    console.error("❌ POST public transportation failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
