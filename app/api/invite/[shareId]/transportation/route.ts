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
import {
  getCapacityLevel,
  capacityLabel,
} from "@/lib/transportation/types";
import {
  reserveForRegistration,
  releaseForRegistration,
} from "@/lib/transportation/capacity";
import { isValidObjectId, serializeDoc } from "@/lib/transportation/service";

export const dynamic = "force-dynamic";

async function resolvePublicTransportContext(shareId: string) {
  const invitation = await Invitation.findOne({ shareId })
    .select("_id eventId ownerId userId")
    .lean();

  if (!invitation?.eventId) {
    return { ok: false as const, status: 404, error: "INVITATION_NOT_FOUND" };
  }

  const event = await Event.findById(invitation.eventId)
    .select("_id userId status title")
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

    const routePayload = routes.map((route) => {
      const reservedSeats = Number(route.reservedSeats || 0);
      const capacity = Number(route.capacity || 0);
      const remaining = Math.max(0, capacity - reservedSeats);
      const level = getCapacityLevel(reservedSeats, capacity);
      const returnCapacity =
        route.direction === "round_trip"
          ? Number(route.returnCapacity ?? route.capacity ?? 0)
          : capacity;
      const returnReservedSeats =
        route.direction === "round_trip"
          ? Number(route.returnReservedSeats || 0)
          : reservedSeats;
      const returnRemaining = Math.max(0, returnCapacity - returnReservedSeats);
      const returnLevel = getCapacityLevel(returnReservedSeats, returnCapacity);
      return {
        _id: String(route._id),
        name: route.name,
        direction: route.direction,
        departureTime: route.departureTime || "",
        returnTime: route.returnTime || "",
        capacity,
        registered: reservedSeats,
        remaining,
        level,
        levelLabel: capacityLabel(level),
        full: remaining <= 0,
        returnCapacity,
        returnRegistered: returnReservedSeats,
        returnRemaining,
        returnLevel,
        returnLevelLabel: capacityLabel(returnLevel),
        returnFull: returnRemaining <= 0,
      };
    });

    let existingRegistration = null;
    let guestPrefill: {
      invitationGuestId: string;
      name: string;
      phone: string;
    } | null = null;

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
          status: { $in: ["registered", "waitlisted"] },
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
        waitlistEnabled: Boolean(ctx.settings.waitlistEnabled),
        notes: ctx.settings.notes || "",
      },
      eventTitle: (ctx.event as any).title || "",
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
    const wantWaitlist = Boolean(body.waitlist || body.status === "waitlisted");

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
        status: { $in: ["registered", "waitlisted"] },
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

    const outboundRouteId = needsOutbound ? body.outboundRouteId : null;
    const outboundStopId = needsOutbound ? body.outboundStopId : null;
    const returnRouteId = needsReturn ? body.returnRouteId : null;
    const returnStopId = needsReturn ? body.returnStopId : null;

    if (needsOutbound && !isValidObjectId(outboundRouteId)) {
      return NextResponse.json(
        { success: false, error: "OUTBOUND_ROUTE_REQUIRED" },
        { status: 400 }
      );
    }
    if (needsReturn && !isValidObjectId(returnRouteId)) {
      return NextResponse.json(
        { success: false, error: "RETURN_ROUTE_REQUIRED" },
        { status: 400 }
      );
    }

    const payload = {
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
    };

    if (wantWaitlist) {
      if (!ctx.settings.waitlistEnabled) {
        return NextResponse.json(
          { success: false, error: "WAITLIST_DISABLED" },
          { status: 403 }
        );
      }

      const registration = await TransportRegistration.create({
        ...payload,
        status: "waitlisted",
        waitlistedAt: new Date(),
        outboundBoardStatus: "not_needed",
        returnBoardStatus: "not_needed",
      });

      return NextResponse.json(
        {
          success: true,
          registration: serializeDoc(registration),
          waitlisted: true,
        },
        { status: 201 }
      );
    }

    const reserved = await reserveForRegistration({
      eventId,
      passengerCount,
      needsOutbound,
      outboundRouteId,
      needsReturn,
      returnRouteId,
    });

    if (!reserved.ok) {
      return NextResponse.json(
        {
          success: false,
          error: reserved.code,
          message: (reserved as any).message,
          remaining: (reserved as any).remaining ?? 0,
          capacity: (reserved as any).capacity,
          requested: passengerCount,
          waitlistAvailable: Boolean(ctx.settings.waitlistEnabled),
        },
        { status: 409 }
      );
    }

    try {
      const registration = await TransportRegistration.create({
        ...payload,
        status: "registered",
        outboundBoardStatus: needsOutbound ? "registered" : "not_needed",
        returnBoardStatus: needsReturn ? "registered" : "not_needed",
      });

      return NextResponse.json(
        { success: true, registration: serializeDoc(registration) },
        { status: 201 }
      );
    } catch (err: any) {
      await releaseForRegistration({
        ...payload,
        status: "registered",
      });
      if (err?.code === 11000) {
        return NextResponse.json(
          { success: false, error: "GUEST_ALREADY_REGISTERED" },
          { status: 409 }
        );
      }
      throw err;
    }
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
