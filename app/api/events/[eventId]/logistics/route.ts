import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import "@/models/Event";
import "@/models/EventSupplier";
import "@/models/EventLogisticsStep";

import Event from "@/models/Event";
import EventSupplier from "@/models/EventSupplier";
import EventLogisticsStep from "@/models/EventLogisticsStep";

/* =========================================================
   GET – לוז לוגיסטי של האירוע
========================================================= */
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const { eventId } = params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const event = await Event.findOne({
      _id: eventId,
      $or: [{ userId: auth.userId }, { producerId: auth.userId }],
    });

    if (!event) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    const steps = await EventLogisticsStep.find({ eventId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ success: true, steps });
  } catch (err) {
    console.error("❌ GET logistics failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/* =========================================================
   POST – הוספת שלב ידני
========================================================= */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const { eventId } = params;
    const body = await req.json();

    const count = await EventLogisticsStep.countDocuments({ eventId });

    const step = await EventLogisticsStep.create({
      eventId,
      time: body.time || "",
      title: body.title || "",
      phone: body.phone || "",
      status: "pending",
      source: body.source || "manual",
      order: count,
    });

    return NextResponse.json({ success: true, step });
  } catch (err) {
    console.error("❌ POST logistics failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
