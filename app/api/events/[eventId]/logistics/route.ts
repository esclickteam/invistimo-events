import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import EventLogisticsStep from "@/models/EventLogisticsStep";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   GET – Logistics Steps for Event
========================================================= */
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { eventId } = params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const steps = await EventLogisticsStep.find({ eventId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ success: true, steps });
  } catch (err) {
    console.error("❌ GET /logistics failed:", err);
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

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { eventId } = params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { title, time } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "MISSING_TITLE" },
        { status: 400 }
      );
    }

    const order = await EventLogisticsStep.countDocuments({ eventId });

    const step = await EventLogisticsStep.create({
      eventId,
      title,
      time: time || "",
      status: "pending",
      order,
      createdBy: auth.userId,
    });

    return NextResponse.json({
      success: true,
      step,
    });
  } catch (err) {
    console.error("❌ POST /logistics failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
