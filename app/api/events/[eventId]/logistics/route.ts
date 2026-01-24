import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import EventLogistics from "@/models/EventLogistics";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================
   GET – Logistics
========================= */
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

    const steps = await EventLogistics.find({ eventId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      steps,
    });
  } catch (err) {
    console.error("❌ GET logistics failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
