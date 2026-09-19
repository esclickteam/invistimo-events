import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { authHasCheckInPermission } from "@/lib/checkIn/permissions";
import {
  applyCheckIn,
  setCheckedInCountAbsolute,
} from "@/lib/checkIn/applyCheckIn";
import {
  checkedInGuestCount,
  confirmedGuestCount,
  computeCheckInStatus,
} from "@/lib/checkIn/status";
import { findCheckInInvitation } from "@/lib/checkIn/findCheckInInvitation";
import { hostScanIsFullyArrived } from "@/lib/checkIn/guestPassState";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serializeGuest(guest: any) {
  return {
    id: String(guest._id),
    name: String(guest.name || "").trim() || "אורח",
    phone: String(guest.phone || "").trim(),
    rsvp: guest.rsvp || "pending",
    confirmedGuestCount: confirmedGuestCount(guest),
    checkedInGuestCount: checkedInGuestCount(guest),
    remaining: Math.max(
      0,
      confirmedGuestCount(guest) - checkedInGuestCount(guest)
    ),
    tableNumber:
      typeof guest.tableNumber === "number" ? guest.tableNumber : null,
    tableName: String(guest.tableName || "").trim(),
    status: computeCheckInStatus(guest),
  };
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const user = await User.findById(auth.userId)
      .select("role staffType accessModules permissions features planLimits")
      .lean();

    if (!authHasCheckInPermission(auth, user as any, "checkin.scan")) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const guestId = String(body.guestId || body.invitationGuestId || "").trim();
    const invitationId = body.invitationId
      ? String(body.invitationId)
      : null;
    const method = body.method === "MANUAL" ? "MANUAL" : "QR";
    const allowOverride = body.allowOverride === true;
    const setAbsolute =
      typeof body.checkedInGuestCount === "number" ||
      typeof body.actualArrivedCount === "number";

    if (!guestId || !mongoose.Types.ObjectId.isValid(guestId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_GUEST" },
        { status: 400 }
      );
    }

    if (allowOverride && !authHasCheckInPermission(auth, user as any, "checkin.edit")) {
      return NextResponse.json(
        { success: false, error: "OVERRIDE_FORBIDDEN" },
        { status: 403 }
      );
    }

    const invitation = await findCheckInInvitation(auth, invitationId);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "NO_INVITATION" },
        { status: 404 }
      );
    }

    const eventId = invitation.eventId ? String(invitation.eventId) : "";
    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      const event = await Event.findById(eventId).select("checkInEnabled").lean();
      if (!(event as any)?.checkInEnabled) {
        return NextResponse.json(
          { success: false, error: "CHECKIN_DISABLED" },
          { status: 403 }
        );
      }
    }

    const guest = await InvitationGuest.findOne({
      _id: guestId,
      invitationId: invitation._id,
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "GUEST_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (
      !setAbsolute &&
      hostScanIsFullyArrived(
        confirmedGuestCount(guest),
        checkedInGuestCount(guest)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "ALREADY_CHECKED_IN",
          message: "האורחים כבר נכנסו",
          guest: serializeGuest(guest),
        },
        { status: 409 }
      );
    }

    const scannedBy =
      auth.impersonated && auth.impersonatedBy
        ? String(auth.impersonatedBy)
        : String(auth.userId);

    let result;
    if (setAbsolute) {
      const nextCount = Number(
        body.checkedInGuestCount ?? body.actualArrivedCount
      );
      result = await setCheckedInCountAbsolute({
        guest,
        nextCount,
        scannedByUserId: scannedBy,
        allowOverride,
        deviceSession: body.deviceSession ? String(body.deviceSession) : null,
        eventId,
        invitationId: String(invitation._id),
      });
    } else {
      result = await applyCheckIn({
        guest,
        quantityAdded: Number(body.quantityAdded || body.quantity || 0),
        scannedByUserId: scannedBy,
        method,
        allowOverride,
        deviceSession: body.deviceSession ? String(body.deviceSession) : null,
        eventId,
        invitationId: String(invitation._id),
      });
    }

    if (!result.ok) {
      const status =
        result.code === "EXCEEDS_CONFIRMED"
          ? 409
          : result.code === "CONCURRENT_UPDATE"
            ? 409
          : result.code === "INVALID_QUANTITY"
            ? 400
            : 400;
      return NextResponse.json(
        {
          success: false,
          error: result.code,
          message: result.error,
          confirmed: result.confirmed,
          previousCheckedInCount: result.previousCheckedInCount,
          currentCheckedInCount: (result as any).currentCheckedInCount,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      guest: serializeGuest(result.guest),
      previousCheckedInCount: result.previousCheckedInCount,
      newCheckedInCount: result.newCheckedInCount,
      quantityAdded: result.quantityAdded,
      overridden: result.overridden,
      logId: result.logId,
    });
  } catch (err) {
    console.error("❌ POST check-in/confirm:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
