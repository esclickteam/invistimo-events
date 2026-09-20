import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { authHasCheckInPermission } from "@/lib/checkIn/permissions";
import { parseCheckInQrPayload } from "@/lib/checkIn/token";
import {
  checkedInGuestCount,
  confirmedGuestCount,
  computeCheckInStatus,
} from "@/lib/checkIn/status";
import { findCheckInInvitation } from "@/lib/checkIn/findCheckInInvitation";
import {
  checkInActionBlocked,
  loadEventCheckInGate,
} from "@/lib/checkIn/eventGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serializeGuest(guest: any) {
  const confirmed = confirmedGuestCount(guest);
  const checkedIn = checkedInGuestCount(guest);
  const remaining = Math.max(0, confirmed - checkedIn);

  return {
    id: String(guest._id),
    name: String(guest.name || "").trim() || "אורח",
    phone: String(guest.phone || "").trim(),
    rsvp: guest.rsvp || "pending",
    confirmedGuestCount: confirmed,
    checkedInGuestCount: checkedIn,
    remaining,
    tableNumber:
      typeof guest.tableNumber === "number" ? guest.tableNumber : null,
    tableName: String(guest.tableName || "").trim(),
    status: computeCheckInStatus(guest),
  };
}

async function resolveContext(
  auth: any,
  invitationId?: string | null,
  requestedEventId?: string | null
) {
  const user = await User.findById(auth.userId)
    .select("role staffType accessModules permissions features planLimits")
    .lean();

  if (!authHasCheckInPermission(auth, user as any, "checkin.scan")) {
    return { error: NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 }) };
  }

  const invitation = await findCheckInInvitation(
    auth,
    invitationId,
    requestedEventId
  );
  if (!invitation) {
    return { error: NextResponse.json({ success: false, error: "NO_INVITATION" }, { status: 404 }) };
  }

  const resolvedEventId = invitation.eventId ? String(invitation.eventId) : "";
  const gate = await loadEventCheckInGate(resolvedEventId);
  const blocked = checkInActionBlocked(gate);
  if (blocked) {
    return {
      error: NextResponse.json(
        { success: false, error: blocked.error, message: blocked.message },
        { status: blocked.status }
      ),
    };
  }

  return {
    user,
    invitation,
    eventId: resolvedEventId,
    checkInEnabled: gate.checkInEnabled,
    live: gate.live,
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

    const body = await req.json().catch(() => ({}));
    const invitationId = body.invitationId ? String(body.invitationId) : null;
    const requestedEventId = body.eventId ? String(body.eventId) : null;
    const ctx = await resolveContext(auth, invitationId, requestedEventId);
    if ("error" in ctx && ctx.error) return ctx.error;

    const { invitation, eventId } = ctx as any;
    const token = parseCheckInQrPayload(body.token || body.payload || body.raw);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    const guest = await InvitationGuest.findOne({
      invitationId: invitation._id,
      checkInToken: token,
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "GUEST_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      eventId,
      invitationId: String(invitation._id),
      guest: serializeGuest(guest),
    });
  } catch (err) {
    console.error("❌ POST check-in/lookup:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const invitationId = req.nextUrl.searchParams.get("invitationId");
    const requestedEventId = req.nextUrl.searchParams.get("eventId");
    const q = String(req.nextUrl.searchParams.get("q") || "").trim();
    const ctx = await resolveContext(auth, invitationId, requestedEventId);
    if ("error" in ctx && ctx.error) return ctx.error;

    const { invitation, eventId } = ctx as any;
    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        eventId,
        invitationId: String(invitation._id),
        guests: [],
      });
    }

    const digits = q.replace(/\D/g, "");
    const filter: any = {
      invitationId: invitation._id,
      $or: [{ name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }],
    };
    if (digits.length >= 3) {
      filter.$or.push({ phone: { $regex: digits } });
    }

    const guests = await InvitationGuest.find(filter).limit(20).lean();

    return NextResponse.json({
      success: true,
      eventId,
      invitationId: String(invitation._id),
      guests: guests.map(serializeGuest),
    });
  } catch (err) {
    console.error("❌ GET check-in/lookup:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
