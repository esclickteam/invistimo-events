import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { normalizeHiddenTableIds } from "@/lib/messages/resolveReminderSmsTemplate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

function canEditEvent(auth: any, event: any) {
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

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
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
      .select("userId producerId assignedStaffIds hideTableNumberForAll hiddenTableIds")
      .lean();

    if (!event || !canEditEvent(auth, event)) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      hideTableNumberForAll: Boolean((event as any).hideTableNumberForAll),
      hiddenTableIds: normalizeHiddenTableIds((event as any).hiddenTableIds),
    });
  } catch (err) {
    console.error("❌ GET reminder-table-visibility:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest(req);
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

    const event = await Event.findById(eventId).select(
      "userId producerId assignedStaffIds hideTableNumberForAll hiddenTableIds"
    );

    if (!event || !canEditEvent(auth, event)) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};

    if (typeof body.hideTableNumberForAll === "boolean") {
      update.hideTableNumberForAll = body.hideTableNumberForAll;
    }

    if (body.hiddenTableIds !== undefined) {
      update.hiddenTableIds = normalizeHiddenTableIds(body.hiddenTableIds);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_FIELDS_TO_UPDATE" },
        { status: 400 }
      );
    }

    await Event.updateOne({ _id: eventId }, { $set: update });

    const fresh = await Event.findById(eventId)
      .select("hideTableNumberForAll hiddenTableIds")
      .lean();

    return NextResponse.json({
      success: true,
      hideTableNumberForAll: Boolean((fresh as any)?.hideTableNumberForAll),
      hiddenTableIds: normalizeHiddenTableIds((fresh as any)?.hiddenTableIds),
    });
  } catch (err) {
    console.error("❌ PATCH reminder-table-visibility:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
