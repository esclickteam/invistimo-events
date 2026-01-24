import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import EventLogisticsStep from "@/models/EventLogisticsStep";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

/* =========================================================
   GET – Logistics Steps for Event
========================================================= */
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    // Auth
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Params
    const { eventId } = params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    // Load
    const steps = await EventLogisticsStep.find({ eventId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ success: true, steps });
  } catch (err) {
    console.error("❌ GET /api/events/[eventId]/logistics failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST – Add Logistics Step
========================================================= */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    // Auth
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Params
    const { eventId } = params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    // Body
    const body = await req.json().catch(() => null);
    const title = String(body?.title || "").trim();
    const time = String(body?.time || "").trim();

    if (!title) {
      return NextResponse.json(
        { success: false, error: "MISSING_TITLE" },
        { status: 400 }
      );
    }

    // Order (append to end)
    const order = await EventLogisticsStep.countDocuments({ eventId });

    const step = await EventLogisticsStep.create({
      eventId,
      title,
      time,
      status: "pending",
      order,
      createdBy: auth.userId,
    });

    return NextResponse.json({ success: true, step });
  } catch (err) {
    console.error("❌ POST /api/events/[eventId]/logistics failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
