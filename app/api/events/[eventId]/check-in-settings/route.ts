import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { authHasCheckInPermission } from "@/lib/checkIn/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

function canAccessEvent(auth: any, event: any) {
  if (!auth?.userId || !event) return false;

  const isAdmin =
    auth.role === "admin" ||
    auth.impersonationRole === "admin" ||
    auth.impersonatedByAdmin === true;

  if (isAdmin) return true;

  const userId = String(auth.userId);
  if (String(event.userId || "") === userId) return true;
  if (String(event.producerId || "") === userId) return true;

  if (
    Array.isArray(event.assignedStaffIds) &&
    event.assignedStaffIds.some((id: any) => String(id) === userId)
  ) {
    return true;
  }

  return false;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { eventId } = await context.params;
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const event = await Event.findById(eventId)
      .select("userId producerId assignedStaffIds checkInEnabled")
      .lean();

    if (!event || !canAccessEvent(auth, event)) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      checkInEnabled: Boolean((event as any)?.checkInEnabled),
    });
  } catch (err) {
    console.error("❌ GET check-in-settings:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
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

    if (!authHasCheckInPermission(auth, user as any, "checkin.manage")) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { eventId } = await context.params;
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const event = await Event.findById(eventId).select(
      "userId producerId assignedStaffIds checkInEnabled"
    );

    if (!event || !canAccessEvent(auth, event)) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (typeof body.checkInEnabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "NO_FIELDS_TO_UPDATE" },
        { status: 400 }
      );
    }

    // Disabling only hides the feature — never delete tokens, logs, or arrivals
    event.checkInEnabled = body.checkInEnabled;
    await event.save();

    return NextResponse.json({
      success: true,
      checkInEnabled: Boolean(event.checkInEnabled),
    });
  } catch (err) {
    console.error("❌ PATCH check-in-settings:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
