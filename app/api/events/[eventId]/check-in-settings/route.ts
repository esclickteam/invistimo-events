import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { isInvistimoAdmin } from "@/lib/checkIn/adminGate";
import { ensureCheckInTokensForEvent } from "@/lib/checkIn/ensureEventTokens";

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

    if (!isInvistimoAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "ADMIN_ONLY" },
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
    const enabling = body.checkInEnabled === true && !event.checkInEnabled;
    event.checkInEnabled = body.checkInEnabled;
    await event.save();

    let tokensCreated = 0;
    if (enabling) {
      const ensured = await ensureCheckInTokensForEvent(event._id);
      tokensCreated = ensured.tokensCreated;
    }

    return NextResponse.json({
      success: true,
      checkInEnabled: Boolean(event.checkInEnabled),
      tokensCreated,
    });
  } catch (err) {
    console.error("❌ PATCH check-in-settings:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
