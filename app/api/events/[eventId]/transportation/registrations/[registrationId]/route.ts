import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireTransportationManagement } from "@/lib/guards/requireTransportation";
import { isValidObjectId, serializeDoc } from "@/lib/transportation/service";
import {
  rebalanceRegistrationSeats,
  releaseForRegistration,
  reserveForRegistration,
} from "@/lib/transportation/capacity";
import TransportRegistration from "@/models/TransportRegistration";
import TransportRoute from "@/models/TransportRoute";
import { TRANSPORT_BOARD_STATUSES } from "@/lib/transportation/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  try {
    await connectDB();
    const { eventId, registrationId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const registration = await TransportRegistration.findOne({
      _id: registrationId,
      eventId,
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: "REGISTRATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Promote from waitlist → registered (atomic seats)
    if (body.action === "promote" || body.status === "registered") {
      if (registration.status === "waitlisted") {
        const reserved = await reserveForRegistration({
          eventId,
          passengerCount: registration.passengerCount,
          needsOutbound: registration.needsOutbound,
          outboundRouteId: registration.outboundRouteId
            ? String(registration.outboundRouteId)
            : null,
          needsReturn: registration.needsReturn,
          returnRouteId: registration.returnRouteId
            ? String(registration.returnRouteId)
            : null,
        });

        if (!reserved.ok) {
          return NextResponse.json(
            {
              success: false,
              error: reserved.code,
              message: (reserved as any).message,
              remaining: (reserved as any).remaining,
              requested: registration.passengerCount,
            },
            { status: 409 }
          );
        }

        registration.status = "registered";
        registration.promotedAt = new Date();
        registration.outboundBoardStatus = registration.needsOutbound
          ? "registered"
          : "not_needed";
        registration.returnBoardStatus = registration.needsReturn
          ? "registered"
          : "not_needed";
        await registration.save();

        return NextResponse.json({
          success: true,
          registration: serializeDoc(registration),
          promoted: true,
        });
      }
    }

    if (body.action === "reject" || body.status === "rejected") {
      if (registration.status === "registered") {
        await releaseForRegistration(registration.toObject());
      }
      registration.status = "rejected";
      registration.rejectedAt = new Date();
      registration.outboundBoardStatus = "cancelled";
      registration.returnBoardStatus = registration.needsReturn
        ? "cancelled"
        : "not_needed";
      await registration.save();
      return NextResponse.json({
        success: true,
        registration: serializeDoc(registration),
      });
    }

    // Boarding status quick update
    if (
      body.outboundBoardStatus &&
      TRANSPORT_BOARD_STATUSES.includes(body.outboundBoardStatus)
    ) {
      registration.outboundBoardStatus = body.outboundBoardStatus;
    }
    if (
      body.returnBoardStatus &&
      TRANSPORT_BOARD_STATUSES.includes(body.returnBoardStatus)
    ) {
      registration.returnBoardStatus = body.returnBoardStatus;
    }

    if (body.status === "cancelled" || body.action === "cancel") {
      if (registration.status === "registered") {
        await releaseForRegistration(registration.toObject());
      }
      registration.status = "cancelled";
      registration.outboundBoardStatus = "cancelled";
      registration.returnBoardStatus = registration.needsReturn
        ? "cancelled"
        : "not_needed";
      await registration.save();
      return NextResponse.json({
        success: true,
        registration: serializeDoc(registration),
        seatsReleased: true,
      });
    }

    if (typeof body.name === "string" && body.name.trim()) {
      registration.name = body.name.trim();
    }
    if (typeof body.phone === "string") registration.phone = body.phone.trim();
    if (typeof body.notes === "string") registration.notes = body.notes.trim();

    // Only rebalance seats for active registered passengers
    if (registration.status === "registered") {
      const passengerCount =
        body.passengerCount !== undefined
          ? Math.max(1, Number(body.passengerCount || 1))
          : registration.passengerCount;

      const needsOutbound =
        body.needsOutbound !== undefined
          ? Boolean(body.needsOutbound)
          : registration.needsOutbound;
      const needsReturn =
        body.needsReturn !== undefined
          ? Boolean(body.needsReturn)
          : registration.needsReturn;

      const outboundRouteId =
        body.outboundRouteId !== undefined
          ? body.outboundRouteId
          : registration.outboundRouteId;
      const returnRouteId =
        body.returnRouteId !== undefined
          ? body.returnRouteId
          : registration.returnRouteId;

      if (needsOutbound) {
        if (!isValidObjectId(String(outboundRouteId || ""))) {
          return NextResponse.json(
            { success: false, error: "OUTBOUND_ROUTE_REQUIRED" },
            { status: 400 }
          );
        }
        const route = await TransportRoute.findOne({
          _id: outboundRouteId,
          eventId,
          active: true,
        }).lean();
        if (
          !route ||
          (route.direction !== "outbound" && route.direction !== "round_trip")
        ) {
          return NextResponse.json(
            { success: false, error: "INVALID_OUTBOUND_ROUTE" },
            { status: 400 }
          );
        }
      }

      if (needsReturn) {
        if (!isValidObjectId(String(returnRouteId || ""))) {
          return NextResponse.json(
            { success: false, error: "RETURN_ROUTE_REQUIRED" },
            { status: 400 }
          );
        }
        const route = await TransportRoute.findOne({
          _id: returnRouteId,
          eventId,
          active: true,
        }).lean();
        if (
          !route ||
          (route.direction !== "return" && route.direction !== "round_trip")
        ) {
          return NextResponse.json(
            { success: false, error: "INVALID_RETURN_ROUTE" },
            { status: 400 }
          );
        }
      }

      const rebalance = await rebalanceRegistrationSeats({
        eventId,
        previous: {
          passengerCount: registration.passengerCount,
          needsOutbound: registration.needsOutbound,
          outboundRouteId: registration.outboundRouteId
            ? String(registration.outboundRouteId)
            : null,
          needsReturn: registration.needsReturn,
          returnRouteId: registration.returnRouteId
            ? String(registration.returnRouteId)
            : null,
          status: registration.status,
        },
        next: {
          passengerCount,
          needsOutbound,
          outboundRouteId: needsOutbound ? String(outboundRouteId) : null,
          needsReturn,
          returnRouteId: needsReturn ? String(returnRouteId) : null,
        },
      });

      if (!rebalance.ok) {
        return NextResponse.json(
          {
            success: false,
            error: rebalance.code,
            message: (rebalance as any).message,
            remaining: (rebalance as any).remaining,
          },
          { status: 409 }
        );
      }

      registration.passengerCount = passengerCount;
      registration.needsOutbound = needsOutbound;
      registration.needsReturn = needsReturn;
      registration.outboundRouteId = needsOutbound ? outboundRouteId : null;
      registration.outboundStopId = needsOutbound
        ? body.outboundStopId !== undefined
          ? body.outboundStopId
          : registration.outboundStopId
        : null;
      registration.returnRouteId = needsReturn ? returnRouteId : null;
      registration.returnStopId = needsReturn
        ? body.returnStopId !== undefined
          ? body.returnStopId
          : registration.returnStopId
        : null;

      if (needsOutbound && registration.outboundBoardStatus === "not_needed") {
        registration.outboundBoardStatus = "registered";
      }
      if (!needsOutbound) registration.outboundBoardStatus = "not_needed";
      if (needsReturn && registration.returnBoardStatus === "not_needed") {
        registration.returnBoardStatus = "registered";
      }
      if (!needsReturn) registration.returnBoardStatus = "not_needed";
    } else if (registration.status === "waitlisted") {
      // Allow editing waitlist entry fields without touching capacity
      if (body.passengerCount !== undefined) {
        registration.passengerCount = Math.max(
          1,
          Number(body.passengerCount || 1)
        );
      }
      if (body.needsOutbound !== undefined) {
        registration.needsOutbound = Boolean(body.needsOutbound);
      }
      if (body.needsReturn !== undefined) {
        registration.needsReturn = Boolean(body.needsReturn);
      }
      if (body.outboundRouteId !== undefined) {
        registration.outboundRouteId = body.outboundRouteId;
      }
      if (body.outboundStopId !== undefined) {
        registration.outboundStopId = body.outboundStopId;
      }
      if (body.returnRouteId !== undefined) {
        registration.returnRouteId = body.returnRouteId;
      }
      if (body.returnStopId !== undefined) {
        registration.returnStopId = body.returnStopId;
      }
    }

    await registration.save();

    return NextResponse.json({
      success: true,
      registration: serializeDoc(registration),
    });
  } catch (err) {
    console.error("❌ PATCH transport registration failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  try {
    await connectDB();
    const { eventId, registrationId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const registration = await TransportRegistration.findOne({
      _id: registrationId,
      eventId,
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: "REGISTRATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (registration.status === "registered") {
      await releaseForRegistration(registration.toObject());
    }

    registration.status = "cancelled";
    registration.outboundBoardStatus = "cancelled";
    registration.returnBoardStatus = registration.needsReturn
      ? "cancelled"
      : "not_needed";
    await registration.save();

    return NextResponse.json({
      success: true,
      registration: serializeDoc(registration),
      seatsReleased: true,
    });
  } catch (err) {
    console.error("❌ DELETE transport registration failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
